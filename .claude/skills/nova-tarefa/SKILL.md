---
name: "nova-tarefa"
description: "Cria uma nova tarefa no agent-itau (gera TASK-XXX.md em tarefas/)"
user_invocable: true
---

# /nova-tarefa

Cria uma nova tarefa, gerando o arquivo `tarefas/TASK-XXX.md` com a estrutura padrão.

## Uso

```
/nova-tarefa "Titulo curto da tarefa"
/nova-tarefa                          # Modo interativo (pergunta detalhes)
```

## Instrucoes para o Claude

### Modo 1 — Titulo fornecido

Se o usuario passou um titulo:

1. **Descobrir o próximo TASK-ID**:
   ```bash
   ls ~/dsg/agent-itau/tarefas/ | grep -E "^TASK-[0-9]+\.md$" | sed 's/TASK-\([0-9]*\)\.md/\1/' | sort -n | tail -1
   ```
   Some 1 ao maior número encontrado. Se nao houver tarefas, comece em `001`. Formato com 3 digitos (`TASK-001`, `TASK-002`, ...).

2. **Perguntar ao usuario** (use AskUserQuestion):
   - Tipo: feature / bug-fix / refactor / docs / hotfix / spike
   - Projeto-alvo: caminho ou nome do repo
   - Descricao detalhada (jornada do cliente, refinamento)
   - Criterios de aceite

3. **Gerar arquivo** `tarefas/TASK-XXX.md`:

```markdown
---
id: TASK-XXX
titulo: "{titulo curto}"
tipo: feature | bug-fix | refactor | docs | hotfix | spike
projetos: [{projeto-1}, {projeto-2}]
autor: "{nome do usuario, do .env.local SQUAD_USER_NAME}"
criado_em: YYYY-MM-DD
status: pendente
---

# {Titulo curto}

## Contexto / Jornada do cliente

{Texto livre descrevendo a jornada do cliente, o problema de negócio, ou o refinamento da tarefa.}

## Objetivo

{O que precisa estar diferente ao final.}

## Criterios de aceite

- [ ] {criterio 1}
- [ ] {criterio 2}
- [ ] {criterio 3}

## Restrições / Dependencias

- {dependencia 1, se houver}

## Notas

{Tudo mais que seja relevante: links de design, conversas com PM, etc..}
```

4. **Confirmar** ao usuario:

```
Tarefa criada:
  ID: TASK-XXX
  Arquivo: tarefas/TASK-XXX.md

Para executar:
  /tarefa TASK-XXX
```

### Modo 2 — Sem titulo (interativo)

Pergunte ao usuario o titulo curto. Em seguida siga o Modo 1.

## Regras

1. Sempre usar **3 digitos** no ID (`TASK-001`, nao `TASK-1`).
2. **Nao sobrescrever** tarefas existentes. Se já existe `TASK-XXX.md`, peca outro nome.
3. Use `~/dsg/agent-itau/tarefas/` como diretório.
4. Frontmatter sempre presente, mesmo com campos vazios marcados como `null` ou `""`.
5. Use AskUserQuestion para coletar os dados — nao invente.
