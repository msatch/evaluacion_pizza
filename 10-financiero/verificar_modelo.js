"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, "datos", name), "utf8"));
const source = fs.readFileSync(path.join(__dirname, "modelo.js"), "utf8");
const engine = `${source.split("async function start()")[0]}\nglobalThis.__modelApi = { buildModel, missingCriticalInputs };`;
eval(engine);

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

const ownPlant = globalThis.__modelApi.buildModel(data);
closeTo(ownPlant.npv, -91764381.4776, 0.1);
closeTo(ownPlant.peakFunding, 125493563.0002, 0.1);
assert.equal(ownPlant.capacityYear, 15840);
assert.ok(globalThis.__modelApi.missingCriticalInputs(data, "planta").length > 0,
  "the current data must remain blocked until validation evidence is added");

const maquila = globalThis.__modelApi.buildModel(data, 1, 1, "maquila");
closeTo(maquila.totalCapex, 2500000, 0.1);
closeTo(maquila.peakFunding, 17776214.0002, 0.1);
assert.equal(maquila.maquilaFee, null);
assert.ok(globalThis.__modelApi.missingCriticalInputs(data, "maquila")
  .some((label) => label.startsWith("Tarifa de maquila")),
  "a missing maquila quote must block the maquila scenario");

const quotedData = JSON.parse(JSON.stringify(data));
quotedData.financial.produccion.costo_maquila_clp_unidad.valor = 600;
quotedData.financial.produccion.costo_maquila_clp_unidad.confianza = "VERIFICADO";
const quotedMaquila = globalThis.__modelApi.buildModel(quotedData, 1, 1, "maquila");
closeTo(quotedMaquila.variableBase - maquila.variableBase, 600);

const python = JSON.parse(execFileSync("python3", ["10-financiero/generar_modelo_excel.py", "--check"], {
  cwd: root,
  encoding: "utf8"
})).indicadores;
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

console.log("Modelo verificado: invariantes, escenarios y paridad JS/Python correctos.");
