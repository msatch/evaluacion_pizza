#!/usr/bin/env python3
"""Genera un modelo financiero editable para LibreOffice Calc y Excel."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.table import BorderLine2


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
        set_text(sheet, col, 3, val)
    style_header(sheet, 3)

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
    row = 4
    last_category = None
    for key, category, label, item, value, kind in rows:
        if category != last_category:
            style_section(sheet, row, category)
            row += 1
            last_category = category
        positions[key] = row
        data_rng = sheet.getCellRangeByPosition(0, row, 6, row)
        data_rng.CellBackColor = 0xFFFFFF if row % 2 == 0 else FORMULA_FILL
        apply_border(data_rng)
        values = [category, label, None, item.get("unidad", ""), item.get("confianza", ""), item.get("fuente", ""), item.get("nota", "")]
        for col, val in enumerate(values):
            if val is not None:
                set_text(sheet, col, row, val)
        if kind == "text":
            set_text(sheet, 2, row, value)
        else:
            set_value(sheet, 2, row, value)
        cell = sheet.getCellByPosition(2, row)
        cell.CellBackColor = INPUT_FILL
        cell.CharColor = 0x0000FF
        cell.CharWeight = 150
        if kind == "money": cell.NumberFormat = money_fmt
        if kind == "pct": cell.NumberFormat = pct_fmt
        if kind == "number": cell.NumberFormat = integer_fmt if float(value).is_integer() else decimal_fmt
        confidence = str(item.get("confianza", "")).upper()
        confidence_cell = sheet.getCellByPosition(4, row)
        confidence_cell.CharWeight = 150
        confidence_cell.CharColor = {"VERIFICADO": GREEN, "ESTIMADO": 0x9A6700, "SUPUESTO": RED, "PENDIENTE": 0x6B7280}.get(confidence, TEXT)
        row += 1
    sheet.getCellRangeByPosition(0, 4, 6, row - 1).IsTextWrapped = True
    format_columns(sheet, [2500, 5200, 2800, 3400, 2700, 9000, 10500])
    sheet.getCellRangeByPosition(0, 3, 6, row - 1).Rows.OptimalHeight = True
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
    data = [load(name) for name in [
        "supuestos.json", "parametros-01-mercado.json", "parametros-02-competencia.json",
        "parametros-06-insumos.json", "parametros-07-local-habilitacion.json",
        "parametros-08-legal-normativo.json", "parametros-10-financiero.json",
    ]]
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
        # Colorea la matriz según el VAN actual; las fórmulas siguen siendo dinámicas.
        doc.calculateAll()
        for row in range(4, 7):
            for col in range(1, 4):
                cell = sens.getCellByPosition(col, row)
                cell.CellBackColor = POSITIVE_FILL if cell.Value >= 0 else NEGATIVE_FILL
                cell.CharColor = GREEN if cell.Value >= 0 else RED
                cell.CharWeight = 150
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
        doc.calculateAll()
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
