#!/usr/bin/env python3
"""Genera un modelo financiero editable para LibreOffice Calc y Excel."""

from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata
from pathlib import Path

import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.table import BorderLine2, TableBorder2
from com.sun.star.util import CellProtection

# Alineación: ausente por completo en la versión anterior del libro, y es el
# defecto visual que más se nota. Los grupos de constantes cambiaron de nombre
# entre versiones de LibreOffice, así que se resuelven con respaldo.
H_LEFT = uno.Enum("com.sun.star.table.CellHoriJustify", "LEFT")
H_CENTER = uno.Enum("com.sun.star.table.CellHoriJustify", "CENTER")
H_RIGHT = uno.Enum("com.sun.star.table.CellHoriJustify", "RIGHT")
try:
    from com.sun.star.table import CellVertJustify2
    V_TOP, V_CENTER = CellVertJustify2.TOP, CellVertJustify2.CENTER
except Exception:  # pragma: no cover - builds antiguas
    V_TOP, V_CENTER = 1, 2
try:
    from com.sun.star.awt.FontSlant import ITALIC as SLANT_ITALIC
except Exception:  # pragma: no cover
    SLANT_ITALIC = 2


ROOT = Path(__file__).resolve().parents[1]
ODS_OUT = ROOT / "10-financiero" / "evaluacion-economica-pizzeria-libreoffice.ods"
XLSX_OUT = ROOT / "10-financiero" / "evaluacion-economica-pizzeria-v3.xlsx"

# Paleta de alto contraste sobre fondo claro: se evita completamente texto blanco.
NAVY = 0x17324D
BLUE = 0x1F4E79
GREEN = 0x1D6F42
RED = 0xB42318
TEXT = 0x1F2937
TITLE_FILL = 0xD9EAF7
HEADER_FILL = 0xBDD7EE
SECTION_FILL = 0xEAF2F8
TOTAL_FILL = 0xD7E4F2
INPUT_FILL = 0xFFF2CC
FORMULA_FILL = 0xF7F9FB
POSITIVE_FILL = 0xE2F0D9
NEGATIVE_FILL = 0xFCE4D6
GRID = 0xB7C9D6


def prop(name, value):
    p = PropertyValue()
    p.Name = name
    p.Value = value
    return p


def load(name):
    return json.loads((ROOT / "datos" / name).read_text(encoding="utf-8"))


def entry(obj, path):
    cur = obj
    for key in path.split("."):
        cur = cur[key]
    return cur


def resolved(primary, fallback):
    return primary if primary.get("valor") is not None else fallback


def maybe(obj, path):
    """entry() tolerante: si la ruta no existe todavía en supuestos.json devuelve
    una hoja vacía, de modo que resolved() caiga al fallback en vez de romper."""
    cur = obj
    for key in path.split("."):
        if not isinstance(cur, dict) or key not in cur:
            return {"valor": None}
        cur = cur[key]
    return cur if isinstance(cur, dict) else {"valor": None}


def up(base, path, fallback):
    """Misma precedencia que modelo.js: manda la etapa dueña, si no el stub E10."""
    return resolved(maybe(base, path), fallback)


# ---------------------------------------------------------------------------
# Motor de cálculo en Python.
#
# Es un ESPEJO LÍNEA A LÍNEA de buildModel() en modelo.js, no una segunda
# formulación. Existe para alimentar tornado, valores de quiebre y Monte Carlo
# —que no caben como fórmulas vivas— y para ser comparado contra el harness de
# Node. Invariante del proyecto: tres motores (JS, Python, Calc), una prueba.
# Si se toca modelo.js hay que tocar esto en el mismo commit.
# ---------------------------------------------------------------------------

EQUIPMENT_KEYS = ["abatidor", "amasadora", "horno", "selladora_vacio",
                  "meson_refrigerado", "congeladores", "acero_lavado_extraccion",
                  "racks_bandejas_instrumentos"]
OTHER_FIXED_KEYS = ["servicios_fijos", "mantenimiento", "administracion", "ventas", "seguros"]


def gv(obj, path, fallback=None):
    """Equivalente de get() en modelo.js: devuelve .valor, o el fallback si la
    ruta no existe o el valor es null."""
    cur = obj
    for key in path.split("."):
        if not isinstance(cur, dict) or key not in cur:
            return fallback
        cur = cur[key]
    val = cur.get("valor") if isinstance(cur, dict) else None
    return fallback if val is None else val


def npv_of(rate, flows):
    return sum(f / ((1 + rate) ** t) for t, f in enumerate(flows))


def irr_of(flows):
    """Bisección idéntica a modelo.js: None si no hay cambio de signo."""
    low, high = -0.99, 10.0
    low_v, high_v = npv_of(low, flows), npv_of(high, flows)
    if low_v * high_v > 0:
        return None
    for _ in range(240):
        mid = (low + high) / 2
        v = npv_of(mid, flows)
        if abs(v) < 0.01:
            return mid
        if low_v * v <= 0:
            high = mid
        else:
            low, low_v = mid, v
    return (low + high) / 2


def payback_of(rate, flows):
    cumulative = flows[0]
    for year in range(1, len(flows)):
        disc = flows[year] / ((1 + rate) ** year)
        previous = cumulative
        cumulative += disc
        if cumulative >= 0:
            return (year - 1) + (-previous / disc)
    return None


def build_model(data, price_mult=1.0, volume_mult=1.0, overrides=None):
    """overrides: {"ruta.punteada": valor} para tornado / quiebre / Monte Carlo.
    Se aplica sobre la lectura, sin mutar los JSON en disco."""
    ov = overrides or {}

    def g(bucket, path, fallback=None):
        if path in ov:
            return ov[path]
        return gv(data[bucket], path, fallback)

    base, financial = "base", "financial"

    inflation = g(financial, "modelo.inflacion_anual_pct") / 100
    discount = g(base, "macro.tasa_descuento_pct",
                 g(financial, "modelo.tasa_descuento_nominal_pct")) / 100
    price_base = g("prices", "precios.precio_venta_b2b_familiar_clp",
                   g(financial, "modelo.precio_b2b_familiar_base_clp"))

    som_month = g("market", "mercado.som_ano1_pizzas_mes")
    stub_year1 = g(financial, "modelo.volumen_ano1_unidades")
    year1_volume = som_month * 12 if som_month is not None else stub_year1
    volumes = []
    for year in range(1, 6):
        if year == 1:
            volumes.append(year1_volume * volume_mult)
            continue
        ramp_fallback = g(financial, f"modelo.volumen_ano{year}_unidades") / stub_year1
        ramp = g(base, f"comercial.rampa_ano{year}_factor", ramp_fallback)
        volumes.append(year1_volume * ramp * volume_mult)

    capacity_day = g(base, "produccion.capacidad_instalada_pizzas_dia")
    operating_days = g(base, "produccion.dias_operacion_mes")
    capacity_year = (capacity_day * operating_days * 12
                     if capacity_day is not None and operating_days is not None else None)
    if capacity_year is not None:
        volumes = [min(v, capacity_year) for v in volumes]

    tax_rates = [g(financial, f"modelo.impuesto_ano{y}_pct") / 100 for y in range(1, 6)]

    def gram(key):
        return g(base, f"producto.{key}", g(financial, f"producto.{key}"))

    flour = g("inputs", "insumos.harina_clp_kg") * gram("harina_kg_unidad")
    sauce = g("inputs", "insumos.salsa_tomate_clp_kg") * gram("salsa_kg_unidad")
    cheese = g("inputs", "insumos.mozzarella_clp_kg") * gram("mozzarella_kg_unidad")
    others = gram("otros_ingredientes_clp_unidad")
    waste = g(base, "produccion.merma_pct", g(financial, "producto.merma_pct")) / 100
    packaging = g("inputs", "insumos.envase_clp_unidad", g(financial, "producto.envase_clp_unidad"))
    energy = g(base, "producto.energia_variable_clp_unidad",
               g(financial, "producto.energia_variable_clp_unidad"))
    distribution = g(base, "producto.distribucion_variable_clp_unidad",
                     g(financial, "producto.distribucion_variable_clp_unidad"))
    variable_base = (flour + sauce + cheese + others) * (1 + waste) + packaging + energy + distribution

    area = g("local", "local.superficie_requerida_m2", g(financial, "operacion.superficie_m2"))
    rent_base = g("local", "local.arriendo_mensual_clp",
                  area * g("local", "local.arriendo_clp_m2_mes"))
    employer_factor = g(base, "macro.factor_costo_empresa",
                        g(financial, "operacion.factor_costo_empresa"))
    payroll_gross = g(base, "rrhh.nomina_bruta_mensual_clp",
                      g(financial, "operacion.nomina_bruta_mensual_clp"))
    payroll_total = g(base, "rrhh.costo_personal_mensual_regimen_clp")
    payroll_base = payroll_total if payroll_total is not None else payroll_gross * employer_factor
    other_fixed = sum(g(base, f"operacion.{k}_mensual_clp",
                        g(financial, f"operacion.{k}_mensual_clp")) for k in OTHER_FIXED_KEYS)
    fixed_monthly = rent_base + payroll_base + other_fixed

    equipment_lines = sum(g(financial, f"inversion.{k}_clp") for k in EQUIPMENT_KEYS)
    equipment = g(base, "capex.equipamiento_base_clp", equipment_lines)
    installation = equipment * g(base, "inversion.flete_instalacion_pct",
                                 g(financial, "inversion.flete_instalacion_pct")) / 100
    habilitation = g("local", "local.habilitacion_sanitaria_clp",
                     g(financial, "inversion.habilitacion_sanitaria_clp"))
    before_contingency = equipment + installation + habilitation
    contingency = before_contingency * g(base, "inversion.contingencia_pct",
                                         g(financial, "inversion.contingencia_pct")) / 100
    permits = g("legal", "capex.tramites_y_constitucion_clp",
                g(financial, "inversion.tramites_analisis_rotulado_clp"))
    preoperation = g(financial, "inversion.preoperacion_clp")
    depreciable = before_contingency + contingency
    total_capex = depreciable + permits + preoperation
    depreciation = depreciable / g(base, "inversion.vida_depreciable_anios",
                                   g(financial, "inversion.vida_depreciable_anios"))
    guarantee = rent_base * g(financial, "inversion.garantia_arriendo_meses")
    residual_gross = depreciable * g(base, "inversion.valor_residual_pct",
                                     g(financial, "inversion.valor_residual_pct")) / 100

    receivable_days = g("prices", "precios.plazo_cobro_dias",
                        g(financial, "operacion.dias_cuentas_cobrar"))
    inventory_days = g(financial, "operacion.dias_inventario")
    payable_days = g(financial, "operacion.dias_cuentas_pagar")

    years = []
    for idx, volume in enumerate(volumes):
        esc = (1 + inflation) ** (idx + 1)
        price = price_base * price_mult * esc
        variable_unit = variable_base * esc
        revenue = volume * price
        variable_cost = volume * variable_unit
        fixed_cost = fixed_monthly * 12 * esc
        nwc = (revenue * receivable_days / 365
               + variable_cost * inventory_days / 365
               - variable_cost * payable_days / 365)
        years.append({"year": idx + 1, "volume": volume, "price": price,
                      "variableUnit": variable_unit, "revenue": revenue,
                      "variableCost": variable_cost, "fixedCost": fixed_cost, "nwc": nwc})

    tax_loss = 0.0
    for idx, y in enumerate(years):
        y["ebitda"] = y["revenue"] - y["variableCost"] - y["fixedCost"]
        y["depreciation"] = depreciation
        y["ebit"] = y["ebitda"] - depreciation
        if y["ebit"] < 0:
            tax_loss += -y["ebit"]
            y["taxable"] = 0.0
            y["tax"] = 0.0
        else:
            offset = min(tax_loss, y["ebit"])
            tax_loss -= offset
            y["taxable"] = y["ebit"] - offset
            y["tax"] = y["taxable"] * tax_rates[idx]
        y["taxRate"] = tax_rates[idx]
        y["taxLossClosing"] = tax_loss

    initial_nwc = years[0]["nwc"]
    initial_investment = total_capex + guarantee + initial_nwc
    flows = [-initial_investment]
    for idx, y in enumerate(years):
        previous_nwc = initial_nwc if idx == 0 else years[idx - 1]["nwc"]
        y["deltaNwc"] = y["nwc"] - previous_nwc
        y["terminal"] = 0.0
        if idx == len(years) - 1:
            book_value = max(0.0, depreciable - depreciation * len(years))
            disposal_result = residual_gross - book_value
            disposal_tax = 0.0
            if disposal_result > 0:
                offset = min(tax_loss, disposal_result)
                tax_loss -= offset
                disposal_tax = (disposal_result - offset) * tax_rates[idx]
            y["bookValue"] = book_value
            y["disposalResult"] = disposal_result
            y["disposalTax"] = disposal_tax
            y["terminal"] = residual_gross - disposal_tax + y["nwc"] + guarantee
        y["fcf"] = y["ebitda"] - y["tax"] - y["deltaNwc"] + y["terminal"]
        flows.append(y["fcf"])

    project_npv = npv_of(discount, flows)
    project_irr = irr_of(flows)
    payback = payback_of(discount, flows)
    pv_inflows = sum(f / ((1 + discount) ** (i + 1)) for i, f in enumerate(flows[1:]))
    cumulative = 0.0
    minimum = 0.0
    for f in flows:
        cumulative += f
        minimum = min(minimum, cumulative)
    peak_funding = -minimum
    capital_limit = data["base"]["meta"]["restriccion_capital_clp"]
    first_esc = 1 + inflation
    contribution = price_base * price_mult * first_esc - variable_base * first_esc
    break_even = years[0]["fixedCost"] / contribution if contribution > 0 else None

    return {
        "inflation": inflation, "discount": discount, "priceBase": price_base,
        "variableBase": variable_base, "flour": flour, "sauce": sauce, "cheese": cheese,
        "packaging": packaging, "waste": waste, "energy": energy, "distribution": distribution,
        "area": area, "rentBase": rent_base, "payrollGross": payroll_gross,
        "employerFactor": employer_factor, "payrollBase": payroll_base,
        "fixedMonthlyBase": fixed_monthly, "equipment": equipment, "installation": installation,
        "habilitation": habilitation, "contingency": contingency, "permits": permits,
        "preoperation": preoperation, "depreciableCapex": depreciable, "totalCapex": total_capex,
        "guarantee": guarantee, "initialNwc": initial_nwc, "initialInvestment": initial_investment,
        "depreciation": depreciation, "residualGross": residual_gross,
        "receivableDays": receivable_days, "years": years, "flows": flows,
        "npv": project_npv, "irr": project_irr, "payback": payback,
        "profitabilityIndex": pv_inflows / initial_investment,
        "peakFunding": peak_funding, "capitalLimit": capital_limit,
        "contribution": contribution, "breakEven": break_even,
        "capacityYear": capacity_year,
        "capacityUse": None if capacity_year is None else volumes[-1] / capacity_year,
        "breakEvenUse": None if capacity_year is None or break_even is None else break_even / capacity_year,
    }


def analysis_params(m):
    """Parámetros que se perturban en tornado y valores de quiebre.

    Cada uno declara su banda Y de dónde sale. Donde la etapa 12 publicó una
    banda se usa esa; donde no existe banda publicada se usa un swing uniforme
    de ±20% ETIQUETADO COMO EXPLORATORIO. La distinción importa: un swing
    exploratorio sirve para ordenar sensibilidades, no para afirmar un rango.
    Devuelve (etiqueta, ruta, base, bajo, alto, ancla, tiene_banda)."""
    p = m["priceBase"]
    B = "banda publicada"
    X = "swing exploratorio ±20% — sin banda publicada"
    capex_lo, capex_hi = 0.80, 1.30
    return [
        ("Precio B2B familiar", "precios.precio_venta_b2b_familiar_clp", p, p * 0.72, p * 1.20,
         "escenarios.precio_*_factor · PF Listo $3.017 / Meta Food $5.034", B),
        ("Envolvente de equipos", "capex.equipamiento_base_clp", m["equipment"],
         m["equipment"] * capex_lo, m["equipment"] * capex_hi,
         "AACE 18R-97 Clase 5 · escenarios.capex_*_factor", B),
        ("Habilitación sanitaria", "local.habilitacion_sanitaria_clp", m["habilitation"],
         m["habilitation"] * capex_lo, m["habilitation"] * capex_hi,
         "AACE 18R-97 Clase 5 · escenarios.capex_*_factor", B),
        ("Plazo de cobro", "precios.plazo_cobro_dias", m["receivableDays"], 30, 60,
         "statement §8 · rango declarado 30–60 días", B),
        ("Capacidad instalada", "produccion.capacidad_instalada_pizzas_dia", 60, 48, 72, X, X),
        ("Días de operación", "produccion.dias_operacion_mes", 22, 17.6, 26.4, X, X),
        ("Mozzarella $/kg", "insumos.mozzarella_clp_kg", 8403.36, 6722.69, 10084.03, X, X),
        ("Gramaje mozzarella", "producto.mozzarella_kg_unidad", 0.10, 0.08, 0.12, X, X),
        ("Costo de personal", "rrhh.costo_personal_mensual_regimen_clp", 2393830,
         1915064, 2872596, X, X),
        ("Arriendo mensual", "local.arriendo_mensual_clp", m["rentBase"],
         m["rentBase"] * 0.8, m["rentBase"] * 1.2, X, X),
        ("TMAR", "macro.tasa_descuento_pct", m["discount"] * 100,
         m["discount"] * 80, m["discount"] * 120, X, X),
        ("Contingencia", "inversion.contingencia_pct", 15, 12, 18, X, X),
        ("Merma", "produccion.merma_pct", 5, 4, 6, X, X),
        ("Vida depreciable", "inversion.vida_depreciable_anios", 10, 8, 12, X, X),
        ("Otros ingredientes", "producto.otros_ingredientes_clp_unidad", 550, 440, 660, X, X),
        ("Distribución por unidad", "producto.distribucion_variable_clp_unidad", 220, 176, 264, X, X),
        ("Envase por unidad", "insumos.envase_clp_unidad", 300, 240, 360, X, X),
    ]


def tornado(data, m):
    """Sensibilidad de una vía. Devuelve filas ordenadas por |ΔVAN|."""
    out = []
    for label, path, base, lo, hi, anchor, band in analysis_params(m):
        r_lo = build_model(data, overrides={path: lo})
        r_hi = build_model(data, overrides={path: hi})
        out.append({
            "label": label, "path": path, "base": base, "lo": lo, "hi": hi,
            "anchor": anchor, "band": band,
            "npv_lo": r_lo["npv"], "npv_hi": r_hi["npv"],
            "fund_lo": r_lo["peakFunding"], "fund_hi": r_hi["peakFunding"],
            "d_npv": abs(r_hi["npv"] - r_lo["npv"]),
            "d_fund": abs(r_hi["peakFunding"] - r_lo["peakFunding"]),
        })
    out.sort(key=lambda r: r["d_npv"], reverse=True)
    return out


def switching_values(data, m):
    """Valor de cada parámetro que anula el VAN y valor que lleva el fondeo
    máximo al límite de capital.

    No hay forma cerrada: el capital de trabajo, el arrastre de pérdidas y los
    MIN() de capacidad y de caja acumulada no se invierten analíticamente. Se
    resuelve por bisección sobre un intervalo acotado, y cuando no hay raíz
    dentro del rango físico se dice, en vez de devolver una raíz espuria."""
    limit = m["capitalLimit"]
    rows = []
    for label, path, base, lo, hi, anchor, band in analysis_params(m):
        # Intervalo de búsqueda amplio pero físicamente admisible.
        span_lo, span_hi = min(lo, base) * 0.1, max(hi, base) * 10
        if path == "macro.tasa_descuento_pct":
            span_lo, span_hi = 0.01, 200.0
        entry_ = {"label": label, "base": base, "anchor": anchor, "band": band}
        for target_name, fn in (("npv", lambda r: r["npv"]),
                                ("fund", lambda r: limit - r["peakFunding"])):
            a, b_ = span_lo, span_hi
            try:
                fa, fb = fn(build_model(data, overrides={path: a})), fn(build_model(data, overrides={path: b_}))
            except Exception:
                entry_[target_name] = None
                continue
            if fa * fb > 0:
                entry_[target_name] = None  # sin raíz en el rango
                continue
            for _ in range(60):
                mid = (a + b_) / 2
                fm = fn(build_model(data, overrides={path: mid}))
                if abs(fm) < 1:
                    break
                if fa * fm <= 0:
                    b_ = mid
                else:
                    a, fa = mid, fm
            entry_[target_name] = (a + b_) / 2
        rows.append(entry_)
    return rows


def monte_carlo(data, m, n=10000, seed=20260804):
    """Perfil de riesgo por simulación.

    SOLO entran parámetros con banda publicada. El volumen no tiene banda
    (escenarios.volumen_* está PENDIENTE por diseño) y por tanto no se simula:
    inventar su distribución sería exactamente la cifra plausible que la regla 7
    prohíbe. Triangular por CDF inversa, semilla fija y declarada para que el
    resultado sea reproducible."""
    import random
    rng = random.Random(seed)
    dists = [(lbl, path, lo, base, hi, anchor)
             for lbl, path, base, lo, hi, anchor, band in analysis_params(m)
             if band == "banda publicada"]

    def tri(lo, mode, hi, u):
        if hi <= lo:
            return lo
        c = (mode - lo) / (hi - lo)
        if u < c:
            return lo + math.sqrt(u * (hi - lo) * (mode - lo))
        return hi - math.sqrt((1 - u) * (hi - lo) * (hi - mode))

    npvs, funds = [], []
    for _ in range(n):
        ov = {}
        for _lbl, path, lo, base, hi, _a in dists:
            ov[path] = tri(min(lo, base), base, max(hi, base), rng.random())
        r = build_model(data, overrides=ov)
        npvs.append(r["npv"])
        funds.append(r["peakFunding"])
    npvs.sort()
    limit = m["capitalLimit"]

    def pct_of(sorted_list, q):
        return sorted_list[max(0, min(len(sorted_list) - 1, int(q * len(sorted_list))))]

    return {
        "n": n, "seed": seed, "dists": dists,
        "p10": pct_of(npvs, 0.10), "p50": pct_of(npvs, 0.50), "p90": pct_of(npvs, 0.90),
        "mean": sum(npvs) / len(npvs),
        "p_npv_pos": sum(1 for v in npvs if v > 0) / len(npvs),
        "p_fits": sum(1 for v in funds if v <= limit) / len(funds),
        "npvs": npvs,
    }


DATA_FILES = {
    "base": "supuestos.json",
    "market": "parametros-01-mercado.json",
    "prices": "parametros-02-competencia.json",
    "inputs": "parametros-06-insumos.json",
    "local": "parametros-07-local-habilitacion.json",
    "legal": "parametros-08-legal-normativo.json",
    "financial": "parametros-10-financiero.json",
}


def load_all():
    return {k: load(v) for k, v in DATA_FILES.items()}


def connect_office():
    profile = tempfile.mkdtemp(prefix="pizzeria-lo-")
    port = 2083
    cmd = [
        "libreoffice", "--headless", "--nologo", "--nodefault", "--nofirststartwizard",
        f"-env:UserInstallation=file://{profile}",
        f"--accept=socket,host=localhost,port={port};urp;StarOffice.ComponentContext",
    ]
    process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )
    for _ in range(60):
        try:
            ctx = resolver.resolve(
                f"uno:socket,host=localhost,port={port};urp;StarOffice.ComponentContext"
            )
            smgr = ctx.ServiceManager
            desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
            return desktop, process, profile
        except Exception:
            time.sleep(0.1)
    process.terminate()
    shutil.rmtree(profile, ignore_errors=True)
    raise RuntimeError("No fue posible conectar con LibreOffice")


def set_text(sheet, col, row, value):
    sheet.getCellByPosition(col, row).String = str(value)


def set_value(sheet, col, row, value):
    sheet.getCellByPosition(col, row).Value = float(value)


def set_formula(sheet, col, row, formula):
    sheet.getCellByPosition(col, row).Formula = formula


def addr(col, row, sheet="Inputs", absolute=True):
    letters = ""
    n = col + 1
    while n:
        n, rem = divmod(n - 1, 26)
        letters = chr(65 + rem) + letters
    dollar = "$" if absolute else ""
    sname = f"'{sheet}'." if sheet else ""
    return f"{sname}{dollar}{letters}{dollar}{row + 1}"


def add_title(sheet, title, subtitle, end_col=6):
    sheet.getCellRangeByPosition(0, 0, end_col, 0).merge(True)
    set_text(sheet, 0, 0, title)
    sheet.getCellRangeByPosition(0, 1, end_col, 1).merge(True)
    set_text(sheet, 0, 1, subtitle)
    r0 = sheet.getCellRangeByPosition(0, 0, end_col, 0)
    r0.CharHeight = 18
    r0.CharWeight = 150
    r0.CellBackColor = TITLE_FILL
    r0.CharColor = NAVY
    r1 = sheet.getCellRangeByPosition(0, 1, end_col, 1)
    r1.CharHeight = 10
    r1.CellBackColor = 0xF6FAFD
    r1.CharColor = TEXT
    sheet.Rows.getByIndex(0).Height = 900
    sheet.Rows.getByIndex(1).Height = 650


def style_header(sheet, row, start=0, end=6):
    rng = sheet.getCellRangeByPosition(start, row, end, row)
    rng.CellBackColor = HEADER_FILL
    rng.CharColor = NAVY
    rng.CharWeight = 150
    rng.CharHeight = 10
    rng.IsTextWrapped = True
    apply_border(rng, BLUE, 28)
    sheet.Rows.getByIndex(row).Height = 650


def style_section(sheet, row, label, end=6):
    sheet.getCellRangeByPosition(0, row, end, row).merge(True)
    set_text(sheet, 0, row, label)
    rng = sheet.getCellRangeByPosition(0, row, end, row)
    rng.CellBackColor = SECTION_FILL
    rng.CharColor = NAVY
    rng.CharWeight = 150
    rng.CharHeight = 11
    apply_border(rng, BLUE, 24)


def format_columns(sheet, widths):
    for idx, width in enumerate(widths):
        sheet.Columns.getByIndex(idx).Width = width


def configure_print_layout(doc, sheets):
    """Evita cortes horizontales y deja las hojas listas para impresión o PDF."""
    styles = doc.StyleFamilies.getByName("PageStyles")
    portrait = styles.getByName("Default")
    portrait.HeaderIsOn = False
    portrait.FooterIsOn = False
    portrait.LeftMargin = 1000
    portrait.RightMargin = 1000
    portrait.TopMargin = 1000
    portrait.BottomMargin = 1000
    portrait.ScaleToPagesX = 1
    portrait.ScaleToPagesY = 0

    landscape_name = "Modelo apaisado"
    if not styles.hasByName(landscape_name):
        landscape = doc.createInstance("com.sun.star.style.PageStyle")
        styles.insertByName(landscape_name, landscape)
    landscape = styles.getByName(landscape_name)
    landscape.IsLandscape = True
    landscape.HeaderIsOn = False
    landscape.FooterIsOn = False
    landscape.LeftMargin = 900
    landscape.RightMargin = 900
    landscape.TopMargin = 900
    landscape.BottomMargin = 900
    landscape.ScaleToPagesX = 1
    landscape.ScaleToPagesY = 0
    for name in ["Inputs", "Flujo_Caja", "Escenarios", "Sensibilidad", "Fuentes"]:
        sheets.getByName(name).PageStyle = landscape_name


def money_format(doc):
    formats = doc.getNumberFormats()
    locale = uno.createUnoStruct("com.sun.star.lang.Locale")
    locale.Language = "es"
    locale.Country = "CL"
    pattern = '[$$-es-CL] #.##0;[RED]([$ $-es-CL] #.##0);-'
    key = formats.queryKey(pattern, locale, True)
    if key == -1:
        key = formats.addNew(pattern, locale)
    return key


def pct_format(doc):
    formats = doc.getNumberFormats()
    locale = uno.createUnoStruct("com.sun.star.lang.Locale")
    locale.Language = "es"
    locale.Country = "CL"
    key = formats.queryKey('0,0%', locale, True)
    if key == -1:
        key = formats.addNew('0,0%', locale)
    return key


def number_format(doc, pattern):
    formats = doc.getNumberFormats()
    locale = uno.createUnoStruct("com.sun.star.lang.Locale")
    locale.Language = "es"
    locale.Country = "CL"
    key = formats.queryKey(pattern, locale, True)
    if key == -1:
        key = formats.addNew(pattern, locale)
    return key


def apply_border(rng, color=0xCCD6DD, width=18):
    line = BorderLine2()
    line.Color = color
    line.LineWidth = width
    line.OuterLineWidth = width
    rng.TopBorder = line
    rng.BottomBorder = line
    rng.LeftBorder = line
    rng.RightBorder = line


def grid(rng, outer=BLUE, outer_w=26, inner=GRID, inner_w=8):
    """Reticulado con exterior grueso e interior fino, en UNA asignación por
    tabla. apply_border() pone el mismo borde en las cuatro caras de cada celda,
    que es exactamente el aspecto de planilla cruda que había que quitar."""
    thick, thin = BorderLine2(), BorderLine2()
    thick.Color, thick.LineWidth, thick.OuterLineWidth = outer, outer_w, outer_w
    thin.Color, thin.LineWidth, thin.OuterLineWidth = inner, inner_w, inner_w
    tb = TableBorder2()
    tb.TopLine = tb.BottomLine = tb.LeftLine = tb.RightLine = thick
    tb.HorizontalLine = tb.VerticalLine = thin
    for flag in ("IsTopLineValid", "IsBottomLineValid", "IsLeftLineValid",
                 "IsRightLineValid", "IsHorizontalLineValid", "IsVerticalLineValid",
                 "IsDistanceValid"):
        setattr(tb, flag, True)
    tb.Distance = 0
    rng.TableBorder2 = tb


def _protection(locked=True):
    p = CellProtection()
    p.IsLocked = locked
    p.IsFormulaHidden = False
    p.IsHidden = False
    p.IsPrintHidden = False
    return p


def make_style(doc, name, parent=None, **props):
    """Crea (o reusa) un estilo de celda. Hay que RE-OBTENER el estilo después de
    insertarlo, y fijar ParentStyle antes que el resto para que la herencia
    resuelva bien."""
    fam = doc.StyleFamilies.getByName("CellStyles")
    if not fam.hasByName(name):
        fam.insertByName(name, doc.createInstance("com.sun.star.style.CellStyle"))
    st = fam.getByName(name)
    if parent and fam.hasByName(parent):
        try:
            st.ParentStyle = parent
        except Exception:
            pass
    for key, value in props.items():
        try:
            setattr(st, key, value)
        except Exception:
            pass
    return st


def build_style_system(doc, fmts):
    """Todo el formato del libro cuelga de aquí. Aplicar un estilo es una
    asignación por rango, no diez propiedades por celda."""
    money, pct, integer, decimal = fmts["money"], fmts["pct"], fmts["int"], fmts["dec"]
    mult = number_format(doc, '#.##0,00"×"')
    years_f = number_format(doc, '#.##0,0" años"')
    days_f = number_format(doc, '#.##0" d"')
    pct2 = number_format(doc, "0,00%")
    locked, unlocked = _protection(True), _protection(False)

    make_style(doc, "P.Base", None, CharFontName="Liberation Sans", CharHeight=10,
               CharColor=TEXT, VertJustify=V_CENTER, CellProtection=locked)
    make_style(doc, "P.Title", "P.Base", CharHeight=18, CharWeight=150, CharColor=NAVY,
               CellBackColor=TITLE_FILL, HoriJustify=H_LEFT)
    make_style(doc, "P.Subtitle", "P.Base", CharHeight=10, CharPosture=SLANT_ITALIC,
               CellBackColor=0xF6FAFD, HoriJustify=H_LEFT)
    make_style(doc, "P.Section", "P.Base", CharHeight=11, CharWeight=150, CharColor=NAVY,
               CellBackColor=SECTION_FILL, HoriJustify=H_LEFT)
    make_style(doc, "P.Header", "P.Base", CharWeight=150, CharColor=NAVY,
               CellBackColor=HEADER_FILL, HoriJustify=H_CENTER, IsTextWrapped=True)
    # Un encabezado centrado sobre una columna alineada a la derecha es
    # justamente lo que se lee como "no profesional".
    make_style(doc, "P.HeaderNum", "P.Header", HoriJustify=H_RIGHT)

    make_style(doc, "P.Label", "P.Base", HoriJustify=H_LEFT)
    make_style(doc, "P.LabelSub", "P.Label", ParaIndent=300)
    make_style(doc, "P.Note", "P.Base", CharHeight=9, CharColor=0x6B7280,
               IsTextWrapped=True, VertJustify=V_TOP, HoriJustify=H_LEFT)
    make_style(doc, "P.Stamp", "P.Base", CharHeight=8, CharColor=0x6B7280, HoriJustify=H_LEFT)

    numeric = {"P.Money": money, "P.Pct": pct, "P.Pct2": pct2, "P.Int": integer,
               "P.Dec2": decimal, "P.Mult": mult, "P.Years": years_f, "P.Days": days_f}
    for name, fmt in numeric.items():
        make_style(doc, name, "P.Base", HoriJustify=H_RIGHT, NumberFormat=fmt)

    # Gemelos para la banda cebra: la alternancia pasa a ser un estilo, no un
    # bucle que pinta fondo fila por fila.
    for name in list(numeric) + ["P.Label", "P.Note"]:
        make_style(doc, name + ".Alt", name, CellBackColor=FORMULA_FILL)

    # Celdas de entrada: la protección viaja EN el estilo, así que "edite sólo
    # las amarillas" deja de ser un consejo y pasa a ser una propiedad.
    for suffix, fmt in [("Money", money), ("Pct", pct), ("Int", integer),
                        ("Mult", mult), ("Dec2", decimal)]:
        make_style(doc, f"P.In.{suffix}", "P.Base", CellBackColor=INPUT_FILL,
                   CharColor=0x0000FF, CharWeight=150, HoriJustify=H_RIGHT,
                   NumberFormat=fmt, CellProtection=unlocked)
    make_style(doc, "P.In.Text", "P.Base", CellBackColor=INPUT_FILL, CharColor=0x0000FF,
               CharWeight=150, HoriJustify=H_LEFT, CellProtection=unlocked)

    conf = {"Verificado": (GREEN, POSITIVE_FILL), "Estimado": (0x9A6700, 0xFFF4CE),
            "Supuesto": (RED, NEGATIVE_FILL), "Pendiente": (0x6B7280, 0xF1F3F5)}
    for name, (fg, bg) in conf.items():
        make_style(doc, f"P.Conf.{name}", "P.Base", CharColor=fg, CellBackColor=bg,
                   CharWeight=150, HoriJustify=H_CENTER)

    make_style(doc, "P.Total", "P.Base", CellBackColor=TOTAL_FILL, CharColor=NAVY,
               CharWeight=150, HoriJustify=H_RIGHT, NumberFormat=money)
    make_style(doc, "P.Total.Label", "P.Base", CellBackColor=TOTAL_FILL, CharColor=NAVY,
               CharWeight=150, HoriJustify=H_LEFT)
    make_style(doc, "P.Total.Pct", "P.Total", NumberFormat=pct)
    make_style(doc, "P.KPI.Label", "P.Base", CharWeight=150, CharColor=TEXT,
               CellBackColor=FORMULA_FILL, HoriJustify=H_LEFT)
    make_style(doc, "P.KPI.Value", "P.Base", CharHeight=15, CharWeight=150, CharColor=NAVY,
               CellBackColor=FORMULA_FILL, HoriJustify=H_RIGHT, NumberFormat=money)
    make_style(doc, "P.KPI.Note", "P.Base", CharHeight=9, CharColor=0x6B7280,
               CellBackColor=FORMULA_FILL, HoriJustify=H_LEFT)

    # Destinos de FORMATO CONDICIONAL. No se aplican estáticamente salvo en la
    # leyenda: pintarlos a mano es lo que hacía que los colores mintieran en
    # cuanto alguien editaba un input.
    make_style(doc, "P.Good", "P.Base", CharColor=GREEN, CellBackColor=POSITIVE_FILL,
               CharWeight=150, HoriJustify=H_RIGHT)
    make_style(doc, "P.Bad", "P.Base", CharColor=RED, CellBackColor=NEGATIVE_FILL,
               CharWeight=150, HoriJustify=H_RIGHT)
    make_style(doc, "P.Warn", "P.Base", CharColor=0x9A6700, CellBackColor=0xFFF4CE,
               CharWeight=150, HoriJustify=H_RIGHT)
    make_style(doc, "P.Neutral", "P.Base", CharColor=TEXT, CellBackColor=FORMULA_FILL,
               HoriJustify=H_RIGHT)


def sty(target, name):
    """Aplica un estilo a una celda o a un rango completo."""
    target.CellStyle = name


# Capacidades UNO conseguidas o degradadas en esta corrida. Se imprime al final
# y se escribe en el libro: si algo se degrada, el archivo lo dice en vez de
# aparentar que está.
CAPS = {}


def cond_format(doc, rng, sheet_idx, col0, row0, rules):
    """Formato condicional REAL. Antes los colores se pintaban desde Python
    después de calculateAll(), así que mentían apenas alguien editaba un input.

    Tres trampas: la propiedad ConditionalFormat es una COPIA (hay que
    reasignarla), la fórmula se interpreta relativa a SourcePosition (se escribe
    sin $ sobre la esquina superior izquierda), y un StyleName inexistente es un
    no-op silencioso."""
    try:
        fam = doc.StyleFamilies.getByName("CellStyles")
        src = uno.createUnoStruct("com.sun.star.table.CellAddress")
        src.Sheet, src.Column, src.Row = sheet_idx, col0, row0
        cf = rng.ConditionalFormat
        cf.clear()
        for formula, style_name in rules:
            if not fam.hasByName(style_name):
                raise RuntimeError(f"estilo inexistente: {style_name}")
            cf.addNew((
                prop("Operator", uno.Enum("com.sun.star.sheet.ConditionOperator", "FORMULA")),
                prop("Formula1", formula),
                prop("StyleName", style_name),
                prop("SourcePosition", src),
            ))
        rng.ConditionalFormat = cf
        CAPS["formato_condicional"] = True
        return True
    except Exception as exc:
        CAPS["formato_condicional"] = f"degradado: {exc}"
        return False


def list_validation(cell, source_range, title, message):
    """Desplegable real. El selector de escenario era texto libre: cualquier
    typo caía en silencio al caso Base."""
    try:
        val = cell.Validation
        val.Type = uno.Enum("com.sun.star.sheet.ValidationType", "LIST")
        val.setFormula1(source_range)
        val.Operator = uno.Enum("com.sun.star.sheet.ConditionOperator", "EQUAL")
        val.ShowList = 1
        val.ShowInputMessage = True
        val.InputTitle, val.InputMessage = title, message
        val.ShowErrorMessage = True
        val.ErrorAlertStyle = uno.Enum("com.sun.star.sheet.ValidationAlertStyle", "STOP")
        val.ErrorTitle = "Valor no permitido"
        val.ErrorMessage = message
        val.IgnoreBlankCells = False
        cell.Validation = val
        CAPS["validacion"] = True
        return True
    except Exception as exc:
        CAPS["validacion"] = f"degradado: {exc}"
        return False


def add_autofilter(doc, name, sheet_idx, col0, row0, col1, row1):
    try:
        ranges = doc.DatabaseRanges
        addr_ = uno.createUnoStruct("com.sun.star.table.CellRangeAddress")
        addr_.Sheet, addr_.StartColumn, addr_.EndColumn = sheet_idx, col0, col1
        addr_.StartRow, addr_.EndRow = row0, row1
        if ranges.hasByName(name):
            ranges.removeByName(name)
        ranges.addNewByName(name, addr_)
        ranges.getByName(name).AutoFilter = True
        # Verificado: el exportador de xlsx de LibreOffice no emite <autoFilter>
        # para rangos de base de datos creados por API, aunque el .ods sí los
        # lleva. Se declara el alcance real en vez de anunciar una capacidad que
        # el archivo de Excel no tiene.
        CAPS["autofiltro"] = "sólo ODS (el exportador xlsx no lo emite)"
        return True
    except Exception as exc:
        CAPS["autofiltro"] = f"degradado: {exc}"
        return False


def add_named_range(doc, name, content, sheet_idx=0, col=0, row=0):
    try:
        nr = doc.NamedRanges
        if nr.hasByName(name):
            return True
        pos = uno.createUnoStruct("com.sun.star.table.CellAddress")
        pos.Sheet, pos.Column, pos.Row = sheet_idx, col, row
        nr.addNewByName(name, content, pos, 0)
        CAPS["rangos_con_nombre"] = True
        return True
    except Exception as exc:
        CAPS["rangos_con_nombre"] = f"degradado: {exc}"
        return False


def set_print_titles(sheet, sheet_idx, row):
    try:
        addr_ = uno.createUnoStruct("com.sun.star.table.CellRangeAddress")
        addr_.Sheet, addr_.StartColumn, addr_.EndColumn = sheet_idx, 0, 20
        addr_.StartRow = addr_.EndRow = row
        sheet.setTitleRows(addr_)
        CAPS["titulos_impresion"] = True
        return True
    except Exception as exc:
        CAPS["titulos_impresion"] = f"degradado: {exc}"
        return False


def try_chart(sheet, name, x, y, w, h, ranges, kind="bar", title="", lines=0):
    """Gráfico nativo. Siempre acompañado de barras REPT() en celda, de modo que
    si esto falla el libro sigue mostrando la misma información."""
    try:
        rect = uno.createUnoStruct("com.sun.star.awt.Rectangle")
        rect.X, rect.Y, rect.Width, rect.Height = x, y, w, h
        addrs = []
        for sheet_idx, c0, r0, c1, r1 in ranges:
            a = uno.createUnoStruct("com.sun.star.table.CellRangeAddress")
            a.Sheet, a.StartColumn, a.StartRow, a.EndColumn, a.EndRow = sheet_idx, c0, r0, c1, r1
            addrs.append(a)
        charts = sheet.Charts
        if charts.hasByName(name):
            charts.removeByName(name)
        charts.addNewByName(name, rect, tuple(addrs), True, True)
        chart = charts.getByName(name).EmbeddedObject
        service = {"bar": "com.sun.star.chart.BarDiagram",
                   "line": "com.sun.star.chart.LineDiagram",
                   "xy": "com.sun.star.chart.XYDiagram"}[kind]
        chart.setDiagram(chart.createInstance(service))
        chart.HasMainTitle = True
        chart.Title.String = title
        if kind == "bar" and lines:
            chart.Diagram.NumberOfLines = lines
        if kind == "bar":
            chart.Diagram.Vertical = False if name.startswith("Tornado") else True
        CAPS["graficos"] = True
        return True
    except Exception as exc:
        CAPS["graficos"] = f"degradado: {exc}"
        return False


def put(sheet, col, row, value, style=None):
    cell = sheet.getCellByPosition(col, row)
    if isinstance(value, str) and value.startswith("="):
        cell.Formula = value
    elif isinstance(value, str):
        cell.String = value
    elif value is None:
        cell.String = "—"
    else:
        cell.Value = float(value)
    if style:
        cell.CellStyle = style
    return cell


def band_rows(sheet, first_row, last_row, first_col, last_col, colors=(0xFFFFFF, FORMULA_FILL)):
    for row in range(first_row, last_row + 1):
        rng = sheet.getCellRangeByPosition(first_col, row, last_col, row)
        rng.CellBackColor = colors[(row - first_row) % len(colors)]
        apply_border(rng)


def style_total(sheet, row, first_col, last_col):
    rng = sheet.getCellRangeByPosition(first_col, row, last_col, row)
    rng.CellBackColor = TOTAL_FILL
    rng.CharColor = NAVY
    rng.CharWeight = 150
    apply_border(rng, BLUE, 28)


def style_kpi(sheet, row, label_col=0, value_col=1):
    rng = sheet.getCellRangeByPosition(label_col, row, value_col, row)
    rng.CellBackColor = FORMULA_FILL
    apply_border(rng, GRID, 24)
    sheet.getCellByPosition(label_col, row).CharWeight = 150
    value = sheet.getCellByPosition(value_col, row)
    value.CharWeight = 150
    value.CharHeight = 14
    value.CharColor = NAVY
    sheet.Rows.getByIndex(row).Height = 750


def build_inputs(doc, data, money_fmt, pct_fmt):
    sheet = doc.Sheets.getByName("Inputs")
    add_title(sheet, "INPUTS Y SUPUESTOS DEL MODELO", "Edite sólo las celdas amarillas con fuente azul.")
    headers = ["Categoría", "Parámetro", "Valor", "Unidad", "Confianza", "Fuente", "Nota"]
    for col, val in enumerate(headers):
        # El encabezado de la columna de valores va alineado a la derecha, sobre
        # la columna numérica que encabeza.
        put(sheet, col, 3, val, "P.HeaderNum" if col == 2 else "P.Header")
    sheet.Rows.getByIndex(3).Height = 650

    base, market, prices, inputs, local, legal, financial = data
    rows = []

    def add(key, category, label, item, value=None, kind="number"):
        rows.append((key, category, label, item, item.get("valor") if value is None else value, kind))

    add("scenario", "Modelo", "Escenario activo", {"valor": "Base", "unidad": "texto", "confianza": "SUPUESTO", "fuente": "Selección del usuario", "nota": "Valores permitidos: Pesimista, Base u Optimista."}, kind="text")
    discount_item = resolved(entry(base, "macro.tasa_descuento_pct"), entry(financial, "modelo.tasa_descuento_nominal_pct"))
    add("discount", "Modelo", "TMAR nominal anual", discount_item, value=discount_item["valor"] / 100, kind="pct")
    inflation_item = entry(financial, "modelo.inflacion_anual_pct")
    add("inflation", "Modelo", "Inflación anual", inflation_item, value=inflation_item["valor"] / 100, kind="pct")
    add("capital_limit", "Modelo", "Capital máximo disponible", {"valor": base["meta"]["restriccion_capital_clp"], "unidad": "CLP", "confianza": "VERIFICADO", "fuente": "datos/supuestos.json#meta.restriccion_capital_clp", "nota": "Restricción declarada en el enunciado."}, kind="money")
    add("horizon", "Modelo", "Horizonte de evaluación", entry(financial, "modelo.horizonte_anios"))
    add("price", "Ventas", "Precio B2B neto base", resolved(entry(prices, "precios.precio_venta_b2b_familiar_clp"), entry(financial, "modelo.precio_b2b_familiar_base_clp")), kind="money")
    # La rampa comercial es FORMA, no nivel (espeja modelo.js). La etapa 03 fija
    # el nivel del año 1 vía SOM; la etapa 11 fija la forma de los años 2-5. Los
    # cinco volúmenes de la etapa 10 quedan como referencia: de ellos sale la
    # forma implícita cuando la etapa 11 aún no publicó factores.
    som_item = dict(maybe(base, "mercado.som_ano1_pizzas_mes"))
    if som_item.get("valor") is None:
        som_item = {"valor": 0, "unidad": "pizzas/mes", "confianza": "PENDIENTE",
                    "fuente": "datos/supuestos.json#mercado.som_ano1_pizzas_mes",
                    "nota": "0 = usar el volumen año 1 de referencia. La etapa 03 lo cierra en terreno."}
    add("som_month", "Ventas", "SOM año 1 (0 = usar referencia)", som_item, kind="number")
    for year in range(1, 6):
        add(f"volume{year}", "Ventas", f"Volumen año {year} (referencia)",
            entry(financial, f"modelo.volumen_ano{year}_unidades"))
    for year in range(2, 6):
        ramp_item = dict(maybe(base, f"comercial.rampa_ano{year}_factor"))
        if ramp_item.get("valor") is None:
            ramp_item = {"valor": 0, "unidad": "multiplicador sobre año 1", "confianza": "PENDIENTE",
                         "fuente": f"datos/supuestos.json#comercial.rampa_ano{year}_factor",
                         "nota": "0 = derivar la forma de los volúmenes de referencia. "
                                 "La etapa 11 no publicó factor y no se inventa uno."}
        add(f"ramp{year}", "Ventas", f"Rampa año {year} (0 = derivar)", ramp_item, kind="number")
    for year in range(1, 6):
        add(f"tax{year}", "Tributación", f"Impuesto año {year}", entry(financial, f"modelo.impuesto_ano{year}_pct"), value=entry(financial, f"modelo.impuesto_ano{year}_pct")["valor"] / 100, kind="pct")

    product_map = [
        ("flour_qty", "Harina por pizza", "harina_kg_unidad"), ("sauce_qty", "Salsa por pizza", "salsa_kg_unidad"),
        ("cheese_qty", "Mozzarella por pizza", "mozzarella_kg_unidad"), ("other_unit", "Otros ingredientes por pizza", "otros_ingredientes_clp_unidad"),
        ("pack_unit", "Envase por pizza", "envase_clp_unidad"), ("energy_unit", "Energía variable por pizza", "energia_variable_clp_unidad"),
        ("distribution_unit", "Distribución variable por pizza", "distribucion_variable_clp_unidad"), ("waste", "Merma de ingredientes", "merma_pct"),
    ]
    # La merma la formula la etapa 04 bajo produccion.*; el envase lo precia la
    # 06 bajo insumos.*. El resto vive en producto.* y lo puede sobrescribir la
    # etapa dueña desde supuestos.json.
    upstream_producto = {"waste": "produccion.merma_pct", "pack_unit": "insumos.envase_clp_unidad"}
    for key, label, name in product_map:
        fallback = entry(financial, f"producto.{name}")
        item = up(base, upstream_producto.get(key, f"producto.{name}"), fallback)
        val = item["valor"] / 100 if key == "waste" else item["valor"]
        add(key, "Producto", label, item, value=val, kind="pct" if key == "waste" else ("money" if "unit" in key else "number"))
    for key, label, path in [
        ("flour_price", "Precio harina/kg", "insumos.harina_clp_kg"),
        ("sauce_price", "Precio tomate/kg", "insumos.salsa_tomate_clp_kg"),
        ("cheese_price", "Precio mozzarella/kg", "insumos.mozzarella_clp_kg"),
    ]:
        add(key, "Insumos", label, entry(inputs, path), kind="money")

    rent_item = entry(local, "local.arriendo_mensual_clp")
    add("area", "Operación", "Superficie", resolved(entry(local, "local.superficie_requerida_m2"), entry(financial, "operacion.superficie_m2")))
    add("rent_m2", "Operación", "Arriendo por m²/mes", entry(local, "local.arriendo_clp_m2_mes"), kind="money")
    add("rent_override", "Operación", "Arriendo mensual directo (0 = calcular)", {**rent_item, "valor": 0}, value=0, kind="money")
    op_map = [
        ("payroll", "Nómina bruta mensual", "nomina_bruta_mensual_clp", "money"),
        ("employer_factor", "Factor costo empresa", "factor_costo_empresa", "number"),
        ("utilities", "Servicios fijos mensuales", "servicios_fijos_mensual_clp", "money"),
        ("maintenance", "Mantenimiento mensual", "mantenimiento_mensual_clp", "money"),
        ("admin", "Administración mensual", "administracion_mensual_clp", "money"),
        ("sales", "Ventas mensuales", "ventas_mensual_clp", "money"),
        ("insurance", "Seguros mensuales", "seguros_mensual_clp", "money"),
        ("ar_days", "Días cuentas por cobrar", "dias_cuentas_cobrar", "number"),
        ("inventory_days", "Días inventario", "dias_inventario", "number"),
        ("ap_days", "Días cuentas por pagar", "dias_cuentas_pagar", "number"),
    ]
    upstream_op = {
        "payroll": "rrhh.nomina_bruta_mensual_clp",
        "employer_factor": "macro.factor_costo_empresa",
        "sales": "operacion.ventas_mensual_clp",
        "insurance": "operacion.seguros_mensual_clp",
    }
    for key, label, name, kind in op_map:
        item = entry(financial, f"operacion.{name}")
        if key == "ar_days":
            item = resolved(entry(prices, "precios.plazo_cobro_dias"), item)
        elif key in upstream_op:
            item = up(base, upstream_op[key], item)
        add(key, "Operación", label, item, kind=kind)
    # La etapa 09 publica el costo de personal ya consolidado (nómina con
    # cotizaciones + retiro de la titular, que no cotiza). Cuando existe, manda
    # esa línea y NO se vuelve a multiplicar por el factor costo empresa.
    add("payroll_total", "Operación", "Costo de personal mensual (0 = calcular)",
        maybe(base, "rrhh.costo_personal_mensual_regimen_clp"),
        value=maybe(base, "rrhh.costo_personal_mensual_regimen_clp").get("valor") or 0, kind="money")
    # Capacidad instalada: la etapa 04 la deriva de la geometría del abatidor.
    # Si es 0, el modelo no topa la producción.
    cap_item = maybe(base, "produccion.capacidad_instalada_pizzas_dia")
    days_item = maybe(base, "produccion.dias_operacion_mes")
    add("capacity_day", "Operación", "Capacidad instalada (un/día, 0 = sin tope)",
        cap_item, value=cap_item.get("valor") or 0)
    add("operating_days", "Operación", "Días de operación al mes",
        days_item, value=days_item.get("valor") or 0)

    inv_map = [
        ("blaster", "Abatidor", "abatidor_clp"), ("mixer", "Amasadora", "amasadora_clp"),
        ("oven", "Horno", "horno_clp"), ("sealer", "Selladora al vacío", "selladora_vacio_clp"),
        ("cold_table", "Mesón refrigerado", "meson_refrigerado_clp"), ("freezers", "Congeladores", "congeladores_clp"),
        ("steel", "Acero, lavado y extracción", "acero_lavado_extraccion_clp"), ("tools", "Racks, bandejas e instrumentos", "racks_bandejas_instrumentos_clp"),
    ]
    for key, label, name in inv_map:
        add(key, "Inversión", label, entry(financial, f"inversion.{name}"), kind="money")
    habil = resolved(entry(local, "local.habilitacion_sanitaria_clp"), entry(financial, "inversion.habilitacion_sanitaria_clp"))
    permit = resolved(entry(legal, "capex.tramites_y_constitucion_clp"), entry(financial, "inversion.tramites_analisis_rotulado_clp"))
    # La etapa 05 publica el envolvente de equipos; si está, manda sobre la suma
    # línea a línea que armó la etapa 10 con precios de publicación.
    envelope_item = maybe(base, "capex.equipamiento_base_clp")
    add("equipment_envelope", "Inversión", "Envolvente de equipos etapa 05 (0 = sumar líneas)",
        envelope_item, value=envelope_item.get("valor") or 0, kind="money")
    install_item = up(base, "inversion.flete_instalacion_pct", entry(financial, "inversion.flete_instalacion_pct"))
    conting_item = up(base, "inversion.contingencia_pct", entry(financial, "inversion.contingencia_pct"))
    residual_item = up(base, "inversion.valor_residual_pct", entry(financial, "inversion.valor_residual_pct"))
    life_item = up(base, "inversion.vida_depreciable_anios", entry(financial, "inversion.vida_depreciable_anios"))
    for key, label, item, kind, val in [
        ("install_pct", "Flete e instalación", install_item, "pct", install_item["valor"] / 100),
        ("habilitation", "Habilitación sanitaria", habil, "money", habil["valor"]),
        ("permits", "Trámites, análisis y rotulado", permit, "money", permit["valor"]),
        ("preop", "Preoperación", entry(financial, "inversion.preoperacion_clp"), "money", None),
        ("contingency", "Contingencia", conting_item, "pct", conting_item["valor"] / 100),
        ("rent_guarantee", "Garantía de arriendo", entry(financial, "inversion.garantia_arriendo_meses"), "number", None),
        ("life", "Vida depreciable", life_item, "number", None),
        ("residual_pct", "Valor residual", residual_item, "pct", residual_item["valor"] / 100),
    ]:
        add(key, "Inversión", label, item, value=item["valor"] if val is None else val, kind=kind)

    # Los multiplicadores de escenario los posee la etapa 12 en supuestos.json.
    # Antes vivían hardcodeados aquí (0,90 / 1,10 / 1,15 / 0,95) mientras la
    # etapa 12 publicaba 0,72 / 1,20 / 1,30 / 0,80 y afirmaba en su página que
    # el reemplazo ya había ocurrido. Ahora se leen de verdad.
    # Los que la etapa 12 dejó en PENDIENTE entran como 1,00 marcados SIN ANCLA:
    # no se inventa un 0,80 para rellenar el hueco.
    scen_metric = {"price": "precio", "volume": "volumen", "variable": "costo_variable",
                   "fixed": "costo_fijo", "capex": "capex"}
    scen_case = {"pess": "pesimista", "base": "base", "opt": "optimista"}
    scen_label = {"pess": "Pesimista", "base": "Base", "opt": "Optimista"}
    metric_label = {"price": "precio", "volume": "volumen", "variable": "costo variable",
                    "fixed": "costo fijo", "capex": "CAPEX"}
    for case in ("pess", "base", "opt"):
        for metric in ("price", "volume", "variable", "fixed", "capex"):
            path = f"escenarios.{scen_metric[metric]}_{scen_case[case]}_factor"
            item = dict(maybe(base, path))
            if item.get("valor") is None:
                item = {
                    "valor": 1.0, "unidad": "multiplicador", "confianza": "PENDIENTE",
                    "fuente": item.get("fuente") or f"datos/supuestos.json#{path}",
                    "nota": "SIN ANCLA — la etapa 12 no publicó banda para esta variable. "
                            "Entra neutro (1,00) para no fabricar un escenario. "
                            + (item.get("nota") or ""),
                }
            add(f"{case}_{metric}", "Escenarios",
                f"{scen_label[case]}: {metric_label[metric]}", item,
                value=item["valor"], kind="number")

    # Los extremos de la matriz de sensibilidad reutilizan las mismas anclas de
    # precio; el eje de volumen queda neutro mientras no exista banda publicada.
    for key, label, path, default in [
        ("sens_price_low", "Sensibilidad: precio bajo", "escenarios.precio_pesimista_factor", 1.0),
        ("sens_price_high", "Sensibilidad: precio alto", "escenarios.precio_optimista_factor", 1.0),
        ("sens_volume_low", "Sensibilidad: volumen bajo", "escenarios.volumen_pesimista_factor", 1.0),
        ("sens_volume_high", "Sensibilidad: volumen alto", "escenarios.volumen_optimista_factor", 1.0),
    ]:
        item = dict(maybe(base, path))
        if item.get("valor") is None:
            item = {"valor": default, "unidad": "multiplicador", "confianza": "PENDIENTE",
                    "fuente": f"datos/supuestos.json#{path}",
                    "nota": "SIN ANCLA — eje neutro mientras la etapa 12 no publique banda."}
        add(key, "Escenarios", label, item, value=item["valor"], kind="number")

    integer_fmt = number_format(doc, '#.##0')
    decimal_fmt = number_format(doc, '#.##0,00')
    positions = {}
    first_row = 4
    row = first_row
    # Sin bandas de sección fusionadas dentro de la tabla: una celda fusionada
    # rompe el autofiltro y la validación. La columna Categoría ya agrupa, y
    # ahora se puede filtrar por ella.
    kind_style = {"money": "Money", "pct": "Pct", "number": "Int", "text": "Text"}
    for key, category, label, item, value, kind in rows:
        positions[key] = row
        # Cebra RELATIVA al inicio de la tabla: con la paridad absoluta anterior
        # la fase del rayado se invertía en cada corte de sección.
        alt = ".Alt" if (row - first_row) % 2 else ""
        put(sheet, 0, row, category, "P.Label" + alt)
        put(sheet, 1, row, label, "P.Label" + alt)
        put(sheet, 3, row, item.get("unidad", ""), "P.Label" + alt)
        confidence = str(item.get("confianza", "")).upper()
        put(sheet, 4, row, confidence, "P.Conf." + confidence.capitalize()
            if confidence in ("VERIFICADO", "ESTIMADO", "SUPUESTO", "PENDIENTE") else "P.Label" + alt)
        put(sheet, 5, row, item.get("fuente", "") or "", "P.Note" + alt)
        put(sheet, 6, row, item.get("nota", "") or "", "P.Note" + alt)
        if kind == "text":
            put(sheet, 2, row, str(value), "P.In.Text")
        else:
            suffix = kind_style.get(kind, "Int")
            if kind == "number" and not float(value).is_integer():
                suffix = "Dec2"
            put(sheet, 2, row, float(value), "P.In." + suffix)
        row += 1
    grid(sheet.getCellRangeByPosition(0, 3, 6, row - 1))
    format_columns(sheet, [2500, 5200, 2800, 3400, 2700, 9000, 10500])
    # OptimalHeight es O(celdas) y es un punto caliente conocido: sólo sobre las
    # dos columnas que realmente envuelven texto.
    sheet.getCellRangeByPosition(5, 4, 6, row - 1).Rows.OptimalHeight = True
    sheet.TabColor = 0xF4B183
    return positions


def formula_ref(pos, key):
    return addr(2, pos[key])


def build_calc_block(sheet, start, name, refs, multipliers, money_fmt, pct_fmt):
    """Crea un modelo completo; retorna coordenadas de resultados clave."""
    r = start
    set_text(sheet, 0, r, name)
    sheet.getCellRangeByPosition(0, r, 6, r).merge(True)
    heading = sheet.getCellRangeByPosition(0, r, 6, r)
    heading.CellBackColor = SECTION_FILL
    heading.CharColor = NAVY
    heading.CharWeight = 150
    apply_border(heading, BLUE, 24)
    r += 1
    labels = ["Precio", "Volumen", "Costo variable", "Costo fijo", "CAPEX"]
    for i, (label, formula) in enumerate(zip(labels, multipliers)):
        set_text(sheet, 0, r + i, label)
        set_formula(sheet, 1, r + i, formula)
    mult_rows = {key: r + i for i, key in enumerate(["price", "volume", "variable", "fixed", "capex"])}
    r += 6
    scalar = {}
    scalar_specs = [
        ("equipment", "Equipos", f"=IF({refs['equipment_envelope']}>0;{refs['equipment_envelope']};" + "+".join(refs[k] for k in ["blaster", "mixer", "oven", "sealer", "cold_table", "freezers", "steel", "tools"]) + ")"),
        ("installation", "Flete/instalación", None), ("rent", "Arriendo mensual", f"=IF({refs['rent_override']}>0;{refs['rent_override']};{refs['area']}*{refs['rent_m2']})"),
        ("variable_base", "Costo variable unitario base", f"=(({refs['flour_qty']}*{refs['flour_price']}+{refs['sauce_qty']}*{refs['sauce_price']}+{refs['cheese_qty']}*{refs['cheese_price']}+{refs['other_unit']})*(1+{refs['waste']})+{refs['pack_unit']}+{refs['energy_unit']}+{refs['distribution_unit']})"),
        ("fixed_month", "Costo fijo mensual base", None), ("depreciable", "CAPEX depreciable", None),
        ("total_capex", "CAPEX total", None), ("depreciation", "Depreciación anual", None),
        ("residual", "Valor residual bruto", None), ("guarantee", "Garantía arriendo", None),
    ]
    for key, label, formula in scalar_specs:
        scalar[key] = r
        set_text(sheet, 0, r, label)
        if formula: set_formula(sheet, 1, r, formula)
        r += 1
    set_formula(sheet, 1, scalar["installation"], f"={addr(1, scalar['equipment'], 'Calculos')}*{refs['install_pct']}")
    personal = f"IF({refs['payroll_total']}>0;{refs['payroll_total']};{refs['payroll']}*{refs['employer_factor']})"
    set_formula(sheet, 1, scalar["fixed_month"], f"=({scalar_cell(scalar,'rent')}+{personal}+{refs['utilities']}+{refs['maintenance']}+{refs['admin']}+{refs['sales']}+{refs['insurance']})")
    capex_mult = addr(1, mult_rows["capex"], "Calculos")
    set_formula(sheet, 1, scalar["depreciable"], f"=({scalar_cell(scalar,'equipment')}+{scalar_cell(scalar,'installation')}+{refs['habilitation']})*(1+{refs['contingency']})*{capex_mult}")
    set_formula(sheet, 1, scalar["total_capex"], f"={scalar_cell(scalar,'depreciable')}+({refs['permits']}+{refs['preop']})*{capex_mult}")
    set_formula(sheet, 1, scalar["depreciation"], f"={scalar_cell(scalar,'depreciable')}/{refs['life']}")
    set_formula(sheet, 1, scalar["residual"], f"={scalar_cell(scalar,'depreciable')}*{refs['residual_pct']}")
    set_formula(sheet, 1, scalar["guarantee"], f"={scalar_cell(scalar,'rent')}*{refs['rent_guarantee']}")
    sheet.getCellRangeByPosition(1, scalar["equipment"], 1, scalar["guarantee"]).NumberFormat = money_fmt

    r += 1
    header = r
    for col, value in enumerate(["Concepto", "Año 0", "Año 1", "Año 2", "Año 3", "Año 4", "Año 5"]): set_text(sheet, col, r, value)
    style_header(sheet, r)
    r += 1
    row_names = ["Volumen", "Escalador", "Precio", "Costo variable unitario", "Ingresos", "Costos variables", "Costos fijos", "EBITDA", "Depreciación", "EBIT", "Pérdida tributaria inicial", "Renta imponible", "Impuesto", "Pérdida tributaria final", "Capital de trabajo", "Variación capital de trabajo", "Recuperaciones terminales", "Flujo libre", "Factor descuento", "Flujo descontado", "Flujo acumulado", "Flujo descontado acumulado"]
    rows = {}
    for label in row_names:
        rows[label] = r
        set_text(sheet, 0, r, label)
        r += 1
    year_cols = range(2, 7)
    p_mult = addr(1, mult_rows["price"], "Calculos")
    v_mult = addr(1, mult_rows["volume"], "Calculos")
    var_mult = addr(1, mult_rows["variable"], "Calculos")
    fixed_mult = addr(1, mult_rows["fixed"], "Calculos")
    for idx, col in enumerate(year_cols, 1):
        # Nivel del año 1 (SOM si existe) × forma de la rampa; después el tope de
        # capacidad. Ambos centinelas se comprueban: capacidad>0 Y días>0, porque
        # días=0 con capacidad>0 topaba el volumen a cero en silencio.
        cap_year = f"{refs['capacity_day']}*{refs['operating_days']}*12"
        y1 = f"IF({refs['som_month']}>0;{refs['som_month']}*12;{refs['volume1']})"
        if idx == 1:
            nivel = y1
        else:
            ramp = (f"IF({refs[f'ramp{idx}']}>0;{refs[f'ramp{idx}']};"
                    f"{refs[f'volume{idx}']}/{refs['volume1']})")
            nivel = f"{y1}*{ramp}"
        demanda = f"({nivel})*{v_mult}"
        set_formula(sheet, col, rows["Volumen"],
                    f"=IF(AND({refs['capacity_day']}>0;{refs['operating_days']}>0);"
                    f"MIN({demanda};{cap_year});{demanda})")
        set_formula(sheet, col, rows["Escalador"], f"=(1+{refs['inflation']})^{idx}")
        set_formula(sheet, col, rows["Precio"], f"={refs['price']}*{p_mult}*{addr(col,rows['Escalador'],'Calculos')}")
        set_formula(sheet, col, rows["Costo variable unitario"], f"={scalar_cell(scalar,'variable_base')}*{var_mult}*{addr(col,rows['Escalador'],'Calculos')}")
        set_formula(sheet, col, rows["Ingresos"], f"={addr(col,rows['Volumen'],'Calculos')}*{addr(col,rows['Precio'],'Calculos')}")
        set_formula(sheet, col, rows["Costos variables"], f"={addr(col,rows['Volumen'],'Calculos')}*{addr(col,rows['Costo variable unitario'],'Calculos')}")
        set_formula(sheet, col, rows["Costos fijos"], f"={scalar_cell(scalar,'fixed_month')}*12*{fixed_mult}*{addr(col,rows['Escalador'],'Calculos')}")
        set_formula(sheet, col, rows["EBITDA"], f"={addr(col,rows['Ingresos'],'Calculos')}-{addr(col,rows['Costos variables'],'Calculos')}-{addr(col,rows['Costos fijos'],'Calculos')}")
        set_formula(sheet, col, rows["Depreciación"], f"={scalar_cell(scalar,'depreciation')}")
        set_formula(sheet, col, rows["EBIT"], f"={addr(col,rows['EBITDA'],'Calculos')}-{addr(col,rows['Depreciación'],'Calculos')}")
        opening = "0" if idx == 1 else addr(col - 1, rows["Pérdida tributaria final"], "Calculos")
        set_formula(sheet, col, rows["Pérdida tributaria inicial"], f"={opening}")
        set_formula(sheet, col, rows["Renta imponible"], f"=MAX(0;{addr(col,rows['EBIT'],'Calculos')}-{addr(col,rows['Pérdida tributaria inicial'],'Calculos')})")
        set_formula(sheet, col, rows["Impuesto"], f"={addr(col,rows['Renta imponible'],'Calculos')}*{refs[f'tax{idx}']}")
        set_formula(sheet, col, rows["Pérdida tributaria final"], f"=MAX(0;{addr(col,rows['Pérdida tributaria inicial'],'Calculos')}-{addr(col,rows['EBIT'],'Calculos')})")
        set_formula(sheet, col, rows["Capital de trabajo"], f"={addr(col,rows['Ingresos'],'Calculos')}*{refs['ar_days']}/365+{addr(col,rows['Costos variables'],'Calculos')}*{refs['inventory_days']}/365-{addr(col,rows['Costos variables'],'Calculos')}*{refs['ap_days']}/365")
        prev_nwc = addr(2, rows["Capital de trabajo"], "Calculos") if idx == 1 else addr(col - 1, rows["Capital de trabajo"], "Calculos")
        set_formula(sheet, col, rows["Variación capital de trabajo"], f"={addr(col,rows['Capital de trabajo'],'Calculos')}-{prev_nwc}")
        # El impuesto de enajenación grava el RESULTADO (residual menos valor
        # libro), no el precio de venta. Con vida depreciable > horizonte el
        # valor libro supera al residual: la venta da pérdida y no se paga
        # impuesto. Tampoco se acredita escudo: al cerrar el horizonte no queda
        # renta futura contra la cual imputar esa pérdida.
        if idx < 5:
            terminal = "0"
        else:
            book = f"MAX(0;{scalar_cell(scalar,'depreciable')}-{scalar_cell(scalar,'depreciation')}*5)"
            disposal = f"({scalar_cell(scalar,'residual')}-{book})"
            terminal = (f"{scalar_cell(scalar,'residual')}-MAX(0;{disposal})*{refs['tax5']}"
                        f"+{addr(col,rows['Capital de trabajo'],'Calculos')}"
                        f"+{scalar_cell(scalar,'guarantee')}")
        set_formula(sheet, col, rows["Recuperaciones terminales"], f"={terminal}")
        set_formula(sheet, col, rows["Flujo libre"], f"={addr(col,rows['EBITDA'],'Calculos')}-{addr(col,rows['Impuesto'],'Calculos')}-{addr(col,rows['Variación capital de trabajo'],'Calculos')}+{addr(col,rows['Recuperaciones terminales'],'Calculos')}")
        set_formula(sheet, col, rows["Factor descuento"], f"=1/(1+{refs['discount']})^{idx}")
        set_formula(sheet, col, rows["Flujo descontado"], f"={addr(col,rows['Flujo libre'],'Calculos')}*{addr(col,rows['Factor descuento'],'Calculos')}")
        prev_cash = addr(1, rows["Flujo acumulado"], "Calculos") if idx == 1 else addr(col - 1, rows["Flujo acumulado"], "Calculos")
        prev_pv = addr(1, rows["Flujo descontado acumulado"], "Calculos") if idx == 1 else addr(col - 1, rows["Flujo descontado acumulado"], "Calculos")
        set_formula(sheet, col, rows["Flujo acumulado"], f"={prev_cash}+{addr(col,rows['Flujo libre'],'Calculos')}")
        set_formula(sheet, col, rows["Flujo descontado acumulado"], f"={prev_pv}+{addr(col,rows['Flujo descontado'],'Calculos')}")
    initial = f"{scalar_cell(scalar,'total_capex')}+{scalar_cell(scalar,'guarantee')}+{addr(2,rows['Capital de trabajo'],'Calculos')}"
    set_formula(sheet, 1, rows["Flujo libre"], f"=-({initial})")
    set_value(sheet, 1, rows["Factor descuento"], 1)
    set_formula(sheet, 1, rows["Flujo descontado"], f"={addr(1,rows['Flujo libre'],'Calculos')}")
    set_formula(sheet, 1, rows["Flujo acumulado"], f"={addr(1,rows['Flujo libre'],'Calculos')}")
    set_formula(sheet, 1, rows["Flujo descontado acumulado"], f"={addr(1,rows['Flujo descontado'],'Calculos')}")
    sheet.getCellRangeByPosition(1, rows["Precio"], 6, rows["Flujo descontado acumulado"]).NumberFormat = money_fmt

    r += 1
    results = {}
    result_specs = ["Inversión inicial", "VAN", "TIR", "Payback descontado",
                    "Índice de rentabilidad", "Fondeo máximo", "Punto de equilibrio mensual",
                    "Capacidad instalada anual", "Uso de capacidad año 5",
                    "Equilibrio sobre capacidad", "VAN por peso de fondeo"]
    for label in result_specs:
        results[label] = r
        set_text(sheet, 0, r, label)
        r += 1
    flow0 = addr(1, rows["Flujo libre"], "Calculos")
    flows = f"{addr(1,rows['Flujo libre'],'Calculos')}:{addr(6,rows['Flujo libre'],'Calculos')}"
    pv_inflows = "+".join(addr(c, rows["Flujo descontado"], "Calculos") for c in year_cols)
    set_formula(sheet, 1, results["Inversión inicial"], f"=-{flow0}")
    set_formula(sheet, 1, results["VAN"], f"=SUM({addr(1,rows['Flujo descontado'],'Calculos')}:{addr(6,rows['Flujo descontado'],'Calculos')})")
    # Sin cambio de signo no existe TIR. Devolver -1 la presentaba como
    # "-100%", un número fabricado que el dictamen y los escenarios leían como
    # si fuera una tasa. NA() se propaga y obliga a decir "No calculable".
    set_formula(sheet, 1, results["TIR"], f"=IFERROR(IRR({flows});NA())")
    cumulative = [addr(c, rows["Flujo descontado acumulado"], "Calculos") for c in range(1, 7)]
    pvflows = [addr(c, rows["Flujo descontado"], "Calculos") for c in range(2, 7)]
    payback = 'NA()'
    for year in range(5, 0, -1):
        payback = f"IF({cumulative[year]}>=0;{year-1}+(-{cumulative[year-1]}/{pvflows[year-1]});{payback})"
    # Mismo criterio que la TIR: "99 años" era un centinela que se leía como si
    # fuera un plazo real. Si el flujo descontado no recupera la inversión
    # dentro del horizonte, no hay payback y hay que decirlo.
    set_formula(sheet, 1, results["Payback descontado"], f"=IFERROR({payback};NA())")
    set_formula(sheet, 1, results["Índice de rentabilidad"], f"=({pv_inflows})/(-{flow0})")
    cash_range = f"{addr(1,rows['Flujo acumulado'],'Calculos')}:{addr(6,rows['Flujo acumulado'],'Calculos')}"
    set_formula(sheet, 1, results["Fondeo máximo"], f"=-MIN({cash_range})")
    contribution = f"({addr(2,rows['Precio'],'Calculos')}-{addr(2,rows['Costo variable unitario'],'Calculos')})"
    set_formula(sheet, 1, results["Punto de equilibrio mensual"], f"=IF({contribution}>0;{addr(2,rows['Costos fijos'],'Calculos')}/{contribution}/12;NA())")
    # La pregunta 5 del statement pide el equilibrio en unidades/mes Y qué
    # porcentaje de la capacidad representa. Sin estas filas el libro sólo podía
    # responder la mitad.
    cap_annual = f"IF(AND({refs['capacity_day']}>0;{refs['operating_days']}>0);{refs['capacity_day']}*{refs['operating_days']}*12;NA())"
    cap_cell = addr(1, results["Capacidad instalada anual"], "Calculos")
    set_formula(sheet, 1, results["Capacidad instalada anual"], f"={cap_annual}")
    set_formula(sheet, 1, results["Uso de capacidad año 5"],
                f"=IFERROR({addr(6,rows['Volumen'],'Calculos')}/{cap_cell};NA())")
    set_formula(sheet, 1, results["Equilibrio sobre capacidad"],
                f"=IFERROR({addr(1,results['Punto de equilibrio mensual'],'Calculos')}*12/{cap_cell};NA())")
    # Bajo racionamiento de capital el denominador correcto es el fondeo máximo
    # —la caja que realmente hay que poner— y no la inversión inicial.
    set_formula(sheet, 1, results["VAN por peso de fondeo"],
                f"=IFERROR({addr(1,results['VAN'],'Calculos')}/{addr(1,results['Fondeo máximo'],'Calculos')};NA())")
    sheet.getCellRangeByPosition(1, results["Inversión inicial"], 1, results["VAN"]).NumberFormat = money_fmt
    sheet.getCellByPosition(1, results["TIR"]).NumberFormat = pct_fmt
    sheet.getCellByPosition(1, results["Fondeo máximo"]).NumberFormat = money_fmt
    return {"rows": rows, "scalar": scalar, "results": results, "end": r, "header": header}


def scalar_cell(scalar, key):
    return addr(1, scalar[key], "Calculos")


def main():
    data_map = load_all()
    # Las funciones de construcción del libro consumen la tupla posicional
    # histórica; el motor Python consume el diccionario. Misma fuente.
    data = [data_map[k] for k in ("base", "market", "prices", "inputs", "local",
                                  "legal", "financial")]
    desktop, process, profile = connect_office()
    doc = None
    try:
        doc = desktop.loadComponentFromURL("private:factory/scalc", "_blank", 0, ())
        default_style = doc.StyleFamilies.getByName("CellStyles").getByName("Default")
        default_style.CharFontName = "Liberation Sans"
        default_style.CharColor = TEXT
        default_style.CharHeight = 10
        sheets = doc.Sheets
        sheets.getByIndex(0).Name = "Resumen"
        for name in ["Inputs", "Inversion", "Flujo_Caja", "Escenarios", "Sensibilidad", "Fuentes", "Calculos"]:
            sheets.insertNewByName(name, sheets.getCount())
        money_fmt, pct_fmt = money_format(doc), pct_format(doc)
        integer_fmt = number_format(doc, '#.##0')
        decimal_fmt = number_format(doc, '#.##0,00')
        build_style_system(doc, {"money": money_fmt, "pct": pct_fmt,
                                 "int": integer_fmt, "dec": decimal_fmt})
        # El recálculo automático dispara una pasada por cada fórmula escrita.
        # Se apaga durante toda la construcción y se calcula una sola vez.
        try:
            doc.enableAutomaticCalculation(False)
        except Exception:
            pass
        pos = build_inputs(doc, data, money_fmt, pct_fmt)
        refs = {key: formula_ref(pos, key) for key in pos}

        calc = sheets.getByName("Calculos")
        add_title(calc, "MOTOR DE CÁLCULO", "Bloques formulados para escenario activo, escenarios comparables y sensibilidad.")
        calc_start = 3
        selector = refs["scenario"]
        active_mult = []
        for metric in ["price", "volume", "variable", "fixed", "capex"]:
            active_mult.append(f'=IF({selector}="Pesimista";{refs[f"pess_{metric}"]};IF({selector}="Optimista";{refs[f"opt_{metric}"]};{refs[f"base_{metric}"]}))')
        blocks = {}
        blocks["Activo"] = build_calc_block(calc, calc_start, "Escenario activo", refs, active_mult, money_fmt, pct_fmt)
        calc_start = blocks["Activo"]["end"] + 2
        for prefix, label in [("pess", "Pesimista"), ("base", "Base"), ("opt", "Optimista")]:
            mult = [f"={refs[f'{prefix}_{metric}']}" for metric in ["price", "volume", "variable", "fixed", "capex"]]
            blocks[label] = build_calc_block(calc, calc_start, f"Escenario {label}", refs, mult, money_fmt, pct_fmt)
            calc_start = blocks[label]["end"] + 2
        price_mults = [refs["sens_price_low"], "1", refs["sens_price_high"]]
        volume_mults = [refs["sens_volume_low"], "1", refs["sens_volume_high"]]
        for vi, vm in enumerate(volume_mults):
            for pi, pm in enumerate(price_mults):
                key = f"S{vi}{pi}"
                blocks[key] = build_calc_block(calc, calc_start, f"Sensibilidad V{vi+1} P{pi+1}", refs, [f"={pm}", f"={vm}", "=1", "=1", "=1"], money_fmt, pct_fmt)
                calc_start = blocks[key]["end"] + 2
        format_columns(calc, [5800, 3000, 3000, 3000, 3000, 3000, 3000])

        summary = sheets.getByName("Resumen")
        add_title(summary, "EVALUACIÓN ECONÓMICA — PIZZERÍA B2B", "Flujo libre sin deuda · CLP nominales · 5 años", 5)
        style_section(summary, 3, "Decisión del escenario activo", 5)
        result_rows = blocks["Activo"]["results"]
        labels = [
            ("Inversión inicial", "Inversión inicial"), ("Fondeo máximo", "Fondeo máximo"),
            ("VAN", "VAN"), ("TIR", "TIR"), ("Payback descontado", "Payback descontado"),
            ("Índice de rentabilidad", "Índice de rentabilidad"), ("Punto equilibrio (u./mes)", "Punto de equilibrio mensual"),
        ]
        for i, (label, key) in enumerate(labels, 5):
            set_text(summary, 0, i, label)
            set_formula(summary, 1, i, f"={addr(1,result_rows[key],'Calculos')}")
            if key in ["Inversión inicial", "Fondeo máximo", "VAN"]: summary.getCellByPosition(1, i).NumberFormat = money_fmt
            if key == "TIR": summary.getCellByPosition(1, i).NumberFormat = pct_fmt
            if key in ["Payback descontado", "Índice de rentabilidad"]: summary.getCellByPosition(1, i).NumberFormat = decimal_fmt
            if key == "Punto de equilibrio mensual": summary.getCellByPosition(1, i).NumberFormat = integer_fmt
            style_kpi(summary, i)
        set_text(summary, 3, 5, "Escenario")
        set_formula(summary, 4, 5, f"={refs['scenario']}")
        set_text(summary, 3, 6, "TMAR")
        set_formula(summary, 4, 6, f"={refs['discount']}")
        summary.getCellByPosition(4, 6).NumberFormat = pct_fmt
        set_text(summary, 3, 7, "Capital disponible")
        set_formula(summary, 4, 7, f"={refs['capital_limit']}")
        summary.getCellByPosition(4, 7).NumberFormat = money_fmt
        set_text(summary, 3, 9, "Dictamen")
        npv = addr(1, 7, "Resumen")
        irr = addr(1, 8, "Resumen")
        funding = addr(1, 6, "Resumen")
        # Una TIR no calculable NO satisface el criterio: se evalúa como falso en
        # vez de propagar #N/A o de colarse como si fuera una tasa.
        irr_ok = f'IF(ISNA({irr});FALSE();{irr}>{refs["discount"]})'
        set_formula(summary, 4, 9,
                    f'=IF(AND({npv}>0;{irr_ok};{funding}<={refs["capital_limit"]});'
                    f'"VIABLE · SUPUESTOS";"RECHAZAR / REDISEÑAR")')
        summary.getCellByPosition(4, 9).CharWeight = 150
        summary.getCellRangeByPosition(3, 5, 4, 12).CellBackColor = 0xE8F3EC
        summary.getCellRangeByPosition(3, 5, 4, 12).CharColor = TEXT
        apply_border(summary.getCellRangeByPosition(3, 5, 4, 12), 0x8CB9A0, 24)
        summary.getCellByPosition(4, 9).CellBackColor = POSITIVE_FILL
        summary.getCellByPosition(4, 9).CharColor = GREEN
        style_section(summary, 14, "Criterios de Ingeniería Económica", 5)
        notes = [
            "VAN > 0: el proyecto crea valor a la TMAR seleccionada.",
            "TIR > TMAR: la rentabilidad interna supera el rendimiento mínimo exigido.",
            "VAN y TIR no se comparan entre sí: tienen unidades diferentes.",
            "El flujo es económico y no incorpora deuda, intereses ni dividendos.",
        ]
        for i, note in enumerate(notes, 16): set_text(summary, 0, i, "• " + note)
        summary.getCellRangeByPosition(0, 16, 5, 19).merge(False)
        style_section(summary, 21, "Guía de lectura del modelo", 5)
        set_text(summary, 0, 23, "Input editable")
        set_text(summary, 1, 23, "Azul sobre amarillo")
        set_text(summary, 3, 23, "Fórmula")
        set_text(summary, 4, 23, "Negro sobre claro")
        set_text(summary, 0, 24, "Vínculo interno")
        set_text(summary, 1, 24, "Verde en Fuentes")
        set_text(summary, 3, 24, "Alerta")
        set_text(summary, 4, 24, "Rojo = alerta")
        for row in [23, 24]:
            band_rows(summary, row, row, 0, 4)
        summary.getCellByPosition(1, 23).CharColor = 0x0000FF
        summary.getCellByPosition(1, 23).CellBackColor = INPUT_FILL
        summary.getCellByPosition(1, 24).CharColor = GREEN
        summary.getCellByPosition(4, 24).CharColor = RED
        summary.getCellRangeByPosition(0, 5, 4, 12).IsTextWrapped = True
        summary.Rows.getByIndex(9).Height = 780
        format_columns(summary, [4200, 3400, 200, 2400, 4000, 200])
        summary.TabColor = 0x5B9BD5

        investment = sheets.getByName("Inversion")
        add_title(investment, "INVERSIÓN INICIAL", "Escenario activo · montos desde Inputs y fórmulas.", 3)
        for c, h in enumerate(["Concepto", "Monto", "Tratamiento", "Referencia"]): set_text(investment, c, 3, h)
        style_header(investment, 3, 0, 3)
        b = blocks["Activo"]
        inv_items = [
            ("Equipos principales", scalar_cell(b["scalar"], "equipment"), "Depreciable"),
            ("Flete e instalación", scalar_cell(b["scalar"], "installation"), "Depreciable"),
            ("Habilitación + contingencia", f"={scalar_cell(b['scalar'],'depreciable')}-{scalar_cell(b['scalar'],'equipment')}-{scalar_cell(b['scalar'],'installation')}", "Depreciable"),
            ("Trámites y preoperación", f"={scalar_cell(b['scalar'],'total_capex')}-{scalar_cell(b['scalar'],'depreciable')}", "No depreciable en este modelo"),
            ("Garantía de arriendo", scalar_cell(b["scalar"], "guarantee"), "Recuperable al año 5"),
            ("Capital de trabajo inicial", addr(2, b["rows"]["Capital de trabajo"], "Calculos"), "Recuperable al año 5"),
        ]
        for i, (label, formula, treatment) in enumerate(inv_items, 4):
            set_text(investment, 0, i, label); set_formula(investment, 1, i, formula if formula.startswith("=") else "=" + formula)
            set_text(investment, 2, i, treatment); set_text(investment, 3, i, "Inputs / Calculos")
            investment.getCellByPosition(1, i).NumberFormat = money_fmt
        band_rows(investment, 4, 9, 0, 3)
        investment.getCellRangeByPosition(1, 4, 1, 9).CharColor = TEXT
        set_text(investment, 0, 11, "INVERSIÓN INICIAL TOTAL")
        set_formula(investment, 1, 11, f"={addr(1,b['results']['Inversión inicial'],'Calculos')}")
        investment.getCellRangeByPosition(0, 11, 1, 11).CharWeight = 150
        investment.getCellByPosition(1, 11).NumberFormat = money_fmt
        style_total(investment, 11, 0, 3)
        format_columns(investment, [6500, 4200, 6500, 5000])
        investment.TabColor = 0xF4B183

        flow = sheets.getByName("Flujo_Caja")
        add_title(flow, "FLUJO DE CAJA LIBRE DEL PROYECTO", "Escenario de Inputs · CLP nominales · sin financiamiento.")
        flow_rows = ["Volumen", "Precio", "Ingresos", "Costos variables", "Costos fijos", "EBITDA", "Depreciación", "EBIT", "Pérdida tributaria inicial", "Renta imponible", "Impuesto", "Pérdida tributaria final", "Capital de trabajo", "Variación capital de trabajo", "Recuperaciones terminales", "Flujo libre", "Factor descuento", "Flujo descontado", "Flujo acumulado", "Flujo descontado acumulado"]
        for c, h in enumerate(["Concepto", "Año 0", "Año 1", "Año 2", "Año 3", "Año 4", "Año 5"]): set_text(flow, c, 3, h)
        style_header(flow, 3)
        for ri, label in enumerate(flow_rows, 4):
            set_text(flow, 0, ri, label)
            srcrow = b["rows"][label]
            for c in range(1, 7): set_formula(flow, c, ri, f"={addr(c,srcrow,'Calculos')}")
        band_rows(flow, 4, 23, 0, 6)
        flow.getCellRangeByPosition(1, 4, 6, 23).CharColor = TEXT
        flow.getCellRangeByPosition(1, 4, 6, 23).NumberFormat = money_fmt
        flow.getCellRangeByPosition(1, 4, 6, 4).NumberFormat = integer_fmt
        flow.getCellRangeByPosition(1, 20, 6, 20).NumberFormat = decimal_fmt
        for important in ["EBITDA", "EBIT", "Flujo libre", "Flujo descontado"]:
            style_total(flow, flow_rows.index(important) + 4, 0, 6)
        format_columns(flow, [6500, 3600, 3600, 3600, 3600, 3600, 3600])
        flow.TabColor = 0x70AD47

        scenarios = sheets.getByName("Escenarios")
        add_title(scenarios, "ESCENARIOS", "Cada caso recalcula impuestos, capital de trabajo y valor terminal.")
        heads = ["Escenario", "VAN", "TIR", "Inversión inicial", "Fondeo máximo", "Payback descontado", "Punto equilibrio/mes"]
        for c, h in enumerate(heads): set_text(scenarios, c, 3, h)
        style_header(scenarios, 3)
        for ri, label in enumerate(["Pesimista", "Base", "Optimista"], 4):
            set_text(scenarios, 0, ri, label)
            rb = blocks[label]["results"]
            for c, key in enumerate(["VAN", "TIR", "Inversión inicial", "Fondeo máximo", "Payback descontado", "Punto de equilibrio mensual"], 1):
                set_formula(scenarios, c, ri, f"={addr(1,rb[key],'Calculos')}")
        for row, color in [(4, 0xFCE8E6), (5, 0xE7F0F7), (6, 0xE8F3EC)]:
            rng = scenarios.getCellRangeByPosition(0, row, 6, row)
            rng.CellBackColor = color; apply_border(rng)
            scenarios.getCellByPosition(0, row).CharWeight = 150
        scenarios.getCellRangeByPosition(1, 4, 1, 6).NumberFormat = money_fmt
        scenarios.getCellRangeByPosition(2, 4, 2, 6).NumberFormat = pct_fmt
        scenarios.getCellRangeByPosition(3, 4, 4, 6).NumberFormat = money_fmt
        scenarios.getCellRangeByPosition(5, 4, 5, 6).NumberFormat = decimal_fmt
        scenarios.getCellRangeByPosition(6, 4, 6, 6).NumberFormat = integer_fmt
        scenarios.getCellRangeByPosition(1, 4, 6, 6).CharColor = TEXT
        format_columns(scenarios, [4200, 4200, 3000, 4200, 4200, 4200, 5000])
        scenarios.TabColor = 0xA5A5A5

        sens = sheets.getByName("Sensibilidad")
        add_title(sens, "SENSIBILIDAD DEL VAN", "Filas: cambio de volumen · columnas: cambio de precio · costos y CAPEX en caso base.", 4)
        set_text(sens, 0, 3, "Volumen \\ Precio")
        for c, formula in enumerate([refs["sens_price_low"], "1", refs["sens_price_high"]], 1):
            set_formula(sens, c, 3, f"=({formula})-1")
            sens.getCellByPosition(c, 3).NumberFormat = pct_fmt
        style_header(sens, 3, 0, 3)
        for vi, vm in enumerate([refs["sens_volume_low"], "1", refs["sens_volume_high"]], 4):
            set_formula(sens, 0, vi, f"=({vm})-1"); sens.getCellByPosition(0, vi).NumberFormat = pct_fmt
            for pi in range(3):
                rb = blocks[f"S{vi-4}{pi}"]["results"]
                set_formula(sens, pi + 1, vi, f"={addr(1,rb['VAN'],'Calculos')}")
                sens.getCellByPosition(pi + 1, vi).NumberFormat = money_fmt
        apply_border(sens.getCellRangeByPosition(0, 3, 3, 6), 0xB8C7D1, 24)
        format_columns(sens, [4200, 4800, 4800, 4800, 1500])
        sens.TabColor = 0xA5A5A5

        sources = sheets.getByName("Fuentes")
        add_title(sources, "TRAZABILIDAD Y FUENTES", "Copia documental de Inputs; los cambios se realizan en Inputs.")
        for c, h in enumerate(["Parámetro", "Valor actual", "Unidad", "Confianza", "Fuente", "Nota"]): set_text(sources, c, 3, h)
        style_header(sources, 3, 0, 5)
        source_row = 4
        for key, input_row in pos.items():
            if key == "scenario": continue
            for c, source_col in enumerate([1, 2, 3, 4, 5, 6]): set_formula(sources, c, source_row, f"={addr(source_col,input_row,'Inputs')}")
            source_row += 1
        band_rows(sources, 4, source_row - 1, 0, 5)
        sources.getCellRangeByPosition(0, 4, 5, source_row - 1).CharColor = GREEN
        format_columns(sources, [5400, 3000, 3600, 2800, 10000, 11000])
        sources.getCellRangeByPosition(0, 3, 5, source_row - 1).IsTextWrapped = True
        sources.getCellRangeByPosition(0, 3, 5, source_row - 1).Rows.OptimalHeight = True
        sources.TabColor = 0xA5A5A5

        # Controles de auditoría y metadatos.
        set_text(summary, 3, 11, "Control VAN")
        set_formula(summary, 4, 11, f'=IF(ABS({addr(1,7,"Resumen")}-SUM({addr(1,b["rows"]["Flujo descontado"],"Calculos")}:{addr(6,b["rows"]["Flujo descontado"],"Calculos")}))<1;"OK";"REVISAR")')
        set_text(summary, 3, 12, "Flujo convencional")
        set_formula(summary, 4, 12, f'=IF(AND({addr(1,b["rows"]["Flujo libre"],"Calculos")}<0;{addr(6,b["rows"]["Flujo libre"],"Calculos")}>0);"OK";"REVISAR TIR")')
        # Formato condicional VIVO. Antes esto era un bucle en Python que leía
        # cell.Value tras calculateAll() y fijaba el color: quedaba congelado y
        # mentía en cuanto el usuario editaba un input.
        def sheet_index(sh):
            return sh.getCellByPosition(0, 0).CellAddress.Sheet

        sens_idx = sheet_index(sens)
        cond_format(doc, sens.getCellRangeByPosition(1, 4, 3, 6), sens_idx, 1, 4,
                    [("B5>=0", "P.Good"), ("B5<0", "P.Bad")])

        # El dictamen estaba pintado de verde fijo, dijera lo que dijera la
        # fórmula. Ahora el color lo decide la propia celda.
        sum_idx = sheet_index(summary)
        cond_format(doc, summary.getCellRangeByPosition(4, 9, 4, 9), sum_idx, 4, 9,
                    [('EXACT(E10;"VIABLE · SUPUESTOS")', "P.Good"),
                     ('NOT(EXACT(E10;"VIABLE · SUPUESTOS"))', "P.Bad")])
        cond_format(doc, summary.getCellRangeByPosition(4, 11, 4, 12), sum_idx, 4, 11,
                    [('EXACT(E12;"OK")', "P.Good"), ('NOT(EXACT(E12;"OK"))', "P.Warn")])
        # Fondeo máximo contra el límite de capital: la restricción dura.
        cond_format(doc, summary.getCellRangeByPosition(1, 6, 1, 6), sum_idx, 1, 6,
                    [(f'B7<={refs["capital_limit"]}', "P.Good"),
                     (f'B7>{refs["capital_limit"]}', "P.Bad")])

        # Confianza por color, en Inputs y en Fuentes. Cuatro reglas no caben en
        # un solo rango (el límite son 3), así que van en dos pasadas.
        inputs_sheet = sheets.getByName("Inputs")
        in_idx = sheet_index(inputs_sheet)
        last_in = max(pos.values()) if pos else 4
        conf_rng = inputs_sheet.getCellRangeByPosition(4, 4, 4, last_in)
        cond_format(doc, conf_rng, in_idx, 4, 4,
                    [('EXACT(E5;"VERIFICADO")', "P.Conf.Verificado"),
                     ('EXACT(E5;"SUPUESTO")', "P.Conf.Supuesto"),
                     ('EXACT(E5;"PENDIENTE")', "P.Conf.Pendiente")])

        # Desplegable real para el escenario, con la lista en una hoja aparte.
        sheets.insertNewByName("Listas", sheets.getCount())
        listas = sheets.getByName("Listas")
        for i, opt in enumerate(["Pesimista", "Base", "Optimista"]):
            set_text(listas, 0, i, opt)
        set_text(listas, 2, 0, "Origen de las validaciones del libro. No editar.")
        list_validation(inputs_sheet.getCellByPosition(2, pos["scenario"]),
                        "$Listas.$A$1:$A$3", "Escenario activo",
                        "Use el desplegable: Pesimista, Base u Optimista.")
        listas.IsVisible = False

        add_autofilter(doc, "Tabla_Inputs", in_idx, 0, 3, 6, last_in)
        for key, row in pos.items():
            add_named_range(doc, "IN_" + re.sub(r"[^A-Za-z0-9_]", "_", key),
                            f"$Inputs.$C${row + 1}", in_idx, 2, row)
        for label, row in b["results"].items():
            add_named_range(doc, "R_ACT_" + re.sub(r"[^A-Za-z0-9_]", "_",
                            unicodedata.normalize("NFKD", label).encode("ascii", "ignore").decode()),
                            f"$Calculos.$B${row + 1}", in_idx, 1, row)
        for name in ["Inputs", "Flujo_Caja", "Fuentes", "Escenarios"]:
            set_print_titles(sheets.getByName(name), sheet_index(sheets.getByName(name)), 3)

        # Hojas de análisis económico. Se calculan con el motor Python —el mismo
        # que el harness compara contra modelo.js— y se escriben congeladas con
        # su guardián de frescura.
        py_model = build_model(data_map)
        results_rows = dict(b["results"])
        results_rows["_flujo_libre_row"] = b["rows"]["Flujo libre"]
        analysis = build_analysis_sheets(
            doc, sheets, data_map, py_model,
            {"money": money_fmt, "pct": pct_fmt, "int": integer_fmt, "dec": decimal_fmt},
            refs, results_rows)

        calc.TabColor = 0xA5A5A5
        calc.IsVisible = False
        configure_print_layout(doc, sheets)
        controller = doc.CurrentController
        for sheet_name, freeze_col, freeze_row in [("Inputs", 3, 4), ("Flujo_Caja", 1, 4), ("Fuentes", 1, 4)]:
            controller.setActiveSheet(sheets.getByName(sheet_name))
            controller.freezeAtPosition(freeze_col, freeze_row)
        controller.setActiveSheet(summary)
        controller.ShowGrid = False
        controller.ZoomValue = 90
        doc.DocumentProperties.Title = "Evaluación económica pizzería B2B"
        doc.DocumentProperties.Subject = "Modelo financiero editable VAN, TIR y flujo de caja"
        doc.DocumentProperties.Author = "Dossier evaluación pizzería"

        # Gráfico de caja acumulada contra el límite de capital. La barra REPT()
        # de la hoja Auditoria muestra lo mismo si esto se degrada.
        try_chart(summary, "CajaVsLimite", 500, 9000, 16000, 8000,
                  [(sheet_index(sheets.getByName("Flujo_Caja")), 0, 3, 6, 3),
                   (sheet_index(sheets.getByName("Flujo_Caja")), 0,
                    4 + list(flow_rows).index("Flujo libre"), 6,
                    4 + list(flow_rows).index("Flujo libre"))],
                  kind="bar", title="Flujo libre por año (CLP)")

        # Hoja de auditoría: qué capacidades se consiguieron y cuáles quedaron
        # degradadas en esta build. Si algo falla, el libro lo declara.
        sheets.insertNewByName("Auditoria", sheets.getCount())
        audit = sheets.getByName("Auditoria")
        add_title(audit, "AUDITORÍA DE LA CONSTRUCCIÓN",
                  "Capacidades logradas o degradadas, y controles internos del modelo.")
        set_text(audit, 0, 3, "Capacidad")
        set_text(audit, 1, 3, "Estado")
        style_header(audit, 3, 0, 1)
        arow = 4
        for cap in ["formato_condicional", "validacion", "autofiltro", "rangos_con_nombre",
                    "titulos_impresion", "graficos", "proteccion"]:
            put(audit, 0, arow, cap.replace("_", " ").capitalize(), "P.Label")
            estado = CAPS.get(cap, "no intentado")
            put(audit, 1, arow, "LOGRADO" if estado is True else str(estado), "P.Label")
            arow += 1
        arow += 1
        put(audit, 0, arow, "Sello de construcción", "P.Section")
        arow += 1
        put(audit, 0, arow, "Generado", "P.Label")
        put(audit, 1, arow, time.strftime("%Y-%m-%d %H:%M"), "P.Label")
        arow += 1
        put(audit, 0, arow, "Control VAN", "P.Label")
        put(audit, 1, arow, f'={addr(4, 11, "Resumen")}', "P.Label")
        arow += 1
        put(audit, 0, arow, "Flujo convencional", "P.Label")
        put(audit, 1, arow, f'={addr(4, 12, "Resumen")}', "P.Label")
        arow += 1
        put(audit, 0, arow, "TIR calculable", "P.Label")
        put(audit, 1, arow,
            f'=IF(ISNA({addr(1, b["results"]["TIR"], "Calculos")});"NO — flujo sin cambio de signo";"sí")',
            "P.Label")
        format_columns(audit, [7000, 9000])
        audit.TabColor = 0xA5A5A5

        # Protección: sólo las hojas CALCULADAS. Inputs queda editable y
        # filtrable a propósito —Excel deshabilita el autofiltro en hojas
        # protegidas— y el contrato "edite sólo las amarillas" ya viaja en el
        # estilo de cada celda de entrada.
        try:
            for name in ["Flujo_Caja", "Escenarios", "Sensibilidad", "Fuentes",
                         "Calculos", "Inversion", "Auditoria", "Listas"]:
                sheets.getByName(name).protect("")
            doc.protect("")
            CAPS["proteccion"] = True
        except Exception as exc:
            CAPS["proteccion"] = f"degradado: {exc}"
        put(audit, 1, 10, "LOGRADO" if CAPS.get("proteccion") is True else str(CAPS.get("proteccion")),
            "P.Label")

        try:
            doc.enableAutomaticCalculation(True)
        except Exception:
            pass
        doc.calculateAll()
        print("capacidades UNO:", json.dumps(CAPS, ensure_ascii=False))
        ODS_OUT.parent.mkdir(parents=True, exist_ok=True)
        ods_url = uno.systemPathToFileUrl(str(ODS_OUT))
        xlsx_url = uno.systemPathToFileUrl(str(XLSX_OUT))
        doc.storeAsURL(ods_url, (prop("FilterName", "calc8"), prop("Overwrite", True)))
        doc.storeToURL(xlsx_url, (prop("FilterName", "Calc MS Excel 2007 XML"), prop("Overwrite", True)))
        print(ODS_OUT)
        print(XLSX_OUT)
    finally:
        if doc is not None:
            try: doc.close(True)
            except Exception: pass
        process.terminate()
        try: process.wait(timeout=5)
        except subprocess.TimeoutExpired: process.kill()
        shutil.rmtree(profile, ignore_errors=True)


def bar(value, peak, width=22):
    """Barra en celda. Se dibuja SIEMPRE, con o sin gráfico nativo."""
    if not peak:
        return ""
    return "█" * max(0, min(width, int(round(abs(value) / peak * width))))


def build_analysis_sheets(doc, sheets, data, m, fmts, refs, results_rows):
    """Hojas de análisis económico calculadas en Python.

    Van CONGELADAS a propósito: un tornado vivo son ~14.400 fórmulas y los
    valores de quiebre no tienen forma cerrada (el capital de trabajo, el
    arrastre de pérdidas y los MIN() de capacidad y caja no se invierten). Pero
    ninguna finge estar viva: cada hoja lleva sello de construcción y un
    guardián que se pone en rojo apenas el VAN del motor se aleja del valor con
    el que se calcularon."""
    money, pct, dec = fmts["money"], fmts["pct"], fmts["dec"]

    def sheet_index(sh):
        return sh.getCellByPosition(0, 0).CellAddress.Sheet

    def new_sheet(name, tab=0xC00000):
        sheets.insertNewByName(name, sheets.getCount())
        sh = sheets.getByName(name)
        sh.TabColor = tab
        return sh

    van_cell = addr(1, results_rows["VAN"], "Calculos")
    guard = (f'=IF(ABS({van_cell}-({m["npv"]:.4f}))>1;'
             f'"DESACTUALIZADO — reejecute generar_modelo_excel.py";"VIGENTE")')
    stamp = f"Calculado el {time.strftime('%Y-%m-%d %H:%M')} sobre VAN base {m['npv']:,.0f} CLP."

    def add_guard(sh, row):
        put(sh, 0, row, "Estado de esta hoja", "P.Label")
        put(sh, 1, row, guard, "P.Label")
        idx = sheet_index(sh)
        cond_format(doc, sh.getCellRangeByPosition(1, row, 1, row), idx, 1, row,
                    [(f'EXACT(B{row+1};"VIGENTE")', "P.Good"),
                     (f'NOT(EXACT(B{row+1};"VIGENTE"))', "P.Bad")])
        put(sh, 0, row + 1, stamp, "P.Stamp")

    # ---------------- Tornado ----------------
    trows = tornado(data, m)
    sh = new_sheet("Tornado", 0x2E75B6)
    add_title(sh, "TORNADO · SENSIBILIDAD DE UNA VÍA",
              "Cada parámetro movido solo, entre su banda declarada. Ordenado por impacto en el VAN.")
    add_guard(sh, 3)
    hdr = ["Parámetro", "Base", "Bajo", "Alto", "VAN bajo", "VAN alto", "Δ VAN",
           "Δ Fondeo", "Impacto", "Origen de la banda"]
    r0 = 6
    for c, h in enumerate(hdr):
        put(sh, c, r0, h, "P.HeaderNum" if 1 <= c <= 7 else "P.Header")
    peak = max((t["d_npv"] for t in trows), default=1)
    for i, t in enumerate(trows):
        r = r0 + 1 + i
        alt = ".Alt" if i % 2 else ""
        put(sh, 0, r, t["label"], "P.Label" + alt)
        for c, v in enumerate([t["base"], t["lo"], t["hi"], t["npv_lo"], t["npv_hi"],
                               t["d_npv"], t["d_fund"]], start=1):
            put(sh, c, r, v, ("P.Dec2" if c <= 3 else "P.Money") + alt)
        put(sh, 8, r, bar(t["d_npv"], peak), "P.Label" + alt)
        put(sh, 9, r, t["anchor"], "P.Note" + alt)
    grid(sh.getCellRangeByPosition(0, r0, 9, r0 + len(trows)))
    format_columns(sh, [5600, 3000, 3000, 3000, 4200, 4200, 4200, 4200, 5200, 9000])
    try_chart(sh, "TornadoChart", 500, 1000 + 260 * len(trows), 17000, 9000,
              [(sheet_index(sh), 0, r0, 0, r0 + len(trows)),
               (sheet_index(sh), 6, r0, 6, r0 + len(trows))],
              kind="bar", title="Impacto en el VAN (CLP)")

    # ---------------- Valores de quiebre ----------------
    sw = switching_values(data, m)
    sh = new_sheet("Valores_Quiebre", 0xC00000)
    add_title(sh, "VALORES DE QUIEBRE",
              "Valor de cada parámetro que anula el VAN y valor que lleva el fondeo máximo al límite de capital.")
    add_guard(sh, 3)
    put(sh, 0, 5,
        "El fondeo máximo actual ($%s) supera el límite de $%s. La columna «fondeo = límite» "
        "ya no marca un punto de quiebre sino la MEJORA REQUERIDA para volver a caber."
        % (f"{m['peakFunding']:,.0f}", f"{m['capitalLimit']:,.0f}"), "P.Note")
    hdr = ["Parámetro", "Base", "VAN = 0", "Variación exigida", "Fondeo = límite",
           "Variación exigida", "Origen de la banda"]
    r0 = 7
    for c, h in enumerate(hdr):
        put(sh, c, r0, h, "P.HeaderNum" if 1 <= c <= 5 else "P.Header")
    for i, s in enumerate(sw):
        r = r0 + 1 + i
        alt = ".Alt" if i % 2 else ""
        put(sh, 0, r, s["label"], "P.Label" + alt)
        put(sh, 1, r, s["base"], "P.Dec2" + alt)
        for col, key in ((2, "npv"), (4, "fund")):
            v = s.get(key)
            if v is None:
                put(sh, col, r, "SIN QUIEBRE EN EL RANGO", "P.Label" + alt)
                put(sh, col + 1, r, "—", "P.Label" + alt)
            else:
                put(sh, col, r, v, "P.Dec2" + alt)
                delta = (v / s["base"] - 1) if s["base"] else None
                put(sh, col + 1, r, delta, "P.Pct" + alt)
        put(sh, 6, r, s["anchor"], "P.Note" + alt)
    grid(sh.getCellRangeByPosition(0, r0, 6, r0 + len(sw)))
    format_columns(sh, [5600, 3400, 5200, 3600, 5200, 3600, 9000])

    # ---------------- Monte Carlo ----------------
    mc = monte_carlo(data, m)
    sh = new_sheet("Monte_Carlo", 0xC00000)
    add_title(sh, "MONTE CARLO · PERFIL DE RIESGO",
              "Distribuciones triangulares sobre los parámetros CON banda publicada. Semilla fija.")
    put(sh, 0, 3,
        "PERFIL ILUSTRATIVO DE RIESGO. Las distribuciones son SUPUESTO; sólo sus anclas están "
        "citadas. No es evidencia y no altera ninguna conclusión del dossier. Los parámetros sin "
        "banda publicada quedan FUERA de la simulación: inventarles una distribución sería "
        "exactamente la cifra plausible que la regla 7 prohíbe.", "P.Note")
    sh.getCellRangeByPosition(0, 3, 6, 3).merge(True)
    sh.Rows.getByIndex(3).Height = 1400
    add_guard(sh, 5)
    put(sh, 0, 8, "Distribuciones simuladas", "P.Section")
    for c, h in enumerate(["Parámetro", "Mínimo", "Moda", "Máximo", "Ancla citada"]):
        put(sh, c, 9, h, "P.HeaderNum" if 1 <= c <= 3 else "P.Header")
    for i, (lbl, _p, lo, base, hi, anchor) in enumerate(mc["dists"]):
        r = 10 + i
        alt = ".Alt" if i % 2 else ""
        put(sh, 0, r, lbl, "P.Label" + alt)
        put(sh, 1, r, min(lo, base), "P.Dec2" + alt)
        put(sh, 2, r, base, "P.Dec2" + alt)
        put(sh, 3, r, max(hi, base), "P.Dec2" + alt)
        put(sh, 4, r, anchor, "P.Note" + alt)
    grid(sh.getCellRangeByPosition(0, 9, 4, 9 + len(mc["dists"])))
    rr = 12 + len(mc["dists"])
    put(sh, 0, rr, "Resultados", "P.Section")
    stats = [("Iteraciones", mc["n"], "P.Dec2"), ("Semilla", mc["seed"], "P.Dec2"),
             ("VAN P10", mc["p10"], "P.Money"), ("VAN P50 (mediana)", mc["p50"], "P.Money"),
             ("VAN P90", mc["p90"], "P.Money"), ("VAN medio", mc["mean"], "P.Money"),
             ("P(VAN > 0)", mc["p_npv_pos"], "P.Pct"),
             ("P(fondeo máximo ≤ límite de capital)", mc["p_fits"], "P.Pct")]
    for i, (lbl, val, st) in enumerate(stats):
        put(sh, 0, rr + 1 + i, lbl, "P.KPI.Label")
        put(sh, 1, rr + 1 + i, val, st.replace("P.", "P.") if st != "P.Money" else "P.KPI.Value")
        if st == "P.Pct":
            sh.getCellByPosition(1, rr + 1 + i).NumberFormat = pct
    grid(sh.getCellRangeByPosition(0, rr + 1, 1, rr + len(stats)))
    # Histograma
    hr = rr + len(stats) + 3
    put(sh, 0, hr, "Distribución del VAN", "P.Section")
    lo_v, hi_v = mc["npvs"][0], mc["npvs"][-1]
    step = (hi_v - lo_v) / 20 or 1
    buckets = [0] * 20
    for v in mc["npvs"]:
        buckets[min(19, int((v - lo_v) / step))] += 1
    put(sh, 0, hr + 1, "Desde", "P.HeaderNum")
    put(sh, 1, hr + 1, "Hasta", "P.HeaderNum")
    put(sh, 2, hr + 1, "Casos", "P.HeaderNum")
    put(sh, 3, hr + 1, "Frecuencia", "P.Header")
    peak_b = max(buckets) or 1
    for i, cnt in enumerate(buckets):
        r = hr + 2 + i
        put(sh, 0, r, lo_v + i * step, "P.Money")
        put(sh, 1, r, lo_v + (i + 1) * step, "P.Money")
        put(sh, 2, r, cnt, "P.Dec2")
        put(sh, 3, r, bar(cnt, peak_b, 30), "P.Label")
    grid(sh.getCellRangeByPosition(0, hr + 1, 3, hr + 21))
    format_columns(sh, [6200, 4600, 4600, 3400, 9000])
    try_chart(sh, "HistogramaVAN", 9000, 1000, 15000, 9000,
              [(sheet_index(sh), 0, hr + 1, 0, hr + 21),
               (sheet_index(sh), 2, hr + 1, 2, hr + 21)],
              kind="bar", title="Distribución del VAN")

    # ---------------- Perfil VAN vs tasa (vivo) ----------------
    sh = new_sheet("Tasa_Descuento", 0xC00000)
    add_title(sh, "TASA DE DESCUENTO",
              "Construcción de la TMAR y perfil del VAN frente a la tasa.")
    put(sh, 0, 3, "Construcción declarada", "P.Section")
    build_up = [
        ("TPM Banco Central", 4.5, "Tasa de política monetaria vigente a la fecha base."),
        ("Interés corriente CMF 200–5.000 UF ≥90 días", 20.46,
         "CMF Certificado 07/2026. Es lo que los bancos cobraron por dinero del tamaño "
         "y plazo del proyecto."),
        ("Spread sobre TPM", 15.96,
         "NO SE DESCOMPONE riesgo por riesgo: no hay fuente pública que lo permita. "
         "Se declara el spread observado, no una construcción inventada."),
        ("TMAR usada por el modelo", m["discount"] * 100,
         "Piso observado. El capital propio es subordinado a esa deuda, así que la TMAR "
         "correcta es mayor; usar el piso es conservador respecto del rechazo."),
    ]
    for c, h in enumerate(["Componente", "%", "Nota"]):
        put(sh, c, 4, h, "P.HeaderNum" if c == 1 else "P.Header")
    for i, (lbl, val, note) in enumerate(build_up):
        r = 5 + i
        alt = ".Alt" if i % 2 else ""
        put(sh, 0, r, lbl, "P.Label" + alt)
        put(sh, 1, r, val / 100, "P.Pct" + alt)
        put(sh, 2, r, note, "P.Note" + alt)
    grid(sh.getCellRangeByPosition(0, 4, 2, 4 + len(build_up)))

    put(sh, 0, 11, "Perfil del VAN frente a la tasa (vivo)", "P.Section")
    put(sh, 0, 12, "Tasa", "P.HeaderNum")
    put(sh, 1, 12, "VAN", "P.HeaderNum")
    put(sh, 2, 12, "Magnitud", "P.Header")
    flow_row = results_rows.get("_flujo_libre_row")
    npvs_profile = []
    for i in range(11):
        rate = 0.05 + i * 0.03
        r = 13 + i
        put(sh, 0, r, rate, "P.Pct")
        if flow_row is not None:
            # Cambiar la tasa no cambia los flujos: basta descontarlos otra vez.
            terms = "+".join(
                f"{addr(cc, flow_row, 'Calculos')}/(1+$A${r+1})^{cc-1}" for cc in range(1, 7))
            put(sh, 1, r, f"={addr(1, results_rows['Inversión inicial'], 'Calculos')}*-1+{terms}",
                "P.Money")
        else:
            v = build_model(data, overrides={"macro.tasa_descuento_pct": rate * 100})["npv"]
            npvs_profile.append(v)
            put(sh, 1, r, v, "P.Money")
    grid(sh.getCellRangeByPosition(0, 12, 2, 23))
    format_columns(sh, [3600, 5200, 6000, 9000])
    try_chart(sh, "PerfilVAN", 9000, 1000, 15000, 9000,
              [(sheet_index(sh), 0, 12, 0, 23), (sheet_index(sh), 1, 12, 1, 23)],
              kind="xy", title="VAN frente a la tasa de descuento")

    # ---------------- Estructura de capital ----------------
    # El motor sigue siendo 100% capital propio, como declara el statement. El
    # crédito se calcula aquí, con aritmética propia y explícita: meterlo en las
    # tres implementaciones del motor sería sobreingeniería y triplicaría el
    # riesgo de divergencia para una empresa de 3-4 personas.
    sh = new_sheet("Estructura_Capital", 0x7030A0)
    add_title(sh, "ESTRUCTURA DE CAPITAL",
              "Configuraciones comparadas contra dos techos de capital: $30.000.000 y $50.000.000.")
    add_guard(sh, 3)

    maquila_ov = {"capex.equipamiento_base_clp": 0, "local.habilitacion_sanitaria_clp": 0,
                  "produccion.capacidad_instalada_pizzas_dia": 100000}
    configs = [
        ("Planta propia · $15M + $15M, sin deuda", {},
         "Los socios aportan $30M. La brecha contra el fondeo exigido no la cierra ninguna estructura."),
        ("Planta propia · $30M + crédito de consumo", {},
         "La deuda no cambia el fondeo requerido: cambia quién lo aporta y añade costo financiero y riesgo personal."),
        ("Maquila · sin planta propia, tarifa $0", maquila_ov,
         "Cota superior: falta la tarifa del maquilador. Sin habilitación ni equipos propios y sin tope de capacidad propia."),
    ]
    hdr = ["Configuración", "CAPEX", "Inversión inicial", "Fondeo máximo",
           "Holgura vs $30M", "Holgura vs $50M", "VAN", "Lectura"]
    r0 = 6
    for c, h in enumerate(hdr):
        put(sh, c, r0, h, "P.HeaderNum" if 1 <= c <= 6 else "P.Header")
    for i, (label, ov, lectura) in enumerate(configs):
        r = r0 + 1 + i
        alt = ".Alt" if i % 2 else ""
        cm = build_model(data, overrides=ov) if ov else m
        put(sh, 0, r, label, "P.Label" + alt)
        for c, v in enumerate([cm["totalCapex"], cm["initialInvestment"], cm["peakFunding"],
                               30_000_000 - cm["peakFunding"], 50_000_000 - cm["peakFunding"],
                               cm["npv"]], start=1):
            put(sh, c, r, v, "P.Money" + alt)
        put(sh, 7, r, lectura, "P.Note" + alt)
    grid(sh.getCellRangeByPosition(0, r0, 7, r0 + len(configs)))
    idx = sheet_index(sh)
    cond_format(doc, sh.getCellRangeByPosition(4, r0 + 1, 5, r0 + len(configs)), idx, 4, r0 + 1,
                [(f"E{r0+2}>=0", "P.Good"), (f"E{r0+2}<0", "P.Bad")])

    # Umbral de tarifa de maquila: el número que sirve para negociar.
    rt = r0 + len(configs) + 2
    put(sh, 0, rt, "Tarifa máxima de maquila admisible", "P.Section")
    put(sh, 0, rt + 1,
        "La tarifa del maquilador no es dato público, así que el modelo no la supone: acota cuánto se "
        "puede pagar. Por bisección sobre el fondeo máximo, con los volúmenes del caso base.", "P.Note")
    put(sh, 0, rt + 2, "Techo de capital", "P.Header")
    put(sh, 1, rt + 2, "Tarifa máxima CLP/pizza", "P.HeaderNum")
    for j, limit in enumerate((30_000_000, 50_000_000)):
        lo, hi = 0.0, 20000.0
        for _ in range(60):
            mid = (lo + hi) / 2
            if build_model(data, overrides={**maquila_ov,
                                            "producto.energia_variable_clp_unidad": 120 + mid}
                           )["peakFunding"] <= limit:
                lo = mid
            else:
                hi = mid
        put(sh, 0, rt + 3 + j, f"${limit:,.0f}".replace(",", "."), "P.Label")
        put(sh, 1, rt + 3 + j, round(lo), "P.Money")
    grid(sh.getCellRangeByPosition(0, rt + 2, 1, rt + 4))

    # Crédito de consumo: amortización francesa, tasa mensual equivalente.
    rc = rt + 7
    put(sh, 0, rc, "Crédito de consumo · tramo CMF 200 a 5.000 UF, 90 días o más", "P.Section")
    put(sh, 0, rc + 1,
        "En el crédito de consumo el deudor es la persona natural: la SpA no es parte del contrato, así "
        "que su responsabilidad limitada no llega a activarse y la deuda sobrevive a la empresa. La cuota "
        "no depende de que el negocio funcione.", "P.Note")
    for c, h in enumerate(["Monto", "Tasa anual", "Plazo", "Cuota mensual", "Total pagado",
                           "Costo financiero", "% de la brecha que cubre"]):
        put(sh, c, rc + 2, h, "P.HeaderNum" if c else "P.Header")
    brecha = m["peakFunding"] - 30_000_000
    row = rc + 3
    for j, (monto, tasa, nombre, meses) in enumerate(
            [(15e6, 0.2046, "Corriente 20,46%", 48), (20e6, 0.2046, "Corriente 20,46%", 48),
             (20e6, 0.3069, "Máxima convencional 30,69%", 48), (30e6, 0.2046, "Corriente 20,46%", 48)]):
        im = (1 + tasa) ** (1 / 12) - 1
        cuota = monto * im / (1 - (1 + im) ** -meses)
        alt = ".Alt" if j % 2 else ""
        put(sh, 0, row, monto, "P.Money" + alt)
        put(sh, 1, row, nombre, "P.Label" + alt)
        put(sh, 2, row, meses, "P.Dec2" + alt)
        put(sh, 3, row, cuota, "P.Money" + alt)
        put(sh, 4, row, cuota * meses, "P.Money" + alt)
        put(sh, 5, row, cuota * meses - monto, "P.Money" + alt)
        put(sh, 6, row, monto / brecha if brecha > 0 else None, "P.Pct" + alt)
        row += 1
    grid(sh.getCellRangeByPosition(0, rc + 2, 6, row - 1))
    put(sh, 0, row + 1,
        f"Brecha a cubrir con planta propia contra el techo de $30.000.000: "
        f"${brecha:,.0f}".replace(",", ".") +
        ". Ningún crédito de consumo de este tamaño la cierra.", "P.Note")
    format_columns(sh, [7200, 5200, 4200, 4600, 4600, 4600, 4600, 11000])

    return {"tornado": trows, "switching": sw, "mc": mc}


def check():
    """Imprime los indicadores del motor Python en JSON, para diferenciar contra
    el harness de Node. No abre LibreOffice."""
    m = build_model(load_all())
    out = {
        "capexTotal": m["totalCapex"], "initialNwc": m["initialNwc"],
        "initialInvestment": m["initialInvestment"], "peakFunding": m["peakFunding"],
        "breakEvenMonth": m["breakEven"], "npv": m["npv"], "irr": m["irr"],
        "payback": m["payback"], "profitabilityIndex": m["profitabilityIndex"],
        "variableBase": m["variableBase"], "fixedMonthlyBase": m["fixedMonthlyBase"],
        "rentBase": m["rentBase"], "payrollBase": m["payrollBase"],
        "equipment": m["equipment"], "capacityYear": m["capacityYear"],
        "capacityUse": m["capacityUse"], "breakEvenUse": m["breakEvenUse"],
        "flour": m["flour"], "sauce": m["sauce"], "cheese": m["cheese"],
        "packaging": m["packaging"],
        "volumes": [y["volume"] for y in m["years"]],
        "prices": [y["price"] for y in m["years"]],
        "fcf": [y["fcf"] for y in m["years"]],
    }
    rounded = {k: (round(v, 4) if isinstance(v, (int, float)) else
                   ([round(x, 4) for x in v] if isinstance(v, list) else v))
               for k, v in out.items()}
    print(json.dumps({"indicadores": rounded}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    if "--check" in sys.argv:
        check()
    else:
        main()
