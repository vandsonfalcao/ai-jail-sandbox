# AI-Jail: Sandbox Segura para o Gemini CLI

**AI-Jail** é uma biblioteca NPM para executar o agente de IA Gemini em um ambiente Docker isolado, protegendo seu sistema host de comandos inseguros e vazamento de dados.

## Pré-requisitos

Para rodar o **AI-Jail**, você precisa apenas de:

1.  **Docker**: O motor que cria o ambiente isolado. Certifique-se de que o serviço está rodando e que seu usuário tem permissão para executar comandos `docker` sem `sudo`.
2.  **Node.js**: Para rodar o CLI globalmente.
3.  **Bash**: Nativo no Linux e macOS. No Windows, utilize o **WSL2**.
4.  **Conexão com a Internet**: Necessária apenas na primeira execução para baixar a imagem base e o agente de IA.

## Instalação (Local)

Para testar ou desenvolver localmente:
```bash
pnpm install
pnpm run build
pnpm link --global
```

## Como Usar

Execute o `ai-jail` de dentro de qualquer diretório de projeto:

### 1. Iniciar o Agente de IA (Modo Padrão)
No diretório do seu projeto, execute:
```bash
ai-jail
```

### 2. Passar um Comando ou Pergunta Direta
```bash
ai-jail "Explique o código neste diretório"
```

### 3. Modo Lockdown (Segurança Máxima)
Para rodar a IA sem qualquer acesso à rede externa:
```bash
ai-jail --lockdown
```

## Arquitetura de Segurança

| Recurso | Proteção |
| :--- | :--- |
| **Arquivos** | Apenas o diretório atual é montado em `/workspace` |
| **Rede** | Bloqueio total via `--network none` (com a flag `--lockdown`) |
| **Sistema** | Isolamento completo via Docker (o agente não vê o seu `/home` ou `/tmp`) |
| **Variáveis de Ambiente** | Isolamento total; chaves do host não vazam para o container |

## Como Funciona

O `ai-jail` utiliza o Docker para criar um ambiente Node.js limpo e isolado. Ele monta o seu diretório atual dentro de um volume seguro no container e executa o `npx @google/gemini-cli` por baixo do pano, garantindo que a IA sempre utilize a versão mais recente e segura.

## Executando Testes

Para verificar a integridade da segurança:
```bash
pnpm run test
```

---
Inspirado por [ai-jail de Fabio Akita (AkitaOnRails)](https://github.com/akitaonrails/ai-jail).
