"use strict";

const $ = (id) => document.getElementById(id);
const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
const pct = (x) => `${num.format(x * 100)}%`;

const get = (obj, path, fallback = null) => {
  let current = obj;
  for (const key of path.split(".")) current = current?.[key];
  return current?.valor ?? fallback;
};

const badge = (confidence) => `<span class="b b-${confidence.toLowerCase()}">${confidence}</span>`;

function npv(rate, flows) {
  return flows.reduce((total, flow, year) => total + flow / ((1 + rate) ** year), 0);
}

function irr(flows) {
  let low = -0.99;
  let high = 10;
  let lowValue = npv(low, flows);
  let highValue = npv(high, flows);
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) return null;
  for (let i = 0; i < 240; i += 1) {
    const mid = (low + high) / 2;
    const value = npv(mid, flows);
    if (Math.abs(value) < 0.01) return mid;
    if (lowValue * value <= 0) high = mid;
    else { low = mid; lowValue = value; }
  }
  return (low + high) / 2;
}

function discountedPayback(rate, flows) {
  let cumulative = flows[0];
  for (let year = 1; year < flows.length; year += 1) {
    const discounted = flows[year] / ((1 + rate) ** year);
    const previous = cumulative;
    cumulative += discounted;
    if (cumulative >= 0) return (year - 1) + (-previous / discounted);
  }
  return null;
}

function buildModel(data, priceMultiplier = 1, volumeMultiplier = 1) {
  const { base, market, prices, inputs, local, legal, financial } = data;
  const inflation = get(financial, "modelo.inflacion_anual_pct") / 100;
  const discount = get(base, "macro.tasa_descuento_pct", get(financial, "modelo.tasa_descuento_nominal_pct")) / 100;
  const priceBase = get(prices, "precios.precio_venta_b2b_familiar_clp", get(financial, "modelo.precio_b2b_familiar_base_clp"));
  const somMonth = get(market, "mercado.som_ano1_pizzas_mes");
  const volumes = [1, 2, 3, 4, 5].map((year) => {
    const fallback = get(financial, `modelo.volumen_ano${year}_unidades`);
    if (year === 1 && somMonth !== null) return somMonth * 12 * volumeMultiplier;
    return fallback * volumeMultiplier;
  });
  const taxRates = [1, 2, 3, 4, 5].map((year) => get(financial, `modelo.impuesto_ano${year}_pct`) / 100);

  const flour = get(inputs, "insumos.harina_clp_kg") * get(financial, "producto.harina_kg_unidad");
  const sauce = get(inputs, "insumos.salsa_tomate_clp_kg") * get(financial, "producto.salsa_kg_unidad");
  const cheese = get(inputs, "insumos.mozzarella_clp_kg") * get(financial, "producto.mozzarella_kg_unidad");
  const others = get(financial, "producto.otros_ingredientes_clp_unidad");
  const waste = get(base, "produccion.merma_pct", get(financial, "producto.merma_pct")) / 100;
  const packaging = get(inputs, "insumos.envase_clp_unidad", get(financial, "producto.envase_clp_unidad"));
  const variableBase = (flour + sauce + cheese + others) * (1 + waste)
    + packaging
    + get(financial, "producto.energia_variable_clp_unidad")
    + get(financial, "producto.distribucion_variable_clp_unidad");

  const area = get(local, "local.superficie_requerida_m2", get(financial, "operacion.superficie_m2"));
  const rentBase = get(local, "local.arriendo_mensual_clp",
    area * get(local, "local.arriendo_clp_m2_mes"));
  const employerFactor = get(base, "macro.factor_costo_empresa", get(financial, "operacion.factor_costo_empresa"));
  const payrollBase = get(financial, "operacion.nomina_bruta_mensual_clp") * employerFactor;
  const otherFixedBase = ["servicios_fijos", "mantenimiento", "administracion", "ventas", "seguros"]
    .reduce((sum, item) => sum + get(financial, `operacion.${item}_mensual_clp`), 0);
  const fixedMonthlyBase = rentBase + payrollBase + otherFixedBase;

  const equipmentKeys = ["abatidor", "amasadora", "horno", "selladora_vacio", "meson_refrigerado", "congeladores", "acero_lavado_extraccion", "racks_bandejas_instrumentos"];
  const equipment = equipmentKeys.reduce((sum, key) => sum + get(financial, `inversion.${key}_clp`), 0);
  const installation = equipment * get(financial, "inversion.flete_instalacion_pct") / 100;
  const habilitation = get(local, "local.habilitacion_sanitaria_clp", get(financial, "inversion.habilitacion_sanitaria_clp"));
  const capitalBeforeContingency = equipment + installation + habilitation;
  const contingency = capitalBeforeContingency * get(financial, "inversion.contingencia_pct") / 100;
  const permits = get(legal, "capex.tramites_y_constitucion_clp", get(financial, "inversion.tramites_analisis_rotulado_clp"));
  const preoperation = get(financial, "inversion.preoperacion_clp");
  const depreciableCapex = capitalBeforeContingency + contingency;
  const totalCapex = depreciableCapex + permits + preoperation;
  const depreciation = depreciableCapex / get(financial, "inversion.vida_depreciable_anios");
  const guarantee = rentBase * get(financial, "inversion.garantia_arriendo_meses");
  const residualGross = depreciableCapex * get(financial, "inversion.valor_residual_pct") / 100;

  const receivableDays = get(prices, "precios.plazo_cobro_dias", get(financial, "operacion.dias_cuentas_cobrar"));
  const inventoryDays = get(financial, "operacion.dias_inventario");
  const payableDays = get(financial, "operacion.dias_cuentas_pagar");
  const years = volumes.map((volume, index) => {
    const escalator = (1 + inflation) ** (index + 1);
    const price = priceBase * priceMultiplier * escalator;
    const variableUnit = variableBase * escalator;
    const revenue = volume * price;
    const variableCost = volume * variableUnit;
    const fixedCost = fixedMonthlyBase * 12 * escalator;
    const nwc = revenue * receivableDays / 365
      + variableCost * inventoryDays / 365
      - variableCost * payableDays / 365;
    return { year: index + 1, volume, price, variableUnit, revenue, variableCost, fixedCost, nwc };
  });

  let taxLoss = 0;
  years.forEach((year, index) => {
    year.ebitda = year.revenue - year.variableCost - year.fixedCost;
    year.depreciation = depreciation;
    year.ebit = year.ebitda - depreciation;
    if (year.ebit < 0) {
      taxLoss += -year.ebit;
      year.taxable = 0;
      year.tax = 0;
    } else {
      const offset = Math.min(taxLoss, year.ebit);
      taxLoss -= offset;
      year.taxable = year.ebit - offset;
      year.tax = year.taxable * taxRates[index];
    }
    year.taxRate = taxRates[index];
    year.taxLossClosing = taxLoss;
  });

  const initialNwc = years[0].nwc;
  const initialInvestment = totalCapex + guarantee + initialNwc;
  const flows = [-initialInvestment];
  years.forEach((year, index) => {
    const previousNwc = index === 0 ? initialNwc : years[index - 1].nwc;
    year.deltaNwc = year.nwc - previousNwc;
    year.terminal = 0;
    if (index === years.length - 1) {
      const residualNet = residualGross * (1 - taxRates[index]);
      year.terminal = residualNet + year.nwc + guarantee;
    }
    year.fcf = year.ebitda - year.tax - year.deltaNwc + year.terminal;
    flows.push(year.fcf);
  });

  const projectNpv = npv(discount, flows);
  const projectIrr = irr(flows);
  const payback = discountedPayback(discount, flows);
  const pvInflows = flows.slice(1).reduce((sum, flow, i) => sum + flow / ((1 + discount) ** (i + 1)), 0);
  let cumulativeCash = 0;
  let minimumCumulativeCash = 0;
  flows.forEach((flow) => {
    cumulativeCash += flow;
    minimumCumulativeCash = Math.min(minimumCumulativeCash, cumulativeCash);
  });
  const peakFunding = -minimumCumulativeCash;
  const capitalLimit = base.meta.restriccion_capital_clp;
  const firstEscalator = 1 + inflation;
  const firstPrice = priceBase * priceMultiplier * firstEscalator;
  const firstVariable = variableBase * firstEscalator;
  const contribution = firstPrice - firstVariable;
  const breakEven = contribution > 0 ? years[0].fixedCost / contribution : null;

  return {
    inflation, discount, priceBase, variableBase, flour, sauce, cheese, packaging,
    area, rentBase, payrollBase, fixedMonthlyBase, equipment, installation, habilitation,
    contingency, permits, preoperation, depreciableCapex, totalCapex, guarantee, initialNwc,
    initialInvestment, depreciation, residualGross, receivableDays, years, flows,
    npv: projectNpv, irr: projectIrr, payback, profitabilityIndex: pvInflows / initialInvestment,
    peakFunding, capitalLimit,
    contribution, breakEven
  };
}

function render(data) {
  const model = buildModel(data);
  const viable = model.npv > 0 && model.irr !== null && model.irr > model.discount
    && model.peakFunding <= model.capitalLimit;
  $("decision").className = `aviso ${viable ? "aviso-clave" : "aviso-riesgo"}`;
  $("decision-title").textContent = viable ? "Viable bajo el escenario base, aún no validado" : "No viable bajo el escenario base";
  $("decision-text").innerHTML = viable
    ? `El VAN es positivo, la TIR supera la TMAR y el fondeo máximo calculado cabe bajo $50 millones. El margen de caja es ${clp.format(model.capitalLimit - model.peakFunding)}, pero la conclusión depende de volúmenes, precio, habilitación y capital de trabajo todavía etiquetados como supuestos.`
    : `El VAN no remunera la TMAR o la TIR no la supera. El escenario debe rechazarse o rediseñarse; no corresponde comparar VAN y TIR entre sí.`;

  const indicators = [
    ["Inversión inicial", clp.format(model.initialInvestment), "CAPEX + garantía + CT"],
    ["Fondeo máximo", clp.format(model.peakFunding), `límite ${clp.format(model.capitalLimit)}`],
    ["VAN a la TMAR", clp.format(model.npv), pct(model.discount)],
    ["TIR", model.irr === null ? "No calculable" : pct(model.irr), `criterio > ${pct(model.discount)}`],
    ["Payback descontado", model.payback === null ? "> 5 años" : `${num.format(model.payback)} años`, "flujo descontado"],
    ["Índice rentabilidad", num.format(model.profitabilityIndex), "criterio > 1"],
    ["Punto equilibrio", model.breakEven === null ? "Sin margen" : `${num.format(model.breakEven / 12)} pizzas/mes`, "año 1"]
  ];
  $("indicators").innerHTML = indicators.map(([label, value, note]) => `<div class="tarjeta"><div class="cifra-etiqueta">${label}</div><div class="cifra">${value}</div><div class="cifra-nota">${note}</div></div>`).join("");

  const investment = [
    ["Equipos principales y auxiliares", model.equipment],
    ["Flete, instalación y puesta en marcha", model.installation],
    ["Habilitación sanitaria", model.habilitation],
    ["Contingencia de estimación", model.contingency],
    ["Trámites, análisis y rotulado", model.permits],
    ["Preoperación y pruebas", model.preoperation],
    ["Garantía de arriendo recuperable", model.guarantee],
    ["Capital de trabajo inicial", model.initialNwc]
  ];
  $("investment-body").innerHTML = investment.map(([name, value]) => `<tr><td>${name}</td><td class="num">${clp.format(value)}</td></tr>`).join("");
  $("investment-total").textContent = clp.format(model.initialInvestment);

  $("cashflow-head").innerHTML = `<tr><th>Concepto</th><th class="num">Año 0</th>${model.years.map((y) => `<th class="num">Año ${y.year}</th>`).join("")}</tr>`;
  const cashRows = [
    ["Volumen (un.)", "—", (y) => num.format(y.volume)],
    ["Precio neto/un.", "—", (y) => clp.format(y.price)],
    ["Ingresos", "—", (y) => clp.format(y.revenue)],
    ["Costos variables", "—", (y) => clp.format(-y.variableCost)],
    ["Costos fijos", "—", (y) => clp.format(-y.fixedCost)],
    ["EBITDA", "—", (y) => clp.format(y.ebitda)],
    ["Depreciación", "—", (y) => clp.format(-y.depreciation)],
    ["EBIT", "—", (y) => clp.format(y.ebit)],
    ["Impuesto pagado", "—", (y) => clp.format(-y.tax)],
    ["Variación CT", clp.format(-model.initialNwc), (y) => clp.format(-y.deltaNwc)],
    ["Recuperaciones terminales", "—", (y) => y.terminal ? clp.format(y.terminal) : "—"],
    ["Flujo libre", clp.format(-model.initialInvestment), (y) => clp.format(y.fcf)]
  ];
  $("cashflow-body").innerHTML = cashRows.map(([label, year0, fn]) => `<tr><td>${label}</td><td class="num">${year0}</td>${model.years.map((y) => `<td class="num">${fn(y)}</td>`).join("")}</tr>`).join("");

  const priceCases = [0.9, 1, 1.1];
  const volumeCases = [0.8, 1, 1.2];
  $("sensitivity-head").innerHTML = `<tr><th>Volumen \ Precio</th>${priceCases.map((p) => `<th class="num">${pct(p - 1)}</th>`).join("")}</tr>`;
  $("sensitivity-body").innerHTML = volumeCases.map((v) => `<tr><td>${pct(v - 1)}</td>${priceCases.map((p) => {
    const scenario = buildModel(data, p, v);
    const cls = scenario.npv > 0 ? "b-verificado" : "b-supuesto";
    return `<td class="num"><span class="b ${cls}">${clp.format(scenario.npv)}</span></td>`;
  }).join("")}</tr>`).join("");

  const traces = [
    ["Precio B2B familiar", get(data.prices, "precios.precio_venta_b2b_familiar_clp"), model.priceBase, "02-competencia", get(data.prices, "precios.precio_venta_b2b_familiar_clp") === null ? "SUPUESTO" : "VERIFICADO"],
    ["SOM año 1", get(data.market, "mercado.som_ano1_pizzas_mes"), model.years[0].volume / 12, "01-mercado", get(data.market, "mercado.som_ano1_pizzas_mes") === null ? "SUPUESTO" : "ESTIMADO"],
    ["Mozzarella", get(data.inputs, "insumos.mozzarella_clp_kg"), get(data.inputs, "insumos.mozzarella_clp_kg"), "06-insumos", "ESTIMADO"],
    ["Harina", get(data.inputs, "insumos.harina_clp_kg"), get(data.inputs, "insumos.harina_clp_kg"), "06-insumos", "VERIFICADO"],
    ["Tomate", get(data.inputs, "insumos.salsa_tomate_clp_kg"), get(data.inputs, "insumos.salsa_tomate_clp_kg"), "06-insumos", "VERIFICADO"],
    ["Envase", get(data.inputs, "insumos.envase_clp_unidad"), model.packaging, "06-insumos", get(data.inputs, "insumos.envase_clp_unidad") === null ? "SUPUESTO" : "VERIFICADO"],
    ["Arriendo mensual", get(data.local, "local.arriendo_mensual_clp"), model.rentBase, "07-local", get(data.local, "local.arriendo_mensual_clp") === null ? "ESTIMADO" : "VERIFICADO"],
    ["Habilitación", get(data.local, "local.habilitacion_sanitaria_clp"), model.habilitation, "07-local", get(data.local, "local.habilitacion_sanitaria_clp") === null ? "SUPUESTO" : "VERIFICADO"],
    ["Plazo de cobro", get(data.prices, "precios.plazo_cobro_dias"), model.receivableDays, "02-competencia", get(data.prices, "precios.plazo_cobro_dias") === null ? "SUPUESTO" : "VERIFICADO"]
  ];
  $("trace-body").innerHTML = traces.map(([name, upstream, used, source, confidence]) => `<tr><td>${name}</td><td>${upstream === null ? "Pendiente" : num.format(upstream)}</td><td class="num">${num.format(used)}</td><td>${source}</td><td>${badge(confidence)}</td></tr>`).join("");

  $("cost-unit").textContent = clp.format(model.variableBase);
  $("fixed-month").textContent = clp.format(model.fixedMonthlyBase);
  $("rent-month").textContent = clp.format(model.rentBase);
  $("depreciation").textContent = clp.format(model.depreciation);
}

async function start() {
  const files = {
    base: "../datos/supuestos.json",
    market: "../datos/parametros-01-mercado.json",
    prices: "../datos/parametros-02-competencia.json",
    inputs: "../datos/parametros-06-insumos.json",
    local: "../datos/parametros-07-local-habilitacion.json",
    legal: "../datos/parametros-08-legal-normativo.json",
    financial: "../datos/parametros-10-financiero.json"
  };
  const entries = await Promise.all(Object.entries(files).map(async ([key, url]) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return [key, await response.json()];
  }));
  render(Object.fromEntries(entries));
}

start().catch((error) => {
  $("model-error").hidden = false;
  $("model-error-text").textContent = `No se pudo cargar el modelo: ${error.message}. Ábralo desde un servidor web o GitHub Pages, no mediante file://.`;
});
