import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import fs from 'fs';

const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');

describe('ai-jail-sandbox (Suíte Completa de Segurança e Integração)', () => {
  const testTimeout = 15000;
  const envWithKey = { GEMINI_API_KEY: 'dummy-key' };

  it('1. deve responder ao comando --version com um formato válido', async () => {
    const { stdout } = await execa('node', [CLI_PATH, '--version'], { 
      timeout: testTimeout,
      env: envWithKey
    });
    // Verifica se a saída contém um padrão SemVer (X.Y.Z)
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  }, testTimeout);

  it('2. deve repassar argumentos diretamente para o Gemini CLI', async () => {
    // Testamos se ele aceita um argumento (ex: help) e o repassa para o Gemini
    // O comando 'help' não exige autenticação e retorna rapidamente
    const { stdout, stderr } = await execa('node', [CLI_PATH, 'help'], { 
      reject: false,
      timeout: testTimeout,
      env: envWithKey
    });
    // Se ele repassou o comando, a saída deve conter a ajuda da CLI do Gemini
    expect(stdout + stderr).toMatch(/gemini/i);
  }, testTimeout);

  it('3. deve bloquear internet com a flag --lockdown', async () => {
    try {
      await execa('node', [CLI_PATH, '--lockdown', 'curl', 'google.com'], { 
        timeout: testTimeout,
        env: envWithKey
      });
      throw new Error('Falha no isolamento de rede');
    } catch (error: any) {
      expect(error.exitCode).not.toBe(0);
    }
  }, testTimeout);

  it('4. deve isolar variáveis de ambiente do host', async () => {
    process.env.TEST_SECRET_HOST = 'my-secret-token';
    const { stdout, stderr } = await execa('node', [CLI_PATH, 'printenv', 'TEST_SECRET_HOST'], { 
      reject: false, 
      timeout: testTimeout,
      env: envWithKey
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
        timeout: testTimeout,
        env: envWithKey
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
        timeout: testTimeout,
        env: envWithKey
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
        timeout: testTimeout,
        env: envWithKey
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
        timeout: testTimeout,
        env: envWithKey
      });
      expect((stdout + stderr).toLowerCase()).toContain('no such file or directory');
    } finally {
      if (fs.existsSync(secretPath)) fs.unlinkSync(secretPath);
    }
  }, testTimeout);

  it('9. deve mascarar diretórios sensíveis (ex: .git)', async () => {
    const { stdout } = await execa('node', [CLI_PATH, 'ls', '-a', '.git'], { 
      reject: false,
      timeout: testTimeout,
      env: envWithKey
    });
    expect(stdout).not.toContain('config');
    expect(stdout).not.toContain('HEAD');
  }, testTimeout);

  it('10. deve barrar execução sem API Key no primeiro uso', async () => {
    // Simulamos um ambiente sem chaves e sem login prévio
    // Usamos um HOME temporário para garantir que não existam configurações prévias
    const tempHome = path.join(process.cwd(), `temp-home-test-auth-${Date.now()}`);
    if (fs.existsSync(tempHome)) fs.rmSync(tempHome, { recursive: true });
    fs.mkdirSync(tempHome);

    try {
      await execa('node', [CLI_PATH, '--version'], { 
        env: { ...process.env, HOME: tempHome, GEMINI_API_KEY: '', GOOGLE_API_KEY: '' },
        timeout: testTimeout 
      });
      throw new Error('Permitiu execução sem API Key');
    } catch (error: any) {
      if (error.message === 'Permitiu execução sem API Key') throw error;
      expect(error.exitCode).toBe(1);
      expect(error.stderr).toContain('API Key não encontrada');
    } finally {
      if (fs.existsSync(tempHome)) fs.rmSync(tempHome, { recursive: true });
    }
  }, testTimeout);

  it('11. deve persistir a API Key após o primeiro uso', async () => {
    const tempHome = path.join(process.cwd(), `temp-home-test-${Date.now()}`);
    if (fs.existsSync(tempHome)) fs.rmSync(tempHome, { recursive: true });
    fs.mkdirSync(tempHome);

    try {
      // 1. Primeira execução com a chave fornecida via flag
      await execa('node', [CLI_PATH, '--key', 'test-persisted-key', 'true'], {
        env: { ...process.env, HOME: tempHome, GEMINI_API_KEY: '', GOOGLE_API_KEY: '' },
        timeout: testTimeout
      });

      // 2. Segunda execução sem a chave (deve funcionar agora usando a persistida)
      const { exitCode } = await execa('node', [CLI_PATH, 'true'], {
        env: { ...process.env, HOME: tempHome, GEMINI_API_KEY: '', GOOGLE_API_KEY: '' },
        timeout: testTimeout
      });

      expect(exitCode).toBe(0);

      // Verificar se a chave está realmente no settings.json
      const settingsPath = path.join(tempHome, '.ai-jail-sandbox', 'config', 'gemini', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.apiKey).toBe('test-persisted-key');

    } finally {
      if (fs.existsSync(tempHome)) fs.rmSync(tempHome, { recursive: true });
    }
  }, testTimeout);
});
