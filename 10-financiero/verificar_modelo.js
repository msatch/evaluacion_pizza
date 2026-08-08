"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, "datos", name), "utf8"));
// El motor se importa, no se recorta con split()/eval(). Antes este arnés
// evaluaba el prefijo de modelo.js anterior a start(): un error de sintaxis
// truncaba el motor en silencio en vez de fallar.
const { buildModel, missingCriticalInputs, cloneWithOverrides, maquilaOverrides } = require("./motor.js");

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

const closeTo = (actual, expected, tolerance = 0.01) => {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `expected ${expected}, received ${actual} (tolerance ${tolerance})`);
};

const ownPlant = buildModel(data);
closeTo(ownPlant.npv, -91764381.4776, 0.1);
closeTo(ownPlant.peakFunding, 125493563.0002, 0.1);
assert.equal(ownPlant.capacityYear, 15840);
assert.ok(missingCriticalInputs(data, "planta").length > 0,
  "the current data must remain blocked until validation evidence is added");

const maquila = buildModel(data, 1, 1, "maquila");
closeTo(maquila.totalCapex, 2500000, 0.1);
closeTo(maquila.peakFunding, 17776214.0002, 0.1);
assert.equal(maquila.maquilaFee, null);
assert.ok(missingCriticalInputs(data, "maquila")
  .some((label) => label.startsWith("Tarifa de maquila")),
  "a missing maquila quote must block the maquila scenario");

const quotedData = JSON.parse(JSON.stringify(data));
quotedData.financial.produccion.costo_maquila_clp_unidad.valor = 600;
quotedData.financial.produccion.costo_maquila_clp_unidad.confianza = "VERIFICADO";
const quotedMaquila = buildModel(quotedData, 1, 1, "maquila");
closeTo(quotedMaquila.variableBase - maquila.variableBase, 600);

const pythonCheck = JSON.parse(execFileSync("python3", ["10-financiero/generar_modelo_excel.py", "--check"], {
  cwd: root,
  encoding: "utf8"
}));
const python = pythonCheck.indicadores;
const parity = {
  capexTotal: ownPlant.totalCapex,
  initialNwc: ownPlant.initialNwc,
  initialInvestment: ownPlant.initialInvestment,
  peakFunding: ownPlant.peakFunding,
  breakEvenMonth: ownPlant.breakEven,
  npv: ownPlant.npv,
  variableBase: ownPlant.variableBase,
  fixedMonthlyBase: ownPlant.fixedMonthlyBase,
  rentBase: ownPlant.rentBase,
  payrollBase: ownPlant.payrollBase,
  equipment: ownPlant.equipment,
  capacityYear: ownPlant.capacityYear
};
for (const [name, value] of Object.entries(parity)) closeTo(value, python[name], 0.11);
for (const [name, value] of Object.entries({
  totalCapex: maquila.totalCapex,
  initialInvestment: maquila.initialInvestment,
  peakFunding: maquila.peakFunding,
  npv: maquila.npv,
  variableBase: maquila.variableBase
})) closeTo(value, pythonCheck.maquila_sin_tarifa[name], 0.11);

// El simulador no puede pagar un cloneWithOverrides por cada reconstrucción:
// buildModel(data, p, v, "maquila") clona internamente y cuesta ~20x más que
// una corrida normal. Pretransformar los datos una vez y luego evaluarlos
// como "planta" tiene que dar exactamente lo mismo. Si alguien cambia
// maquilaOverrides, esta invariante cae y el atajo deja de estar licenciado.
const maquilaData = cloneWithOverrides(data, maquilaOverrides(data));
for (const [priceMultiplier, volumeMultiplier] of [[1, 1], [0.9, 1.2], [1.1, 0.8]]) {
  const fast = buildModel(maquilaData, priceMultiplier, volumeMultiplier);
  const slow = buildModel(data, priceMultiplier, volumeMultiplier, "maquila");
  for (const key of ["npv", "peakFunding", "totalCapex", "initialInvestment", "variableBase"]) {
    assert.equal(fast[key], slow[key],
      `maquila pretransformada difiere en ${key} con (${priceMultiplier}, ${volumeMultiplier})`);
  }
}

// El límite de capital NO es una hoja de parámetro: es un número plano en
// meta, sin confianza ni fuente. cloneWithOverrides sólo sabe escribir hojas
// {valor: ...}, así que el simulador lo trata como caso especial. Se afirma
// el fallo para que el caso especial quede documentado por una prueba y no
// por un comentario que nadie relee.
assert.throws(() => cloneWithOverrides(data, { "meta.restriccion_capital_clp": 3e7 }),
  /No se pudo aplicar el override/,
  "meta.restriccion_capital_clp es un número plano: debe seguir rechazándose");
assert.equal(buildModel(data).capitalLimit, 50000000);

console.log("Modelo verificado: invariantes, escenarios y paridad JS/Python correctos.");
