#!/usr/bin/env python3
"""Genera el modelo financiero XLSX editable usando LibreOffice UNO."""

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
OUT = ROOT / "10-financiero" / "evaluacion-economica-pizzeria-v2.xlsx"


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
    r0.CharHeight = 19
    r0.CharWeight = 150
    r0.CellBackColor = 0x17324D
    r0.CharColor = 0xFFFFFF
    r1 = sheet.getCellRangeByPosition(0, 1, end_col, 1)
    r1.CharHeight = 10
    r1.CellBackColor = 0xDCE7EF
    r1.CharColor = 0x17324D
    sheet.Rows.getByIndex(0).Height = 900
    sheet.Rows.getByIndex(1).Height = 650


def style_header(sheet, row, start=0, end=6):
    rng = sheet.getCellRangeByPosition(start, row, end, row)
    rng.CellBackColor = 0x26734D
    rng.CharColor = 0xFFFFFF
    rng.CharWeight = 150
    rng.IsTextWrapped = True
    sheet.Rows.getByIndex(row).Height = 650


def style_section(sheet, row, label, end=6):
    sheet.getCellRangeByPosition(0, row, end, row).merge(True)
    set_text(sheet, 0, row, label)
    rng = sheet.getCellRangeByPosition(0, row, end, row)
    rng.CellBackColor = 0xD97706
    rng.CharColor = 0xFFFFFF
    rng.CharWeight = 150


def format_columns(sheet, widths):
    for idx, width in enumerate(widths):
        sheet.Columns.getByIndex(idx).Width = width


def money_format(doc):
    formats = doc.getNumberFormats()
    locale = uno.createUnoStruct("com.sun.star.lang.Locale")
    locale.Language = "es"
    locale.Country = "CL"
    pattern = '[$$-es-CL] #.##0;[RED]-[$$-es-CL] #.##0'
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


def band_rows(sheet, first_row, last_row, first_col, last_col, colors=(0xFFFFFF, 0xF4F7F9)):
    for row in range(first_row, last_row + 1):
        rng = sheet.getCellRangeByPosition(first_col, row, last_col, row)
        rng.CellBackColor = colors[(row - first_row) % len(colors)]
        apply_border(rng)


def style_total(sheet, row, first_col, last_col):
    rng = sheet.getCellRangeByPosition(first_col, row, last_col, row)
    rng.CellBackColor = 0xDCE7EF
    rng.CharColor = 0x17324D
    rng.CharWeight = 150
    apply_border(rng, 0x17324D, 28)


def style_kpi(sheet, row, label_col=0, value_col=1):
    rng = sheet.getCellRangeByPosition(label_col, row, value_col, row)
    rng.CellBackColor = 0xF4F7F9
    apply_border(rng, 0xB8C7D1, 24)
    sheet.getCellByPosition(label_col, row).CharWeight = 150
    value = sheet.getCellByPosition(value_col, row)
    value.CharWeight = 150
    value.CharHeight = 14
    value.CharColor = 0x17324D
    sheet.Rows.getByIndex(row).Height = 750


def build_inputs(doc, data, money_fmt, pct_fmt):
    sheet = doc.Sheets.getByName("Inputs")
    add_title(sheet, "INPUTS DEL MODELO · VERSIÓN VISUAL 2", "Edite solamente las celdas amarillas de la columna C. Todas las demás hojas usan fórmulas.")
    headers = ["Categoría", "Parámetro", "Valor", "Unidad", "Confianza", "Fuente", "Nota"]
    for col, val in enumerate(headers):
        set_text(sheet, col, 3, val)
    style_header(sheet, 3)

    base, market, prices, inputs, local, legal, financial = data
    rows = []

    def add(key, category, label, item, value=None, kind="number"):
        rows.append((key, category, label, item, item.get("valor") if value is None else value, kind))

    add("scenario", "Modelo", "Escenario activo", {"valor": "Base", "unidad": "texto", "confianza": "SUPUESTO", "fuente": "Selección del usuario", "nota": "Valores permitidos: Pesimista, Base u Optimista."}, kind="text")
    add("discount", "Modelo", "TMAR nominal anual", resolved(entry(base, "macro.tasa_descuento_pct"), entry(financial, "modelo.tasa_descuento_nominal_pct")), value=15 / 100, kind="pct")
    add("inflation", "Modelo", "Inflación anual", entry(financial, "modelo.inflacion_anual_pct"), value=3 / 100, kind="pct")
    add("capital_limit", "Modelo", "Capital máximo disponible", {"valor": base["meta"]["restriccion_capital_clp"], "unidad": "CLP", "confianza": "VERIFICADO", "fuente": "datos/supuestos.json#meta.restriccion_capital_clp", "nota": "Restricción declarada en el enunciado."}, kind="money")
    add("horizon", "Modelo", "Horizonte de evaluación", entry(financial, "modelo.horizonte_anios"))
    add("price", "Ventas", "Precio B2B neto base", resolved(entry(prices, "precios.precio_venta_b2b_familiar_clp"), entry(financial, "modelo.precio_b2b_familiar_base_clp")), value=4200, kind="money")
    for year in range(1, 6):
        add(f"volume{year}", "Ventas", f"Volumen año {year}", entry(financial, f"modelo.volumen_ano{year}_unidades"))
    for year in range(1, 6):
        add(f"tax{year}", "Tributación", f"Impuesto año {year}", entry(financial, f"modelo.impuesto_ano{year}_pct"), value=entry(financial, f"modelo.impuesto_ano{year}_pct")["valor"] / 100, kind="pct")

    product_map = [
        ("flour_qty", "Harina por pizza", "harina_kg_unidad"), ("sauce_qty", "Salsa por pizza", "salsa_kg_unidad"),
        ("cheese_qty", "Mozzarella por pizza", "mozzarella_kg_unidad"), ("other_unit", "Otros ingredientes por pizza", "otros_ingredientes_clp_unidad"),
        ("pack_unit", "Envase por pizza", "envase_clp_unidad"), ("energy_unit", "Energía variable por pizza", "energia_variable_clp_unidad"),
        ("distribution_unit", "Distribución variable por pizza", "distribucion_variable_clp_unidad"), ("waste", "Merma de ingredientes", "merma_pct"),
    ]
    for key, label, name in product_map:
        item = entry(financial, f"producto.{name}")
        val = item["valor"] / 100 if key == "waste" else item["valor"]
        add(key, "Producto", label, item, value=val, kind="pct" if key == "waste" else ("money" if "unit" in key else "number"))
    for key, label, path in [
        ("flour_price", "Precio harina/kg", "insumos.harina_clp_kg"),
        ("sauce_price", "Precio tomate/kg", "insumos.salsa_tomate_clp_kg"),
        ("cheese_price", "Precio mozzarella/kg", "insumos.mozzarella_clp_kg"),
    ]:
        add(key, "Insumos", label, entry(inputs, path), kind="money")

    rent_item = entry(local, "local.arriendo_mensual_clp")
    add("area", "Operación", "Superficie", resolved(entry(local, "local.superficie_requerida_m2"), entry(financial, "operacion.superficie_m2")), value=120)
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
    for key, label, name, kind in op_map:
        item = entry(financial, f"operacion.{name}")
        if key == "ar_days":
            item = resolved(entry(prices, "precios.plazo_cobro_dias"), item)
        add(key, "Operación", label, item, kind=kind)

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
    for key, label, item, kind, val in [
        ("install_pct", "Flete e instalación", entry(financial, "inversion.flete_instalacion_pct"), "pct", 0.15),
        ("habilitation", "Habilitación sanitaria", habil, "money", habil["valor"]),
        ("permits", "Trámites, análisis y rotulado", permit, "money", permit["valor"]),
        ("preop", "Preoperación", entry(financial, "inversion.preoperacion_clp"), "money", None),
        ("contingency", "Contingencia", entry(financial, "inversion.contingencia_pct"), "pct", 0.15),
        ("rent_guarantee", "Garantía de arriendo", entry(financial, "inversion.garantia_arriendo_meses"), "number", None),
        ("life", "Vida depreciable", entry(financial, "inversion.vida_depreciable_anios"), "number", None),
        ("residual_pct", "Valor residual", entry(financial, "inversion.valor_residual_pct"), "pct", 0.10),
    ]:
        add(key, "Inversión", label, item, value=item["valor"] if val is None else val, kind=kind)

    scenario_rows = [
        ("pess_price", "Pesimista: precio", 0.90), ("pess_volume", "Pesimista: volumen", 0.80),
        ("pess_variable", "Pesimista: costo variable", 1.10), ("pess_fixed", "Pesimista: costo fijo", 1.10), ("pess_capex", "Pesimista: CAPEX", 1.15),
        ("base_price", "Base: precio", 1), ("base_volume", "Base: volumen", 1), ("base_variable", "Base: costo variable", 1),
        ("base_fixed", "Base: costo fijo", 1), ("base_capex", "Base: CAPEX", 1),
        ("opt_price", "Optimista: precio", 1.10), ("opt_volume", "Optimista: volumen", 1.20),
        ("opt_variable", "Optimista: costo variable", 0.95), ("opt_fixed", "Optimista: costo fijo", 1), ("opt_capex", "Optimista: CAPEX", 0.95),
        ("sens_price_low", "Sensibilidad: precio bajo", 0.90), ("sens_price_high", "Sensibilidad: precio alto", 1.10),
        ("sens_volume_low", "Sensibilidad: volumen bajo", 0.80), ("sens_volume_high", "Sensibilidad: volumen alto", 1.20),
    ]
    for key, label, value in scenario_rows:
        add(key, "Escenarios", label, {"valor": value, "unidad": "multiplicador", "confianza": "SUPUESTO", "fuente": "Etapa 10", "nota": "Editable para análisis de riesgo."}, value=value)

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
        data_rng.CellBackColor = 0xFFFFFF if row % 2 == 0 else 0xF4F7F9
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
        cell.CellBackColor = 0xFFF2CC
        cell.CharWeight = 150
        if kind == "money": cell.NumberFormat = money_fmt
        if kind == "pct": cell.NumberFormat = pct_fmt
        if kind == "number": cell.NumberFormat = integer_fmt if float(value).is_integer() else decimal_fmt
        confidence = str(item.get("confianza", "")).upper()
        confidence_cell = sheet.getCellByPosition(4, row)
        confidence_cell.CharWeight = 150
        confidence_cell.CharColor = {"VERIFICADO": 0x26734D, "ESTIMADO": 0x9A6700, "SUPUESTO": 0xB42318, "PENDIENTE": 0x6B7280}.get(confidence, 0x17324D)
        row += 1
    sheet.getCellRangeByPosition(0, 4, 6, row - 1).IsTextWrapped = True
    format_columns(sheet, [2500, 5200, 2800, 3400, 2700, 9000, 10500])
    sheet.getCellRangeByPosition(0, 3, 6, row - 1).Rows.OptimalHeight = True
    sheet.getCellRangeByPosition(0, 3, 6, 3).CellBackColor = 0x26734D
    sheet.TabColor = 0xD97706
    return positions


def formula_ref(pos, key):
    return addr(2, pos[key])


def build_calc_block(sheet, start, name, refs, multipliers, money_fmt, pct_fmt):
    """Crea un modelo completo; retorna coordenadas de resultados clave."""
    r = start
    set_text(sheet, 0, r, name)
    sheet.getCellRangeByPosition(0, r, 6, r).merge(True)
    sheet.getCellRangeByPosition(0, r, 6, r).CellBackColor = 0x17324D
    sheet.getCellRangeByPosition(0, r, 6, r).CharColor = 0xFFFFFF
    sheet.getCellRangeByPosition(0, r, 6, r).CharWeight = 150
    r += 1
    labels = ["Precio", "Volumen", "Costo variable", "Costo fijo", "CAPEX"]
    for i, (label, formula) in enumerate(zip(labels, multipliers)):
        set_text(sheet, 0, r + i, label)
        set_formula(sheet, 1, r + i, formula)
    mult_rows = {key: r + i for i, key in enumerate(["price", "volume", "variable", "fixed", "capex"])}
    r += 6
    scalar = {}
    scalar_specs = [
        ("equipment", "Equipos", "=" + "+".join(refs[k] for k in ["blaster", "mixer", "oven", "sealer", "cold_table", "freezers", "steel", "tools"])),
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
    set_formula(sheet, 1, scalar["fixed_month"], f"=({scalar_cell(scalar,'rent')}+{refs['payroll']}*{refs['employer_factor']}+{refs['utilities']}+{refs['maintenance']}+{refs['admin']}+{refs['sales']}+{refs['insurance']})")
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
        set_formula(sheet, col, rows["Volumen"], f"={refs[f'volume{idx}']}*{v_mult}")
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
        terminal = "0" if idx < 5 else f"{scalar_cell(scalar,'residual')}*(1-{refs['tax5']})+{addr(col,rows['Capital de trabajo'],'Calculos')}+{scalar_cell(scalar,'guarantee')}"
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
    result_specs = ["Inversión inicial", "VAN", "TIR", "Payback descontado", "Índice de rentabilidad", "Fondeo máximo", "Punto de equilibrio mensual"]
    for label in result_specs:
        results[label] = r
        set_text(sheet, 0, r, label)
        r += 1
    flow0 = addr(1, rows["Flujo libre"], "Calculos")
    flows = f"{addr(1,rows['Flujo libre'],'Calculos')}:{addr(6,rows['Flujo libre'],'Calculos')}"
    pv_inflows = "+".join(addr(c, rows["Flujo descontado"], "Calculos") for c in year_cols)
    set_formula(sheet, 1, results["Inversión inicial"], f"=-{flow0}")
    set_formula(sheet, 1, results["VAN"], f"=SUM({addr(1,rows['Flujo descontado'],'Calculos')}:{addr(6,rows['Flujo descontado'],'Calculos')})")
    set_formula(sheet, 1, results["TIR"], f"=IFERROR(IRR({flows});-1)")
    cumulative = [addr(c, rows["Flujo descontado acumulado"], "Calculos") for c in range(1, 7)]
    pvflows = [addr(c, rows["Flujo descontado"], "Calculos") for c in range(2, 7)]
    payback = 'NA()'
    for year in range(5, 0, -1):
        payback = f"IF({cumulative[year]}>=0;{year-1}+(-{cumulative[year-1]}/{pvflows[year-1]});{payback})"
    set_formula(sheet, 1, results["Payback descontado"], f"=IFERROR({payback};99)")
    set_formula(sheet, 1, results["Índice de rentabilidad"], f"=({pv_inflows})/(-{flow0})")
    cash_range = f"{addr(1,rows['Flujo acumulado'],'Calculos')}:{addr(6,rows['Flujo acumulado'],'Calculos')}"
    set_formula(sheet, 1, results["Fondeo máximo"], f"=-MIN({cash_range})")
    contribution = f"({addr(2,rows['Precio'],'Calculos')}-{addr(2,rows['Costo variable unitario'],'Calculos')})"
    set_formula(sheet, 1, results["Punto de equilibrio mensual"], f"=IF({contribution}>0;{addr(2,rows['Costos fijos'],'Calculos')}/{contribution}/12;NA())")
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
        add_title(summary, "EVALUACIÓN ECONÓMICA — PIZZERÍA B2B", "VERSIÓN VISUAL 2 · Flujo libre sin deuda · pesos nominales · horizonte de cinco años", 5)
        style_section(summary, 3, "Decisión del escenario activo", 5)
        result_rows = blocks["Activo"]["results"]
        labels = ["Inversión inicial", "Fondeo máximo", "VAN", "TIR", "Payback descontado", "Índice de rentabilidad", "Punto de equilibrio mensual"]
        for i, label in enumerate(labels, 5):
            set_text(summary, 0, i, label)
            set_formula(summary, 1, i, f"={addr(1,result_rows[label],'Calculos')}")
            if label in ["Inversión inicial", "Fondeo máximo", "VAN"]: summary.getCellByPosition(1, i).NumberFormat = money_fmt
            if label == "TIR": summary.getCellByPosition(1, i).NumberFormat = pct_fmt
            if label in ["Payback descontado", "Índice de rentabilidad"]: summary.getCellByPosition(1, i).NumberFormat = decimal_fmt
            if label == "Punto de equilibrio mensual": summary.getCellByPosition(1, i).NumberFormat = integer_fmt
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
        set_formula(summary, 4, 9, f'=IF(AND({npv}>0;{irr}>{refs["discount"]};{funding}<={refs["capital_limit"]});"VIABLE BAJO SUPUESTOS";"RECHAZAR O REDISEÑAR")')
        summary.getCellByPosition(4, 9).CharWeight = 150
        summary.getCellRangeByPosition(3, 5, 4, 12).CellBackColor = 0xE8F3EC
        apply_border(summary.getCellRangeByPosition(3, 5, 4, 12), 0x8CB9A0, 24)
        summary.getCellByPosition(4, 9).CellBackColor = 0xC6E0CD
        summary.getCellByPosition(4, 9).CharColor = 0x14532D
        style_section(summary, 14, "Criterios de Ingeniería Económica", 5)
        notes = [
            "VAN > 0: el proyecto crea valor a la TMAR seleccionada.",
            "TIR > TMAR: la rentabilidad interna supera el rendimiento mínimo exigido.",
            "VAN y TIR no se comparan entre sí: tienen unidades diferentes.",
            "El flujo es económico y no incorpora deuda, intereses ni dividendos.",
        ]
        for i, note in enumerate(notes, 16): set_text(summary, 0, i, "• " + note)
        summary.getCellRangeByPosition(0, 16, 5, 19).merge(False)
        format_columns(summary, [4600, 3300, 300, 2800, 4500, 300])
        summary.TabColor = 0x17324D

        investment = sheets.getByName("Inversion")
        add_title(investment, "INVERSIÓN INICIAL", "Detalle del escenario activo; todos los montos provienen de Inputs o de fórmulas.", 3)
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
        set_text(investment, 0, 11, "INVERSIÓN INICIAL TOTAL")
        set_formula(investment, 1, 11, f"={addr(1,b['results']['Inversión inicial'],'Calculos')}")
        investment.getCellRangeByPosition(0, 11, 1, 11).CharWeight = 150
        investment.getCellByPosition(1, 11).NumberFormat = money_fmt
        style_total(investment, 11, 0, 3)
        format_columns(investment, [6500, 4200, 6500, 5000])
        investment.TabColor = 0xD97706

        flow = sheets.getByName("Flujo_Caja")
        add_title(flow, "FLUJO DE CAJA LIBRE DEL PROYECTO", "Escenario elegido en Inputs; cifras nominales, después de impuestos y antes de financiamiento.")
        flow_rows = ["Volumen", "Precio", "Ingresos", "Costos variables", "Costos fijos", "EBITDA", "Depreciación", "EBIT", "Pérdida tributaria inicial", "Renta imponible", "Impuesto", "Pérdida tributaria final", "Capital de trabajo", "Variación capital de trabajo", "Recuperaciones terminales", "Flujo libre", "Factor descuento", "Flujo descontado", "Flujo acumulado", "Flujo descontado acumulado"]
        for c, h in enumerate(["Concepto", "Año 0", "Año 1", "Año 2", "Año 3", "Año 4", "Año 5"]): set_text(flow, c, 3, h)
        style_header(flow, 3)
        for ri, label in enumerate(flow_rows, 4):
            set_text(flow, 0, ri, label)
            srcrow = b["rows"][label]
            for c in range(1, 7): set_formula(flow, c, ri, f"={addr(c,srcrow,'Calculos')}")
        band_rows(flow, 4, 23, 0, 6)
        flow.getCellRangeByPosition(1, 4, 6, 23).NumberFormat = money_fmt
        flow.getCellRangeByPosition(1, 4, 6, 4).NumberFormat = integer_fmt
        flow.getCellRangeByPosition(1, 20, 6, 20).NumberFormat = decimal_fmt
        for important in ["EBITDA", "EBIT", "Flujo libre", "Flujo descontado"]:
            style_total(flow, flow_rows.index(important) + 4, 0, 6)
        format_columns(flow, [6500, 3600, 3600, 3600, 3600, 3600, 3600])
        flow.TabColor = 0x26734D

        scenarios = sheets.getByName("Escenarios")
        add_title(scenarios, "ESCENARIOS", "Multiplicadores editables en Inputs; cada caso recalcula impuestos, capital de trabajo y valor terminal.")
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
        format_columns(scenarios, [4200, 4200, 3000, 4200, 4200, 4200, 5000])
        scenarios.TabColor = 0x6B4FA1

        sens = sheets.getByName("Sensibilidad")
        add_title(sens, "SENSIBILIDAD DEL VAN", "Filas: multiplicador de volumen. Columnas: multiplicador de precio; costos y CAPEX permanecen en caso base.", 4)
        set_text(sens, 0, 3, "Volumen \\ Precio")
        for c, formula in enumerate([refs["sens_price_low"], "1", refs["sens_price_high"]], 1):
            set_formula(sens, c, 3, f"={formula}")
            sens.getCellByPosition(c, 3).NumberFormat = pct_fmt
        style_header(sens, 3, 0, 3)
        for vi, vm in enumerate([refs["sens_volume_low"], "1", refs["sens_volume_high"]], 4):
            set_formula(sens, 0, vi, f"={vm}"); sens.getCellByPosition(0, vi).NumberFormat = pct_fmt
            for pi in range(3):
                rb = blocks[f"S{vi-4}{pi}"]["results"]
                set_formula(sens, pi + 1, vi, f"={addr(1,rb['VAN'],'Calculos')}")
                sens.getCellByPosition(pi + 1, vi).NumberFormat = money_fmt
        apply_border(sens.getCellRangeByPosition(0, 3, 3, 6), 0xB8C7D1, 24)
        format_columns(sens, [4200, 4800, 4800, 4800, 1500])
        sens.TabColor = 0x6B4FA1

        sources = sheets.getByName("Fuentes")
        add_title(sources, "TRAZABILIDAD Y FUENTES", "Copia documental de Inputs. Los cambios posteriores deben realizarse en Inputs.")
        for c, h in enumerate(["Parámetro", "Valor actual", "Unidad", "Confianza", "Fuente", "Nota"]): set_text(sources, c, 3, h)
        style_header(sources, 3, 0, 5)
        source_row = 4
        for key, input_row in pos.items():
            if key == "scenario": continue
            for c, source_col in enumerate([1, 2, 3, 4, 5, 6]): set_formula(sources, c, source_row, f"={addr(source_col,input_row,'Inputs')}")
            source_row += 1
        band_rows(sources, 4, source_row - 1, 0, 5)
        format_columns(sources, [5400, 3000, 3600, 2800, 10000, 11000])
        sources.getCellRangeByPosition(0, 3, 5, source_row - 1).IsTextWrapped = True
        sources.getCellRangeByPosition(0, 3, 5, source_row - 1).Rows.OptimalHeight = True
        sources.TabColor = 0x5F6B76

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
                cell.CellBackColor = 0xE8F3EC if cell.Value >= 0 else 0xFCE8E6
                cell.CharColor = 0x14532D if cell.Value >= 0 else 0xB42318
                cell.CharWeight = 150
        calc.TabColor = 0x9CA3AF
        calc.IsVisible = False
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
        OUT.parent.mkdir(parents=True, exist_ok=True)
        url = uno.systemPathToFileUrl(str(OUT))
        doc.storeAsURL(url, (prop("FilterName", "Calc MS Excel 2007 XML"), prop("Overwrite", True)))
        print(OUT)
    finally:
        if doc is not None:
            try: doc.close(True)
            except Exception: pass
        process.terminate()
        try: process.wait(timeout=5)
        except subprocess.TimeoutExpired: process.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    main()
