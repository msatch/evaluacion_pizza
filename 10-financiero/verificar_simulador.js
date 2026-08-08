"use strict";

// ==========================================================================
// Arnés del simulador. Comprueba lo que el ojo no ve al abrir la página:
// que cada control esté realmente cableado al motor, y que el atajo de
// rendimiento (mutar la hoja en sitio en vez de reclonar) dé exactamente lo
// mismo que la vía lenta. Un control desconectado se mueve, se ve bien y no
// cambia el modelo: es el modo de falla más caro de un simulador.
// ==========================================================================

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { buildModel, cloneWithOverrides, get } = require("./motor.js");
const { PARAMETROS, GRUPOS, PALANCAS_TORNADO } = require("./parametros-simulador.js");

const root = path.resolve(__dirname, "..");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, "datos", name), "utf8"));
const data = {
  base: readJson("supuestos.json"),
  market: readJson("parametros-01-mercado.json"),
  prices: readJson("parametros-02-competencia.json"),
  inputs: readJson("parametros-06-insumos.json"),
  local: readJson("parametros-07-local-habilitacion.json"),
  legal: readJson("parametros-08-legal-normativo.json"),
  financial: readJson("parametros-10-financiero.json"),
  gates: readJson("gates-decision.json")
};

const base = buildModel(data);
const CLAVES = ["npv", "peakFunding", "breakEven", "totalCapex", "initialNwc", "variableBase"];

// ---------------------------------------------------------------- forma ----

const ids = new Set();
for (const p of PARAMETROS) {
  assert.ok(/^[a-z0-9]+$/.test(p.id), `id no apto para URL: ${p.id}`);
  assert.ok(!ids.has(p.id), `id duplicado: ${p.id}`);
  ids.add(p.id);
  assert.ok(GRUPOS.some((g) => g.id === p.grupo), `grupo desconocido en ${p.id}: ${p.grupo}`);
  assert.ok(p.min < p.max, `rango inválido en ${p.id}`);
}
for (const id of PALANCAS_TORNADO) {
  assert.ok(ids.has(id), `PALANCAS_TORNADO apunta a un id inexistente: ${id}`);
}

// -------------------------------------------------- resolución efectiva ----
// Espeja la precedencia del motor: gana la etapa dueña, si no el stub E10,
// si no el derivado. Si esto se desalinea, la página muestra un número que
// el motor no usa.

function resolverEfectivo(datos, p) {
  for (const [bucket, ruta] of p.lectura) {
    const valor = get(datos[bucket], ruta);
    if (valor !== null && valor !== undefined) return valor;
  }
  if (p.derivar) return p.derivar(datos, get);
  if (p.plano) return datos[p.bucketPlano].meta.restriccion_capital_clp;
  return null;
}

for (const p of PARAMETROS) {
  const efectivo = resolverEfectivo(data, p);
  assert.ok(efectivo !== null && Number.isFinite(efectivo) || p.id === "tarifa",
    `${p.id}: no se pudo resolver un valor efectivo (${efectivo})`);
}

// El precio efectivo tiene que ser el stub, no el null de la etapa 02.
assert.equal(resolverEfectivo(data, PARAMETROS.find((p) => p.id === "precio")), 4200);
// La vida depreciable la manda `base` (10), no el stub de la etapa 10 (5).
assert.equal(resolverEfectivo(data, PARAMETROS.find((p) => p.id === "vida")), 10);
assert.equal(resolverEfectivo(data, PARAMETROS.find((p) => p.id === "limite")), 50000000);

// --------------------------------------------------- cada control cablea ----
// Para cada parámetro: escribir un valor distinto debe mover el modelo. Si
// no lo mueve, tiene que estar declarado `inerte` con su razón.

const inertesEsperados = [];
for (const p of PARAMETROS) {
  if (p.soloMaquila) continue;
  const actual = resolverEfectivo(data, p);
  const sonda = p.id === "limite" ? actual / 2
    : actual === 0 ? p.max : actual * (actual > 0 ? 1.5 : 0.5);

  let movido;
  if (p.plano) {
    movido = structuredClone(data);
    movido[p.bucketPlano].meta.restriccion_capital_clp = sonda;
  } else {
    // Debe aplicar sin lanzar: si la ruta ya no existe en ningún bucket,
    // cloneWithOverrides lanza y el control estaría muerto.
    movido = cloneWithOverrides(data, { [p.ruta]: sonda });
  }
  const resultado = buildModel(movido);
  const cambio = CLAVES.some((k) => resultado[k] !== base[k])
    || resultado.capitalLimit !== base.capitalLimit;

  if (!cambio) inertesEsperados.push(p.id);
  if (cambio) {
    assert.ok(!p.inerte,
      `${p.id} está marcado como inerte pero sí mueve el modelo: quite la marca`);
  } else {
    assert.ok(p.inerte || p.inerteTopado,
      `${p.id} no mueve el modelo y no declara por qué. Ruta mal cableada o restricción activa sin documentar.`);
  }
}

// --------------------------------------------- el techo de capacidad topa ----
// Documenta el hecho que hace inerte al SOM: sobre 1.320 pizzas/mes la
// capacidad instalada se come cualquier aumento de demanda. Es la razón por
// la que el tornado debe rotular "sin efecto — restricción activa" en vez de
// dibujar una barra de largo cero, que se lee como "no importa".
const topado = cloneWithOverrides(data, { "mercado.som_ano1_pizzas_mes": 5000 });
assert.equal(buildModel(topado).npv, base.npv,
  "con la capacidad vigente, subir el SOM no debe cambiar nada");
const destopado = cloneWithOverrides(data, {
  "mercado.som_ano1_pizzas_mes": 5000,
  "produccion.capacidad_instalada_pizzas_dia": 400
});
assert.notEqual(buildModel(destopado).npv, base.npv,
  "al levantar la capacidad, el SOM tiene que volver a mover el VAN");
assert.equal(base.years.every((y) => y.volume === base.capacityYear), true,
  "hoy la capacidad topa el volumen en los cinco años");

// ------------------------------------------- vía rápida ≡ vía lenta ----
// El simulador clona UNA vez por cuadro y luego muta la hoja en sitio para
// el tornado y la bisección. Esta invariante es lo que licencia ese atajo.

function hojasDe(datos, ruta) {
  const partes = ruta.split(".");
  const hojas = [];
  for (const bucket of Object.values(datos)) {
    let actual = bucket;
    for (const parte of partes.slice(0, -1)) {
      if (!actual || typeof actual !== "object" || !(parte in actual)) { actual = null; break; }
      actual = actual[parte];
    }
    const ultima = partes.at(-1);
    if (actual && typeof actual[ultima] === "object" && actual[ultima] !== null) {
      hojas.push(actual[ultima]);
    }
  }
  return hojas;
}

const borrador = structuredClone(data);
for (const p of PARAMETROS) {
  if (p.plano || p.soloMaquila) continue;
  const actual = resolverEfectivo(data, p);
  const sonda = actual === 0 ? p.max : actual * 1.3;
  const hojas = hojasDe(borrador, p.ruta);
  assert.ok(hojas.length > 0, `${p.id}: la ruta ${p.ruta} no resuelve a ninguna hoja`);

  const previos = hojas.map((h) => h.valor);
  hojas.forEach((h) => { h.valor = sonda; });
  const rapido = buildModel(borrador);
  hojas.forEach((h, i) => { h.valor = previos[i]; });

  const lento = buildModel(cloneWithOverrides(data, { [p.ruta]: sonda }));
  for (const k of CLAVES) {
    assert.equal(rapido[k], lento[k], `${p.id}: vía rápida difiere de la lenta en ${k}`);
  }
}
// El borrador quedó restaurado tal cual: si no, el tornado contaminaría el caso base.
for (const k of CLAVES) {
  assert.equal(buildModel(borrador)[k], base[k],
    `restaurar la hoja en sitio no devolvió el borrador a su estado inicial (${k})`);
}

console.log(`Simulador verificado: ${PARAMETROS.length} controles cableados, `
  + `${inertesEsperados.length} inertes declarados (${inertesEsperados.join(", ") || "ninguno"}), `
  + "vía rápida idéntica a la lenta.");
