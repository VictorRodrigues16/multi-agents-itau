# Arquitetura — agent-itau

## Componentes

```
+-----------------------------------------------------------------------+
|                              USUARIO                                   |
|  (dev, lider, PM no Claude Code CLI)                                   |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                         SKILLS (.claude/skills/)                       |
|  /tarefa  /nova-tarefa  /quality-gate  /review-cruzado  /doc          |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                       AGENTES (.claude/agents/)                        |
|                                                                        |
|  +----------+    +-------------+    +------------+    +-------------+ |
|  |Orquestra-|--->|Dev Tech Lead|--->|Teste Tech  |--->|Doc          | |
|  |dor       |    | + 5 devs    |    |Lead + 4    |    |Especialista | |
|  |          |    |             |    |frentes     |    |             | |
|  +----------+    +-------------+    +------------+    +-------------+ |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                      ARTEFATOS (.workflow/tasks/)                      |
|  plano, subtarefas, dev-N-result, reviews, testes/, summary, ...      |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|     SCRIPTS               |     DASHBOARD             |    RELATORIO   |
|  emit-event.sh            |  Next.js 16 + Tailwind 4  |  Puppeteer +   |
|  sortear-revisores.sh     |  paleta Itaú              |  HTML -> PDF   |
|  gerar-relatorio-pdf.js   |  polling /api/events      |                |
+-----------------------------------------------------------------------+
                                                              |
                                                              v
                                                        +----------+
                                                        |  PDF     |
                                                        |  ITAU    |
                                                        +----------+
```

## Camadas

### 1. Camada de entrada — Skills

Pontos de entrada do usuario (`.claude/skills/`):

| Skill | Aciona |
|-------|--------|
| `/tarefa TASK-XXX` | Pipeline completo |
| `/nova-tarefa` | Apenas criacao de arquivo de tarefa |
| `/quality-gate` | Apenas Quality Gate isolado |
| `/review-cruzado` | Apenas reviews (sobre tarefa já executada) |
| `/doc` | Apenas geracao de PDF |
| `/listar-tarefas` | Listagem com status |

Cada skill e um arquivo `SKILL.md` com instrucoes em portugues. O Claude le e segue.

### 2. Camada de orquestração — Agentes

Subagentes em `.claude/agents/`, lancados via `Agent` tool:

**Coordenacao**
- `orquestrador.md` — coordena tudo (mas roda na sessao principal, nao como subagente)

**Desenvolvimento (6 agentes)**
- `dev-tech-lead.md` — coordena devs e review cruzado
- `dev-especialista-1.md` ate `dev-especialista-5.md` — implementam em paralelo

**Testes (5 agentes)**
- `teste-tech-lead.md` — coordena esteira
- `teste-quality-gate.md` — formato + lint + types + smells
- `teste-cobertura.md` — gera e roda testes
- `teste-segurança.md` — OWASP + secrets + deps
- `teste-performance.md` — bundle + N+1 + leaks

**Documentação (1 agente)**
- `doc-especialista.md` — compila tudo e gera PDF

### 3. Camada de execução — Código

- **Worktrees** isolados (`git worktree add`) — cada dev tem seu proprio espaco
- **Sorteio aleatorio** de revisores via script bash
- **Eventos em JSONL** para dashboard

### 4. Camada de saída — Relatório

Gerador Node + Puppeteer:
1. Recebe JSON estruturado
2. Renderiza HTML com paleta Itaú (`brand/paleta.md`)
3. Embute logo SVG (`brand/itau-logo.svg`)
4. Converte HTML -> PDF A4 via Puppeteer headless
5. Salva em `relatorios/TASK-XXX.pdf`

## Decisões de arquitetura

### Por que sem time de arquitetura

O projeto-pai (squad-workflow-automation) tem um time de arquitetura com 5 agentes para tarefas complexas que exigem design upfront. No agent-itau:

- O fluxo do Itaú e mais ageis e o refinamento já vem do PM
- Tarefas de arquitetura sao raras o suficiente para nao justificar 5 agentes dedicados
- O Orquestrador + Dev Tech Lead conduzem decisões de design quando necessário
- Tarefas com risco arquitetural alto podem pedir aprovacao adicional no plano

### Por que sem time de infra

O projeto-pai tem 3 agentes de infra (git, contexto, relatório). No agent-itau:

- O Orquestrador faz scan de contexto sob demanda (cache simples em `.workflow/contexts/`)
- Git status/diff via Bash tool quando necessário
- Relatórios gerados pelo Doc Especialista (PDF) cobrem a necessidade

### Por que review por sorteio aleatorio (vs. circular fixo)

No projeto-pai, o review e circular: 1->2, 2->3, ..., 5->1. No agent-itau, sorteio aleatorio.

- **Vantagem do sorteio**: imprevisibilidade, evita viciosidade entre pares fixos
- **Vantagem do circular**: previsibilidade, mais fácil de auditar

A pedido da proposta original, optamos pelo **sorteio**: cada dev recebe 2 revisores aleatorios (distintos, nao o proprio).

### Por que integrações opt-in via .md

Reducao de complexidade. Por padrão, o sistema funciona inteiramente local:
- Sem Trello / Jira
- Sem Bitbucket / GitHub PR automático
- Sem SonarQube
- Sem Slack

Quem quiser ativar uma integração cria um arquivo `.md` em `.claude/integracoes/` descrevendo como o agente deve usar a ferramenta (credenciais via `.env.local`).

### Por que dashboard separado

O dashboard e **opcional** e nao bloqueia o pipeline. Roda em `http://localhost:4174` consumindo o arquivo JSONL de eventos. Útil para acompanhamento visual, mas o pipeline funciona sem ele.

## Persistencia

Tudo e arquivo. Sem banco. Sem servidor.

| O que | Onde | Formato |
|-------|------|---------|
| Tarefas | `tarefas/TASK-XXX.md` | Markdown + frontmatter |
| Artefatos de execução | `.workflow/tasks/TASK-XXX/` | Markdown + JSON |
| Eventos | `~/.claude/agent-events-itau.jsonl` | JSONL |
| Relatórios | `relatorios/TASK-XXX.pdf` | PDF |
| Cache de contexto | `.workflow/contexts/{projeto}/` | JSON |
| Integrações | `.claude/integracoes/{tool}.md` | Markdown |

## Modelo de segurança

- Nenhum agente faz `git push` — push e humano
- Nenhum agente edita codigo em projetos sem aprovacao explicita do humano
- Credenciais sempre em `.env.local` (gitignored)
- Inputs validados em scripts bash (set -euo pipefail)
- Puppeteer roda em sandbox (chromium headless)
- Sem chamadas de rede ao iniciar — tudo local por padrão
