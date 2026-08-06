#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root"

for file in datos/*.json; do
  jq empty "$file"
done

node --check 10-financiero/modelo.js
node 10-financiero/verificar_modelo.js

if rg -q '12 de 12 etapas|Las doce etapas' index.html; then
  echo "Estado de etapas obsoleto en index.html" >&2
  exit 1
fi

stage_count="$(rg -c 'class="nav-etapa"' index.html)"
if [[ "$stage_count" != "13" ]]; then
  echo "Se esperaban 13 enlaces de etapa y se encontraron $stage_count" >&2
  exit 1
fi

missing=0
while IFS=$'\t' read -r from target; do
  case "$target" in
    http*|mailto:*|tel:*) continue ;;
  esac
  if [[ ! -e "$(dirname "$from")/$target" ]]; then
    printf 'Enlace local faltante: %s -> %s\n' "$from" "$target" >&2
    missing=1
  fi
done < <(perl -ne 'while(/(?:href|src)="([^"#?]+)"/g){print "$ARGV\t$1\n"}' index.html */index.html 00-statement/statement.html)

[[ "$missing" == "0" ]]
echo "Dossier verificado: datos, motor, paridad, etapas y enlaces locales correctos."
