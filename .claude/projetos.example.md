---
version: 1
---

# Projetos registrados — agent-itau (template de exemplo)

> Este é o **template versionado**. Na primeira vez que você registrar um projeto
> pela aba **Projetos** do dashboard, o arquivo `projetos.md` é criado e passa a
> ser a fonte real — este exemplo deixa de ser lido.
>
> Você também pode começar manualmente:
> `cp .claude/projetos.example.md .claude/projetos.md` e ajustar os caminhos.
>
> Os caminhos podem usar `~/` (expandido para o seu home), então funcionam em
> qualquer máquina sem editar usuário fixo.

## meu-projeto-exemplo

- **nome**: Meu projeto (exemplo)
- **caminho**: `~/projetos/meu-projeto`
- **descricao**: Substitua pelo caminho real de um projeto seu. É aqui que os agentes vão editar código.
- **stack**: Next.js, TypeScript
- **ativo**: false
- **criado_em**: 2026-01-01T00:00:00.000Z

## Como os agentes usam

Quando o `dev-tech-lead` precisa criar worktrees, ele consulta este arquivo para localizar
o projeto-alvo via `caminho`. O caminho pode usar `~/` (será expandido para o home).
