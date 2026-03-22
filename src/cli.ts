#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function run() {
  const args = process.argv.slice(2);
  let lockdown = false;
  let allowSecrets = false;
  let readOnly = false;
  let unlimited = false;
  const userArgs: string[] = [];

  // Parsear argumentos
  for (const arg of args) {
    if (arg === '--lockdown') {
      lockdown = true;
    } else if (arg === '--allow-secrets') {
      allowSecrets = true;
    } else if (arg === '--read-only') {
      readOnly = true;
    } else if (arg === '--unlimited') {
      unlimited = true;
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

  // Configurações do Gemini (Persistência)
  const geminiConfigDir = path.join(os.homedir(), '.ai-jail-sandbox', 'config', 'gemini');
  if (!fs.existsSync(geminiConfigDir)) {
    fs.mkdirSync(geminiConfigDir, { recursive: true });
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
    dockerFlags.push('gemini', ...userArgs);
  }

  // 5. Executar
  const dockerProcess = spawn('docker', dockerFlags, { stdio: 'inherit' });
  dockerProcess.on('close', (code) => {
    process.exit(code || 0);
  });
}

run().catch((err) => {
  console.error('Erro ao executar ai-jail-sandbox:', err);
  process.exit(1);
});
