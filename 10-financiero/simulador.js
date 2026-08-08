"use strict";

// ==========================================================================
// Simulador financiero — etapa 10.
//
// Capa de interacción sobre motor.js. NO contiene una sola operación del
// modelo: todo cálculo pasa por buildModel(). Lo que hay aquí es aplicar
// overrides, dibujar y no mentir sobre lo que significa el resultado.
//
// El motor y la especificación de controles se cargan antes que este archivo
// (scripts clásicos, ámbito léxico global compartido).
// ==========================================================================

const s$ = (id) => document.getElementById(id);
const clpc = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const dec = (d) => new Intl.NumberFormat("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });
const ent = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

const ARCHIVOS = {
  base: "supuestos.json",
  market: "parametros-01-mercado.json",
  prices: "parametros-02-competencia.json",
  inputs: "parametros-06-insumos.json",
  local: "parametros-07-local-habilitacion.json",
  legal: "parametros-08-legal-normativo.json",
  financial: "parametros-10-financiero.json",
  gates: "gates-decision.json",
  casob: "caso-b-activos.json"
};

const estado = {
  datos: null,          // los JSON tal cual salieron del dossier
  linea: null,          // modelo base intocado, para los deltas
  overrides: {},        // { id: valor }
  escenario: "planta",
  preset: "dossier",
  metricaTornado: "npv",
  borrador: null,       // clon reutilizable para el tornado y la bisección
  hojas: new Map()      // id -> [hojas mutables dentro del borrador]
};

const porId = new Map(PARAMETROS.map((p) => [p.id, p]));

// -------------------------------------------------------------- formato ----

function fmt(valor, formato) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  switch (formato) {
    case "clp": return clpc.format(Math.round(valor));
    case "clp2": return clpc.format(valor).replace(/\s?$/, "") + (valor % 1 ? "" : "");
    case "pct": return `${dec(valor % 1 ? 2 : 0).format(valor)}%`;
    case "int": return ent.format(Math.round(valor));
    case "dec2": return dec(2).format(valor);
    case "dec3": return dec(3).format(valor);
    default: return ent.format(valor);
  }
}

// Etiquetas de eje: los CLP de este proyecto son millones, y "$-125.493.563"
// no cabe ni se lee. Se compacta a millones y se conserva el signo.
function compacto(v) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${v < 0 ? "−" : ""}$${dec(abs >= 1e7 ? 0 : 1).format(abs / 1e6)}M`;
  if (abs >= 1e3) return `${v < 0 ? "−" : ""}$${dec(0).format(abs / 1e3)}k`;
  return `${v < 0 ? "−" : ""}$${dec(0).format(abs)}`;
}
// Hasta dos decimales, sin ceros de relleno: la TMAR es 20,46% y mostrarla
// como 20,5% haría dudar de si el motor está usando el valor del dossier.
const pctf = (x) => `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(x * 100)}%`;
const firma = (v, f = compacto) => (v > 0 ? "+" : "") + f(v);

// ------------------------------------------------- resolución efectiva ----
// Espeja la precedencia del motor: manda la etapa dueña, si no el stub de la
// etapa 10, si no el derivado. verificar_simulador.js comprueba que esto siga
// coincidiendo con lo que buildModel() realmente lee.

function resolver(datos, p) {
  for (const [bucket, ruta] of p.lectura) {
    const nodo = nodoEn(datos[bucket], ruta);
    if (nodo && nodo.valor !== null && nodo.valor !== undefined) {
      return { valor: nodo.valor, confianza: nodo.confianza ?? "SUPUESTO", origen: `${bucket} · ${ruta}` };
    }
  }
  if (p.derivar) {
    return { valor: p.derivar(datos, get), confianza: p.derivarConfianza ?? "SUPUESTO", origen: p.derivarOrigen };
  }
  if (p.plano) {
    return { valor: datos[p.bucketPlano].meta.restriccion_capital_clp, confianza: "RESTRICCIÓN", origen: "meta · restricción del titular" };
  }
  return { valor: null, confianza: "PENDIENTE", origen: p.lectura.map(([b, r]) => `${b} · ${r}`).join(" → ") };
}

function nodoEn(obj, ruta) {
  let actual = obj;
  for (const clave of ruta.split(".")) actual = actual?.[clave];
  return actual && typeof actual === "object" ? actual : null;
}

const valorDossier = (p) => resolver(estado.datos, p).valor;
const valorActual = (p) => (p.id in estado.overrides ? estado.overrides[p.id] : valorDossier(p));

// ------------------------------------------------- aplicar overrides ----
// cloneWithOverrides (motor.js) hace todo el trabajo salvo un caso: el límite
// de capital es un número suelto en meta, no una hoja {valor}. Se trata
// aparte en vez de reimplementar el recorrido, que podría desviarse.

function aplicar(datos, overrides) {
  const hojas = {};
  let limite;
  for (const [id, valor] of Object.entries(overrides)) {
    const p = porId.get(id);
    if (!p) continue;
    if (p.plano) limite = valor;
    else hojas[p.ruta] = valor;
  }
  const salida = Object.keys(hojas).length ? cloneWithOverrides(datos, hojas) : structuredClone(datos);
  if (limite !== undefined) salida.base.meta.restriccion_capital_clp = limite;
  return salida;
}

// Devuelve las hojas mutables de una ruta dentro de un clon concreto, para
// poder mover un parámetro sin volver a clonar los 140 KB de JSON.
function hojasDe(datos, ruta) {
  const partes = ruta.split(".");
  const salida = [];
  for (const bucket of Object.values(datos)) {
    if (!bucket || typeof bucket !== "object") continue;
    let actual = bucket;
    for (const parte of partes.slice(0, -1)) {
      if (!actual || typeof actual !== "object" || !(parte in actual)) { actual = null; break; }
      actual = actual[parte];
    }
    const ultima = partes.at(-1);
    if (actual && typeof actual[ultima] === "object" && actual[ultima] !== null) salida.push(actual[ultima]);
  }
  return salida;
}

// El escenario de maquila se pretransforma UNA vez: buildModel(..., "maquila")
// clona internamente y cuesta ~20× una corrida normal. verificar_modelo.js
// comprueba que evaluar los datos pretransformados como "planta" da un
// resultado idéntico; esa invariante es la que licencia este atajo.
function prepararBorrador() {
  const conOverrides = aplicar(estado.datos, estado.overrides);
  const borrador = estado.escenario === "maquila"
    ? cloneWithOverrides(conOverrides, maquilaOverrides(conOverrides))
    : conOverrides;
  estado.borrador = borrador;
  estado.hojas = new Map();
  for (const p of PARAMETROS) {
    if (p.plano) continue;
    estado.hojas.set(p.id, hojasDe(borrador, p.ruta));
  }
  return borrador;
}

// Corre el modelo con un parámetro movido, mutando el borrador en sitio y
// restaurándolo. O(1) por corrida en vez de un clon completo.
function conParametro(p, valor, priceMult = 1, volMult = 1) {
  if (p.plano) {
    const previo = estado.borrador.base.meta.restriccion_capital_clp;
    estado.borrador.base.meta.restriccion_capital_clp = valor;
    const m = buildModel(estado.borrador, priceMult, volMult);
    estado.borrador.base.meta.restriccion_capital_clp = previo;
    return m;
  }
  const hojas = estado.hojas.get(p.id) ?? [];
  const previos = hojas.map((h) => h.valor);
  hojas.forEach((h) => { h.valor = valor; });
  const m = buildModel(estado.borrador, priceMult, volMult);
  hojas.forEach((h, i) => { h.valor = previos[i]; });
  return m;
}

// ------------------------------------------------------------ escalas ----

const M = { l: 68, r: 20, t: 18, b: 34 };
const W = 720;

function escala(min, max, desde, hasta) {
  const span = (max - min) || 1;
  return (v) => desde + ((v - min) / span) * (hasta - desde);
}

// Marcas redondas: 1/2/5 × 10^n. Sin esto los ejes muestran −91.764.381.
function marcas(min, max, objetivo = 5) {
  const span = (max - min) || 1;
  const crudo = span / objetivo;
  const mag = 10 ** Math.floor(Math.log10(crudo));
  const norm = crudo / mag;
  const paso = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
  const salida = [];
  for (let t = Math.ceil(min / paso) * paso; t <= max + paso * 1e-9; t += paso) salida.push(t);
  return salida;
}

// Extiende el dominio para que el cero siempre esté dentro: un gráfico de
// flujos que no muestra el cero no deja leer el signo.
function dominio(valores, incluirCero = true) {
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  if (incluirCero) { min = Math.min(min, 0); max = Math.max(max, 0); }
  if (min === max) { min -= 1; max += 1; }
  const aire = (max - min) * 0.08;
  return [min - aire, max + aire];
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function ejeY(alto, dom, y, formato = compacto) {
  return marcas(dom[0], dom[1]).map((t) => `
    <line class="g-rejilla" x1="${M.l}" x2="${W - M.r}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"></line>
    <text class="g-texto" x="${M.l - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${esc(formato(t))}</text>`).join("");
}

// -------------------------------------------------------- gráficos ----

// 1 · Caja acumulada contra el límite. El gráfico que decide: la línea cruza
//     el techo de capital entre el año 0 y el 1 y no vuelve.
function dibujarCaja(modelo) {
  const fig = s$("g-caja");
  const svg = fig.querySelector("svg");
  const alto = 300;
  let acum = 0;
  const puntos = modelo.flows.map((f, i) => { acum += f; return { x: i, y: acum }; });
  const limite = -modelo.capitalLimit;
  const dom = dominio([...puntos.map((p) => p.y), limite]);
  const x = escala(0, puntos.length - 1, M.l, W - M.r);
  const y = escala(dom[0], dom[1], alto - M.b, M.t);

  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join("");
  const area = `${linea}L${x(puntos.length - 1).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;
  const valle = puntos.reduce((a, b) => (b.y < a.y ? b : a));
  const excede = modelo.peakFunding > modelo.capitalLimit;

  svg.innerHTML = `
    <title>Caja acumulada</title>
    <desc>${esc(`Caja acumulada sin descontar a lo largo de cinco años. El punto más bajo es ${compacto(valle.y)} en el año ${valle.x}, contra un límite de capital de ${compacto(limite)}.`)}</desc>
    ${ejeY(alto, dom, y)}
    <line class="g-cero" x1="${M.l}" x2="${W - M.r}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"></line>
    <path class="g-area" d="${area}" fill="var(--g-neg)"></path>
    <path class="g-linea" d="${linea}" stroke="var(--g-neg)"></path>
    <line class="g-umbral" x1="${M.l}" x2="${W - M.r}" y1="${y(limite).toFixed(1)}" y2="${y(limite).toFixed(1)}"></line>
    <text class="g-marca" x="${W - M.r}" y="${(y(limite) - 7).toFixed(1)}" text-anchor="end" fill="var(--riesgo)">Límite de capital ${esc(compacto(limite))}</text>
    ${puntos.map((p) => `<circle class="g-punto" cx="${x(p.x).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="4" fill="var(--g-neg)"></circle>`).join("")}
    <text class="g-texto-fuerte" x="${x(valle.x).toFixed(1)}" y="${(y(valle.y) + 18).toFixed(1)}" text-anchor="${valle.x === puntos.length - 1 ? "end" : "middle"}">${esc(compacto(valle.y))}</text>
    ${puntos.map((p) => `<text class="g-texto" x="${x(p.x).toFixed(1)}" y="${alto - M.b + 16}" text-anchor="middle">Año ${p.x}</text>`).join("")}
    ${excede ? `<text class="g-marca" x="${M.l}" y="${alto - 4}" fill="var(--riesgo)">Excede el límite en ${esc(compacto(modelo.peakFunding - modelo.capitalLimit))}</text>` : ""}`;

  pista(fig, puntos.map((p) => ({
    cx: x(p.x), cy: y(p.y),
    titulo: `Año ${p.x}`, valor: clpc.format(Math.round(p.y)),
    nota: p.y < limite ? "bajo el límite de capital" : ""
  })));
  tablaAlterna(fig, puntos.map((p) => [`Año ${p.x}`, clpc.format(Math.round(p.y))]));
}

// 2 · FCF por año. Signo por posición respecto del cero; el color es canal
//     secundario, y la leyenda lo nombra.
function dibujarFcf(modelo) {
  const fig = s$("g-fcf");
  const svg = fig.querySelector("svg");
  const alto = 300;
  const valores = modelo.flows;
  const dom = dominio(valores);
  const y = escala(dom[0], dom[1], alto - M.b, M.t);
  const banda = (W - M.r - M.l) / valores.length;
  const ancho = Math.min(24, banda * 0.55);
  const r = 4;

  const barras = valores.map((v, i) => {
    const cx = M.l + banda * (i + 0.5);
    const y0 = y(0);
    const y1 = y(v);
    const h = Math.abs(y1 - y0);
    const arriba = v >= 0;
    const top = arriba ? y1 : y0;
    const color = arriba ? "var(--g-pos)" : "var(--g-neg)";
    // Extremo redondeado 4px del lado del dato, recto en la línea base.
    const rr = Math.min(r, h);
    const d = arriba
      ? `M${cx - ancho / 2},${y0}L${cx - ancho / 2},${top + rr}Q${cx - ancho / 2},${top} ${cx - ancho / 2 + rr},${top}L${cx + ancho / 2 - rr},${top}Q${cx + ancho / 2},${top} ${cx + ancho / 2},${top + rr}L${cx + ancho / 2},${y0}Z`
      : `M${cx - ancho / 2},${y0}L${cx - ancho / 2},${top + h - rr}Q${cx - ancho / 2},${top + h} ${cx - ancho / 2 + rr},${top + h}L${cx + ancho / 2 - rr},${top + h}Q${cx + ancho / 2},${top + h} ${cx + ancho / 2},${top + h - rr}L${cx + ancho / 2},${y0}Z`;
    return { cx, d, color, v, i, etiquetaY: arriba ? top - 6 : top + h + 13 };
  });

  svg.innerHTML = `
    <title>Flujo de caja libre por año</title>
    <desc>${esc(`Flujo de caja libre de los años 0 a 5: ${valores.map((v, i) => `año ${i} ${compacto(v)}`).join(", ")}.`)}</desc>
    ${ejeY(alto, dom, y)}
    ${barras.map((b) => `<path d="${b.d}" fill="${b.color}"></path>`).join("")}
    <line class="g-cero" x1="${M.l}" x2="${W - M.r}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"></line>
    ${barras.map((b) => `<text class="g-texto" x="${b.cx.toFixed(1)}" y="${b.etiquetaY.toFixed(1)}" text-anchor="middle">${esc(compacto(b.v))}</text>`).join("")}
    ${barras.map((b) => `<text class="g-texto" x="${b.cx.toFixed(1)}" y="${alto - M.b + 16}" text-anchor="middle">Año ${b.i}</text>`).join("")}`;

  pista(fig, barras.map((b) => ({
    cx: b.cx, cy: y(Math.max(0, b.v)),
    titulo: `Año ${b.i}`, valor: clpc.format(Math.round(b.v)),
    nota: b.v >= 0 ? "entrada de caja" : "salida de caja"
  })));
  tablaAlterna(fig, valores.map((v, i) => [`Año ${i}`, clpc.format(Math.round(v))]));
}

// 3 · Perfil VAN vs tasa. Cero reconstrucciones: sólo redescuenta los flujos.
function dibujarPerfil(modelo) {
  const fig = s$("g-perfil");
  const svg = fig.querySelector("svg");
  const alto = 300;
  const puntos = [];
  for (let i = 0; i <= 60; i += 1) {
    const tasa = i / 100;
    puntos.push({ tasa, van: npv(tasa, modelo.flows) });
  }
  const dom = dominio(puntos.map((p) => p.van));
  const x = escala(0, 0.6, M.l, W - M.r);
  const y = escala(dom[0], dom[1], alto - M.b, M.t);
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(p.tasa).toFixed(1)},${y(p.van).toFixed(1)}`).join("");
  const vanTmar = npv(modelo.discount, modelo.flows);
  const cruza = modelo.irr !== null && modelo.irr >= 0 && modelo.irr <= 0.6;

  svg.innerHTML = `
    <title>VAN según la tasa de descuento</title>
    <desc>${esc(`Curva del VAN entre 0% y 60%. A la TMAR de ${pctf(modelo.discount)} el VAN es ${compacto(vanTmar)}. ${cruza ? `Cruza cero en la TIR, ${pctf(modelo.irr)}.` : "No cruza cero: la TIR no existe en este rango."}`)}</desc>
    ${ejeY(alto, dom, y)}
    <line class="g-cero" x1="${M.l}" x2="${W - M.r}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"></line>
    <path class="g-linea" d="${linea}" stroke="var(--g-pos)"></path>
    <line class="g-rejilla" x1="${x(modelo.discount).toFixed(1)}" x2="${x(modelo.discount).toFixed(1)}" y1="${M.t}" y2="${alto - M.b}" stroke="var(--acento)"></line>
    <circle class="g-punto" cx="${x(modelo.discount).toFixed(1)}" cy="${y(vanTmar).toFixed(1)}" r="4.5" fill="var(--acento)"></circle>
    <text class="g-texto-fuerte" x="${(x(modelo.discount) + 8).toFixed(1)}" y="${(y(vanTmar) - 9).toFixed(1)}">TMAR ${esc(pctf(modelo.discount))} · ${esc(compacto(vanTmar))}</text>
    ${cruza ? `<circle class="g-punto" cx="${x(modelo.irr).toFixed(1)}" cy="${y(0).toFixed(1)}" r="4.5" fill="var(--ok)"></circle>
      <text class="g-texto-fuerte" x="${(x(modelo.irr) + 8).toFixed(1)}" y="${(y(0) - 9).toFixed(1)}">TIR ${esc(pctf(modelo.irr))}</text>`
      : `<text class="g-marca" x="${W - M.r}" y="${M.t + 12}" text-anchor="end" fill="var(--riesgo)">Sin cruce: la TIR no existe</text>`}
    ${[0, 0.15, 0.3, 0.45, 0.6].map((t) => `<text class="g-texto" x="${x(t).toFixed(1)}" y="${alto - M.b + 16}" text-anchor="middle">${esc(pctf(t))}</text>`).join("")}`;

  pista(fig, puntos.filter((_, i) => i % 3 === 0).map((p) => ({
    cx: x(p.tasa), cy: y(p.van),
    titulo: `Tasa ${pctf(p.tasa)}`, valor: clpc.format(Math.round(p.van))
  })));
  tablaAlterna(fig, puntos.filter((_, i) => i % 6 === 0).map((p) => [pctf(p.tasa), clpc.format(Math.round(p.van))]));
}

// 4 · Tornado. Recalcula en vivo con el atajo de mutación en sitio.
function calcularTornado() {
  const centro = buildModel(estado.borrador);
  const filas = [];
  for (const id of PALANCAS_TORNADO) {
    const p = porId.get(id);
    if (!p || (p.soloMaquila && estado.escenario !== "maquila")) continue;
    // En maquila, maquilaOverrides fuerza estos tres: moverlos no dice nada.
    if (estado.escenario === "maquila" && p.forzadoEnMaquila !== undefined) continue;
    const actual = valorActual(p);
    if (!Number.isFinite(actual) || actual === 0) continue;
    const bajo = conParametro(p, actual * 0.8);
    const alto = conParametro(p, actual * 1.2);
    filas.push({
      p, actual,
      npv: [bajo.npv - centro.npv, alto.npv - centro.npv],
      peakFunding: [-(bajo.peakFunding - centro.peakFunding), -(alto.peakFunding - centro.peakFunding)]
    });
  }
  return { centro, filas };
}

function dibujarTornado(tornado) {
  const fig = s$("g-tornado");
  const svg = fig.querySelector("svg");
  const metrica = estado.metricaTornado;
  const ml = 168;

  // Sin recorte. Una palanca inerte queda ABAJO al ordenar por swing, así que
  // cortar la cola borra justamente las filas que hay que explicar: el SOM no
  // mueve nada porque la capacidad lo topa, no porque la demanda dé igual.
  // El alto crece con las filas para que ninguna quede fuera del viewBox.
  const filas = tornado.filas
    .map((f) => ({ ...f, d: f[metrica], rango: Math.max(...f[metrica].map(Math.abs)) }))
    .sort((a, b) => b.rango - a.rango);
  const alto = M.t + M.b + Math.max(filas.length, 1) * 28;
  svg.setAttribute("viewBox", `0 0 ${W} ${alto}`);
  svg.style.aspectRatio = `${W} / ${alto}`;
  const tope = Math.max(...filas.map((f) => f.rango), 1);
  const x = escala(-tope, tope, ml, W - M.r);
  const banda = (alto - M.t - M.b) / Math.max(filas.length, 1);
  const grosor = Math.min(20, banda * 0.6);

  const cuerpo = filas.map((f, i) => {
    const cy = M.t + banda * (i + 0.5);
    const inerte = f.rango < 1;
    // Por qué no mueve: la restricción de capacidad, una razón estructural
    // del parámetro, o simplemente que este indicador no lo ve (la TMAR no
    // toca el fondeo máximo, que va sin descontar). Rotular mal es peor que
    // no rotular.
    const razon = f.p.inerteTopado
      ? "sin efecto — restricción de capacidad activa"
      : f.p.inerte
        ? "sin efecto — no hay impuesto que escudar"
        : `sin efecto sobre el ${metrica === "npv" ? "VAN" : "fondeo máximo"}`;
    const segmentos = f.d.map((v, k) => {
      if (Math.abs(v) < 1) return "";
      const x0 = x(0);
      const x1 = x(v);
      const izq = Math.min(x0, x1);
      const w = Math.abs(x1 - x0);
      // Hueco de 2px en el color de superficie contra el eje cero, para que
      // las dos mitades no se toquen.
      const ajuste = v > 0 ? 1 : -1;
      const color = v > 0 ? "var(--g-pos)" : "var(--g-neg)";
      return `<rect x="${(izq + (ajuste > 0 ? 1 : 0)).toFixed(1)}" y="${(cy - grosor / 2).toFixed(1)}" width="${Math.max(0, w - 1).toFixed(1)}" height="${grosor.toFixed(1)}" rx="3" fill="${color}" data-k="${k}"></rect>`;
    }).join("");
    const etiqueta = `${f.p.etiqueta}`;
    return `
      <text class="g-texto" x="${ml - 10}" y="${(cy + 3.5).toFixed(1)}" text-anchor="end">${esc(etiqueta.length > 26 ? etiqueta.slice(0, 25) + "…" : etiqueta)}</text>
      ${segmentos}
      ${inerte ? `<text class="g-marca" x="${(x(0) + 6).toFixed(1)}" y="${(cy + 3.5).toFixed(1)}" fill="var(--alerta)">${esc(razon)}</text>` : ""}`;
  }).join("");

  const nombre = metrica === "npv" ? "VAN" : "fondeo máximo";
  svg.innerHTML = `
    <title>Sensibilidad por parámetro</title>
    <desc>${esc(`Cambio en el ${nombre} al mover cada parámetro ±20%. ${filas.slice(0, 3).map((f) => `${f.p.etiqueta}: ${compacto(f.rango)}`).join("; ")}.`)}</desc>
    ${marcas(-tope, tope, 4).map((t) => `
      <line class="g-rejilla" x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${M.t}" y2="${alto - M.b}"></line>
      <text class="g-texto" x="${x(t).toFixed(1)}" y="${alto - M.b + 16}" text-anchor="middle">${esc(compacto(t))}</text>`).join("")}
    ${cuerpo}
    <line class="g-cero" x1="${x(0).toFixed(1)}" x2="${x(0).toFixed(1)}" y1="${M.t}" y2="${alto - M.b}"></line>
    <text class="g-marca" x="${W - M.r}" y="${alto - 4}" text-anchor="end">Mejor ${nombre} →</text>`;

  pista(fig, filas.flatMap((f, i) => {
    const cy = M.t + banda * (i + 0.5);
    return f.d.map((v, k) => ({
      cx: (x(0) + x(v)) / 2, cy,
      titulo: f.p.etiqueta,
      valor: `${k === 0 ? "−20%" : "+20%"}: ${firma(v)}`,
      nota: f.rango < 1 ? (f.p.inerteTopado ?? f.p.inerte ?? "") : `${nombre} de referencia ${compacto(tornado.centro[metrica])}`
    }));
  }));
  tablaAlterna(fig, filas.map((f) => [f.p.etiqueta, firma(f.d[0]), firma(f.d[1]), compacto(f.rango)]));
}

// ------------------------------------------------- pista y tabla alterna ----
// La pista sólo enriquece: todo valor está además en la tabla "Ver datos", así
// que nada queda detrás del puntero. Vive en un div hermano y no dentro del
// SVG, porque el SVG se reescribe entero en cada cuadro.

function pista(fig, objetivos) {
  const svg = fig.querySelector("svg");
  const caja = fig.querySelector(".pista");
  fig._objetivos = objetivos;
  if (fig._pistaLista) return;
  fig._pistaLista = true;

  const mover = (ev) => {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const px = ((ev.clientX - rect.left) / rect.width) * vb.width;
    const py = ((ev.clientY - rect.top) / rect.height) * vb.height;
    let mejor = null;
    let mejorD = Infinity;
    for (const o of fig._objetivos ?? []) {
      const d = (o.cx - px) ** 2 + ((o.cy - py) * 0.35) ** 2;
      if (d < mejorD) { mejorD = d; mejor = o; }
    }
    if (!mejor || mejorD > 90 ** 2) { caja.dataset.visible = "false"; return; }
    caja.dataset.visible = "true";
    caja.innerHTML = `<div class="pista-titulo">${esc(mejor.titulo)}</div>
      <div class="pista-valor">${esc(mejor.valor)}</div>
      ${mejor.nota ? `<div class="pista-nota">${esc(mejor.nota)}</div>` : ""}`;
    caja.style.left = `${(mejor.cx / vb.width) * rect.width + svg.offsetLeft}px`;
    caja.style.top = `${(mejor.cy / vb.height) * rect.height + svg.offsetTop}px`;
  };
  svg.addEventListener("pointermove", mover);
  svg.addEventListener("pointerleave", () => { caja.dataset.visible = "false"; });
}

function tablaAlterna(fig, filas) {
  const cuerpo = fig.querySelector(".tabla-alterna tbody");
  if (!cuerpo) return;
  cuerpo.innerHTML = filas.map((f) =>
    `<tr><td>${esc(f[0])}</td>${f.slice(1).map((c) => `<td class="num">${esc(c)}</td>`).join("")}</tr>`).join("");
}

// ------------------------------------------------------------ medidor ----

function dibujarMedidor(modelo) {
  const pista = s$("medidor-pista");
  if (modelo.breakEven === null || modelo.capacityYear === null) {
    pista.innerHTML = "";
    pista.setAttribute("aria-valuetext", "no calculable");
    s$("medidor-texto").textContent = modelo.breakEven === null
      ? "Sin margen de contribución: a este precio y costo no hay volumen que alcance el equilibrio."
      : "La etapa 04 no ha publicado capacidad: no se puede comparar el equilibrio contra ella.";
    s$("medidor-izq").textContent = "—";
    s$("medidor-der").textContent = "—";
    return;
  }
  const uso = modelo.breakEvenUse;
  const tope = Math.max(uso, 1);
  const anchoCap = (1 / tope) * 100;
  const anchoEq = (Math.min(uso, tope) / tope) * 100;
  const excede = uso > 1;

  pista.innerHTML = `
    <div class="medidor-relleno" style="width:${Math.min(anchoEq, anchoCap).toFixed(1)}%"></div>
    ${excede ? `<div class="medidor-exceso" style="left:${anchoCap.toFixed(1)}%;width:${(anchoEq - anchoCap).toFixed(1)}%"></div>` : ""}
    <div class="medidor-marca" style="left:${anchoCap.toFixed(1)}%"></div>`;
  pista.setAttribute("aria-valuenow", Math.round(uso * 100));
  pista.setAttribute("aria-valuetext",
    `el equilibrio exige el ${Math.round(uso * 100)}% de la capacidad instalada`);
  s$("medidor-texto").innerHTML = excede
    ? `El equilibrio exige <strong>${pctf(uso)}</strong> de la capacidad instalada: con esta estructura la planta no puede producir lo que necesita vender para no perder plata.`
    : `El equilibrio ocupa <strong>${pctf(uso)}</strong> de la capacidad instalada, y queda holgura para crecer.`;
  s$("medidor-izq").textContent = `Equilibrio: ${ent.format(Math.round(modelo.breakEven / 12))} pizzas/mes`;
  s$("medidor-der").textContent = `Capacidad: ${ent.format(Math.round(modelo.capacityYear / 12))} pizzas/mes`;
}

// -------------------------------------------------------------- kpis ----

function dibujarKpis(modelo) {
  const b = estado.linea;
  const mejorSiSube = (v, base) => (v > base ? "mejor" : v < base ? "peor" : "");
  const fichas = [
    { et: "VAN a la TMAR", v: clpc.format(Math.round(modelo.npv)), d: modelo.npv - b.npv, dir: mejorSiSube(modelo.npv, b.npv), nota: `a ${pctf(modelo.discount)}` },
    { et: "Fondeo máximo", v: clpc.format(Math.round(modelo.peakFunding)), d: -(modelo.peakFunding - b.peakFunding), dir: mejorSiSube(-modelo.peakFunding, -b.peakFunding),
      nota: modelo.peakFunding > modelo.capitalLimit
        ? `excede el límite en ${compacto(modelo.peakFunding - modelo.capitalLimit)}`
        : `cabe bajo ${compacto(modelo.capitalLimit)}` },
    { et: "TIR", v: modelo.irr === null ? null : pctf(modelo.irr), nulo: "No existe",
      nota: modelo.irr === null ? "los flujos no cambian de signo" : `criterio > ${pctf(modelo.discount)}` },
    { et: "Payback descontado", v: modelo.payback === null ? null : `${dec(1).format(modelo.payback)} años`, nulo: "> 5 años", nota: "sobre flujo descontado" },
    { et: "Índice de rentabilidad", v: dec(2).format(modelo.profitabilityIndex), d: modelo.profitabilityIndex - b.profitabilityIndex, dir: mejorSiSube(modelo.profitabilityIndex, b.profitabilityIndex), fd: (x) => dec(2).format(x), nota: "criterio > 1" },
    { et: "Equilibrio mensual", v: modelo.breakEven === null ? null : `${ent.format(Math.round(modelo.breakEven / 12))} u`, nulo: "Sin margen",
      nota: modelo.breakEvenUse === null ? "capacidad pendiente" : `${pctf(modelo.breakEvenUse)} de la capacidad` },
    { et: "Inversión inicial", v: clpc.format(Math.round(modelo.initialInvestment)), d: -(modelo.initialInvestment - b.initialInvestment), dir: mejorSiSube(-modelo.initialInvestment, -b.initialInvestment), nota: "CAPEX + garantía + CT" },
    { et: "Uso de capacidad", v: modelo.capacityUse === null ? null : pctf(modelo.capacityUse), nulo: "Pendiente", nota: "año 5 sobre capacidad instalada" }
  ];

  s$("kpis").innerHTML = fichas.map((f) => {
    const hayDelta = f.d !== undefined && Math.abs(f.d) > 1e-9 && Object.keys(estado.overrides).length > 0;
    const delta = hayDelta
      ? `<div class="kpi-delta ${f.dir ? `kpi-delta-${f.dir}` : ""}">${esc(firma(f.d, f.fd ?? compacto))} vs dossier</div>`
      : "";
    return `<div class="kpi">
      <div class="kpi-etiqueta">${esc(f.et)}</div>
      <div class="kpi-valor${f.v === null ? " kpi-valor-nulo" : ""}">${esc(f.v ?? f.nulo)}</div>
      ${delta}
      <div class="kpi-nota">${esc(f.nota)}</div>
    </div>`;
  }).join("");
}

// ------------------------------------------------------------ tablas ----

function dibujarTablas(modelo) {
  const inversion = [
    ["Equipos principales y auxiliares", modelo.equipment],
    ["Flete, instalación y puesta en marcha", modelo.installation],
    ["Habilitación sanitaria", modelo.habilitation],
    ["Contingencia de estimación", modelo.contingency],
    ["Trámites, análisis y rotulado", modelo.permits],
    ["Preoperación y pruebas", modelo.preoperation],
    ["Garantía de arriendo recuperable", modelo.guarantee],
    ["Capital de trabajo inicial", modelo.initialNwc]
  ];
  s$("inversion-cuerpo").innerHTML = inversion.map(([n, v]) =>
    `<tr><td>${esc(n)}</td><td class="num">${clpc.format(Math.round(v))}</td></tr>`).join("");
  s$("inversion-total").textContent = clpc.format(Math.round(modelo.initialInvestment));

  s$("flujo-cabecera").innerHTML = `<tr><th>Concepto</th><th class="num">Año 0</th>${modelo.years.map((y) => `<th class="num">Año ${y.year}</th>`).join("")}</tr>`;
  const filas = [
    ["Volumen (un.)", "—", (y) => ent.format(Math.round(y.volume))],
    ["Precio neto/un.", "—", (y) => clpc.format(Math.round(y.price))],
    ["Ingresos", "—", (y) => clpc.format(Math.round(y.revenue))],
    ["Costos variables", "—", (y) => clpc.format(Math.round(-y.variableCost))],
    ["Costos fijos", "—", (y) => clpc.format(Math.round(-y.fixedCost))],
    ["EBITDA", "—", (y) => clpc.format(Math.round(y.ebitda))],
    ["Depreciación", "—", (y) => clpc.format(Math.round(-y.depreciation))],
    ["EBIT", "—", (y) => clpc.format(Math.round(y.ebit))],
    ["Impuesto pagado", "—", (y) => clpc.format(Math.round(-y.tax))],
    ["Variación CT", clpc.format(Math.round(-modelo.initialNwc)), (y) => clpc.format(Math.round(-y.deltaNwc))],
    ["Recuperaciones terminales", "—", (y) => (y.terminal ? clpc.format(Math.round(y.terminal)) : "—")],
    ["Flujo libre", clpc.format(Math.round(-modelo.initialInvestment)), (y) => clpc.format(Math.round(y.fcf))]
  ];
  s$("flujo-cuerpo").innerHTML = filas.map(([et, a0, fn]) =>
    `<tr><td>${esc(et)}</td><td class="num">${a0}</td>${modelo.years.map((y) => `<td class="num">${fn(y)}</td>`).join("")}</tr>`).join("");
}

function dibujarSensibilidad(modelo) {
  const precios = [0.9, 1, 1.1];
  const volumenes = [0.8, 1, 1.2];
  s$("sensibilidad-cabecera").innerHTML = `<tr><th>Volumen \\ Precio</th>${precios.map((p) => `<th class="num">${pctf(p - 1)}</th>`).join("")}</tr>`;
  s$("sensibilidad-cuerpo").innerHTML = volumenes.map((v) => `<tr><td>${pctf(v - 1)}</td>${precios.map((p) => {
    const m = buildModel(estado.borrador, p, v);
    return `<td class="num"><span class="b ${m.npv > 0 ? "b-verificado" : "b-supuesto"}">${clpc.format(Math.round(m.npv))}</span></td>`;
  }).join("")}</tr>`).join("");

  // Con la capacidad topando, las tres filas de volumen salen idénticas.
  // Decirlo evita que la tabla se lea como "el volumen no importa".
  const topa = modelo.years.every((y) => y.volume === modelo.capacityYear);
  s$("sensibilidad-nota").innerHTML = topa
    ? "<strong>Las tres filas son iguales a propósito:</strong> la capacidad instalada topa el volumen en los cinco años, así que variar la demanda no cambia lo que se produce. Suba la capacidad para que esta dimensión vuelva a moverse."
    : "Cada celda recalcula el escenario completo, capital de trabajo incluido.";
}

function dibujarTrazabilidad() {
  const filas = PARAMETROS
    .filter((p) => !p.soloMaquila || estado.escenario === "maquila")
    .map((p) => {
      const dossier = resolver(estado.datos, p);
      const modificado = p.id in estado.overrides;
      const usado = valorActual(p);
      const forzado = estado.escenario === "maquila" && p.forzadoEnMaquila !== undefined;
      const insignia = dossier.confianza === "RESTRICCIÓN"
        ? '<span class="b b-restriccion">Restricción</span>'
        : badge(dossier.confianza);
      return `<tr>
        <td>${esc(p.etiqueta)}${modificado ? ' <span class="b b-supuesto">A mano</span>' : ""}</td>
        <td class="num">${esc(fmt(dossier.valor, p.formato))}</td>
        <td class="num">${forzado ? `<span class="tenue">${esc(fmt(p.forzadoEnMaquila, p.formato))}</span>` : esc(fmt(usado, p.formato))}</td>
        <td><small>${esc(forzado ? "forzado por el escenario de maquila" : (dossier.origen ?? "—"))}</small></td>
        <td>${insignia}</td>
      </tr>`;
    });
  s$("trazabilidad-cuerpo").innerHTML = filas.join("");
}

// ---------------------------------------------------------- veredicto ----
// Dos estados alcanzables. El tercero —"todo verificado"— es inalcanzable por
// construcción: un override escribe .valor y nunca .confianza, y ninguna hoja
// del dossier tiene aprobado_para_decision en true. Se deja fuera en vez de
// escribir una rama muerta que sugiera que existe un camino a "viable".

function dibujarVeredicto(modelo) {
  const faltantes = missingCriticalInputs(estado.datos, estado.escenario);
  const n = faltantes.length;
  const m = Object.keys(estado.overrides).length;
  const caja = s$("veredicto");
  caja.className = "aviso aviso-riesgo";

  if (m === 0) {
    s$("veredicto-titulo").textContent = "Cálculo exploratorio, no decisión de inversión";
    s$("veredicto-texto").textContent = `Este simulador reproduce el motor de la etapa 10 sobre los mismos JSON del dossier. `
      + `Quedan ${n} parámetros críticos sin evidencia verificada, así que el resultado muestra el efecto de los supuestos heredados y no emite una recomendación.`;
  } else {
    s$("veredicto-titulo").textContent = "Escenario escrito a mano — no es evidencia";
    s$("veredicto-texto").textContent = `Está usando ${m} ${m === 1 ? "valor escrito" : "valores escritos"} a mano sobre los datos del dossier. `
      + `Cambiar un número aquí no cambia su confianza: los ${n} parámetros críticos siguen sin verificar. `
      + `Esto sirve para explorar sensibilidad y para saber qué medir primero; no sustituye una cotización, una entrevista ni un piloto.`;
  }

  const chip = s$("chip-modificados");
  chip.hidden = m === 0;
  chip.textContent = `${m} a mano`;
  s$("chip-criticos").textContent = `${n} críticos sin verificar`;
  s$("btn-reiniciar").disabled = m === 0;

  s$("criticos-texto").textContent = n === 0
    ? "No quedan vacíos críticos para este escenario."
    : `${n} parámetros requieren evidencia verificada o aprobación formal antes de decidir. Los gates externos van debajo.`;
  const gates = (estado.datos.gates?.gates ?? []).map((g) => `${g.id} · ${g.estado.replaceAll("_", " ")} — ${g.criterio_de_salida}`);
  s$("criticos-lista").innerHTML = [...faltantes, ...gates].map((t) => `<li>${esc(t)}</li>`).join("");

  const avisoMaquila = s$("aviso-maquila");
  if (estado.escenario === "maquila") {
    const tarifa = valorActual(porId.get("tarifa"));
    avisoMaquila.hidden = false;
    s$("aviso-maquila-texto").innerHTML = (tarifa === null || tarifa === undefined)
      ? "La tarifa de maquila sigue <strong>pendiente</strong>: con tarifa cero el VAN sale positivo por construcción, y eso es una cota superior, no una proyección. Los umbrales publicados por la etapa 13 son <strong>$810/pizza</strong> contra el techo de $50.000.000 y <strong>$560/pizza</strong> contra el de $30.000.000. Escriba una tarifa en el panel para ver el escenario con costo real."
      : `Con la tarifa escrita a mano de <strong>${clpc.format(tarifa)}/pizza</strong>. Los umbrales publicados por la etapa 13 son $810 contra el techo de $50.000.000 y $560 contra el de $30.000.000.`;
  } else {
    avisoMaquila.hidden = true;
  }
}

// ------------------------------------------------------------ controles ----

function construirControles() {
  s$("grupos").innerHTML = GRUPOS.map((g) => {
    const params = PARAMETROS.filter((p) => p.grupo === g.id);
    if (!params.length) return "";
    return `<details class="grupo" id="grupo-${g.id}"${g.abierto ? " open" : ""}>
      <summary><span class="grupo-nombre">${esc(g.titulo)}</span><span class="grupo-cuenta" data-cuenta="${g.id}">${params.length}</span></summary>
      <div class="grupo-cuerpo">
        ${g.nota ? `<p class="grupo-nota">${esc(g.nota)}</p>` : ""}
        ${params.map((p) => filaControl(p)).join("")}
      </div>
    </details>`;
  }).join("");

  s$("grupos").addEventListener("input", alCambiarControl);
  s$("grupos").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".control-volver");
    if (!btn) return;
    delete estado.overrides[btn.dataset.id];
    estado.preset = "personalizado";
    sincronizarControles();
    redibujar();
  });
  // El anuncio para lector de pantalla va en `change`, no en `input`: durante
  // un arrastre `input` dispara decenas de veces y saturaría la cola de voz.
  s$("grupos").addEventListener("change", anunciar);
}

function filaControl(p) {
  const d = resolver(estado.datos, p);
  const insignia = d.confianza === "RESTRICCIÓN"
    ? '<span class="b b-restriccion">Restricción</span>'
    : badge(d.confianza);
  return `<div class="control" data-control="${p.id}">
    <div class="control-cabecera">
      <label class="control-etiqueta" for="in-${p.id}">${esc(p.etiqueta)}</label>
      ${insignia}
    </div>
    <div class="control-fila">
      <input type="range" id="rg-${p.id}" data-id="${p.id}" min="${p.min}" max="${p.max}" step="${p.paso}"
             aria-label="${esc(p.etiqueta)} (deslizador)">
      <input type="number" id="in-${p.id}" data-id="${p.id}" step="${p.paso}"
             aria-describedby="pie-${p.id}">
    </div>
    <div class="control-pie">
      <span class="control-origen" id="pie-${p.id}">${esc(p.unidad)}</span>
      <button type="button" class="control-volver" data-id="${p.id}" hidden>volver al dossier</button>
    </div>
    <p class="control-nota" data-dossier="${p.id}"></p>
    ${p.nota ? `<p class="control-nota">${esc(p.nota)}</p>` : ""}
    <p class="control-aviso" data-aviso="${p.id}" hidden></p>
  </div>`;
}

function sincronizarControles() {
  for (const p of PARAMETROS) {
    const fila = document.querySelector(`[data-control="${p.id}"]`);
    if (!fila) continue;
    const rg = s$(`rg-${p.id}`);
    const nu = s$(`in-${p.id}`);
    const d = resolver(estado.datos, p);
    const actual = valorActual(p);
    const modificado = p.id in estado.overrides;
    const forzado = estado.escenario === "maquila" && p.forzadoEnMaquila !== undefined;
    const ocultoPorEscenario = p.soloMaquila && estado.escenario !== "maquila";

    fila.hidden = ocultoPorEscenario;
    const v = actual === null || actual === undefined ? (p.min + p.max) / 2 : actual;
    // El deslizador se recorta al rango y el navegador lo ajusta al paso; el
    // campo numérico muestra el valor EXACTO que usa el motor. Redondearlo al
    // paso mostraría 20,5% donde la TMAR es 20,46% y 8.403 donde la mozzarella
    // es 8.403,36: cifras que el modelo no está usando.
    rg.value = String(Math.min(p.max, Math.max(p.min, v)));
    nu.value = actual === null || actual === undefined ? "" : String(v);
    nu.placeholder = actual === null ? "pendiente" : "";
    rg.disabled = forzado;
    nu.disabled = forzado;
    fila.classList.toggle("control-modificado", modificado);

    fila.querySelector(".control-volver").hidden = !modificado;
    fila.querySelector(`[data-dossier="${p.id}"]`).innerHTML = modificado
      ? `Dossier: <strong>${esc(fmt(d.valor, p.formato))}</strong> · ${esc(d.origen ?? "")}`
      : `${esc(d.origen ?? "")}`;

    const aviso = fila.querySelector(`[data-aviso="${p.id}"]`);
    if (forzado) {
      aviso.hidden = false;
      aviso.className = "control-aviso control-aviso-frio";
      aviso.textContent = `El escenario de maquila lo fija en ${fmt(p.forzadoEnMaquila, p.formato)}: no hay planta propia que costear.`;
    } else if (p.avisoVivo) {
      aviso.hidden = false;
      aviso.className = "control-aviso";
      aviso.textContent = p.avisoVivo;
    } else {
      aviso.hidden = true;
    }
  }
  for (const g of GRUPOS) {
    const n = PARAMETROS.filter((p) => p.grupo === g.id && p.id in estado.overrides).length;
    const total = PARAMETROS.filter((p) => p.grupo === g.id).length;
    const cuenta = document.querySelector(`[data-cuenta="${g.id}"]`);
    if (cuenta) cuenta.textContent = n ? `${n} a mano · ${total}` : String(total);
  }
}

const redondear = (v, p) => {
  const dp = (String(p.paso).split(".")[1] ?? "").length;
  return Number(v.toFixed(dp));
};

function alCambiarControl(ev) {
  const id = ev.target.dataset?.id;
  if (!id) return;
  const p = porId.get(id);
  if (!p) return;
  let v = Number(ev.target.value);
  if (!Number.isFinite(v)) return;
  if (ev.target.type === "range") v = redondear(v, p);
  const dossier = valorDossier(p);
  if (dossier !== null && Math.abs(v - dossier) < 1e-9) delete estado.overrides[id];
  else estado.overrides[id] = v;
  estado.preset = "personalizado";
  // Sincroniza el gemelo (rango ↔ número) sin re-renderizar el panel entero,
  // que mataría el foco y el arrastre en curso.
  const gemelo = ev.target.type === "range" ? s$(`in-${id}`) : s$(`rg-${id}`);
  if (gemelo) gemelo.value = String(ev.target.type === "range" ? v : Math.min(p.max, Math.max(p.min, v)));
  const fila = document.querySelector(`[data-control="${id}"]`);
  fila.classList.toggle("control-modificado", id in estado.overrides);
  fila.querySelector(".control-volver").hidden = !(id in estado.overrides);
  redibujar();
}

function anunciar() {
  const m = buildModel(estado.borrador);
  let region = s$("anuncio");
  if (!region) {
    region = document.createElement("p");
    region.id = "anuncio";
    region.setAttribute("aria-live", "polite");
    region.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap";
    document.body.append(region);
  }
  region.textContent = `VAN ${clpc.format(Math.round(m.npv))}, fondeo máximo ${clpc.format(Math.round(m.peakFunding))}.`;
}

// ------------------------------------------------------------ presets ----

function construirPresets() {
  const e = estado.datos.base.escenarios ?? {};
  const f = (k) => e[k]?.valor ?? null;
  const casob = estado.datos.casob?.overrides_modelo ?? {};
  const porRuta = new Map(PARAMETROS.map((p) => [p.ruta, p]));

  const factorSobre = (id, factor) => {
    const p = porId.get(id);
    return factor === null ? null : redondear(valorDossier(p) * factor, p);
  };

  const presets = [
    { id: "dossier", etiqueta: "Dossier", overrides: () => ({}), sinAncla: [] },
    {
      id: "pesimista", etiqueta: "Pesimista",
      overrides: () => limpiar({
        precio: factorSobre("precio", f("precio_pesimista_factor")),
        equipos: factorSobre("equipos", f("capex_pesimista_factor")),
        hab: factorSobre("hab", f("capex_pesimista_factor"))
      }),
      sinAncla: sinAnclaDe("pesimista", e)
    },
    {
      id: "optimista", etiqueta: "Optimista",
      overrides: () => limpiar({
        precio: factorSobre("precio", f("precio_optimista_factor")),
        equipos: factorSobre("equipos", f("capex_optimista_factor")),
        hab: factorSobre("hab", f("capex_optimista_factor"))
      }),
      sinAncla: sinAnclaDe("optimista", e)
    },
    {
      id: "casob", etiqueta: "Caso B · activos",
      overrides: () => {
        const o = {};
        for (const [ruta, valor] of Object.entries(casob)) {
          const p = porRuta.get(ruta);
          if (p) o[p.id] = valor;
        }
        return o;
      },
      nota: estado.datos.casob?.resultado
        ? `El Caso B declara VAN ${compacto(estado.datos.casob.resultado.van_clp)} y fondeo ${compacto(estado.datos.casob.resultado.fondeo_maximo_clp)}. Si el motor reproduce esas cifras, el preset está bien cableado.`
        : null,
      sinAncla: []
    },
    {
      id: "techo30", etiqueta: "Techo $30M",
      overrides: () => ({ limite: 30000000 }),
      // No hay parámetro en datos/ para este techo: existe sólo como prosa en
      // la etapa 13. Presentarlo como cifra del dossier sería inventar respaldo.
      sinAncla: ["<strong>El techo de $30 millones no es un parámetro del dossier.</strong> Está declarado en prosa en la etapa 13 como restricción del titular; <code>meta.restriccion_capital_clp</code> sigue en $50.000.000."]
    }
  ];

  s$("presets").innerHTML = presets.map((p) =>
    `<button type="button" class="boton" data-preset="${p.id}">${esc(p.etiqueta)}</button>`).join("");
  s$("presets").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-preset]");
    if (!btn) return;
    const preset = presets.find((p) => p.id === btn.dataset.preset);
    estado.overrides = preset.overrides();
    estado.preset = preset.id;
    const avisos = [...(preset.sinAncla ?? [])];
    if (preset.nota) avisos.push(preset.nota);
    const caja = s$("sin-ancla");
    caja.hidden = avisos.length === 0;
    caja.innerHTML = avisos.map((a) => `<div>${a}</div>`).join("");
    for (const b of s$("presets").querySelectorAll("[data-preset]")) {
      b.classList.toggle("preset-activo", b.dataset.preset === preset.id);
    }
    sincronizarControles();
    redibujar();
  });
}

const limpiar = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null));

// Los factores de volumen, costo variable y costo fijo están PENDIENTE en la
// etapa 12. Coercerlos a 1,00 en silencio sería exactamente la "cifra
// plausible" que la regla 7 prohíbe: se declaran.
function sinAnclaDe(cual, e) {
  const faltan = ["volumen", "costo_variable", "costo_fijo"]
    .filter((k) => (e[`${k}_${cual}_factor`]?.valor ?? null) === null)
    .map((k) => k.replace("_", " "));
  if (!faltan.length) return [];
  return [`<strong>SIN ANCLA:</strong> la etapa 12 no publicó factor ${cual} para ${faltan.join(", ")}. `
    + "Este escenario deja esos parámetros como están en el dossier en vez de inventarles un multiplicador."];
}

// ---------------------------------------------------- enlace y memoria ----

const CLAVE_ALMACEN = "pizzeria:simulador:v1";

function escribirHash() {
  const partes = [`v=1`, `e=${estado.escenario}`];
  for (const [id, v] of Object.entries(estado.overrides)) partes.push(`${id}=${v}`);
  const hash = Object.keys(estado.overrides).length || estado.escenario !== "planta"
    ? `#${partes.join("&")}` : "";
  history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
  try { localStorage.setItem(CLAVE_ALMACEN, JSON.stringify({ o: estado.overrides, e: estado.escenario })); } catch { /* modo privado */ }
}

// Precedencia: hash > localStorage > dossier. Un enlace compartido nunca debe
// quedar pisado por el estado guardado de quien lo abre.
function leerEstadoInicial() {
  const desconocidos = [];
  const hash = location.hash.slice(1);
  if (hash) {
    const pares = new URLSearchParams(hash.replaceAll("&amp;", "&"));
    if (pares.get("v") !== "1") return { aviso: "El enlace usa un formato de parámetros que esta versión no reconoce; se ignoró." };
    const escenario = pares.get("e");
    if (escenario === "planta" || escenario === "maquila") estado.escenario = escenario;
    for (const [k, v] of pares) {
      if (k === "v" || k === "e") continue;
      const p = porId.get(k);
      if (!p) { desconocidos.push(k); continue; }
      const n = Number(v);
      if (!Number.isFinite(n)) { desconocidos.push(k); continue; }
      estado.overrides[k] = n;
    }
    return desconocidos.length
      ? { aviso: `El enlace traía parámetros que este simulador no conoce y se omitieron: ${desconocidos.join(", ")}.` }
      : {};
  }
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_ALMACEN) ?? "null");
    if (guardado?.o) {
      for (const [k, v] of Object.entries(guardado.o)) if (porId.has(k)) estado.overrides[k] = v;
      if (guardado.e === "maquila") estado.escenario = "maquila";
    }
  } catch { /* almacenamiento no disponible */ }
  return {};
}

// -------------------------------------------------- valores de quiebre ----
// Misma convención que switching_values() del Python: si no hay cambio de
// signo en el rango se dice, en vez de devolver una raíz espuria.

function bisectar(p, objetivo) {
  const actual = valorActual(p);
  if (!Number.isFinite(actual) || actual === 0) return null;
  const lo = p.id === "tmar" ? 0.01 : Math.min(p.min, actual) * 0.1;
  const hi = p.id === "tmar" ? 200 : Math.max(p.max, actual) * 10;
  const f = (v) => objetivo(conParametro(p, v));
  let fa = f(lo);
  let fb = f(hi);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) return null;
  let a = lo;
  let b = hi;
  for (let i = 0; i < 60; i += 1) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
  }
  return (a + b) / 2;
}

function calcularQuiebres() {
  const boton = s$("btn-quiebres");
  boton.disabled = true;
  boton.textContent = "Calculando…";
  // Un cuadro de respiro para que el botón pinte su estado antes de bloquear.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const limite = buildModel(estado.borrador).capitalLimit;
    const filas = ["precio", "som", "cap", "moz", "hab", "tmar", "personal", "equipos"]
      .map((id) => porId.get(id))
      .filter((p) => p && !(estado.escenario === "maquila" && p.forzadoEnMaquila !== undefined))
      .map((p) => ({
        p,
        actual: valorActual(p),
        van: bisectar(p, (m) => m.npv),
        fondeo: bisectar(p, (m) => m.peakFunding - limite)
      }));

    const celda = (p, v) => (v === null
      ? '<td class="num sin">Sin quiebre en el rango</td>'
      : `<td class="num">${esc(fmt(v, p.formato))}</td>`);
    s$("quiebres-cuerpo").innerHTML = filas.map((f) => `<tr>
      <td>${esc(f.p.etiqueta)}</td>
      <td class="num">${esc(fmt(f.actual, f.p.formato))}</td>
      ${celda(f.p, f.van)}
      ${celda(f.p, f.fondeo)}
    </tr>`).join("");
    s$("quiebres-envoltorio").hidden = false;
    boton.disabled = false;
    boton.textContent = "Recalcular valores de quiebre";
  }));
}

// ------------------------------------------------------------ redibujo ----

let pendiente = false;
function redibujar() {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => {
    pendiente = false;
    prepararBorrador();
    const modelo = buildModel(estado.borrador);
    // El motor pierde la etiqueta de escenario al evaluar datos
    // pretransformados como "planta": se repone para la copia de la página.
    modelo.scenario = estado.escenario;
    dibujarVeredicto(modelo);
    dibujarKpis(modelo);
    dibujarMedidor(modelo);
    dibujarCaja(modelo);
    dibujarFcf(modelo);
    dibujarPerfil(modelo);
    dibujarTornado(calcularTornado());
    dibujarTablas(modelo);
    dibujarSensibilidad(modelo);
    dibujarTrazabilidad();
    s$("quiebres-envoltorio").hidden = true;
    escribirHash();
  });
}

// ------------------------------------------------------------- arranque ----

async function cargar() {
  try {
    const entradas = await Promise.all(Object.entries(ARCHIVOS).map(async ([clave, nombre]) => {
      const r = await fetch(`../datos/${nombre}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`${nombre}: HTTP ${r.status}`);
      return [clave, await r.json()];
    }));
    return { datos: Object.fromEntries(entradas), origen: "vivo" };
  } catch (error) {
    // file:// bloquea fetch. La instantánea embebida deja que la página
    // funcione con doble clic, avisando que es una copia.
    if (window.__instantanea?.datos) {
      return { datos: window.__instantanea.datos, origen: "instantanea", fecha: window.__instantanea.fecha };
    }
    throw error;
  }
}

async function iniciar() {
  const { datos, origen, fecha } = await cargar();
  estado.datos = datos;

  if (origen === "instantanea") {
    s$("aviso-instantanea").hidden = false;
    s$("aviso-instantanea-texto").textContent =
      `Los JSON del dossier no se pudieron leer en vivo, así que esta página está usando la copia embebida del ${fecha}. `
      + "Los números son los mismos que tenía el dossier a esa fecha. Para leer los datos en vivo, sirva la carpeta por HTTP "
      + "(por ejemplo: python3 -m http.server) en vez de abrir el archivo directamente.";
    s$("meta-origen").innerHTML = `<strong>Datos:</strong> instantánea ${esc(fecha)}`;
  } else {
    s$("meta-origen").innerHTML = "<strong>Datos:</strong> JSON del dossier en vivo";
  }

  const { aviso } = leerEstadoInicial();
  if (aviso) {
    s$("aviso-instantanea").hidden = false;
    s$("aviso-instantanea-texto").textContent = aviso;
  }

  // La línea base se calcula UNA vez, sin overrides, y no se vuelve a tocar:
  // es contra ella que se miden todos los deltas.
  estado.linea = buildModel(datos);

  construirPresets();
  construirControles();
  sincronizarControles();

  for (const radio of document.querySelectorAll('input[name="escenario"]')) {
    radio.checked = radio.value === estado.escenario;
    radio.addEventListener("change", () => {
      estado.escenario = document.querySelector('input[name="escenario"]:checked').value;
      sincronizarControles();
      redibujar();
    });
  }
  for (const radio of document.querySelectorAll('input[name="tornado-metrica"]')) {
    radio.addEventListener("change", () => {
      estado.metricaTornado = document.querySelector('input[name="tornado-metrica"]:checked').value;
      prepararBorrador();
      dibujarTornado(calcularTornado());
    });
  }

  s$("btn-reiniciar").addEventListener("click", () => {
    estado.overrides = {};
    estado.preset = "dossier";
    s$("sin-ancla").hidden = true;
    for (const b of s$("presets").querySelectorAll("[data-preset]")) b.classList.remove("preset-activo");
    sincronizarControles();
    redibujar();
  });

  s$("btn-enlace").addEventListener("click", async () => {
    escribirHash();
    try {
      await navigator.clipboard.writeText(location.href);
    } catch {
      const tmp = document.createElement("textarea");
      tmp.value = location.href;
      document.body.append(tmp);
      tmp.select();
      document.execCommand("copy");
      tmp.remove();
    }
    const marca = s$("copiado");
    marca.hidden = false;
    setTimeout(() => { marca.hidden = true; }, 2000);
  });

  s$("btn-quiebres").addEventListener("click", calcularQuiebres);

  redibujar();
}

iniciar().catch((error) => {
  s$("error-carga").hidden = false;
  s$("error-carga-texto").textContent =
    `No se pudo cargar el modelo: ${error.message}. Sirva la carpeta por HTTP (python3 -m http.server) o ábrala desde GitHub Pages.`;
});
