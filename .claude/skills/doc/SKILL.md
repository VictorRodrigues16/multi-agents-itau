---
name: "doc"
description: "Gera o relatório PDF Itaú de uma tarefa já executada"
user_invocable: true
---

# /doc

Aciona apenas o agente `doc-especialista` para gerar (ou re-gerar) o PDF de uma tarefa já executada.

Útil para:
- Regenerar PDF após ajustes manuais nos artefatos
- Visualizar PDF sem precisar rodar a tarefa inteira
- Testar mudancas no template do PDF

## Uso

```
/doc TASK-XXX
```

## Instrucoes para o Claude

1. **Validar pré-requisitos**:
   - Verificar que `$CLAUDE_PROJECT_DIR/.workflow/tasks/TASK-XXX/` existe
   - Verificar que pelo menos `dev-summary.md` ou `testes/summary.md` existe
   - Se nao houver artefatos suficientes, avisar o usuario

2. **Verificar dependencias**:
   ```bash
   node -e "require('puppeteer'); console.log('ok')" 2>&1
   ```
   Se falhar, sugira `bash $CLAUDE_PROJECT_DIR/scripts/init.sh`.

3. **Acionar o agente**:

```
Agent(
  description: "[doc-especialista] $TASK_ID — gerar PDF",
  prompt: "Leia $CLAUDE_PROJECT_DIR/.claude/agents/doc-especialista.md.
           TASK_ID: $TASK_ID
           Compile os artefatos de $CLAUDE_PROJECT_DIR/.workflow/tasks/$TASK_ID/
           e gere o PDF em $CLAUDE_PROJECT_DIR/relatorios/$TASK_ID.pdf.
           Se algum artefato faltar, registre na secao correspondente como 'nao disponível'.",
  model: opus
)
```

4. **Validar saída**:
   ```bash
   ls -lh $CLAUDE_PROJECT_DIR/relatorios/$TASK_ID.pdf
   ```

5. **Apresentar ao usuario**:

```
Relatório gerado:
  Arquivo: relatorios/$TASK_ID.pdf
  Tamanho: {X} KB
  Caminho absoluto: /Users/.../$TASK_ID.pdf

Para abrir:
  open relatorios/$TASK_ID.pdf
```

## Regras

1. Nao precisa de aprovacao do usuario para gerar (e idempotente).
2. Se o PDF já existir, **sobrescreve**.
3. Mantem o HTML intermediario em `relatorios/.tmp/$TASK_ID.html` para debug.
