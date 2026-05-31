---
name: "quality-gate"
description: "Roda apenas a esteira de qualidade (sem desenvolvimento) sobre arquivos modificados"
user_invocable: true
---

# /quality-gate

Roda **apenas** o Quality Gate (format + lint + types + analise complementar) sobre os arquivos atualmente modificados no projeto.

Útil para validar codigo sem executar o pipeline completo.

## Uso

```
/quality-gate                     # Quality gate sobre git diff
/quality-gate TASK-XXX            # Quality gate sobre os arquivos da tarefa
```

## Instrucoes para o Claude

### Modo 1 — Sem TASK-ID

1. Detectar o projeto-alvo (cwd ou caminho informado)
2. Listar arquivos modificados:
   ```bash
   git -C $PROJ diff --name-only HEAD
   ```
3. Salvar lista em `/tmp/quality-gate-files.txt`
4. Acionar o agente:

```
Agent(
  description: "[teste-quality-gate] /quality-gate ad-hoc",
  prompt: "Leia ~/dsg/agent-itau/.claude/agents/teste-quality-gate.md.
           Arquivos modificados: ler /tmp/quality-gate-files.txt
           Salve resultado em /tmp/quality-gate-result.md",
  model: sonnet
)
```

5. Apresentar o resultado ao usuario com:
   - Score
   - Veredicto (PASS / WARN / FAIL)
   - Issues encontradas (so as bloqueantes e importantes na síntese; sugestoes no anexo)

### Modo 2 — Com TASK-ID

1. Ler `~/dsg/agent-itau/.workflow/tasks/TASK-XXX/files-changed.txt`
2. Acionar o agente com esses arquivos
3. Salvar resultado em `~/dsg/agent-itau/.workflow/tasks/TASK-XXX/testes/quality-gate.md` (sobrescreve)
4. Apresentar resultado

## Regras

1. Nao chama outros agentes alem do `teste-quality-gate`.
2. Nao altera codigo — apenas reporta.
3. Se nao houver arquivos modificados, avisar o usuario.
