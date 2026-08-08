"use strict";

// ==========================================================================
// Especificación de los controles del simulador (etapa 10).
//
// Datos puros: sin DOM, sin fetch. Se carga tanto en el navegador como en
// verificar_simulador.js, que comprueba contra los JSON reales que cada
// `ruta` sigue aterrizando en el bucket que el motor efectivamente lee.
// Ese es el modo de falla que importa: si una ruta se desalinea, el control
// se mueve y el modelo no cambia — un simulador que miente en silencio.
//
// Campos:
//   id        clave corta y estable; es lo que viaja en el hash de la URL.
//   ruta      lo que se escribe vía cloneWithOverrides (busca por ruta en
//             todos los buckets, así que no lleva prefijo de archivo).
//   lectura   [[bucket, ruta], ...] en el MISMO orden de precedencia que usa
//             el motor. Sirve para mostrar el valor y la confianza vigentes,
//             y para saber si el número que se ve viene de la etapa dueña o
//             de un stub de la etapa 10.
//   derivar   sólo cuando el fallback del motor no es una lectura simple
//             (arriendo = m² × $/m²; rampa = forma implícita en los stubs).
//   inerte    razón por la que el control hoy no mueve el VAN. No se oculta:
//             el hecho de que no mueva nada ES un hallazgo.
//   plano     la hoja no es {valor: ...} sino un número suelto.
// ==========================================================================

const GRUPOS = [
  { id: "palancas", titulo: "Palancas principales", abierto: true,
    nota: "Los seis parámetros que más mueven el resultado." },
  { id: "demanda", titulo: "Demanda y comercial", abierto: false,
    nota: "Nivel del año 1 y forma de la rampa. La etapa 03 fija el nivel; la 11, la forma." },
  { id: "produccion", titulo: "Producción", abierto: false,
    nota: "Capacidad y merma. La capacidad instalada hoy topa el volumen en los cinco años." },
  { id: "variable", titulo: "Costo variable por pizza", abierto: false,
    nota: "Precios de insumo y gramajes. El gramaje mueve tanto como el precio." },
  { id: "fijo", titulo: "Costo fijo mensual", abierto: false,
    nota: "Cinco líneas separadas y no un agregado: repartir un total inventaría una distribución." },
  { id: "capex", titulo: "Inversión (CAPEX)", abierto: false,
    nota: "Envolvente de equipos, habilitación y los porcentajes que se aplican encima." },
  { id: "macro", titulo: "Macro y caja", abierto: false,
    nota: "Tasa, inflación, ciclo de caja y la restricción de capital del titular." },
  { id: "maquila", titulo: "Maquila", abierto: false,
    nota: "Sólo aplica al escenario de maquila." }
];

const PARAMETROS = [
  // ------------------------------------------------------ palancas ----
  {
    id: "precio", grupo: "palancas", etiqueta: "Precio B2B familiar",
    ruta: "precios.precio_venta_b2b_familiar_clp",
    lectura: [["prices", "precios.precio_venta_b2b_familiar_clp"],
              ["financial", "modelo.precio_b2b_familiar_base_clp"]],
    formato: "clp", unidad: "CLP netos por pizza",
    min: 2000, max: 9000, paso: 50,
    nota: "Anclas publicadas: PF Listo familiar $3.017 (retail) y foodservice $5.034."
  },
  {
    id: "som", grupo: "palancas", etiqueta: "SOM año 1",
    ruta: "mercado.som_ano1_pizzas_mes",
    lectura: [["market", "mercado.som_ano1_pizzas_mes"]],
    derivar: (data, get) => get(data.financial, "modelo.volumen_ano1_unidades") / 12,
    derivarOrigen: "financial · modelo.volumen_ano1_unidades ÷ 12",
    derivarConfianza: "SUPUESTO",
    formato: "int", unidad: "pizzas por mes",
    min: 200, max: 6000, paso: 25,
    // Con la capacidad vigente (60/día × 22 días = 1.320/mes) cualquier SOM
    // por encima de ese techo se pierde. No es que la demanda no importe: es
    // que la planta no la puede producir. Se rotula, no se esconde.
    inerteTopado: "La capacidad instalada topa el volumen: subir el SOM no cambia nada hasta ampliarla.",
    nota: "Fija el NIVEL del año 1. La rampa sólo le da forma a los años 2-5."
  },
  {
    id: "cap", grupo: "palancas", etiqueta: "Capacidad instalada",
    ruta: "produccion.capacidad_instalada_pizzas_dia",
    lectura: [["base", "produccion.capacidad_instalada_pizzas_dia"]],
    formato: "int", unidad: "pizzas por día",
    min: 10, max: 400, paso: 5,
    forzadoEnMaquila: 100000,
    nota: "Techo duro sobre el volumen de los cinco años."
  },
  {
    id: "moz", grupo: "palancas", etiqueta: "Mozzarella",
    ruta: "insumos.mozzarella_clp_kg",
    lectura: [["inputs", "insumos.mozzarella_clp_kg"]],
    formato: "clp2", unidad: "CLP por kg",
    min: 4000, max: 16000, paso: 50,
    nota: "La línea de insumo más pesada: $840 de los $2.433 de costo variable."
  },
  {
    id: "hab", grupo: "palancas", etiqueta: "Habilitación sanitaria",
    ruta: "local.habilitacion_sanitaria_clp",
    lectura: [["local", "local.habilitacion_sanitaria_clp"],
              ["financial", "inversion.habilitacion_sanitaria_clp"]],
    formato: "clp", unidad: "CLP",
    min: 0, max: 40000000, paso: 250000,
    forzadoEnMaquila: 0,
    nota: "La partida de CAPEX con más incertidumbre: sin visita técnica ni presupuesto."
  },
  {
    id: "tmar", grupo: "palancas", etiqueta: "TMAR (tasa de descuento)",
    ruta: "macro.tasa_descuento_pct",
    lectura: [["base", "macro.tasa_descuento_pct"],
              ["financial", "modelo.tasa_descuento_nominal_pct"]],
    formato: "pct", unidad: "% nominal anual",
    min: 5, max: 45, paso: 0.1,
    nota: "Nominal, consistente con flujos nominales. No mueve el fondeo máximo, que va sin descontar."
  },

  // ------------------------------------------------------- demanda ----
  ...[2, 3, 4, 5].map((anio) => ({
    id: `r${anio}`, grupo: "demanda", etiqueta: `Rampa año ${anio}`,
    ruta: `comercial.rampa_ano${anio}_factor`,
    lectura: [["base", `comercial.rampa_ano${anio}_factor`]],
    derivar: (data, get) => get(data.financial, `modelo.volumen_ano${anio}_unidades`)
      / get(data.financial, "modelo.volumen_ano1_unidades"),
    derivarOrigen: `financial · volumen_ano${anio} ÷ volumen_ano1`,
    derivarConfianza: "SUPUESTO",
    formato: "dec2", unidad: "× el volumen del año 1",
    min: 1, max: anio <= 3 ? 5 : 6, paso: 0.05,
    // Misma razón que el SOM: el año 1 ya sale topado, así que multiplicarlo
    // no produce ni una pizza más mientras la capacidad no suba.
    inerteTopado: "La capacidad instalada ya topa el año 1: la rampa no agrega volumen."
  })),
  {
    id: "cobro", grupo: "demanda", etiqueta: "Plazo de cobro",
    ruta: "precios.plazo_cobro_dias",
    lectura: [["prices", "precios.plazo_cobro_dias"],
              ["financial", "operacion.dias_cuentas_cobrar"]],
    formato: "int", unidad: "días",
    min: 0, max: 120, paso: 1,
    nota: "HORECA declara 30-60 días. Financia capital de trabajo, no resultado."
  },

  // ---------------------------------------------------- producción ----
  {
    id: "dias", grupo: "produccion", etiqueta: "Días de operación",
    ruta: "produccion.dias_operacion_mes",
    lectura: [["base", "produccion.dias_operacion_mes"]],
    formato: "int", unidad: "días por mes",
    min: 10, max: 30, paso: 1,
    nota: "Colineal con la capacidad diaria: ambos escalan la capacidad anual."
  },
  {
    id: "merma", grupo: "produccion", etiqueta: "Merma",
    ruta: "produccion.merma_pct",
    lectura: [["base", "produccion.merma_pct"], ["financial", "producto.merma_pct"]],
    formato: "pct", unidad: "% sobre ingredientes",
    min: 0, max: 25, paso: 0.5
  },

  // ------------------------------------------------ costo variable ----
  {
    id: "harina", grupo: "variable", etiqueta: "Harina",
    ruta: "insumos.harina_clp_kg",
    lectura: [["inputs", "insumos.harina_clp_kg"]],
    formato: "clp", unidad: "CLP por kg", min: 400, max: 3000, paso: 10
  },
  {
    id: "salsa", grupo: "variable", etiqueta: "Salsa de tomate",
    ruta: "insumos.salsa_tomate_clp_kg",
    lectura: [["inputs", "insumos.salsa_tomate_clp_kg"]],
    formato: "clp2", unidad: "CLP por kg", min: 1000, max: 6000, paso: 20
  },
  {
    id: "envase", grupo: "variable", etiqueta: "Envase",
    ruta: "insumos.envase_clp_unidad",
    lectura: [["inputs", "insumos.envase_clp_unidad"],
              ["financial", "producto.envase_clp_unidad"]],
    formato: "clp", unidad: "CLP por pizza", min: 100, max: 1200, paso: 10
  },
  {
    id: "otros", grupo: "variable", etiqueta: "Otros ingredientes",
    ruta: "producto.otros_ingredientes_clp_unidad",
    lectura: [["base", "producto.otros_ingredientes_clp_unidad"],
              ["financial", "producto.otros_ingredientes_clp_unidad"]],
    formato: "clp", unidad: "CLP por pizza", min: 0, max: 1500, paso: 10
  },
  {
    id: "energia", grupo: "variable", etiqueta: "Energía variable",
    ruta: "producto.energia_variable_clp_unidad",
    lectura: [["base", "producto.energia_variable_clp_unidad"],
              ["financial", "producto.energia_variable_clp_unidad"]],
    formato: "clp", unidad: "CLP por pizza", min: 0, max: 800, paso: 5,
    nota: "En maquila, la tarifa de maquila se suma sobre esta misma línea."
  },
  {
    id: "distrib", grupo: "variable", etiqueta: "Distribución",
    ruta: "producto.distribucion_variable_clp_unidad",
    lectura: [["base", "producto.distribucion_variable_clp_unidad"],
              ["financial", "producto.distribucion_variable_clp_unidad"]],
    formato: "clp", unidad: "CLP por pizza", min: 0, max: 1200, paso: 10
  },
  {
    id: "gmoz", grupo: "variable", etiqueta: "Gramaje de mozzarella",
    ruta: "producto.mozzarella_kg_unidad",
    lectura: [["base", "producto.mozzarella_kg_unidad"],
              ["financial", "producto.mozzarella_kg_unidad"]],
    formato: "dec3", unidad: "kg por pizza", min: 0.05, max: 0.2, paso: 0.005,
    nota: "Misma palanca que el precio de la mozzarella, y es la que mueve el piloto de la etapa 04."
  },
  {
    id: "gharina", grupo: "variable", etiqueta: "Gramaje de harina",
    ruta: "producto.harina_kg_unidad",
    lectura: [["base", "producto.harina_kg_unidad"], ["financial", "producto.harina_kg_unidad"]],
    formato: "dec3", unidad: "kg por pizza", min: 0.08, max: 0.3, paso: 0.001
  },
  {
    id: "gsalsa", grupo: "variable", etiqueta: "Gramaje de salsa",
    ruta: "producto.salsa_kg_unidad",
    lectura: [["base", "producto.salsa_kg_unidad"], ["financial", "producto.salsa_kg_unidad"]],
    formato: "dec3", unidad: "kg por pizza", min: 0.03, max: 0.2, paso: 0.005
  },

  // ---------------------------------------------------- costo fijo ----
  {
    id: "arriendo", grupo: "fijo", etiqueta: "Arriendo mensual",
    ruta: "local.arriendo_mensual_clp",
    lectura: [["local", "local.arriendo_mensual_clp"]],
    derivar: (data, get) => get(data.financial, "operacion.superficie_m2")
      * get(data.local, "local.arriendo_clp_m2_mes"),
    derivarOrigen: "120 m² (SUPUESTO) × $6.331/m² (ESTIMADO)",
    // La confianza efectiva es la MÁS DÉBIL de las dos entradas. La etapa 10
    // rotulaba esta fila como ESTIMADO, que sobrevendía la superficie.
    derivarConfianza: "SUPUESTO",
    formato: "clp", unidad: "CLP por mes", min: 200000, max: 3000000, paso: 10000
  },
  {
    id: "personal", grupo: "fijo", etiqueta: "Costo de personal",
    ruta: "rrhh.costo_personal_mensual_regimen_clp",
    lectura: [["base", "rrhh.costo_personal_mensual_regimen_clp"]],
    formato: "clp", unidad: "CLP por mes", min: 500000, max: 6000000, paso: 10000,
    nota: "Ya consolidado: incluye el retiro de la titular, que no paga cotización patronal."
  },
  { id: "servicios", grupo: "fijo", etiqueta: "Servicios fijos",
    ruta: "operacion.servicios_fijos_mensual_clp",
    lectura: [["base", "operacion.servicios_fijos_mensual_clp"],
              ["financial", "operacion.servicios_fijos_mensual_clp"]],
    formato: "clp", unidad: "CLP por mes", min: 0, max: 800000, paso: 5000 },
  { id: "mant", grupo: "fijo", etiqueta: "Mantenimiento",
    ruta: "operacion.mantenimiento_mensual_clp",
    lectura: [["base", "operacion.mantenimiento_mensual_clp"],
              ["financial", "operacion.mantenimiento_mensual_clp"]],
    formato: "clp", unidad: "CLP por mes", min: 0, max: 600000, paso: 5000 },
  { id: "admin", grupo: "fijo", etiqueta: "Administración",
    ruta: "operacion.administracion_mensual_clp",
    lectura: [["base", "operacion.administracion_mensual_clp"],
              ["financial", "operacion.administracion_mensual_clp"]],
    formato: "clp", unidad: "CLP por mes", min: 0, max: 800000, paso: 5000 },
  { id: "ventas", grupo: "fijo", etiqueta: "Ventas",
    ruta: "operacion.ventas_mensual_clp",
    lectura: [["base", "operacion.ventas_mensual_clp"],
              ["financial", "operacion.ventas_mensual_clp"]],
    formato: "clp", unidad: "CLP por mes", min: 0, max: 1000000, paso: 5000 },
  { id: "seguros", grupo: "fijo", etiqueta: "Seguros",
    ruta: "operacion.seguros_mensual_clp",
    lectura: [["base", "operacion.seguros_mensual_clp"],
              ["financial", "operacion.seguros_mensual_clp"]],
    formato: "clp", unidad: "CLP por mes", min: 0, max: 500000, paso: 5000 },

  // --------------------------------------------------------- capex ----
  {
    id: "equipos", grupo: "capex", etiqueta: "Envolvente de equipos",
    ruta: "capex.equipamiento_base_clp",
    lectura: [["base", "capex.equipamiento_base_clp"]],
    formato: "clp", unidad: "CLP", min: 2000000, max: 40000000, paso: 100000,
    forzadoEnMaquila: 0,
    nota: "Etapa 05: austero $5,98M · base $10,12M · holgado $16,75M."
  },
  {
    id: "conting", grupo: "capex", etiqueta: "Contingencia",
    ruta: "inversion.contingencia_pct",
    lectura: [["base", "inversion.contingencia_pct"],
              ["financial", "inversion.contingencia_pct"]],
    formato: "pct", unidad: "% sobre equipos + habilitación", min: 0, max: 50, paso: 1,
    nota: "Estimación AACE clase 5: la contingencia se declara, no se esconde."
  },
  {
    id: "flete", grupo: "capex", etiqueta: "Flete e instalación",
    ruta: "inversion.flete_instalacion_pct",
    lectura: [["base", "inversion.flete_instalacion_pct"],
              ["financial", "inversion.flete_instalacion_pct"]],
    formato: "pct", unidad: "% sobre equipos", min: 0, max: 40, paso: 1
  },
  {
    id: "vida", grupo: "capex", etiqueta: "Vida depreciable",
    ruta: "inversion.vida_depreciable_anios",
    lectura: [["base", "inversion.vida_depreciable_anios"],
              ["financial", "inversion.vida_depreciable_anios"]],
    formato: "int", unidad: "años", min: 3, max: 20, paso: 1,
    inerte: "El proyecto no paga impuesto en ningún año: no hay escudo que mover."
  },
  {
    id: "residual", grupo: "capex", etiqueta: "Valor residual",
    ruta: "inversion.valor_residual_pct",
    lectura: [["base", "inversion.valor_residual_pct"],
              ["financial", "inversion.valor_residual_pct"]],
    formato: "pct", unidad: "% del CAPEX depreciable", min: 0, max: 60, paso: 1
  },

  // --------------------------------------------------------- macro ----
  {
    id: "inflacion", grupo: "macro", etiqueta: "Inflación anual",
    ruta: "modelo.inflacion_anual_pct",
    lectura: [["financial", "modelo.inflacion_anual_pct"]],
    formato: "pct", unidad: "%", min: 0, max: 15, paso: 0.1,
    nota: "Escala precio y costo simétricamente: casi no mueve el VAN por sí sola."
  },
  {
    id: "inv", grupo: "macro", etiqueta: "Días de inventario",
    ruta: "operacion.dias_inventario",
    lectura: [["financial", "operacion.dias_inventario"]],
    formato: "int", unidad: "días", min: 0, max: 90, paso: 1
  },
  {
    id: "pago", grupo: "macro", etiqueta: "Días de pago a proveedores",
    ruta: "operacion.dias_cuentas_pagar",
    lectura: [["financial", "operacion.dias_cuentas_pagar"]],
    formato: "int", unidad: "días", min: 0, max: 90, paso: 1
  },
  {
    id: "limite", grupo: "macro", etiqueta: "Límite de capital",
    ruta: "meta.restriccion_capital_clp",
    // Número suelto en meta, no una hoja {valor, confianza, fuente}.
    // cloneWithOverrides no sabe escribirlo: el simulador lo trata aparte.
    plano: true, bucketPlano: "base",
    lectura: [],
    formato: "clp", unidad: "CLP", min: 10000000, max: 300000000, paso: 1000000,
    nota: "Restricción del titular, no una medición: no tiene confianza ni fuente."
  },

  // ------------------------------------------------------- maquila ----
  {
    id: "tarifa", grupo: "maquila", etiqueta: "Tarifa de maquila",
    ruta: "produccion.costo_maquila_clp_unidad",
    lectura: [["financial", "produccion.costo_maquila_clp_unidad"]],
    soloMaquila: true,
    formato: "clp", unidad: "CLP por pizza", min: 0, max: 2500, paso: 10,
    nota: "Umbrales publicados por la etapa 13: $810 contra el techo de $50M, $560 contra el de $30M."
  }
];

// Las seis palancas sobre las que corre el tornado y el buscador de quiebres.
const PALANCAS_TORNADO = ["precio", "som", "cap", "moz", "hab", "tmar",
  "personal", "arriendo", "equipos", "envase", "gmoz", "cobro", "conting", "merma"];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GRUPOS, PARAMETROS, PALANCAS_TORNADO };
}
