// ==========================================================================
// Motor económico del proyecto — microfábrica de pizzas congeladas B2B.
//
// Este archivo es la FUENTE DE VERDAD del cálculo en el navegador y el
// ESPEJO LÍNEA A LÍNEA de build_model() en generar_modelo_excel.py. Si se
// toca uno hay que tocar el otro en el mismo commit; verificar_modelo.js
// comprueba la paridad JS/Python y falla si divergen.
//
// No contiene DOM: lo consumen modelo.js (etapa 10), simulador.js y el
// arnés de Node. Extraído de modelo.js sin cambiar una sola operación.
// ==========================================================================

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

function cloneWithOverrides(data, overrides) {
  const clone = JSON.parse(JSON.stringify(data));
  for (const [path, value] of Object.entries(overrides)) {
    let applied = false;
    for (const source of Object.values(clone)) {
      if (!source || typeof source !== "object") continue;
      const parts = path.split(".");
      let current = source;
      for (const part of parts.slice(0, -1)) {
        if (!current || typeof current !== "object" || !(part in current)) {
          current = null;
          break;
        }
        current = current[part];
      }
      const last = parts.at(-1);
      if (current && typeof current[last] === "object" && current[last] !== null) {
        current[last].valor = value;
        applied = true;
      }
    }
    if (!applied) throw new Error(`No se pudo aplicar el override ${path}.`);
  }
  return clone;
}

function maquilaOverrides(data) {
  const baseEnergy = get(data.base, "producto.energia_variable_clp_unidad",
    get(data.financial, "producto.energia_variable_clp_unidad"));
  const maquilaFee = get(data.financial, "produccion.costo_maquila_clp_unidad", 0);
  return {
    "capex.equipamiento_base_clp": 0,
    "local.habilitacion_sanitaria_clp": 0,
    "produccion.capacidad_instalada_pizzas_dia": 100000,
    // El fee se agrega a la energía base porque ambos son costos variables por
    // unidad. Con tarifa pendiente (= null), este escenario es una cota, no
    // una proyección aprobable.
    "producto.energia_variable_clp_unidad": baseEnergy + maquilaFee
  };
}

function buildModel(data, priceMultiplier = 1, volumeMultiplier = 1, scenario = "planta") {
  const overrides = scenario === "maquila" ? maquilaOverrides(data) : {};
  const source = Object.keys(overrides).length ? cloneWithOverrides(data, overrides) : data;
  const { base, market, prices, inputs, local, legal, financial } = source;
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
    breakEvenUse: capacityYear === null || breakEven === null ? null : breakEven / capacityYear,
    scenario,
    maquilaFee: scenario === "maquila"
      ? get(data.financial, "produccion.costo_maquila_clp_unidad")
      : null
  };
}

const criticalInputs = {
  planta: [
    ["market", "mercado.som_ano1_pizzas_mes", "Volumen vendido del año 1"],
    ["prices", "precios.precio_venta_b2b_familiar_clp", "Precio B2B familiar"],
    ["prices", "precios.plazo_cobro_dias", "Plazo de cobro"],
    ["inputs", "insumos.mozzarella_clp_kg", "Cotización industrial de mozzarella"],
    ["inputs", "insumos.envase_clp_unidad", "Costo de envase"],
    ["base", "produccion.merma_pct", "Merma medida en piloto"],
    ["base", "produccion.capacidad_instalada_pizzas_dia", "Capacidad demostrada"],
    ["local", "local.arriendo_mensual_clp", "Arriendo del local"],
    ["local", "local.habilitacion_sanitaria_clp", "Presupuesto de habilitación"]
  ],
  maquila: [
    ["market", "mercado.som_ano1_pizzas_mes", "Volumen vendido del año 1"],
    ["prices", "precios.precio_venta_b2b_familiar_clp", "Precio B2B familiar"],
    ["prices", "precios.plazo_cobro_dias", "Plazo de cobro"],
    ["inputs", "insumos.mozzarella_clp_kg", "Cotización industrial de mozzarella"],
    ["inputs", "insumos.envase_clp_unidad", "Costo de envase"],
    ["base", "produccion.merma_pct", "Merma medida en piloto"],
    ["financial", "produccion.costo_maquila_clp_unidad", "Tarifa de maquila"]
  ]
};

function entryAt(obj, path) {
  let current = obj;
  for (const key of path.split(".")) current = current?.[key];
  return current && typeof current === "object" ? current : null;
}

function missingCriticalInputs(data, scenario) {
  return criticalInputs[scenario]
    .filter(([bucket, path]) => {
      const item = entryAt(data[bucket], path);
      return item?.valor === null || item?.valor === undefined
        || (item?.confianza !== "VERIFICADO" && item?.aprobado_para_decision !== true);
    })
    .map(([bucket, path, label]) => {
      const item = entryAt(data[bucket], path);
      if (item?.valor === null || item?.valor === undefined) return label;
      return `${label} (${item.confianza?.toLowerCase() ?? "sin estado"})`;
    });
}

// Puente para Node. En un script clásico del navegador `module` no existe,
// así que esta línea queda inerte. Evita que el arnés tenga que recortar el
// archivo con split()/eval(): un error de sintaxis ahora falla fuerte en vez
// de truncar el motor en silencio.
// Ojo: se rompería si alguien agregara un package.json con "type": "module".
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    npv, irr, discountedPayback, cloneWithOverrides, maquilaOverrides,
    buildModel, criticalInputs, entryAt, missingCriticalInputs,
    get, conf, badge, clp, num, pct
  };
}
