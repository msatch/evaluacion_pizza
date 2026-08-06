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

// Lee la confianza declarada en la hoja. Si la hoja no existe o su valor es
// null, el modelo está usando un fallback de la etapa 10: eso es SUPUESTO.
const conf = (obj, path, fallback = "SUPUESTO") => {
  let current = obj;
  for (const key of path.split(".")) current = current?.[key];
  if (!current || current.valor === null || current.valor === undefined) return fallback;
  return current.confianza ?? fallback;
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
  // La rampa comercial es FORMA, no nivel. La etapa 03 fija el nivel del año 1
  // (SOM validado); la etapa 11 fija la forma de los años 2-5. Si 11 no la ha
  // fijado, se usa la forma implícita en los stubs de la etapa 10 —declarada
  // como supuesto— en vez de su nivel absoluto. Sustituir solo el año 1 dejaba
  // el año 2 anclado a 42.000 y un SOM sobre ~3.500/mes invertía la rampa.
  const stubYear1 = get(financial, "modelo.volumen_ano1_unidades");
  const year1Volume = somMonth !== null ? somMonth * 12 : stubYear1;
  const volumes = [1, 2, 3, 4, 5].map((year) => {
    if (year === 1) return year1Volume * volumeMultiplier;
    const rampFallback = get(financial, `modelo.volumen_ano${year}_unidades`) / stubYear1;
    const ramp = get(base, `comercial.rampa_ano${year}_factor`, rampFallback);
    return year1Volume * ramp * volumeMultiplier;
  });
  // Restricción de capacidad: solo muerde si la etapa 04 la publicó.
  const capacityDay = get(base, "produccion.capacidad_instalada_pizzas_dia");
  const operatingDays = get(base, "produccion.dias_operacion_mes");
  const capacityYear = capacityDay !== null && operatingDays !== null
    ? capacityDay * operatingDays * 12
    : null;
  if (capacityYear !== null) {
    for (let i = 0; i < volumes.length; i += 1) volumes[i] = Math.min(volumes[i], capacityYear);
  }
  const taxRates = [1, 2, 3, 4, 5].map((year) => get(financial, `modelo.impuesto_ano${year}_pct`) / 100);

  // Los gramajes los formula la etapa 04; los precios/kg los publica la 06.
  const gram = (key) => get(base, `producto.${key}`, get(financial, `producto.${key}`));
  const flour = get(inputs, "insumos.harina_clp_kg") * gram("harina_kg_unidad");
  const sauce = get(inputs, "insumos.salsa_tomate_clp_kg") * gram("salsa_kg_unidad");
  const cheese = get(inputs, "insumos.mozzarella_clp_kg") * gram("mozzarella_kg_unidad");
  const others = gram("otros_ingredientes_clp_unidad");
  const waste = get(base, "produccion.merma_pct", get(financial, "producto.merma_pct")) / 100;
  const packaging = get(inputs, "insumos.envase_clp_unidad", get(financial, "producto.envase_clp_unidad"));
  const energy = get(base, "producto.energia_variable_clp_unidad",
    get(financial, "producto.energia_variable_clp_unidad"));
  const distribution = get(base, "producto.distribucion_variable_clp_unidad",
    get(financial, "producto.distribucion_variable_clp_unidad"));
  const variableBase = (flour + sauce + cheese + others) * (1 + waste)
    + packaging + energy + distribution;

  const area = get(local, "local.superficie_requerida_m2", get(financial, "operacion.superficie_m2"));
  const rentBase = get(local, "local.arriendo_mensual_clp",
    area * get(local, "local.arriendo_clp_m2_mes"));
  const employerFactor = get(base, "macro.factor_costo_empresa", get(financial, "operacion.factor_costo_empresa"));
  const payrollGross = get(base, "rrhh.nomina_bruta_mensual_clp",
    get(financial, "operacion.nomina_bruta_mensual_clp"));
  // La etapa 09 separa la nómina de dependientes del retiro de la titular, que
  // no paga cotización patronal. Multiplicar solo la nómina por el factor
  // borraría el retiro. Cuando 09 publica el costo de personal ya consolidado,
  // manda esa línea y NO se vuelve a aplicar el factor.
  const payrollTotal = get(base, "rrhh.costo_personal_mensual_regimen_clp");
  const payrollBase = payrollTotal !== null ? payrollTotal : payrollGross * employerFactor;
  const otherFixedBase = ["servicios_fijos", "mantenimiento", "administracion", "ventas", "seguros"]
    .reduce((sum, item) => sum + get(base, `operacion.${item}_mensual_clp`,
      get(financial, `operacion.${item}_mensual_clp`)), 0);
  const fixedMonthlyBase = rentBase + payrollBase + otherFixedBase;

  const equipmentKeys = ["abatidor", "amasadora", "horno", "selladora_vacio", "meson_refrigerado", "congeladores", "acero_lavado_extraccion", "racks_bandejas_instrumentos"];
  const equipmentLines = equipmentKeys.reduce((sum, key) => sum + get(financial, `inversion.${key}_clp`), 0);
  // La etapa 05 publica el envolvente; mientras esté pendiente manda la suma
  // línea a línea que armó la etapa 10 con precios de publicación.
  const equipment = get(base, "capex.equipamiento_base_clp", equipmentLines);
  const installation = equipment * get(base, "inversion.flete_instalacion_pct",
    get(financial, "inversion.flete_instalacion_pct")) / 100;
  const habilitation = get(local, "local.habilitacion_sanitaria_clp", get(financial, "inversion.habilitacion_sanitaria_clp"));
  const capitalBeforeContingency = equipment + installation + habilitation;
  const contingency = capitalBeforeContingency * get(base, "inversion.contingencia_pct",
    get(financial, "inversion.contingencia_pct")) / 100;
  const permits = get(legal, "capex.tramites_y_constitucion_clp", get(financial, "inversion.tramites_analisis_rotulado_clp"));
  const preoperation = get(financial, "inversion.preoperacion_clp");
  const depreciableCapex = capitalBeforeContingency + contingency;
  const totalCapex = depreciableCapex + permits + preoperation;
  const depreciation = depreciableCapex / get(base, "inversion.vida_depreciable_anios",
    get(financial, "inversion.vida_depreciable_anios"));
  const guarantee = rentBase * get(financial, "inversion.garantia_arriendo_meses");
  const residualGross = depreciableCapex * get(base, "inversion.valor_residual_pct",
    get(financial, "inversion.valor_residual_pct")) / 100;

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
      // El impuesto de enajenación grava el RESULTADO (precio menos valor
      // libro), no el precio de venta. Con vida depreciable mayor que el
      // horizonte el valor libro supera al residual y la venta da pérdida.
      // Esa pérdida engrosa la pérdida tributaria acumulada, pero al cerrar
      // el horizonte no queda renta futura contra la cual imputarla: no
      // genera caja. Reconocer aquí un escudo sobrestimaría el proyecto.
      const bookValue = Math.max(0, depreciableCapex - depreciation * years.length);
      const disposalResult = residualGross - bookValue;
      let disposalTax = 0;
      if (disposalResult > 0) {
        const offset = Math.min(taxLoss, disposalResult);
        taxLoss -= offset;
        disposalTax = (disposalResult - offset) * taxRates[index];
      }
      year.bookValue = bookValue;
      year.disposalResult = disposalResult;
      year.disposalTax = disposalTax;
      year.terminal = residualGross - disposalTax + year.nwc + guarantee;
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
    inflation, discount, priceBase, variableBase, flour, sauce, cheese, packaging, waste, energy, distribution,
    area, rentBase, payrollGross, employerFactor, payrollBase, fixedMonthlyBase, equipment, installation, habilitation,
    contingency, permits, preoperation, depreciableCapex, totalCapex, guarantee, initialNwc,
    initialInvestment, depreciation, residualGross, receivableDays, years, flows,
    npv: projectNpv, irr: projectIrr, payback, profitabilityIndex: pvInflows / initialInvestment,
    peakFunding, capitalLimit,
    contribution, breakEven,
    capacityYear, capacityUse: capacityYear === null ? null : volumes[volumes.length - 1] / capacityYear,
    breakEvenUse: capacityYear === null || breakEven === null ? null : breakEven / capacityYear
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
    ["Punto equilibrio", model.breakEven === null ? "Sin margen" : `${num.format(model.breakEven / 12)} pizzas/mes`,
      model.breakEvenUse === null ? "año 1 · % de capacidad pendiente de etapa 04" : `año 1 · ${pct(model.breakEvenUse)} de la capacidad`],
    ["Uso de capacidad", model.capacityUse === null ? "Pendiente" : pct(model.capacityUse),
      model.capacityYear === null ? "etapa 04 no ha publicado capacidad" : "año 5 sobre capacidad instalada"]
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

  // La confianza se lee de la hoja de origen, nunca se escribe a mano: esta es
  // la tabla cuyo único trabajo es cumplir la regla 1 de trazabilidad.
  const traces = [
    ["Precio B2B familiar", get(data.prices, "precios.precio_venta_b2b_familiar_clp"), model.priceBase, "02-competencia", conf(data.prices, "precios.precio_venta_b2b_familiar_clp")],
    ["SOM año 1", get(data.market, "mercado.som_ano1_pizzas_mes"), model.years[0].volume / 12, "01-mercado · 03-validación", conf(data.market, "mercado.som_ano1_pizzas_mes")],
    ["Mozzarella", get(data.inputs, "insumos.mozzarella_clp_kg"), get(data.inputs, "insumos.mozzarella_clp_kg"), "06-insumos", conf(data.inputs, "insumos.mozzarella_clp_kg")],
    ["Harina", get(data.inputs, "insumos.harina_clp_kg"), get(data.inputs, "insumos.harina_clp_kg"), "06-insumos", conf(data.inputs, "insumos.harina_clp_kg")],
    ["Tomate", get(data.inputs, "insumos.salsa_tomate_clp_kg"), get(data.inputs, "insumos.salsa_tomate_clp_kg"), "06-insumos", conf(data.inputs, "insumos.salsa_tomate_clp_kg")],
    ["Envase", get(data.inputs, "insumos.envase_clp_unidad"), model.packaging, "06-insumos", conf(data.inputs, "insumos.envase_clp_unidad")],
    ["Merma", get(data.base, "produccion.merma_pct"), model.waste * 100, "04-producto-proceso", conf(data.base, "produccion.merma_pct")],
    ["Capacidad instalada", get(data.base, "produccion.capacidad_instalada_pizzas_dia"), model.capacityYear === null ? null : model.capacityYear / 12, "04-producto-proceso", conf(data.base, "produccion.capacidad_instalada_pizzas_dia")],
    ["Envolvente de equipos", get(data.base, "capex.equipamiento_base_clp"), model.equipment, "05-maquinaria", conf(data.base, "capex.equipamiento_base_clp")],
    ["Arriendo mensual", get(data.local, "local.arriendo_mensual_clp"), model.rentBase, "07-local", conf(data.local, "local.arriendo_mensual_clp", "ESTIMADO")],
    ["Habilitación", get(data.local, "local.habilitacion_sanitaria_clp"), model.habilitation, "07-local", conf(data.local, "local.habilitacion_sanitaria_clp")],
    ["Nómina bruta mensual", get(data.base, "rrhh.nomina_bruta_mensual_clp"), model.payrollGross, "09-rrhh", conf(data.base, "rrhh.nomina_bruta_mensual_clp")],
    ["Factor costo empresa", get(data.base, "macro.factor_costo_empresa"), model.employerFactor, "09-rrhh", conf(data.base, "macro.factor_costo_empresa")],
    ["Distribución por unidad", get(data.base, "producto.distribucion_variable_clp_unidad"), model.distribution, "11-comercial", conf(data.base, "producto.distribucion_variable_clp_unidad")],
    ["Rampa año 2", get(data.base, "comercial.rampa_ano2_factor"), model.years[1].volume / model.years[0].volume, "11-comercial", conf(data.base, "comercial.rampa_ano2_factor")],
    ["TMAR", get(data.base, "macro.tasa_descuento_pct"), model.discount * 100, "12-riesgos", conf(data.base, "macro.tasa_descuento_pct")],
    ["Plazo de cobro", get(data.prices, "precios.plazo_cobro_dias"), model.receivableDays, "02-competencia · 03-validación", conf(data.prices, "precios.plazo_cobro_dias")]
  ];
  $("trace-body").innerHTML = traces.map(([name, upstream, used, source, confidence]) => `<tr><td>${name}</td><td>${upstream === null ? "Pendiente" : num.format(upstream)}</td><td class="num">${used === null ? "Pendiente" : num.format(used)}</td><td>${source}</td><td>${badge(confidence)}</td></tr>`).join("");

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
