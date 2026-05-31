# Commits e PRs — agent-itau

## Conventional Commits

Formato: `<type>(<scope>): <descricao>`

### Types permitidos

`feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`

### Regras

- Scope: nome do módulo (auth, transferência, dashboard, etc..)
- Descricao: imperativo, em portugues brasileiro
- Máximo 72 caracteres na primeira linha
- Body opcional para explicar o "por que" (nao "o que")

## PROIBIDO (regra inviolavel)

- **NUNCA** incluir `Co-authored-by`
- **NUNCA** incluir `Signed-off-by`
- **NUNCA** mencionar IA, Claude, Copilot ou qualquer assistente
- **NUNCA** fazer push direto para main/master
- **NUNCA** commitar arquivos `.env*` com credenciais

## Branch naming

- `feature/descricao-curta`
- `fix/descricao-curta`
- `hotfix/descricao-curta`
- Branch base: padrão do repo (override em `.claude/integracoes/git.md`)

## PRs

- Titulo curto (< 70 caracteres) seguindo conventional commits
- Descricao com:
  - **Resumo** (1-3 bullets)
  - **Tipo** (feat / fix / refactor / etc..)
  - **Tarefa relacionada** (referencia ao TASK-XXX)
  - **Como testar** (passos)
  - **Checklist** (testes / lint / types)
- Sem mensoes a IA

## Atomicidade

- 1 commit por subtarefa
- Commits revertiveis (cada um deve deixar o codigo em estado funcional)
- Nao commitar codigo comentado
- Nao commitar `console.log` ou `debugger`
