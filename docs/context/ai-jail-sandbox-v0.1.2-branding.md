# Contexto do Projeto: Branding e Status Experimental (v0.1.2)

**Data:** 12 de Março, 2026
**Mudança Principal:** Alinhamento do nome do comando CLI com o nome do pacote NPM (`ai-jail-sandbox`).

## 1. Decisões de Branding

Para evitar confusão e garantir consistência na experiência do usuário, o comando CLI foi renomeado de `ai-jail` para **`ai-jail-sandbox`**.

### Motivação:
- **Consistência**: O comando agora corresponde exatamente ao nome do pacote no NPM.
- **Identidade Única**: O sufixo `-sandbox` reforça a proposta de valor do projeto (isolamento).

## 2. Status do Projeto

O projeto foi oficialmente marcado como **EXPERIMENTAL** e em fase de testes.
- **Transparência**: Alerta o usuário de que a ferramenta ainda está em evolução.
- **Segurança**: Reforça a necessidade de auditoria antes de uso em cenários críticos.

## 3. Impacto Técnico

- O arquivo `package.json` foi atualizado na seção `bin`.
- Toda a documentação (`README.md`) foi revisada para refletir o novo comando.
- Os testes futuros deverão utilizar o novo comando `ai-jail-sandbox`.

---
*Este registro marca a transição de um rascunho de ferramenta para um produto em fase oficial de testes.*
