---
name: "review-cruzado"
description: "Executa apenas a fase de review cruzado por sorteio (entre devs já executados em uma tarefa)"
user_invocable: true
---

# /review-cruzado

Roda **apenas** o review cruzado por sorteio entre devs que já executaram subtarefas de uma tarefa.

Útil para re-executar reviews sem rodar o pipeline completo.

## Uso

```
/review-cruzado TASK-XXX
```

## Instrucoes para o Claude

### Pré-requisitos

A tarefa precisa ter passado pela fase de desenvolvimento (ou seja, ter `dev-N-result.md` em `.workflow/tasks/TASK-XXX/`).

Se nao houver resultados de devs, avise o usuario e sugira `/tarefa TASK-XXX`.

### Fluxo

1. **Identificar devs participantes**:
   ```bash
   ls $CLAUDE_PROJECT_DIR/.workflow/tasks/TASK-XXX/dev-*-result.md
   ```
   Extraia os IDs (dev-1, dev-2, ...).

2. **Sortear revisores** usando o script:
   ```bash
   for dev in $devs; do
     outros=$(echo "$devs" | grep -v "^$dev$" | paste -sd ',')
     revisores=$($CLAUDE_PROJECT_DIR/scripts/sortear-revisores.sh "$dev" "$outros")
     echo "$dev -> $revisores"
   done
   ```

3. **Salvar mapa** em `.workflow/tasks/TASK-XXX/reviews-map.json`

4. **Disparar reviews em paralelo**: para cada dev-N, lance os 2 revisores sorteados:

```
Agent(
  description: "[dev-especialista-{rev}] Review do dev-{revisado} ($TASK_ID)",
  prompt: "Leia $CLAUDE_PROJECT_DIR/.claude/agents/dev-especialista-{rev}.md.
           Modo: REVIEW.
           Revisar trabalho de: dev-{revisado}
           Worktree do revisado: ver .workflow/tasks/$TASK_ID/worktrees.json
           Subtarefa original: ver .workflow/tasks/$TASK_ID/subtarefas.md
           Salvar em .workflow/tasks/$TASK_ID/review-dev{rev}-de-dev{revisado}.md",
  model: sonnet,
  run_in_background: true
)
```

5. **Aguardar todos** os reviews concluirem.

6. **Consolidar** em `.workflow/tasks/$TASK_ID/review-consolidado.md`:

```markdown
# Review cruzado consolidado — TASK-XXX

## Sorteio
| Revisado | Revisor 1 | Revisor 2 |
|----------|-----------|-----------|
| dev-1 | dev-3 | dev-5 |
| ... | ... | ... |

## Resultados
| Revisado | Revisor 1 | Revisor 2 | Veredicto consolidado |
|----------|-----------|-----------|----------------------|
| dev-1 | APROVADO | APROVADO COM SUGESTOES | aprovado |
| dev-2 | DEVOLVER | APROVADO | revisar |

## Issues bloqueantes consolidadas
{lista, agrupada por arquivo}

## Recomendacao
- Devs aprovados: $X
- Devs a corrigir: $Y
- Acao sugerida: {seguir / corrigir / escalar}
```

7. **Apresentar resumo** ao usuario.

## Regras

1. Pode rodar varias vezes sobre a mesma tarefa (cada execução sortea revisores diferentes).
2. **Nao** altera codigo.
3. **Nao** chama outros agentes alem dos dev-especialistas.
4. Máximo 5 reviews em paralelo.
