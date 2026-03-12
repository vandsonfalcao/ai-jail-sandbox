#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function run() {
  const args = process.argv.slice(2);
  let lockdown = false;
  const userArgs: string[] = [];

  // Parsear argumentos
  for (const arg of args) {
    if (arg === '--lockdown') {
      lockdown = true;
    } else {
      userArgs.push(arg);
    }
  }

  const imageName = 'ai-jail-sandbox';
  const projectRoot = path.resolve(__dirname, '..');
  const dockerfilePath = path.join(projectRoot, 'docker', 'Dockerfile');
  const currentDir = process.cwd();

  // 1. Verificar se a imagem existe (usando docker images)
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
  const dockerFlags = ['run', '--rm'];

  if (lockdown) {
    dockerFlags.push('--network', 'none');
  }

  // Detectar TTY
  if (process.stdin.isTTY) {
    dockerFlags.push('-it');
  } else {
    dockerFlags.push('-i');
  }

  dockerFlags.push('-v', `${currentDir}:/workspace`);
  dockerFlags.push('-w', '/workspace');

  // Repassar variáveis de terminal para suporte a cores (remove avisos de 256-color e True Color)
  if (process.env.TERM) {
    dockerFlags.push('-e', `TERM=${process.env.TERM}`);
  }
  if (process.env.COLORTERM) {
    dockerFlags.push('-e', `COLORTERM=${process.env.COLORTERM}`);
  }

  dockerFlags.push(imageName);

  // 4. Determinar o comando final
  // Se houver argumentos de sistema conhecidos, executa direto (para testes e diagnósticos)
  const systemCommands = ['ls', 'curl', 'bash', 'printenv', 'whoami', 'true', 'hostname', 'uname', 'cat'];
  if (userArgs.length > 0 && systemCommands.includes(userArgs[0])) {
    dockerFlags.push(...userArgs);
  } else {
    // Padrão: Gemini CLI direto (o executável se chama 'gemini' no container)
    dockerFlags.push('gemini', ...userArgs);
  }

  // 5. Executar
  const dockerProcess = spawn('docker', dockerFlags, { stdio: 'inherit' });
  dockerProcess.on('close', (code) => {
    process.exit(code || 0);
  });
}

run().catch((err) => {
  console.error('Erro ao executar ai-jail:', err);
  process.exit(1);
});
