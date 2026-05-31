# Fluxo Completo — agent-itau

Este documento descreve o fluxo completo de execução de uma tarefa no agent-itau, do recebimento ao PDF final.

## Visao geral

```
HUMANO       AGENTES                                            ARTEFATOS
-----------  ----------------------------------------------     ------------------------
escreve  --> tarefas/TASK-XXX.md
TASK         |
             v
/tarefa  --> Orquestrador
             | classifica e propoe plano
             | <-- humano APROVA
             |
             v
             Dev Tech Lead
             | quebra em N subtarefas
             | cria N worktrees
             v
             5 Devs em paralelo  ----------------------------> dev-N-result.md
             |
             v
             Sorteio de revisores (script)                      reviews-map.json
             |
             v
             N x 2 reviews em paralelo  -----------------------> review-devX-de-devY.md
             |
             v
             Dev Tech Lead consolida e devolve                  dev-summary.md
             |
             v
             Orquestrador le e segue
             |
             v
             Teste Tech Lead
             |
             v
             4 frentes em paralelo:                             testes/quality-gate.md
             - Quality Gate                                     testes/cobertura.md
             - Cobertura (gera testes)                          testes/segurança.md
             - Segurança                                        testes/performance.md
             - Performance (opcional)
             |
             v
             Teste Tech Lead consolida                          testes/summary.md
             |
             v
             Orquestrador le veredito                           (escalona se FAIL)
             |
             v
             Doc Especialista
             | le todos os artefatos
             | monta JSON estruturado                           relatorio-dados.json
             | chama gerador HTML+PDF
             v
             PDF Itaú                                           relatorios/TASK-XXX.pdf
```

## Fases detalhadas

### Fase 0 — Cadastro da tarefa

Usuario executa:
```
/nova-tarefa "Implementar fluxo de transferência PIX agendada"
```

A skill faz perguntas (tipo, projetos, criterios) e gera `tarefas/TASK-XXX.md`.

### Fase 1 — Analise e plano

Usuario executa:
```
/tarefa TASK-XXX
```

O **Orquestrador** (você, na sessao principal):
1. Le `tarefas/TASK-XXX.md`
2. Classifica: tipo / complexidade / risco
3. Identifica projetos-alvo
4. Decide quantos devs usar (1 a 5)
5. **Apresenta plano** ao humano em formato estruturado
6. **Aguarda aprovacao**

Output: `.workflow/tasks/TASK-XXX/plano.md`

### Fase 2 — Desenvolvimento

Após aprovacao, o Orquestrador aciona o **Dev Tech Lead** via Agent tool.

O Dev Tech Lead:
1. Refina subtarefas (1 por dev)
2. Cria worktrees:
   ```bash
   git worktree add ../{projeto}-dev1 -b feature/TASK-XXX-st001
   ```
3. Dispara 1 a 5 devs **em paralelo** (`run_in_background: true`)
4. Cada dev:
   - Implementa em seu worktree
   - Escreve testes
   - Valida localmente (tsc, eslint, vitest/jest)
   - Faz commit local
   - Salva resultado em `dev-N-result.md`

### Fase 3 — Review cruzado por sorteio

Ao concluir, o Dev Tech Lead:
1. Lista devs que participaram
2. Para cada dev, sorteia 2 revisores:
   ```bash
   scripts/sortear-revisores.sh dev-1 "dev-2,dev-3,dev-4,dev-5"
   # -> "dev-3,dev-5"
   ```
3. Salva mapeamento em `reviews-map.json`
4. Dispara reviews em paralelo
5. Cada revisor:
   - Le o diff do colega
   - Aplica checklist (regras de TS, padrões, edge cases, segurança, etc..)
   - Salva em `review-devX-de-devY.md` com veredicto e issues

O Tech Lead consolida. Se houver issues **bloqueantes**, devolve ao dev original (max 2 ciclos).

### Fase 4 — Merge e sumário

Após todos aprovados:
1. Merge das branches dos devs na branch consolidada `feature/TASK-XXX`
2. Resolve conflitos simples (escala complexos)
3. Limpa worktrees
4. Escreve `dev-summary.md` com tudo
5. Devolve ao Orquestrador

### Fase 5 — Esteira de testes

O Orquestrador aciona o **Teste Tech Lead**, que dispara **4 frentes em paralelo**:

| Frente | O que faz |
|--------|-----------|
| Quality Gate | Prettier + ESLint + TypeScript + analise complementar |
| Cobertura | Audita testes existentes, gera testes faltantes, executa |
| Segurança | OWASP top 10, npm audit, secrets, padrões inseguros |
| Performance | (opcional) bundle size, N+1, loops pesados, memory leaks |

Cada frente devolve um **score 0-100** e um veredito (PASS / WARN / FAIL).

O Teste Tech Lead consolida em `testes/summary.md` com a **nota global Itaú** (media ponderada).

### Fase 6 — Decisão do Orquestrador

- **PASS** -> avanca pra documentação
- **WARN** -> avanca, mas registra avisos
- **FAIL** -> escala ao humano com lista de correcoes (max 2 ciclos de volta ao dev)

### Fase 7 — Documentação (PDF)

O Orquestrador aciona o **Doc Especialista**, que:

1. Le TODOS os artefatos:
   - `tarefas/TASK-XXX.md`
   - `.workflow/tasks/TASK-XXX/*` (plano, subtarefas, dev-summary, reviews, testes)
   - `~/.claude/agent-events-itau.jsonl` (timeline)
2. Compila em `relatorio-dados.json` com estrutura padronizada
3. Chama:
   ```bash
   node scripts/gerar-relatorio-pdf.js \
     --dados .workflow/tasks/TASK-XXX/relatorio-dados.json \
     --saída relatorios/TASK-XXX.pdf
   ```
4. Verifica que o PDF foi gerado
5. Devolve caminho ao Orquestrador

### Fase 8 — Apresentacao final

O Orquestrador apresenta ao humano:
- Resumo executivo
- Tabela com a esteira
- Caminho do PDF
- Proximos passos sugeridos (abrir PR, etc..)

## Pontos de aprovacao do humano

| Momento | O que aprovar |
|---------|---------------|
| Após Fase 1 | Plano de execução |
| Antes de cada commit | Mensagem e arquivos staged |
| Após Fase 5 (se FAIL) | Decisão de re-executar dev ou seguir com waiver |
| Antes de push (sempre) | Push e responsabilidade humana |

## Ciclos de correcao

Limite **2 ciclos por fase**. Na 3a, o Orquestrador escala ao humano:

```
"Após 2 ciclos, o problema persiste:
 - Dev-2 nao consegue resolver o conflito de tipo X
 - Quality gate continua FAIL em Y

Como prosseguir?
 1. Você assume o controle
 2. Pular a verificacao com waiver
 3. Cancelar a tarefa"
```

## Integrações externas

Por padrão, **nao ha integrações ativas**. O fluxo acima funciona inteiramente local.

Para ativar integrações (Jira, GitHub, Slack, SonarQube), crie o arquivo correspondente em `.claude/integracoes/`. Cada arquivo descreve em portugues como os agentes devem interagir. Veja `.claude/integracoes/README.md` para template.

## Eventos para o dashboard

Toda transicao importante emite um evento:

```bash
scripts/emit-event.sh spawning <agent-id> <task-id> "<descricao>"
# ...
scripts/emit-event.sh stopped <agent-id> <task-id> <success|error> "<resumo>"
```

Eventos gravados em `~/.claude/agent-events-itau.jsonl` e consumidos pelo dashboard via `/api/events`.

## Variáveis de ambiente importantes

| Variável | Default | Uso |
|----------|---------|-----|
| `AGENT_ITAU_ROOT` | `$HOME/dsg/agent-itau` | Raiz do projeto |
| `AGENT_ITAU_REPORTS` | `$AGENT_ITAU_ROOT/relatórios` | Saída dos PDFs |
| `AGENT_ITAU_EVENTS` | `$HOME/.claude/agent-events-itau.jsonl` | Arquivo de eventos |
| `SQUAD_USER_NAME` | "Time Itaú" | Autor nos relatórios |
| `PROJECTS_ROOT` | `$HOME/projetos` | Onde estao os repos a trabalhar |
