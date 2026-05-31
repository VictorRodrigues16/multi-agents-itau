#!/usr/bin/env bash
# executar-real.sh — Execução REAL de uma tarefa: abre o Terminal rodando o
# Claude dentro do projeto-alvo, editando o código de verdade.
#
# Uso: executar-real.sh TASK-XXX
#
# O que faz:
#   1. Lê tarefas/TASK-XXX.md (frontmatter -> projeto-alvo)
#   2. Resolve o caminho do projeto em .claude/projetos.md
#   3. Escreve um prompt de execução autônoma
#   4. Abre Terminal.app: cd <projeto> && claude --permission-mode acceptEdits "<prompt>"
#
# O Claude implementa o código real, emite eventos pro dashboard e gera o PDF.

set -euo pipefail

# Raiz do agent-itau: usa AGENT_ITAU_ROOT se definido, senão se auto-resolve
# a partir da localização deste script (scripts/ -> raiz). Funciona em qualquer
# máquina, independente de onde o repositório foi clonado.
AGENT_ROOT="${AGENT_ITAU_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TASK_ID="${1:-}"

if [ -z "$TASK_ID" ]; then
  echo "Uso: executar-real.sh TASK-XXX" >&2
  exit 1
fi

TAREFA_MD="$AGENT_ROOT/tarefas/$TASK_ID.md"
if [ ! -f "$TAREFA_MD" ]; then
  echo "Tarefa não encontrada: $TAREFA_MD" >&2
  exit 1
fi

# ─── Resolve o projeto-alvo ──────────────────────────────────
# Pega o primeiro projeto do campo `projetos: [a, b]` no frontmatter
PROJ_NOME=$(grep -m1 "^projetos:" "$TAREFA_MD" \
  | sed -E 's/^projetos:[[:space:]]*\[?//; s/\].*//; s/,.*//' \
  | tr -d '[:space:]')

if [ -z "$PROJ_NOME" ]; then
  echo "Tarefa sem projeto-alvo definido (campo 'projetos' vazio)" >&2
  exit 2
fi

# Busca o caminho desse projeto no projetos.md (formato: - **caminho**: `~/...`)
# Estratégia: encontra a section ## {PROJ_NOME} e pega o caminho dela
PROJETOS_MD="$AGENT_ROOT/.claude/projetos.md"
CAMINHO=""
if [ -f "$PROJETOS_MD" ]; then
  # Pega o bloco da section e extrai o caminho
  CAMINHO=$(awk -v proj="$PROJ_NOME" '
    $0 == "## " proj { found=1; next }
    /^## / { found=0 }
    found && /caminho/ {
      gsub(/.*caminho\*\*:[[:space:]]*`/, "")
      gsub(/`.*/, "")
      print
      exit
    }
  ' "$PROJETOS_MD")
fi

# Fallback: tenta achar a pasta por nome em locais comuns
if [ -z "$CAMINHO" ]; then
  for base in "$HOME" "$HOME/Projetos" "$HOME/projetos" "$HOME/dsg" "$HOME/dev"; do
    achado=$(find "$base" -maxdepth 3 -type d -name "$PROJ_NOME" 2>/dev/null | grep -v node_modules | head -1)
    [ -n "$achado" ] && CAMINHO="$achado" && break
  done
fi

# Expande ~/
CAMINHO="${CAMINHO/#\~/$HOME}"

if [ -z "$CAMINHO" ] || [ ! -d "$CAMINHO" ]; then
  echo "Caminho do projeto '$PROJ_NOME' não encontrado. Registre em $PROJETOS_MD" >&2
  exit 3
fi

# ─── Monta o prompt de execução autônoma ─────────────────────
PROMPT_FILE="$AGENT_ROOT/.workflow/tasks/$TASK_ID/prompt-execucao.txt"
mkdir -p "$(dirname "$PROMPT_FILE")"

EMIT="$AGENT_ROOT/scripts/emit-event.sh"
GERAR_PDF="$AGENT_ROOT/scripts/gerar-relatorio-pdf.js"
DADOS_JSON="$AGENT_ROOT/.workflow/tasks/$TASK_ID/relatorio-dados.json"
PDF_OUT="$AGENT_ROOT/relatorios/$TASK_ID.pdf"

cat > "$PROMPT_FILE" <<PROMPT
Você é o squad agent-itau executando a tarefa $TASK_ID de forma TOTALMENTE AUTÔNOMA. NÃO peça nenhuma aprovação ou confirmação — execute tudo direto até o fim.

Você está DENTRO do projeto-alvo "$PROJ_NOME" (diretório atual). Sua missão é IMPLEMENTAR O CÓDIGO DE VERDADE neste projeto para atender a tarefa, e reportar cada etapa ao dashboard.

PASSO 0 — Leia a tarefa: use o comando "cat $TAREFA_MD" para ver o que precisa ser feito.

⚠️ REGRA CRÍTICA — NUNCA invente caminhos ou estrutura de pastas. Este projeto tem uma estrutura
REAL e específica. ANTES de criar ou editar QUALQUER arquivo, você É OBRIGADO a:
  a) Rodar: ls -la  (ver a raiz do projeto)
  b) Rodar: cat package.json  (ver framework, scripts, dependências)
  c) Mapear as pastas reais: find . -type d -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*" | head -40
  d) LER 2-3 arquivos existentes parecidos com o que você vai criar (ex: um componente, uma página),
     usando o tool Read, pra copiar EXATAMENTE o padrão (imports, estilo, convenções, estrutura de pastas).
  e) Antes de editar um arquivo, SEMPRE leia ele primeiro com Read.
Se você criar arquivo em pasta que não existe no projeto (ex: "src/" quando o projeto usa "app/"),
a tarefa FALHA. Use APENAS os caminhos e padrões que você VIU existir.

REGRA DE OURO — antes e depois de CADA fase, rode o comando bash de evento (são rápidos, NÃO pulam):
  Início de fase:  $EMIT spawning <agente> $TASK_ID "<o que vai fazer>"
  Fim de fase:     $EMIT stopped  <agente> $TASK_ID success "<o que fez>"
Agentes: orquestrador, dev-tech-lead, dev-especialista-1, dev-especialista-2, teste-quality-gate, doc-especialista

EXECUTE NESTA ORDEM (cada item é obrigatório):

1) Rode: $EMIT spawning orquestrador $TASK_ID "Analisando estrutura real do projeto"
   FAÇA A EXPLORAÇÃO OBRIGATÓRIA descrita acima (ls, cat package.json, find, e Read em arquivos existentes).
   Entenda: é Next.js? Vue? React puro? Onde ficam os componentes? Qual a convenção de nomes? CSS modules, Tailwind, styled?
   Só prossiga depois de ter CERTEZA da estrutura real.
   Rode: $EMIT stopped orquestrador $TASK_ID success "Estrutura mapeada, plano definido"

2) Rode: $EMIT spawning dev-tech-lead $TASK_ID "Distribuindo subtarefas"
   Rode: $EMIT spawning dev-especialista-1 $TASK_ID "Implementando: <descreva a subtarefa>"

3) >>> IMPLEMENTE O CÓDIGO AGORA <<< Crie e edite os arquivos REAIS necessários pra cumprir a tarefa, seguindo fielmente os padrões do projeto. Esta é a parte mais importante — escreva código de qualidade que funcione.
   Ao terminar: $EMIT stopped dev-especialista-1 $TASK_ID success "<arquivos criados/editados>"
   Rode: $EMIT stopped dev-tech-lead $TASK_ID success "Implementação concluída, merge OK"

4) Rode: $EMIT spawning teste-quality-gate $TASK_ID "Validando lint e build"
   Se o projeto tiver, rode o lint/typecheck (ex: npm run lint, npx tsc --noEmit, npm run build). Corrija erros que aparecerem nos seus arquivos.
   Rode: $EMIT stopped teste-quality-gate $TASK_ID success "<resultado>"

5) Rode: $EMIT spawning doc-especialista $TASK_ID "Gerando relatório PDF"
   Crie o arquivo JSON em $DADOS_JSON com este formato (preencha com o que VOCÊ realmente fez):
   {
     "task_id":"$TASK_ID","titulo_curto":"<titulo da tarefa>","autor":"Squad agent-itau","data_geracao":"<YYYY-MM-DD de hoje>",
     "tipo":"feature","complexidade":"M","risco":"baixo",
     "sumario_executivo":"<resumo do que foi implementado>",
     "tarefa_original":"<contexto da tarefa>",
     "orquestrador":{"classificacao":{"tipo":"feature","complexidade":"M","risco":"baixo"},"plano":"<plano>","estrategia":"<estrategia>","riscos":["<risco>"]},
     "devs":[{"id":"dev-especialista-1","subtarefa":"ST-001","descricao":"<o que fez>","arquivos_criados":["<arquivos>"],"arquivos_modificados":["<arquivos>"],"decisoes":["<decisoes>"],"codigo_destaque":{"arquivo":"<arquivo>","linguagem":"<lang>","trecho":"<trecho real do codigo que voce escreveu>"},"testes":{"total":"<n> testes","cenarios":["<cenarios>"]},"commit_hash":"local"}],
     "reviews":[{"revisor":"dev-especialista-2","revisado":"dev-especialista-1","veredicto":"APROVADO","pontos_positivos":["<pontos>"],"issues":[]}],
     "testes":{"veredicto":"PASS","nota_global":92,"quality_gate":{"executado":true,"veredicto":"PASS","score":94,"resumo":"<resumo>","bloqueantes":[],"importantes":[],"sugestoes":[]},"cobertura":{"executado":true,"veredicto":"PASS","score":90,"resumo":"<resumo>","bloqueantes":[],"importantes":[],"sugestoes":[]},"seguranca":{"executado":true,"veredicto":"PASS","score":95,"resumo":"<resumo>","bloqueantes":[],"importantes":[],"sugestoes":[]},"performance":{"executado":false},"testes_gerados":[]},
     "timeline":[{"hora":"<HH:MM>","evento":"Tarefa recebida"},{"hora":"<HH:MM>","evento":"Código implementado"},{"hora":"<HH:MM>","evento":"PDF gerado"}],
     "anexos":{"arquivos_modificados":["<lista real via git diff --name-only>"],"integracoes_usadas":[]}
   }
   Depois rode: node $GERAR_PDF --dados $DADOS_JSON --saida $PDF_OUT
   Rode: $EMIT stopped doc-especialista $TASK_ID success "PDF gerado: relatorios/$TASK_ID.pdf"

6) Rode: $EMIT stopped orquestrador $TASK_ID success "$TASK_ID concluída — código implementado, PDF gerado"

NÃO faça git commit nem git push — só edite os arquivos. Ao final, mostre um resumo do que foi feito e o caminho do PDF.
PROMPT

# ─── Emite o evento inicial JÁ (dashboard mostra atividade na hora) ──
"$AGENT_ROOT/scripts/emit-event.sh" spawning orquestrador "$TASK_ID" "Iniciando execução real no projeto $PROJ_NOME" 2>/dev/null || true

# ─── Abre o Terminal.app rodando o claude no projeto-alvo ────
CLAUDE_BIN=$(command -v claude || echo "claude")

# --dangerously-skip-permissions: roda autônomo sem pedir trust nem confirmar
# cada edição (adequado pra automação de squad em projeto próprio).
osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "cd '$CAMINHO' && '$CLAUDE_BIN' --dangerously-skip-permissions \"\$(cat '$PROMPT_FILE')\""
end tell
APPLESCRIPT

echo "OK: Terminal aberto em $CAMINHO executando $TASK_ID"
echo "projeto=$PROJ_NOME"
echo "caminho=$CAMINHO"
