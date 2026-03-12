import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import fs from 'fs';

const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');

describe('ai-jail CLI (Segurança e Funcionalidade)', () => {
  const testTimeout = 15000;

  it('1. deve responder ao comando --version instantaneamente', async () => {
    const { stdout } = await execa('node', [CLI_PATH, '--version'], { timeout: testTimeout });
    expect(stdout).toContain('0.33.0');
  }, testTimeout);

  it('2. deve bloquear internet com a flag --lockdown', async () => {
    try {
      await execa('node', [CLI_PATH, '--lockdown', 'curl', 'google.com'], { timeout: testTimeout });
      throw new Error('Deveria ter falhado o acesso à internet');
    } catch (error: any) {
      expect(error.exitCode).not.toBe(0);
    }
  }, testTimeout);

  it('3. deve isolar variáveis de ambiente do host', async () => {
    process.env.TEST_SECRET_HOST = 'my-secret-token';
    const { stdout, stderr } = await execa('node', [CLI_PATH, 'printenv', 'TEST_SECRET_HOST'], { 
      reject: false, 
      timeout: testTimeout 
    });
    const output = stdout + stderr;
    expect(output).not.toContain('my-secret-token');
  }, testTimeout);

  it('4. deve isolar arquivos do host (não consegue ver arquivos fora do workspace)', async () => {
    const secretPath = `/tmp/ai-jail-secret-${Date.now()}.txt`;
    fs.writeFileSync(secretPath, 'secret content');

    try {
      const { stdout, stderr } = await execa('node', [CLI_PATH, 'ls', secretPath], { 
        reject: false,
        timeout: testTimeout 
      });
      const output = stdout + stderr;
      expect(output).not.toContain('secret content');
      expect(output.toLowerCase()).toContain('no such file or directory');
    } finally {
      if (fs.existsSync(secretPath)) fs.unlinkSync(secretPath);
    }
  }, testTimeout);

  it('5. deve isolar o diretório Home do usuário', async () => {
    const homeDir = process.env.HOME || '/home';
    const { stdout, stderr } = await execa('node', [CLI_PATH, 'ls', homeDir], { 
      reject: false,
      timeout: testTimeout 
    });
    const output = stdout + stderr;
    expect(output.toLowerCase()).toContain('no such file or directory');
  }, testTimeout);
});
