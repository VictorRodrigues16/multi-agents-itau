---
name: "tarefa"
description: "Executa uma tarefa do agent-itau via pipeline completo de agentes (orquestrador -> devs -> testes -> doc)"
user_invocable: true
---

# /tarefa

Entrypoint principal do agent-itau. Recebe um TASK-ID e dispara o pipeline completo de agentes:

```
Orquestrador -> Dev Tech Lead -> Devs (paralelo + review sorteio) -> Teste Tech Lead -> Doc
```

## Uso

```
/tarefa                                # Lista tarefas pendentes
/tarefa TASK-001                       # Executa uma tarefa
/tarefa TASK-001 "contexto extra"      # Executa com contexto adicional
```

## Instrucoes para o Claude

### Modo lista (sem argumento)

Se nenhum TASK-ID for fornecido:
1. Liste arquivos em `$CLAUDE_PROJECT_DIR/tarefas/`
2. Para cada `TASK-XXX.md`, leia o frontmatter (se houver) e a primeira linha
3. Verifique se ha relatório em `$CLAUDE_PROJECT_DIR/relatorios/TASK-XXX.pdf`
4. Exiba tabela:

```
| ID       | Titulo                              | Status      |
|----------|-------------------------------------|-------------|
| TASK-001 | Transferência PIX agendada          | concluída   |
| TASK-002 | Refatorar autenticacao              | pendente    |
```

### Modo execução (com TASK-ID)

**REGRA CRITICA:** Você e o Orquestrador desta sessao. NAO acione o agente `orquestrador` como subagente — você roda na sessao principal e dispara os outros agentes (`dev-tech-lead`, `teste-tech-lead`, `doc-especialista`) via Agent tool.

#### FASE 0 — Setup

1. Verifique se `tarefas/TASK-XXX.md` existe. Se nao, peca ao usuario para criar via `/nova-tarefa`.
2. Verifique se existe `$CLAUDE_PROJECT_DIR/.workflow/tasks/TASK-XXX/`. Crie se necessário.
3. Defina `TASK_ID=TASK-XXX` como variável da sessao.
4. Emita evento de início:

```bash
$CLAUDE_PROJECT_DIR/scripts/emit-event.sh spawning orquestrador "$TASK_ID" "Iniciando tarefa"
```

5. Leia `$CLAUDE_PROJECT_DIR/CLAUDE.md` para garantir que tem as regras carregadas.

#### FASE 1 — Analise (você, como Orquestrador)

Leia `$CLAUDE_PROJECT_DIR/.claude/agents/orquestrador.md` e siga a FASE 1 dele:

1. Ler `tarefas/TASK-XXX.md`
2. Classificar (tipo / complexidade / risco)
3. Identificar projetos afetados
4. Decidir número de devs (1 a 5)
5. **Apresentar plano ao usuario e aguardar aprovacao**

Salve o plano em `$CLAUDE_PROJECT_DIR/.workflow/tasks/TASK-XXX/plano.md`.

#### FASE 2 — Desenvolvimento

Após aprovacao, acione o Dev Tech Lead:

```
Agent(
  description: "[dev-tech-lead] $TASK_ID — coordenar implementação",
  prompt: "Leia $CLAUDE_PROJECT_DIR/.claude/agents/dev-tech-lead.md e execute.
           TASK_ID: $TASK_ID
           Número de devs: $N
           Projetos afetados: $PROJ
           Plano: ver $CLAUDE_PROJECT_DIR/.workflow/tasks/$TASK_ID/plano.md
           Tarefa original: ver tarefas/$TASK_ID.md
           Salve seu sumário em .workflow/tasks/$TASK_ID/dev-summary.md",
  model: opus
)
```

Após retorno, leia `.workflow/tasks/$TASK_ID/dev-summary.md`. Se houver bloqueios, escale ao usuario.

#### FASE 3 — Esteira de testes

```
Agent(
  description: "[teste-tech-lead] $TASK_ID — esteira de testes",
  prompt: "Leia $CLAUDE_PROJECT_DIR/.claude/agents/teste-tech-lead.md e execute.
           TASK_ID: $TASK_ID
           Arquivos modificados: ver .workflow/tasks/$TASK_ID/files-changed.txt
           Tipo da tarefa: $TIPO
           Salve summary em .workflow/tasks/$TASK_ID/testes/summary.md",
  model: opus
)
```

Após retorno, leia o summary. Se houver FAIL bloqueante:
- Apresentar ao usuario
- Se usuario aprovar correcao: voltar ao Dev Tech Lead (max 2 ciclos)
- Se usuario decidir seguir: registrar em waivers.md

#### FASE 4 — Documentação (PDF)

```
Agent(
  description: "[doc-especialista] $TASK_ID — gerar relatório PDF",
  prompt: "Leia $CLAUDE_PROJECT_DIR/.claude/agents/doc-especialista.md e execute.
           TASK_ID: $TASK_ID
           Compile todos os artefatos em .workflow/tasks/$TASK_ID/ e gere o PDF em relatorios/$TASK_ID.pdf",
  model: opus
)
```

#### FASE 5 — Finalizacao

1. Verifique que `relatorios/$TASK_ID.pdf` existe
2. Emita evento de conclusão:
```bash
$CLAUDE_PROJECT_DIR/scripts/emit-event.sh stopped orquestrador "$TASK_ID" success "Pipeline concluído"
```
3. Apresente ao usuario:

```markdown
# $TASK_ID concluída

## Veredicto: PASS | FAIL

## Resumo
{1-2 paragrafos resumindo o que foi feito}

## Esteira
| Fase | Status | Detalhes |
|------|--------|----------|
| Desenvolvimento | OK | $N subtarefas |
| Quality Gate | $S/100 | $detalhes |
| Cobertura | $S/100 | $detalhes |
| Segurança | $S/100 | $detalhes |

## Relatório completo
PDF: `relatorios/$TASK_ID.pdf`

## Proximos passos sugeridos
- Revisar PDF
- Abrir PR (use `gh pr create` ou o fluxo do seu repo)
- Atualizar quadro Kanban (se configurado em .claude/integracoes/)
```

## Regras

1. **Pedir aprovacao do plano antes de codificar.**
2. **Pedir confirmacao antes de cada commit** (regra de memória do usuario).
3. **Sempre emitir eventos** via `emit-event.sh` para o dashboard.
4. **Máximo 2 ciclos de correcao** por fase. Na 3a, escalar.
5. **NUNCA fazer push** — push e responsabilidade humana.
6. Se a tarefa for XL (>8h estimadas), sugerir split antes de prosseguir.
