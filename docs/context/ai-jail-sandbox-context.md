# Contexto do Projeto: Evolução do AI-Jail Sandbox

**Data:** 12 de Março, 2026
**Objetivo:** Criar uma sandbox segura para agentes de IA usando Docker e TypeScript.

## 1. Evolução Técnica

O projeto evoluiu do repositório inicial em Bash para o pacote NPM oficial **`ai-jail-sandbox`** estruturado em TypeScript.

### Transição:
- **Fase 1 (Bash):** Scripts simples que chamavam o Docker com volumes montados.
- **Fase 2 (Segurança):** Implementação da flag `--lockdown` e isolamento de variáveis de ambiente.
- **Fase 3 (NPM/TypeScript):** Migração total para Node.js, permitindo instalação global e testes automatizados com Vitest.
- **Fase 4 (Performance):** Inclusão do Gemini CLI dentro da imagem Docker para execução instantânea.
- **Fase 5 (Publicação):** Publicação oficial no registro do NPM sob o nome `ai-jail-sandbox`.

## 2. Arquitetura de Segurança (Sandbox)

A segurança é baseada no isolamento de containers Docker:

- **Isolamento de Arquivos:** Apenas o diretório atual (`process.cwd()`) é montado no container em `/workspace`. O container não enxerga o `/home`, `/tmp` ou qualquer outra pasta do host.
- **Isolamento de Rede:** A flag `--lockdown` ativa o modo `--network none` no Docker, impedindo qualquer exfiltração de dados ou acesso externo pela IA.
- **Isolamento de Ambiente:** Nenhuma variável de ambiente do host (como chaves de API) é passada para o container por padrão.
- **Isolamento de Usuário:** O container roda em um ambiente Node.js limpo e descartável (`--rm`).
- **Suporte Visual:** Repasse das variáveis `TERM` e `COLORTERM` para habilitar suporte a 256 cores e True Color (24-bit).

## 3. Validação (TDD)

O projeto é validado através de testes rigorosos em `tests/cli.test.ts`:
1. **Rede:** Verificação de que o acesso falha sob `--lockdown`.
2. **Variáveis:** Confirmação de que segredos do host não são visíveis.
3. **Arquivos:** Teste real tentando ler um arquivo secreto no `/tmp` do host a partir do container.

## 4. Como Manter

- **Build:** `pnpm run build` (gera os arquivos em `dist/`).
- **Testes:** `pnpm run test` (valida a segurança).
- **Publicação:** `npm publish --access public` (enviar novas versões para o NPM).

---
*Este documento serve como registro histórico e técnico do estado atual do projeto.*
