# AI-Jail Sandbox: Sandbox Segura para o Gemini CLI

> ⚠️ **ATENÇÃO: Este produto é EXPERIMENTAL e está em fase de testes.** O uso em ambientes críticos não é recomendado sem a devida auditoria.

**AI-Jail Sandbox** é uma ferramenta CLI profissional para executar o agente de IA Gemini em um ambiente Docker isolado, protegendo seu sistema host de comandos inseguros, consumo excessivo de recursos e vazamento de dados.

---

## 🚀 Instalação por Sistema Operacional

### 🐧 Linux (Nativo)
O suporte é nativo e recomendado para máxima performance.
**Pré-requisitos:**
*   **Docker**: Serviço rodando e usuário no grupo `docker`.
*   **Node.js**: v18+.
**Como instalar:**
```bash
npm install -g ai-jail-sandbox
# ou usando pnpm
pnpm add -g ai-jail-sandbox
```

### 🪟 Windows (via WSL2)
O uso no Windows é suportado **exclusivamente através do WSL2**.
**Pré-requisitos:**
1.  **WSL2**: Instale o WSL2 e uma distro (ex: Ubuntu) da Microsoft Store.
2.  **Docker Desktop**: Instale e ative a integração com o WSL2.
**Como instalar:**
Abra o terminal do Ubuntu e rode:
```bash
npm install -g ai-jail-sandbox
```

### 🍎 macOS
Suporte via Docker Desktop ou OrbStack.
**Pré-requisitos:**
*   **Docker**: Binário `docker` acessível no terminal.
*   **Node.js**: Instalado via Homebrew ou oficial.
**Como instalar:**
```bash
npm install -g ai-jail-sandbox
```

---

## 🛠️ Como Usar

### 1. Iniciar o Agente de IA (Modo Padrão)
Execute para abrir o terminal interativo do Gemini:
```bash
ai-jail-sandbox
```
> **Dica:** Na primeira execução, use `--key SUA_CHAVE` para salvar sua API Key e não precisar digitá-la novamente.

### 2. Fornecer ou Atualizar API Key
Você pode passar a chave diretamente via argumento ou variável de ambiente. A chave será persistida para usos futuros:
```bash
ai-jail-sandbox --key SUA_CHAVE_AQUI
```

### 3. Passar um Comando ou Pergunta Direta
Envie prompts diretamente sem entrar no modo interativo:
```bash
ai-jail-sandbox "Explique a lógica deste diretório"
```

### 4. Modo Lockdown (Segurança Máxima)
Desativa totalmente o acesso à internet dentro do container:
```bash
ai-jail-sandbox --lockdown
```

### 5. Modo Somente-Leitura (Consulta Segura)
Garante que a IA **não possa alterar nenhum arquivo** no seu projeto:
```bash
ai-jail-sandbox --read-only
```

---

## 🛡️ Arquitetura de Segurança e Qualidade

| Camada de Valor | Recurso Protegido | Mecanismo de Proteção |
| :--- | :--- | :--- |
| **Isolamento de Arquivos** | Sistema Host | Apenas o diretório atual é montado; o agente não vê `/home` ou `/tmp` do host. |
| **Proteção de Segredos** | Chaves e Envs | Mascaramento automático via padrões fixos (`.env*`, `.ssh`, `.git`) e integração com seu `.gitignore` local. |
| **Integridade de Dados** | Código Fonte | Bloqueio total de modificações opcional via flag `--read-only`. |
| **Privacidade Total** | Exfiltração de Dados | Bloqueio de rede externa via flag `--lockdown` (`--network none`). |
| **Disponibilidade** | Estabilidade do Host | Limites de hardware (2 CPUs, 2GB RAM) para evitar travamentos do computador. |
| **Isolamento de Ambiente** | Dados do Sistema | Nenhuma variável de ambiente do host vaza para o container. |
| **Performance** | Produtividade | Cache persistente do NPM em `~/.ai-jail-sandbox/cache` para execuções rápidas. |
| **Qualidade Visual** | Experiência de Uso | Suporte nativo a 256 cores e True Color (24-bit). |

> Para desativar a proteção de segredos: `--allow-secrets`
> Para remover limites de hardware: `--unlimited`

---
Inspirado por [ai-jail de Fabio Akita (AkitaOnRails)](https://github.com/akitaonrails/ai-jail).
