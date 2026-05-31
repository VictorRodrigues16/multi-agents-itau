#!/usr/bin/env bash
# emit-event.sh
# Emite um evento de agente para o dashboard agent-itau.
#
# Uso:
#   emit-event.sh spawning <agent-id> <task-id> "<descricao>"
#   emit-event.sh stopped  <agent-id> <task-id> <success|error> "<resumo>"
#   emit-event.sh log      <agent-id> <task-id> "<mensagem>"
#
# Eventos sao gravados em JSONL em ~/.claude/agent-events-itau.jsonl
# O dashboard faz polling deste arquivo a cada 3s.

set -euo pipefail

EVENTS_FILE="${AGENT_ITAU_EVENTS:-$HOME/.claude/agent-events-itau.jsonl}"
# Expande $HOME literal se a env vier sem expansao (ex: settings.json do Claude Code)
EVENTS_FILE="${EVENTS_FILE//\$HOME/$HOME}"
mkdir -p "$(dirname "$EVENTS_FILE")"

TIPO="${1:-}"
AGENT_ID="${2:-}"
TASK_ID="${3:-}"

if [ -z "$TIPO" ] || [ -z "$AGENT_ID" ] || [ -z "$TASK_ID" ]; then
  echo "Uso:"
  echo "  $0 spawning <agent-id> <task-id> \"<descricao>\""
  echo "  $0 stopped  <agent-id> <task-id> <success|error> \"<resumo>\""
  echo "  $0 log      <agent-id> <task-id> \"<mensagem>\""
  exit 1
fi

# Timestamp em milissegundos (compativel com macOS BSD date)
if date +%s%3N 2>/dev/null | grep -qE '^[0-9]+$'; then
  TS=$(date +%s%3N)
else
  TS=$(($(date +%s) * 1000))
fi

ESCAPAR() {
  printf '%s' "$1" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()), end='')" 2>/dev/null \
    || printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\n/\\n/g')"
}

case "$TIPO" in
  spawning)
    DESC="${4:-}"
    DESC_JSON=$(ESCAPAR "$DESC")
    EVENT="{\"ts\":$TS,\"tipo\":\"spawning\",\"agent_id\":\"$AGENT_ID\",\"task_id\":\"$TASK_ID\",\"descricao\":$DESC_JSON}"
    ;;
  stopped)
    STATUS="${4:-success}"
    DESC="${5:-}"
    DESC_JSON=$(ESCAPAR "$DESC")
    EVENT="{\"ts\":$TS,\"tipo\":\"stopped\",\"agent_id\":\"$AGENT_ID\",\"task_id\":\"$TASK_ID\",\"status\":\"$STATUS\",\"descricao\":$DESC_JSON}"
    ;;
  log)
    DESC="${4:-}"
    DESC_JSON=$(ESCAPAR "$DESC")
    EVENT="{\"ts\":$TS,\"tipo\":\"log\",\"agent_id\":\"$AGENT_ID\",\"task_id\":\"$TASK_ID\",\"descricao\":$DESC_JSON}"
    ;;
  *)
    echo "Tipo desconhecido: $TIPO" >&2
    exit 1
    ;;
esac

echo "$EVENT" >> "$EVENTS_FILE"
echo "[event] $TIPO $AGENT_ID $TASK_ID"
