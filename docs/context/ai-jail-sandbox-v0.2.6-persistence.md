# Contexto do Projeto: Persistência de API Key e UX (v0.2.6)

**Data:** 22 de Março, 2026
**Versão:** 0.2.6
**Foco:** Usabilidade, Persistência de Configuração e Debugging.

## 1. Melhoria na Experiência do Usuário (UX)

Nesta versão, focamos em reduzir o atrito do usuário ao iniciar o sandbox, especialmente no que diz respeito à autenticação com o Gemini.

### Implementações:
- **Persistência de API Key**: Agora, ao fornecer uma API Key via flag `--key` ou variável de ambiente, o sandbox a salva automaticamente no arquivo `~/.ai-jail-sandbox/config/gemini/settings.json`. Isso evita que o usuário precise fornecer a chave em todas as execuções.
- **Flag `--key`**: Adicionada flag explícita para facilitar a configuração inicial da chave de API.
- **Logging de Debug**: Implementado um sistema de logs em `logs/` para facilitar o diagnóstico de problemas durante a execução do Docker e do Gemini CLI. Ativado via flag `--debug`.
- **Prevenção de Crash**: O CLI agora pré-configura o diretório do workspace como "confiável" (trusted) no Gemini, evitando interrupções e pedidos manuais de confiança que travavam o terminal em versões anteriores.

## 2. Refinamento de Diagnóstico

- Adicionado repasse de variáveis `TERM` e `COLORTERM` para garantir suporte a cores no terminal dentro do container.
- Implementado sistema de logs rotativos e estruturados por data/hora para cada execução.

## 3. Validação Técnica Robusta

A bateria de testes agora conta com 11 casos, com destaque para:
- **Persistência de Chave**: Teste que valida se a chave fornecida na primeira execução é corretamente utilizada em uma segunda execução sem parâmetros.
- **Isolamento de Autenticação**: Teste que garante que o sistema barra a execução caso nenhuma chave seja encontrada (em ambiente isolado).

---
*Este marco solidifica o ai-jail-sandbox como uma ferramenta prática e de baixa fricção para o desenvolvedor.*
