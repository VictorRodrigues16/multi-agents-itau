# agent-itau

> Squad virtual de engenharia automatizado pelo Claude Code, adaptado para o fluxo Itaú.

**Filosofia**: tudo em Markdown. Sem banco, sem servidor de estado. Você clona o repositório, instala dependências, e o sistema roda 100% local na sua máquina.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Como instalar |
|-----------|---------------|---------------|
| Node.js | 20+ | https://nodejs.org/ ou `nvm install 20` |
| npm | 10+ | vem com Node |
| Claude Code CLI | qualquer | https://docs.claude.com/claude-code |
| Git | 2.20+ | já vem no macOS / Linux |

Opcional (apenas para gerar PDF do relatório):
- Puppeteer roda Chromium sob demanda. O `init.sh` baixa automaticamente.

---

## Instalação (3 minutos)

```bash
# 1. Clone
git clone <url-do-repo> agent-itau
cd agent-itau

# 2. Rode o setup automático
bash scripts/init.sh

# 3. Suba o dashboard (opcional, mas recomendado)
cd dashboard-next
npm run dev
# → http://localhost:4174
```

O `init.sh` faz:

- Cria as pastas necessárias (`tarefas/`, `relatorios/`, `.workflow/tasks/`)
- Instala dependências do dashboard (`dashboard-next/`)
- Instala dependências do gerador de PDF (`scripts/`)
- Copia `.env.example` → `.env.local` (com placeholders)
- Marca scripts shell como executáveis

---

## Primeiros passos

### Opção A — Pelo dashboard

1. Abra http://localhost:4174
2. Aba **Projetos** → **+ Adicionar projeto** → cole o caminho de um repo no seu PC
3. Botão **+ Nova tarefa** no topo → preencha jornada do cliente
4. Marque **Executar pipeline automaticamente** → o Claude CLI dispara
5. Acompanhe o progresso no Feed e na aba **Times**

### Opção B — Pelo Claude Code CLI

```bash
cd agent-itau
claude
# Dentro do Claude Code:
/nova-tarefa "Implementar tela X"   # gera tarefas/TASK-XXX.md
/tarefa TASK-XXX                     # dispara o pipeline
```

Tanto faz a opção — o dashboard reflete em tempo real qualquer execução.

---

## Arquitetura — só Markdown

```
agent-itau/
├── CLAUDE.md                       # instruções do Claude Code
├── README.md                       # este arquivo
├── tarefas/
│   └── TASK-001.md                 # cada tarefa é UM arquivo .md
├── .claude/
│   ├── projetos.md                 # FONTE CANÔNICA dos projetos
│   ├── agents/                     # 13 agentes (1 .md cada)
│   │   ├── orquestrador.md
│   │   ├── dev-tech-lead.md
│   │   └── ...
│   ├── skills/                     # comandos /slash do Claude
│   ├── rules/                      # padrões de código
│   └── integracoes/                # opt-in (Jira, Slack, ...)
├── .workflow/
│   └── tasks/TASK-XXX/
│       ├── plano.md                # plano do orquestrador
│       ├── worktrees.md            # mapeamento dev → worktree
│       ├── dev-summary.md          # consolidado do dev-tech-lead
│       ├── testes/summary.md       # consolidado da esteira
│       └── events/
│           └── {ts}-{agente}.md    # cada evento = 1 arquivo .md
├── brand/                          # logo + paleta
├── docs/                           # fluxo + arquitetura
├── relatorios/                     # PDFs gerados pelo agente Doc
├── scripts/                        # emit-event.sh + gerador PDF
└── dashboard-next/                 # UI Next.js (opcional)
```

**Nenhum JSON de estado.** Os únicos JSONs são:

- `package.json` / `tsconfig.json` (config de build, não evitam)
- `relatorio-dados-exemplo.json` (input do gerador PDF — gerado dinamicamente pelo agente Doc a partir dos `.md`)

---

## Como editar manualmente

Tudo é arquivo de texto. Você pode usar VSCode, vim, Obsidian, etc:

| Quero... | Edito... |
|---------|---------|
| Adicionar/remover projeto | `.claude/projetos.md` |
| Personalizar prompt de um agente | `.claude/agents/{nome}.md` |
| Ajustar regras de código | `.claude/rules/typescript.md` (ou outros) |
| Mudar como funciona uma skill | `.claude/skills/{nome}/SKILL.md` |
| Criar uma tarefa | `tarefas/TASK-XXX.md` (formato: ver `tarefas/TASK-001.md`) |
| Ativar integração (Jira, Slack) | Criar `.claude/integracoes/{nome}.md` |

O dashboard escreve nos mesmos arquivos quando você usa a UI — então edição manual e UI são equivalentes.

---

## Identidade

| Aspecto | Como configurar |
|---------|-----------------|
| Logo no dashboard | substitua `brand/logo.png` |
| Paleta de cores | edite `brand/paleta.md` |
| Nome / Squad | edite `dashboard-next/src/components/layout/top-bar.tsx` (linha do nome) |
| Identidade do usuário | `.env.local` → `SQUAD_USER_NAME` |

---

## Variáveis de ambiente

Todas opcionais. Estão em `.env.example`:

```bash
SQUAD_USER_NAME="Seu Nome"
SQUAD_USER_EMAIL="vc@itau.com.br"
PROJECTS_ROOT="$HOME/projetos"
DASHBOARD_PORT=4174
AGENT_ITAU_DIFF_PATH=""  # opcional, sobrescreve o repo de diff default

# Opcional — a raiz do projeto se auto-resolve a partir da pasta do repo.
# Defina só se rodar o dashboard/scripts de um diretorio diferente:
# AGENT_ITAU_ROOT="$HOME/agent-itau"
```

Para ativar integrações externas, descomente e preencha:

```bash
# JIRA_HOST=...
# GITHUB_TOKEN=...
# SLACK_WEBHOOK=...
# SONARQUBE_HOST=...
```

E crie o arquivo `.md` correspondente em `.claude/integracoes/` (ver `.claude/integracoes/README.md`).

---

## Times e fluxo

**4 times. Sem arquitetura. Sem infra.**

```
Orquestrador (1)
    │
    ▼
Dev Tech Lead + 5 devs (review por sorteio)
    │
    ▼
Teste Tech Lead + 4 frentes (quality / cobertura / segurança / perf)
    │
    ▼
Doc Especialista → PDF Itaú
```

Detalhes em [docs/fluxo-completo.md](docs/fluxo-completo.md) e [docs/arquitetura.md](docs/arquitetura.md).

---

## Compartilhando este repo

Para entregar pra alguém:

1. Faça `git add . && git commit && git push`
2. Quem clona pode colocar o repo **em qualquer pasta** (`~/agent-itau`, `~/Downloads/...`, etc.) — a raiz se auto-resolve, **não precisa** ser `~/dsg/agent-itau`.
3. Roda `bash scripts/init.sh` e está pronto.
4. Os MDs de agentes / tarefas / regras vêm versionados — a outra pessoa vê tudo igual.

**O que NÃO cruza máquinas (é local de cada um, e por isso fica fora do git):**

- `.claude/projetos.md` — cada pessoa registra os próprios projetos pela aba **Projetos**. Num clone novo o sistema mostra o template `projetos.example.md` até você adicionar o seu.
- `~/.claude/agent-events-itau.jsonl` — stream de eventos, regenerado localmente a cada execução.
- `.env.local` — sua identidade/config.
- `.workflow/tasks/*/prompt-execucao.txt` e afins — artefatos regerados a cada run (contêm caminhos absolutos da máquina local).

Ou seja: **clona em qualquer lugar, registra seu projeto, cria uma tarefa e roda** — sem nenhum caminho fixo da máquina de origem.

---

## Skills disponíveis (dentro do Claude Code)

| Comando | O que faz |
|---------|-----------|
| `/tarefa` | Lista tarefas pendentes |
| `/tarefa TASK-XXX` | Executa pipeline completo |
| `/nova-tarefa "titulo"` | Cria `tarefas/TASK-XXX.md` |
| `/quality-gate` | Esteira de qualidade isolada |
| `/review-cruzado TASK-XXX` | Re-executa apenas reviews |
| `/doc TASK-XXX` | Re-gera só o PDF |
| `/listar-tarefas` | Tabela com status |

---

## Suporte

Se algo der errado, abra um issue ou edite os MDs diretamente. **Tudo é texto, tudo é versionado, tudo é editável.**
