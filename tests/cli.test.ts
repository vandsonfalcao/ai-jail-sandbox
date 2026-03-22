import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import fs from 'fs';

const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');

describe('ai-jail-sandbox (Suíte Completa de Segurança e Integração)', () => {
  const testTimeout = 15000;

  it('1. deve responder ao comando --version com um formato válido', async () => {
    const { stdout } = await execa('node', [CLI_PATH, '--version'], { timeout: testTimeout });
    // Verifica se a saída contém um padrão SemVer (X.Y.Z)
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  }, testTimeout);

  it('2. deve repassar argumentos diretamente para o Gemini CLI', async () => {
    // Testamos se ele aceita um argumento (ex: help) e o repassa para o Gemini
    // O comando 'help' não exige autenticação e retorna rapidamente
    const { stdout, stderr } = await execa('node', [CLI_PATH, 'help'], { 
      reject: false,
      timeout: testTimeout
    });
    // Se ele repassou o comando, a saída deve conter a ajuda da CLI do Gemini
    expect(stdout + stderr).toMatch(/gemini/i);
  }, testTimeout);

  it('3. deve bloquear internet com a flag --lockdown', async () => {
    try {
      await execa('node', [CLI_PATH, '--lockdown', 'curl', 'google.com'], { timeout: testTimeout });
      throw new Error('Falha no isolamento de rede');
    } catch (error: any) {
      expect(error.exitCode).not.toBe(0);
    }
  }, testTimeout);

  it('4. deve isolar variáveis de ambiente do host', async () => {
    process.env.TEST_SECRET_HOST = 'my-secret-token';
    const { stdout, stderr } = await execa('node', [CLI_PATH, 'printenv', 'TEST_SECRET_HOST'], { 
      reject: false, 
      timeout: testTimeout 
    });
    const output = stdout + stderr;
    expect(output).not.toContain('my-secret-token');
  }, testTimeout);

  it('5. deve mascarar arquivos .env* automaticamente', async () => {
    const envPath = path.join(process.cwd(), '.env.test-secret');
    fs.writeFileSync(envPath, 'SECRET_KEY=12345');
    try {
      const { stdout } = await execa('node', [CLI_PATH, 'cat', '.env.test-secret'], { 
        reject: false,
        timeout: testTimeout 
      });
      expect(stdout.trim()).toBe('');
    } finally {
      if (fs.existsSync(envPath)) fs.unlinkSync(envPath);
    }
  }, testTimeout);

  it('6. deve mascarar arquivos listados no .gitignore', async () => {
    const secretFilePath = path.join(process.cwd(), 'git-ignored-secret.txt');
    fs.writeFileSync(secretFilePath, 'private git info');
    const originalGitignore = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore') : null;
    fs.writeFileSync('.gitignore', 'git-ignored-secret.txt');
    try {
      const { stdout } = await execa('node', [CLI_PATH, 'cat', 'git-ignored-secret.txt'], { 
        reject: false,
        timeout: testTimeout 
      });
      expect(stdout.trim()).toBe('');
    } finally {
      if (fs.existsSync(secretFilePath)) fs.unlinkSync(secretFilePath);
      if (originalGitignore) fs.writeFileSync('.gitignore', originalGitignore);
      else if (fs.existsSync('.gitignore')) fs.unlinkSync('.gitignore');
    }
  }, testTimeout);

  it('7. deve respeitar o modo somente-leitura com --read-only', async () => {
    try {
      await execa('node', [CLI_PATH, '--read-only', 'touch', 'test-readonly.txt'], { 
        timeout: testTimeout 
      });
      throw new Error('Permitiu escrita em modo read-only');
    } catch (error: any) {
      expect(error.stderr.toLowerCase()).toContain('read-only file system');
    }
  }, testTimeout);

  it('8. deve isolar arquivos do host (fora do workspace)', async () => {
    const secretPath = `/tmp/ai-jail-outside-${Date.now()}.txt`;
    fs.writeFileSync(secretPath, 'host secret');
    try {
      const { stdout, stderr } = await execa('node', [CLI_PATH, 'ls', secretPath], { 
        reject: false,
        timeout: testTimeout 
      });
      expect((stdout + stderr).toLowerCase()).toContain('no such file or directory');
    } finally {
      if (fs.existsSync(secretPath)) fs.unlinkSync(secretPath);
    }
  }, testTimeout);

  it('9. deve mascarar diretórios sensíveis (ex: .git)', async () => {
    const { stdout } = await execa('node', [CLI_PATH, 'ls', '-a', '.git'], { 
      reject: false,
      timeout: testTimeout 
    });
    expect(stdout).not.toContain('config');
    expect(stdout).not.toContain('HEAD');
  }, testTimeout);
});
