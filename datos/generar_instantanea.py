#!/usr/bin/env python3
"""Genera datos/instantanea.js: una copia embebida de los JSON que consume el motor.

Por qué existe
--------------
El simulador lee los JSON con fetch(), y fetch() sobre file:// está bloqueado
por el navegador. Sin esta instantánea, abrir simulador.html con doble clic da
una página en blanco con un error de carga. Con ella, la página funciona
offline y avisa que está leyendo una copia.

Es una duplicación deliberada de la fuente de verdad, así que lleva guardia:
la salida es DETERMINISTA (la fecha sale de gates-decision.json, no del reloj),
y verificar-dossier.sh regenera y compara. Si alguien edita un JSON y no
regenera, el dossier no pasa. Es el mismo idioma que las hojas congeladas del
libro, que llevan una fórmula que las marca DESACTUALIZADO al desviarse.

Uso
---
    python3 datos/generar_instantanea.py            # escribe datos/instantanea.js
    python3 datos/generar_instantanea.py --stdout   # imprime, para diff en la guardia
"""

import hashlib
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent

# Los mismos ocho buckets, con las mismas claves, que start() pide por fetch.
# Si esta lista se desalinea de simulador.js, la instantánea sirve un modelo
# distinto del que sirve el servidor: verificar_instantanea lo detecta.
BUCKETS = {
    "base": "supuestos.json",
    "market": "parametros-01-mercado.json",
    "prices": "parametros-02-competencia.json",
    "inputs": "parametros-06-insumos.json",
    "local": "parametros-07-local-habilitacion.json",
    "legal": "parametros-08-legal-normativo.json",
    "financial": "parametros-10-financiero.json",
    "gates": "gates-decision.json",
    # No alimenta el motor: lo usa el preset "Caso B" del simulador. Se llama
    # caso-b-* y no parametros-* justamente para que nunca se consolide.
    "casob": "caso-b-activos.json",
}


def construir() -> str:
    datos = {}
    huella = hashlib.sha256()
    for clave, nombre in BUCKETS.items():
        crudo = (RAIZ / nombre).read_bytes()
        huella.update(nombre.encode("utf-8"))
        huella.update(crudo)
        datos[clave] = json.loads(crudo)

    # La fecha viene del dossier, no del reloj: así regenerar sin cambios da
    # un archivo idéntico y la guardia puede ser un diff simple.
    fecha = datos["gates"]["meta"]["fecha_corte"]

    cuerpo = json.dumps(
        {"fecha": fecha, "huella": huella.hexdigest()[:16], "datos": datos},
        ensure_ascii=False, indent=1, sort_keys=True,
    )
    return (
        "// ARCHIVO GENERADO — no editar a mano.\n"
        "// Regenerar con: python3 datos/generar_instantanea.py\n"
        "//\n"
        "// Copia embebida de los JSON del dossier para que simulador.html\n"
        "// funcione al abrirlo con doble clic (file:// bloquea fetch).\n"
        "// Servido por HTTP el simulador ignora este archivo y lee los JSON\n"
        "// en vivo. verificar-dossier.sh falla si esta copia quedó atrasada.\n"
        f"window.__instantanea = {cuerpo};\n"
    )


def main() -> int:
    contenido = construir()
    if "--stdout" in sys.argv:
        sys.stdout.write(contenido)
        return 0
    destino = RAIZ / "instantanea.js"
    destino.write_text(contenido, encoding="utf-8")
    kb = len(contenido.encode("utf-8")) / 1024
    print(f"instantanea.js regenerada: {kb:.0f} KB, {len(BUCKETS)} buckets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
