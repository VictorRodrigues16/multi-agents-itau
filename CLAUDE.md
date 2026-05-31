# CLAUDE.md — agent-itau

> Este arquivo e lido automaticamente pelo Claude Code ao iniciar uma sessao neste diretório.

## Identidade do projeto

Você esta operando dentro do **agent-itau** — um sistema de squad virtual de engenharia automatizado, desenhado para ser usado por desenvolvedores do Itaú no fluxo de refinamento e execução de tarefas.

Este projeto foi inspirado no `squad-workflow-automation` (DSG), mas **nao herda** suas integrações nem suas regras internas. Use **apenas** o que estiver descrito aqui.

## Como o fluxo funciona

1. Um humano (PM, lider, dev) cria uma "jornada" ou tarefa em linguagem natural.
2. A tarefa e salva em `tarefas/TASK-XXX.md`.
3. O usuario executa `/tarefa TASK-XXX`.
4. O **Orquestrador** le, analisa e decide:
   - Quem precisa ser acionado (devs, testes, doc)
   - Quantos devs para a tarefa (1 a 5)
   - Quais decisões precisam de aprovacao do humano
5. O **Dev Tech Lead** quebra a tarefa em subtarefas e distribui entre os N devs.
6. Os **Devs Especialistas** implementam em paralelo (worktrees isolados).
7. **Review cruzado por sorteio**: ao concluir, cada dev tem o trabalho revisado por 2 colegas sorteados aleatoriamente.
8. O **Tech Lead** consolida, válida e devolve ao Orquestrador.
9. O Orquestrador aciona o **Time de Testes**.
10. O **Time de Testes** roda a esteira completa (quality gate, cobertura, segurança, performance).
11. Volta ao Orquestrador.
12. O Orquestrador aciona o **Doc Especialista**, que gera um **PDF Itaú** com toda a jornada.

## Regras invioláveis

### Sobre alteracao de codigo

Diferente do projeto-pai (squad-workflow-automation), aqui o agent-itau **e** o sistema. As regras de "nunca edite codigo diretamente" do projeto DSG **nao se aplicam** — neste projeto você pode editar livremente os arquivos do `agent-itau` (configs, agents, skills, scripts, dashboard).

Quando o agent-itau for usado para trabalhar em **outros** projetos (ex: um repo de microsservico do Itaú clonado em `~/projetos/`), a regra muda: ai sim toda alteracao de codigo passa pelo pipeline de agentes via `/tarefa`.

### Commits (Conventional Commits)

- Formato: `<type>(<scope>): <descricao>`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`
- Descricao: imperativa, em portugues brasileiro
- Máximo 72 caracteres na primeira linha
- **NUNCA** incluir `Co-authored-by`, `Signed-off-by`, ou mencao a IA/Claude/Copilot
- 1 commit por subtarefa (atomico)

### Branches

- `feature/descricao-curta` — novas funcionalidades
- `fix/descricao-curta` — correcoes
- `hotfix/descricao-curta` — urgencias
- Branch base: padrão do repo do projeto-alvo (config em `.claude/integracoes/git.md` se quiser personalizar)

### TypeScript / Código

- TypeScript strict: ZERO `any`, ZERO `@ts-ignore`, ZERO `as any`
- Vue: `<script setup lang="ts">` com Composition API
- React/Next: componentes funcionais com hooks
- Componentes < 200 linhas (sugerir split se ultrapassar)
- Sem `console.log` em codigo de producao
- Imports com `import type` para tipos puros

### Segurança

- NUNCA commitar credenciais, tokens, senhas, chaves
- `.env*` no `.gitignore`
- Inputs sempre validados na borda (API/UI)
- SQL: queries parametrizadas, nunca concatenacao

### Idioma

- Documentação interna: portugues brasileiro
- Código (variáveis, funcoes): conforme padrão do projeto-alvo (default ingles)
- Commits: portugues brasileiro
- Comentarios: portugues brasileiro

## Os 4 times

### 1. Orquestrador (1 agente)

- `orquestrador.md` — coordena tudo, classifica e direciona

### 2. Time de Desenvolvimento (6 agentes)

- `dev-tech-lead.md` — coordena devs, escolhe quantos sao necessarios
- `dev-especialista-1.md` ... `dev-especialista-5.md` — implementam em paralelo

**Review cruzado por sorteio:** ao concluir, cada dev tem o trabalho revisado por 2 colegas sorteados pelo Tech Lead (que executa `scripts/sortear-revisores.sh <dev-id>`).

### 3. Time de Testes (5 agentes)

- `teste-tech-lead.md` — coordena a esteira de testes
- `teste-quality-gate.md` — formato + lint + types
- `teste-cobertura.md` — gera/válida testes unitarios, integração, e2e
- `teste-segurança.md` — escaneia vulnerabilidades, dependencias
- `teste-performance.md` — checa regressao de performance (opt-in)

### 4. Documentação (1 agente)

- `doc-especialista.md` — gera PDF Itaú detalhado da tarefa completa

## Skills (entrypoints do usuario)

| Comando | Descricao |
|---------|-----------|
| `/tarefa TASK-XXX` | Executa pipeline completo |
| `/tarefa` | Lista tarefas pendentes |
| `/nova-tarefa "titulo"` | Cria TASK-XXX.md |
| `/quality-gate` | Roda apenas a esteira de qualidade |
| `/review-cruzado` | Roda apenas o review cruzado |
| `/doc TASK-XXX` | Gera o PDF da tarefa |
| `/listar-tarefas` | Lista todas com status |

## Integrações externas

Por padrão, **nao ha integrações ativas**. Para ativar uma, crie o arquivo correspondente em `.claude/integracoes/`:

- `jira.md` — credenciais, project key, status mapping
- `github.md` — owner/repo, token
- `slack.md` — webhook url, canais
- `sonarqube.md` — host, token, project key
- `confluence.md` — host, space, token

Cada arquivo descreve **em portugues** como os agentes devem usar a ferramenta. Os agentes leem o arquivo de integração se existir; sem o arquivo, pulam a integração silenciosamente.

## Identidade visual

Quando o agente Doc gerar relatórios, **sempre** usar:

- **Logo Itaú (canonica)**: `brand/logo.png`
  - Servida pelo Next.js em `/logo.png` via symlink em `dashboard-next/public/logo.png`
  - Lida e embutida em base64 no PDF (gerador)
  - Substituir `brand/logo.png` atualiza tudo automaticamente
- SVGs em `brand/` (`itau-logo.svg`, `itau-logo-white.svg`, `itau-monograma.svg`) sao **legado** — manter como fallback histórico, mas nao usar.
- Paleta:
  - Laranja Itaú: `#EC7000` (primaria)
  - Laranja escuro: `#C75300` (hover/destaque)
  - Laranja claro: `#FFF4EC` (background sutil)
  - Preto: `#1A1A1A` (texto)
  - Branco: `#FFFFFF` (background)
  - Cinza claro: `#F5F5F5` (background secundario)
  - Cinza medio: `#707070` (texto secundario)
- Tipografia: sans-serif (Inter, Helvetica, Arial)

## Dashboard

Dashboard Next.js em `dashboard-next/` para monitorar agentes em tempo real.

```bash
cd dashboard-next && npm install && npm run dev
# http://localhost:3000
```

Eventos sao emitidos via `scripts/emit-event.sh` por cada agente em momentos-chave (spawn, conclusão). O dashboard faz polling do arquivo `~/.claude/agent-events-itau.jsonl`.

## Diretórios

```
agent-itau/
  CLAUDE.md             # você esta aqui
  README.md
  brand/                # logo + paleta
  tarefas/              # TASK-XXX.md (entrada)
  relatorios/           # PDFs gerados (saída)
  docs/                 # arquitetura e fluxo
  .claude/
    agents/             # 12 agentes
    skills/             # 6 skills
    rules/              # regras de codigo (typescript, commits, testes)
    integracoes/        # opt-in (jira, github, slack, etc..)
    settings.json
  .workflow/
    tasks/              # artefatos de execução por tarefa
    contexts/           # cache de contexto dos projetos-alvo
  scripts/              # emit-event, init, sortear-revisores, gerar-pdf
  dashboard-next/       # UI de monitoramento
```

## Comportamento esperado do Claude Code nesta sessao

1. Quando o usuario digitar `/tarefa TASK-XXX`, **sempre** rode a skill, que aciona o Orquestrador.
2. Antes de executar a fase de devs, **mostre o plano ao usuario e peca aprovacao**.
3. Em commits, **peca confirmacao** antes de cada um.
4. **NUNCA** fure o pipeline editando codigo do projeto-alvo diretamente (ver "Sobre alteracao de codigo" acima).
5. Mantenha o tom: profissional, conciso, em portugues brasileiro.
