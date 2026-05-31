# Integrações opt-in — agent-itau

Esta pasta contem arquivos `.md` que **ativam** integrações com ferramentas externas. Por padrão, **nenhuma** integração esta ativa.

Cada arquivo descreve, em portugues claro, como os agentes devem usar a ferramenta. O Claude le o arquivo quando precisa interagir com a integração.

## Como ativar uma integração

1. Crie o arquivo `.claude/integracoes/{nome}.md` correspondente
2. Preencha as credenciais em `.env.local`
3. Pronto. O próximo `/tarefa` já consulta a integração automaticamente.

## Integrações disponíveis

### Jira

Arquivo: `jira.md`

Permite ao Orquestrador:
- Buscar contexto adicional de uma tarefa (issue Jira)
- Mover cards quando a tarefa muda de status
- Adicionar comentarios automaticos

Variáveis necessarias em `.env.local`:
```bash
JIRA_HOST=https://itau.atlassian.net
JIRA_EMAIL=seu.email@itau.com.br
JIRA_TOKEN=...
JIRA_PROJECT_KEY=ITAU
```

### GitHub

Arquivo: `github.md`

Permite ao agente teste-deploy / orquestrador:
- Abrir PR automaticamente após commit
- Atribuir reviewers
- Adicionar labels

Variáveis:
```bash
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=itau
GITHUB_REPO=<repo-do-projeto>
```

### Slack

Arquivo: `slack.md`

Permite envio de notificacoes:
- Início de tarefa
- Conclusão com link do PDF
- Falhas e bloqueios

Variáveis:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CANAL_NOTIFICACOES=#squad-virtual
```

### SonarQube

Arquivo: `sonarqube.md`

Aciona o Quality Gate a fazer consulta REAL na API do SonarQube.

Variáveis:
```bash
SONARQUBE_HOST=https://sonar.itau.com.br
SONARQUBE_TOKEN=sqa_...
SONARQUBE_PROJECT_KEY_PREFIX=itau-
```

### Confluence

Arquivo: `confluence.md`

Pública o relatório (alem do PDF) em uma pagina Confluence.

Variáveis:
```bash
CONFLUENCE_HOST=https://itau.atlassian.net/wiki
CONFLUENCE_TOKEN=...
CONFLUENCE_SPACE_KEY=ENG
CONFLUENCE_PARENT_PAGE_ID=...
```

## Template de arquivo de integração

Use este formato ao criar uma nova integração:

```markdown
# {Nome da integração}

> Habilita {breve descricao}

## Status
ATIVA

## Variáveis necessarias
- VAR_1
- VAR_2

## Como o agente deve usar

### Cenario 1: {nome do cenario}
{Instrucao em portugues claro: passo a passo}

Exemplo de comando:
```bash
curl -H "Authorization: Bearer $TOKEN" {host}/endpoint
```

### Cenario 2: {nome do cenario}
{...}

## Quem usa
- Orquestrador (para buscar contexto)
- Doc Especialista (para anexar links no PDF)
```

## Filosofia

**Toda integração e um arquivo de prosa.** Sem codigo fonte proprietario, sem framework de plugin.
Você le o arquivo, entende o que faz, e ajusta sem programar.

Quando uma integração falha (rede, credenciais, etc..), o agente registra o erro mas **nao bloqueia** o pipeline — ele segue sem a integração.
