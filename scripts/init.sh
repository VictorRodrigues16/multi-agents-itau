#!/usr/bin/env bash
# init.sh
# Inicializa o ambiente do agent-itau:
# - Verifica/instala dependencias (node, puppeteer)
# - Cria estrutura de pastas
# - Da permissao de execucao aos scripts
# - Copia .env.example para .env.local se nao existir

set -euo pipefail

# Raiz do agent-itau: usa AGENT_ITAU_ROOT se definido, senão se auto-resolve
# a partir da localização deste script (scripts/ -> raiz). Funciona em qualquer
# máquina, independente de onde o repositório foi clonado.
AGENT_ROOT="${AGENT_ITAU_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$AGENT_ROOT"

cor_orange='\033[38;5;208m'
cor_reset='\033[0m'
cor_bold='\033[1m'
cor_dim='\033[2m'

print_header() {
  echo
  echo -e "${cor_orange}${cor_bold}[agent-itau]${cor_reset} $1"
}

print_step() {
  echo -e "  ${cor_dim}->${cor_reset} $1"
}

print_ok() {
  echo -e "  ${cor_orange}OK${cor_reset} $1"
}

# 1. Verifica node
print_header "Verificando dependencias..."
if ! command -v node >/dev/null 2>&1; then
  echo "[erro] node nao encontrado. Instale: https://nodejs.org/"
  exit 1
fi
NODE_VERSION=$(node -v)
print_ok "node $NODE_VERSION"

# 2. Pastas
print_header "Criando estrutura de pastas..."
mkdir -p tarefas relatorios .workflow/tasks .workflow/contexts
mkdir -p .claude/integracoes
print_ok "pastas prontas"

# 3. Permissoes de execucao dos scripts
print_header "Configurando scripts..."
chmod +x scripts/emit-event.sh scripts/sortear-revisores.sh scripts/init.sh 2>/dev/null || true
print_ok "scripts executaveis"

# 4. .env.local
if [ ! -f .env.local ]; then
  print_header "Criando .env.local..."
  cp .env.example .env.local
  print_ok ".env.local criado a partir do .env.example"
  print_step "Edite .env.local com seus dados"
fi

# 5. Puppeteer (necessario pro gerador de PDF)
print_header "Verificando puppeteer..."
if ! node -e "require('puppeteer')" 2>/dev/null; then
  print_step "puppeteer nao instalado, instalando em ${AGENT_ROOT}/scripts/..."
  cd scripts
  if [ ! -f package.json ]; then
    cat > package.json <<EOF
{
  "name": "agent-itau-scripts",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "puppeteer": "^23.0.0"
  }
}
EOF
  fi
  npm install --silent
  cd "$AGENT_ROOT"
  print_ok "puppeteer instalado"
else
  print_ok "puppeteer ja disponivel"
fi

# 6. Dashboard (opcional)
print_header "Verificando dashboard..."
if [ -d dashboard-next ] && [ ! -d dashboard-next/node_modules ]; then
  print_step "instalando dependencias do dashboard..."
  cd dashboard-next
  npm install --silent
  cd "$AGENT_ROOT"
  print_ok "dashboard pronto"
elif [ -d dashboard-next/node_modules ]; then
  print_ok "dashboard ja configurado"
fi

echo
echo -e "${cor_orange}${cor_bold}agent-itau pronto.${cor_reset}"
echo
echo "Proximos passos:"
echo "  1. Edite ${cor_orange}.env.local${cor_reset} com seus dados"
echo "  2. Crie uma tarefa: ${cor_orange}/nova-tarefa \"titulo\"${cor_reset}"
echo "  3. Execute: ${cor_orange}/tarefa TASK-001${cor_reset}"
echo "  4. (opcional) Dashboard: ${cor_orange}cd dashboard-next && npm run dev${cor_reset}"
echo
