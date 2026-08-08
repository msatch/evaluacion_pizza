"use strict";

// Renderizador de la etapa 10. El motor vive en motor.js y se carga antes
// que este archivo; sus funciones de nivel superior quedan visibles aquí a
// través del ámbito léxico global que comparten los scripts clásicos.

function setTextList(element, values) {
  element.replaceChildren();
  values.forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    element.append(item);
  });
}

function render(data, scenario = "planta") {
  const model = buildModel(data, 1, 1, scenario);
  const missing = missingCriticalInputs(data, scenario);
  const decisionReady = missing.length === 0;
  const viable = decisionReady && model.npv > 0 && model.irr !== null && model.irr > model.discount
    && model.peakFunding <= model.capitalLimit;
  $("decision").className = `aviso ${viable ? "aviso-clave" : "aviso-riesgo"}`;
  if (!decisionReady) {
    $("decision-title").textContent = `Escenario ${scenario}: cálculo exploratorio, no decisión de inversión`;
    $("decision-text").textContent = "El motor muestra el efecto de los supuestos heredados, pero bloquea una recomendación hasta cerrar los datos críticos listados abajo.";
  } else if (viable) {
    $("decision-title").textContent = `Escenario ${scenario}: viable bajo parámetros validados`;
    $("decision-text").textContent = `El VAN es positivo, la TIR supera la TMAR y el fondeo máximo calculado cabe bajo ${clp.format(model.capitalLimit)}. El margen de caja es ${clp.format(model.capitalLimit - model.peakFunding)}.`;
  } else {
    $("decision-title").textContent = `Escenario ${scenario}: no viable con parámetros validados`;
    $("decision-text").textContent = "El VAN no remunera la TMAR, la TIR no la supera o el fondeo excede el límite. Rediseñe o rechace esta configuración.";
  }

  $("readiness-status").textContent = decisionReady ? "Listo para decisión" : "Validación pendiente";
  $("readiness-status").className = `b ${decisionReady ? "b-verificado" : "b-pendiente"}`;
  $("readiness-count").textContent = decisionReady
    ? "Todos los parámetros críticos requeridos están informados."
    : `${missing.length} parámetros críticos requieren evidencia verificada o aprobación formal antes de decidir.`;
  setTextList($("readiness-missing"), missing.length ? missing : ["No quedan vacíos críticos para este escenario."]);
  const relevantGates = (data.gates?.gates ?? []).filter((gate) => {
    if (scenario === "planta") return true;
    return gate.id !== "G2-operacion" || gate.estado !== "CERRADO";
  });
  setTextList($("readiness-gates"), relevantGates.map((gate) =>
    `${gate.id} · ${gate.estado.replaceAll("_", " ")} — ${gate.criterio_de_salida}`));
  const scenarioLabel = scenario === "maquila" ? "Maquila" : "Planta propia";
  $("scenario-name").textContent = scenarioLabel;
  $("scenario-note").textContent = scenario === "maquila"
    ? (model.maquilaFee === null
      ? "Cota superior: aún no incorpora una tarifa real de maquila."
      : `Incluye tarifa de maquila de ${clp.format(model.maquilaFee)} por pizza.`)
    : "Mantiene la capacidad, equipos y habilitación de la planta estudiada.";

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
    const sensitivityScenario = buildModel(data, p, v, scenario);
    const cls = sensitivityScenario.npv > 0 ? "b-verificado" : "b-supuesto";
    return `<td class="num"><span class="b ${cls}">${clp.format(sensitivityScenario.npv)}</span></td>`;
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
    // Con el arriendo pendiente, el valor usado sale de superficie × $/m². La
    // superficie es un stub de la etapa 10 (SUPUESTO) y el $/m² es ESTIMADO:
    // la confianza efectiva es la MÁS DÉBIL de las dos, no la del $/m².
    ["Arriendo mensual", get(data.local, "local.arriendo_mensual_clp"), model.rentBase, "07-local", conf(data.local, "local.arriendo_mensual_clp", "SUPUESTO")],
    ["Habilitación", get(data.local, "local.habilitacion_sanitaria_clp"), model.habilitation, "07-local", conf(data.local, "local.habilitacion_sanitaria_clp")],
    ["Nómina bruta mensual", get(data.base, "rrhh.nomina_bruta_mensual_clp"), model.payrollGross, "09-rrhh", conf(data.base, "rrhh.nomina_bruta_mensual_clp")],
    ["Factor costo empresa", get(data.base, "macro.factor_costo_empresa"), model.employerFactor, "09-rrhh", conf(data.base, "macro.factor_costo_empresa")],
    ["Distribución por unidad", get(data.base, "producto.distribucion_variable_clp_unidad"), model.distribution, "11-comercial", conf(data.base, "producto.distribucion_variable_clp_unidad")],
    ["Rampa año 2", get(data.base, "comercial.rampa_ano2_factor"), model.years[1].volume / model.years[0].volume, "11-comercial", conf(data.base, "comercial.rampa_ano2_factor")],
    ["TMAR", get(data.base, "macro.tasa_descuento_pct"), model.discount * 100, "12-riesgos", conf(data.base, "macro.tasa_descuento_pct")],
    ...(scenario === "maquila" ? [["Tarifa de maquila", get(data.financial, "produccion.costo_maquila_clp_unidad"), model.maquilaFee, "13-financiamiento", conf(data.financial, "produccion.costo_maquila_clp_unidad")]] : []),
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
    financial: "../datos/parametros-10-financiero.json",
    gates: "../datos/gates-decision.json"
  };
  const entries = await Promise.all(Object.entries(files).map(async ([key, url]) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return [key, await response.json()];
  }));
  const data = Object.fromEntries(entries);
  const controls = document.querySelectorAll('input[name="scenario"]');
  const redraw = () => render(data, document.querySelector('input[name="scenario"]:checked').value);
  controls.forEach((control) => control.addEventListener("change", redraw));
  redraw();
}

start().catch((error) => {
  $("model-error").hidden = false;
  $("model-error-text").textContent = `No se pudo cargar el modelo: ${error.message}. Ábralo desde un servidor web o GitHub Pages, no mediante file://.`;
});
