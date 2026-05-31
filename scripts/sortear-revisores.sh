#!/usr/bin/env bash
# sortear-revisores.sh
# Sorteia 2 revisores aleatorios para um dev, entre os outros devs disponiveis.
#
# Uso:
#   sortear-revisores.sh <dev-id> <lista,separada,por,virgula>
#
# Exemplo:
#   sortear-revisores.sh dev-1 "dev-2,dev-3,dev-4,dev-5"
#   -> imprime: "dev-3,dev-5" (aleatorio)
#
# Garante:
#   - Os 2 sorteados NAO sao o proprio dev
#   - Os 2 sorteados sao distintos
#   - Se houver < 2 candidatos, devolve so o(s) disponivel(is)

set -euo pipefail

DEV_ID="${1:-}"
CANDIDATOS_CSV="${2:-}"

if [ -z "$DEV_ID" ] || [ -z "$CANDIDATOS_CSV" ]; then
  echo "Uso: $0 <dev-id> <lista-separada-por-virgula>" >&2
  echo "Exemplo: $0 dev-1 \"dev-2,dev-3,dev-4,dev-5\"" >&2
  exit 1
fi

# Converte CSV -> array, removendo o proprio dev e duplicatas
IFS=',' read -r -a CANDIDATOS <<< "$CANDIDATOS_CSV"
CANDIDATOS_LIMPOS=()
for c in "${CANDIDATOS[@]}"; do
  c_trim=$(echo "$c" | tr -d '[:space:]')
  if [ -n "$c_trim" ] && [ "$c_trim" != "$DEV_ID" ]; then
    if [[ ! " ${CANDIDATOS_LIMPOS[*]:-} " =~ " $c_trim " ]]; then
      CANDIDATOS_LIMPOS+=("$c_trim")
    fi
  fi
done

TOTAL=${#CANDIDATOS_LIMPOS[@]}

if [ "$TOTAL" -eq 0 ]; then
  echo "" # nenhum revisor disponivel
  exit 0
fi

# Embaralha (Fisher-Yates)
for ((i=TOTAL-1; i>0; i--)); do
  j=$((RANDOM % (i+1)))
  tmp="${CANDIDATOS_LIMPOS[i]}"
  CANDIDATOS_LIMPOS[i]="${CANDIDATOS_LIMPOS[j]}"
  CANDIDATOS_LIMPOS[j]="$tmp"
done

# Pega os 2 primeiros
N=2
if [ "$TOTAL" -lt 2 ]; then
  N=$TOTAL
fi

RESULTADO=""
for ((k=0; k<N; k++)); do
  if [ -n "$RESULTADO" ]; then
    RESULTADO="${RESULTADO},${CANDIDATOS_LIMPOS[k]}"
  else
    RESULTADO="${CANDIDATOS_LIMPOS[k]}"
  fi
done

echo "$RESULTADO"
