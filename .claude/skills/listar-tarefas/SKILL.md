---
name: "listar-tarefas"
description: "Lista todas as tarefas do agent-itau com seu status (pendente / em execução / concluída)"
user_invocable: true
---

# /listar-tarefas

Lista todas as tarefas registradas em `tarefas/`, com status calculado a partir dos artefatos:

- **pendente**: tarefa existe mas nao tem `.workflow/tasks/TASK-XXX/`
- **em execução**: existe `.workflow/tasks/TASK-XXX/` mas nao tem PDF em `relatorios/`
- **concluída**: existe PDF em `relatorios/TASK-XXX.pdf`

## Uso

```
/listar-tarefas                       # Todas
/listar-tarefas --pendentes           # Apenas pendentes
/listar-tarefas --em-execução         # Apenas em execução
/listar-tarefas --concluídas          # Apenas concluídas
```

## Instrucoes para o Claude

1. **Listar arquivos de tarefa**:
   ```bash
   ls $CLAUDE_PROJECT_DIR/tarefas/ | grep -E "^TASK-[0-9]+\.md$" | sort
   ```

2. Para cada tarefa, calcular status:
   ```bash
   TASK_ID=$(basename "$arq" .md)
   if [ -f "$CLAUDE_PROJECT_DIR/relatorios/$TASK_ID.pdf" ]; then
     STATUS="concluída"
   elif [ -d "$CLAUDE_PROJECT_DIR/.workflow/tasks/$TASK_ID" ]; then
     STATUS="em-execução"
   else
     STATUS="pendente"
   fi
   ```

3. Ler frontmatter de cada tarefa para extrair:
   - `titulo`
   - `tipo`
   - `projetos`
   - `criado_em`

4. **Filtrar** pelo flag passado (`--pendentes`, etc..)

5. **Apresentar tabela**:

```
| ID       | Titulo                              | Tipo    | Status        | Criada em  |
|----------|-------------------------------------|---------|---------------|------------|
| TASK-001 | Transferência PIX agendada          | feature | concluída     | 2026-05-21 |
| TASK-002 | Refatorar autenticacao              | refactor| em execução   | 2026-05-21 |
| TASK-003 | Fix bug calculo juros               | bug-fix | pendente      | 2026-05-22 |

Total: 3 tarefas (1 concluída, 1 em execução, 1 pendente)

Acoes:
  Para executar uma pendente:   /tarefa TASK-XXX
  Para ver o PDF de concluída:  open relatorios/TASK-XXX.pdf
  Para criar nova:              /nova-tarefa
```

## Regras

1. Status e **calculado pelos artefatos**, nao por flag no frontmatter.
2. Se a pasta `tarefas/` estiver vazia, sugerir `/nova-tarefa`.
3. Ordenar por ID crescente.
