#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root"

for file in datos/*.json; do
  jq empty "$file"
done

jq -e '
  .meta.estado_global == "VALIDACION_PENDIENTE"
  and (.meta.fecha_corte | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}$"))
  and (.gates | length == 4)
  and all(.gates[]; (.id | type == "string") and (.estado | type == "string")
    and (.responsable | type == "string") and (.parametros_a_cerrar | length > 0))
' datos/gates-decision.json >/dev/null

if ! python3 datos/generar_instantanea.py --stdout | diff -q - datos/instantanea.js >/dev/null; then
  echo "instantánea desactualizada — ejecute: python3 datos/generar_instantanea.py" >&2
  exit 1
fi

node --check datos/instantanea.js
node --check 10-financiero/motor.js
node --check 10-financiero/modelo.js
node --check 10-financiero/parametros-simulador.js
node --check 10-financiero/simulador.js
node 10-financiero/verificar_modelo.js
node 10-financiero/verificar_simulador.js

if rg -q '12 de 12 etapas|Las doce etapas' index.html; then
  echo "Estado de etapas obsoleto en index.html" >&2
  exit 1
fi

stage_count="$(rg -c 'class="nav-etapa"' index.html)"
if [[ "$stage_count" != "14" ]]; then
  echo "Se esperaban 13 etapas y un Caso B, y se encontraron $stage_count enlaces" >&2
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
done < <(perl -ne 'while(/(?:href|src)="([^"#?]+)"/g){print "$ARGV\t$1\n"}' index.html */index.html 00-statement/statement.html 10-financiero/simulador.html)

[[ "$missing" == "0" ]]
echo "Dossier verificado: datos, motor, paridad, etapas y enlaces locales correctos."
