# AI-Jail Sandbox: Sandbox Segura para o Gemini CLI

> ⚠️ **ATENÇÃO: Este produto é EXPERIMENTAL e está em fase de testes.** O uso em ambientes críticos não é recomendado sem a devida auditoria.

**AI-Jail Sandbox** é uma ferramenta CLI oficial para executar o agente de IA Gemini em um ambiente Docker isolado, protegendo seu sistema host de comandos inseguros e vazamento de dados.

## Pré-requisitos

Para rodar o **AI-Jail Sandbox**, você precisa apenas de:

1.  **Docker**: O motor que cria o ambiente isolado. Certifique-se de que o serviço está rodando e que seu usuário tem permissão para executar comandos `docker` sem `sudo`.
2.  **Node.js**: Para instalar e rodar o CLI globalmente.
3.  **Bash**: Nativo no Linux e macOS. No Windows, utilize o **WSL2**.

## Instalação Global (NPM)

Instale a ferramenta oficial diretamente do registro do NPM:
```bash
npm install -g ai-jail-sandbox
```
*Ou usando pnpm:*
```bash
pnpm add -g ai-jail-sandbox
```

## Como Usar

Execute o `ai-jail-sandbox` de dentro de qualquer diretório de projeto:

### 1. Iniciar o Agente de IA (Modo Padrão)
```bash
ai-jail-sandbox
```

### 2. Passar uma Pergunta Direta
```bash
ai-jail-sandbox "Explique o código neste diretório"
```

### 3. Modo Lockdown (Segurança Máxima)
Para rodar a IA sem qualquer acesso à rede externa:
```bash
ai-jail-sandbox --lockdown
```

## Arquitetura de Segurança

| Recurso | Proteção |
| :--- | :--- |
| **Arquivos** | Apenas o diretório atual é montado em `/workspace` |
| **Rede** | Bloqueio total via `--network none` (com a flag `--lockdown`) |
| **Sistema** | Isolamento completo via Docker (o agente não vê o seu `/home` ou `/tmp`) |
| **Variáveis** | Isolamento total; chaves do host não vazam para o container |
| **Visual** | Suporte a 256 cores e True Color (24-bit) habilitado |

---
Inspirado por [ai-jail de Fabio Akita (AkitaOnRails)](https://github.com/akitaonrails/ai-jail).
