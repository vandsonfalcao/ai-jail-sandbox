#!/usr/bin/env node

import { spawn } from 'child_process';
import { execa } from 'execa';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function run() {
  const args = process.argv.slice(2);
  let lockdown = false;
  let allowSecrets = false;
  let readOnly = false;
  let unlimited = false;
  let debug = false;
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const userArgs: string[] = [];

  // Parsear argumentos
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--lockdown') {
      lockdown = true;
    } else if (arg === '--allow-secrets') {
      allowSecrets = true;
    } else if (arg === '--read-only') {
      readOnly = true;
    } else if (arg === '--unlimited') {
      unlimited = true;
    } else if (arg === '--debug') {
      debug = true;
    } else if (arg === '--key' && i + 1 < args.length) {
      apiKey = args[++i];
    } else {
      userArgs.push(arg);
    }
  }

  const imageName = 'ai-jail-sandbox';
  const projectRoot = path.resolve(__dirname, '..');
  const dockerfilePath = path.join(projectRoot, 'docker', 'Dockerfile');
  const currentDir = process.cwd();

  // 1. Verificar se a imagem existe
  const checkImage = spawn('docker', ['images', '-q', imageName]);
  let imageId = '';
  checkImage.stdout.on('data', (data) => { imageId += data.toString().trim(); });

  await new Promise((resolve) => checkImage.on('close', resolve));

  // 2. Buildar se não existir
  if (!imageId) {
    console.log(`Imagem ${imageName} não encontrada. Construindo...`);
    const build = spawn('docker', ['build', '-t', imageName, '-f', dockerfilePath, path.join(projectRoot, 'docker')], { stdio: 'inherit' });
    await new Promise((resolve) => build.on('close', resolve));
  }

  // 3. Preparar flags do Docker
  const dockerFlags = ['run', '--rm', '--init'];

  if (lockdown) {
    dockerFlags.push('--network', 'none');
  }

  // Limites de Hardware (Padrão)
  if (!unlimited) {
    dockerFlags.push('--cpus', '2');
    dockerFlags.push('--memory', '2g');
    dockerFlags.push('--pids-limit', '256');
  }

  // Detectar TTY
  if (process.stdin.isTTY) {
    dockerFlags.push('-it');
  } else {
    dockerFlags.push('-i');
  }

  // Montagem do Workspace
  const mountMode = readOnly ? ':ro' : '';
  dockerFlags.push('-v', `${currentDir}:/workspace${mountMode}`);
  dockerFlags.push('-w', '/workspace');

  // Cache Persistente para NPM
  const cacheDir = path.join(os.homedir(), '.ai-jail-sandbox', 'cache', 'npm');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  dockerFlags.push('-v', `${cacheDir}:/root/.npm`);

  // Configurações do Gemini (Persistência e Confiança)
  const geminiConfigDir = path.join(os.homedir(), '.ai-jail-sandbox', 'config', 'gemini');
  const settingsPath = path.join(geminiConfigDir, 'settings.json');

  // Carregar configurações existentes
  let settings: any = { trustedWorkspaces: [] as string[] };
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch (e) {}
  }

  // Se a chave não foi passada por env ou flag, tenta carregar do settings
  if (!apiKey && settings.apiKey) {
    apiKey = settings.apiKey;
  }

  // Validar e Injetar API Key (Mecanismo Obrigatório)
  // Verificamos se já existe uma autenticação real (API Key no settings ou credenciais)
  let isAlreadyAuthenticated = fs.existsSync(path.join(geminiConfigDir, 'credentials.json')) || !!settings.apiKey || !!settings.authenticated;
  
  if (apiKey) {
    // Persistir a chave se ela for nova ou diferente
    if (settings.apiKey !== apiKey) {
      settings.apiKey = apiKey;
      if (!fs.existsSync(geminiConfigDir)) {
        fs.mkdirSync(geminiConfigDir, { recursive: true });
      }
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }
    dockerFlags.push('-e', `GEMINI_API_KEY=${apiKey}`);
    dockerFlags.push('-e', `GOOGLE_API_KEY=${apiKey}`);
  } else if (!isAlreadyAuthenticated) {
    console.error('\n[ERRO] API Key não encontrada!');
    console.error('Para evitar travamentos no terminal, o fornecimento da chave é obrigatório no primeiro uso.');
    console.error('\nComo resolver:');
    console.error('1. Use a flag: ai-jail-sandbox --key SUA_CHAVE_AQUI');
    console.error('2. Ou exporte: export GEMINI_API_KEY=SUA_CHAVE_AQUI\n');
    process.exit(1);
  }

  if (!fs.existsSync(geminiConfigDir)) {
    fs.mkdirSync(geminiConfigDir, { recursive: true });
  }

  // Pré-configurar confiança do workspace para evitar crash de reinício
  if (!settings.trustedWorkspaces.includes('/workspace')) {
    settings.trustedWorkspaces.push('/workspace');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  }

  dockerFlags.push('-v', `${geminiConfigDir}:/root/.gemini`);

  // Proteção de arquivos sensíveis (Mascaramento)
  if (!allowSecrets) {
    const sensitivePatterns = new Set(['.git', '.ssh', '.npm', '.pnpm', 'credentials.json']);
    
    // Ler .gitignore para adicionar padrões extras
    const gitignorePath = path.join(currentDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      gitignoreContent.split('\n').forEach(line => {
        const pattern = line.trim();
        if (pattern && !pattern.startsWith('#')) {
          sensitivePatterns.add(pattern.replace(/\/$/, '')); // Remove trailing slash
        }
      });
    }

    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const isSensitive = file.startsWith('.env') || sensitivePatterns.has(file) || file.endsWith('.key') || file.endsWith('.pem');

      if (isSensitive) {
        const fullPath = path.join(currentDir, file);
        if (fs.existsSync(fullPath)) {
          const isDir = fs.statSync(fullPath).isDirectory();
          if (isDir) {
            dockerFlags.push('-v', `/tmp:/workspace/${file}:ro`);
          } else {
            dockerFlags.push('-v', `/dev/null:/workspace/${file}`);
          }
        }
      }
    }
  }

  // Repassar variáveis de terminal para suporte a cores
  const passthroughEnvs = ['TERM', 'COLORTERM'];
  for (const env of passthroughEnvs) {
    if (process.env[env]) {
      dockerFlags.push('-e', `${env}=${process.env[env]}`);
    }
  }

  dockerFlags.push(imageName);

  // 4. Determinar o comando final
  const systemCommands = ['ls', 'curl', 'bash', 'printenv', 'whoami', 'true', 'hostname', 'uname', 'cat', 'touch', 'mkdir', 'rm'];
  if (userArgs.length > 0 && systemCommands.includes(userArgs[0])) {
    dockerFlags.push(...userArgs);
  } else {
    // Modo interativo normal
    dockerFlags.push('gemini', ...userArgs);
  }

  // 5. Executar
  const logsDir = path.join(currentDir, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const logFileName = `debug_${dateStr}_${timeStr}.log`;
  const logPath = path.join(logsDir, logFileName);
  
  const logMessage = (msg: string) => {
    const ts = new Date().toISOString();
    fs.appendFileSync(logPath, `[${ts}] ${msg}\n`);
    if (debug) console.log(`[DEBUG] ${msg}`);
  };

  logMessage(`Iniciando Docker. Comando: docker ${dockerFlags.join(' ')}`);

  const dockerProcess = spawn('docker', dockerFlags, { stdio: 'inherit' });

  dockerProcess.on('close', (code) => {
    logMessage(`Docker finalizado com código ${code}`);
    
    // Se o código for de erro, tentamos resetar o terminal
    if (code !== 0 && code !== null) {
      console.log(`\n[!] O processo Docker encerrou com erro (código ${code}).`);
    }
    
    process.exit(code || 0);
  });

  dockerProcess.on('error', (err) => {
    logMessage(`Erro ao disparar Docker: ${err.message}`);
    process.exit(1);
  });
}

run().catch((err) => {
  console.error('Erro ao executar ai-jail-sandbox:', err);
  process.exit(1);
});
