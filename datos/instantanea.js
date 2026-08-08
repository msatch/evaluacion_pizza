// ARCHIVO GENERADO — no editar a mano.
// Regenerar con: python3 datos/generar_instantanea.py
//
// Copia embebida de los JSON del dossier para que simulador.html
// funcione al abrirlo con doble clic (file:// bloquea fetch).
// Servido por HTTP el simulador ignora este archivo y lee los JSON
// en vivo. verificar-dossier.sh falla si esta copia quedó atrasada.
window.__instantanea = {
 "datos": {
  "base": {
   "_lea_esto_primero": {
    "consumidor_principal": "10-financiero (E10) lee este archivo completo para construir el modelo.",
    "esquema_de_valor": {
     "aprobado_para_decision": "booleano opcional; solo para un estimado o supuesto crítico autorizado explícitamente",
     "confianza": "VERIFICADO | ESTIMADO | SUPUESTO | PENDIENTE",
     "consultado": "YYYY-MM-DD",
     "etapa": "etapa responsable de llenarlo",
     "fecha_aprobacion": "YYYY-MM-DD, requerido si aprobado_para_decision es true",
     "fuente": "URL o nombre de fuente primaria",
     "nota": "método de estimación, supuestos, salvedades",
     "responsable_aprobacion": "rol o persona que autorizó el uso del estimado, requerido si aprobado_para_decision es true",
     "unidad": "string",
     "valor": "número o null"
    },
    "proposito": "Fuente única de verdad de los parámetros compartidos entre etapas del estudio. Ninguna etapa inventa un valor que ya exista aquí; ninguna etapa usa un valor propio sin escribirlo aquí.",
    "regla_1": "NUNCA edites este archivo directamente: varias etapas corren en paralelo y se pisarían las escrituras. Escribe tus parámetros en 'datos/parametros-<tu-etapa>.json' usando el mismo esquema; el coordinador los consolida aquí al cerrar cada ola.",
    "regla_2": "Si necesitas un parámetro que ya está aquí, úsalo tal cual. Si crees que está mal, dilo en tu entregable y en tu archivo de parámetros; no lo corrijas por tu cuenta aquí.",
    "regla_3": "confianza ∈ {VERIFICADO, ESTIMADO, SUPUESTO, PENDIENTE}. PENDIENTE = valor null, aún no investigado. Un ESTIMADO o SUPUESTO crítico solo puede cerrar un gate si incluye aprobado_para_decision: true, responsable_aprobacion y fecha_aprobacion.",
    "regla_4": "Todo monto en CLP nominales 2026 salvo que 'unidad' diga otra cosa. No usar UF salvo arriendos e inmuebles."
   },
   "capex": {
    "capex_total_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "10-financiero",
     "fuente": null,
     "nota": "Equipamiento + habilitación + garantías de arriendo + trámites.",
     "unidad": "CLP",
     "valor": null
    },
    "capital_trabajo_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "10-financiero",
     "fuente": null,
     "nota": "CRÍTICO. Debe cubrir el ciclo de conversión de caja: stock de insumos + producto terminado + cuentas por cobrar a precios.plazo_cobro_dias − crédito de proveedores.",
     "unidad": "CLP",
     "valor": null
    },
    "equipamiento_austero_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://calvac.cl/venta-de/abatidores/ ; https://www.supermaq.cl/amasadoras/amasadora_20_kilos/ ; https://www.supermaq.cl/hornos_pizza/horno_electrico_pizzero_2_camara_40x40/ ; https://lacasita.cl/producto/congelador-industrial-2-puertas-500-litros-maigas/ ; https://lacasita.cl/producto/campana-mural-acero-inoxidable-200x100-maigas/ ; https://lacasita.cl/categoria-producto/acero-inoxidable/mesones-de-trabajo/ ; https://gastromaq.cl/producto/carro-bandejero-15-niveles-acero-inoxidable-bandejas-60x40-cm-mod-1-gastromaq/ ; https://fullmaquinas.cl/acero-inoxidable/lavaplatos-industriales",
     "nota": "Suma de precios de publicación netos, NO de cotizaciones. Canasta: abatidor 5 bandejas 90 L $2.296.980 + amasadora espiral 20 kg $747.815 + horno pizzero 2 cámaras 40x40 $400.000 + un congelador 500 L AISI 304 $1.298.350 + campana mural 200x100 con extractor $546.250 + mesón central 240x60 $167.250 + un carro bandejero 15 niveles $201.681 + lavafondo doble 120x70x80 $219.990 + lavamanos mural $103.990. SACRIFICA: formado de masa manual (sin laminadora), sin mesón refrigerado, sin redundancia de frío, un solo carro. EXCLUYE, por no tener precio público: envasado, bandejas GN 60x40, balanza, termómetro sonda y registrador continuo de temperatura del art. 189 DS 977. Es un piso verificable, no un total. El mercado de equipo usado no arrojó publicación citable al 04-08-2026 (chileremates.cl devolvió 0 productos en la categoría de acero inoxidable usado); por eso este escenario es 'mínimo viable nuevo', no 'usado'.",
     "unidad": "CLP neto",
     "valor": 5982306
    },
    "equipamiento_base_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://calvac.cl/venta/abatidor-de-temperatura-10-bandejas-290-litros/ ; https://www.supermaq.cl/amasadoras/amasadora_20_kilos/ ; https://www.supermaq.cl/sobadoras/laminadora_de_masa_40_cm_ventus./ ; https://www.industriaminera.cl/producto/biggi-chile-sa-mesones-refrigerados/ ; https://lacasita.cl/producto/congelador-industrial-2-puertas-500-litros-maigas/ ; https://lacasita.cl/producto/campana-mural-acero-inoxidable-200x100-maigas/ ; https://gastromaq.cl/producto/carro-bandejero-15-niveles-acero-inoxidable-bandejas-60x40-cm-mod-1-gastromaq/",
     "nota": "Suma de precios de publicación netos, NO de cotizaciones. Canasta: abatidor 10 bandejas 290 L EN STOCK $3.898.990 + amasadora 20 kg $747.815 + horno pizzero 2 cámaras 40x40 $400.000 + laminadora 40 cm $231.000 + mesón refrigerado 120 cm $620.000 + dos congeladores 500 L $2.596.700 + campana 200x100 $546.250 + mesones 240x60 y 140x60 $352.140 + dos carros bandejeros $403.362 + lavafondo doble $219.990 + lavamanos $103.990. EXCLUYE lo mismo que el escenario austero (envasado, bandejas, balanza, sonda, registrador) más ductos de campana, empalme y obra civil, que son de E7. Reemplaza a las ocho líneas hardcodeadas de datos/parametros-10-financiero.json#inversion, que suman $8.817.795 y contienen un abatidor sin stock, un horno de cámara 40x40 cm y una selladora de vacío incompatible con el producto.",
     "unidad": "CLP neto",
     "valor": 10120237
    },
    "equipamiento_holgado_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://calvac.cl/venta/abatidor-de-temperatura-10-bandejas-290-litros/ ; https://www.supermaq.cl/hornos_pizza/horno_electrico_pizzero_camara_690x500_mm/ ; https://lacasita.cl/producto/congelador-industrial-2-puertas-500-litros-maigas/ ; https://www.industriaminera.cl/producto/biggi-chile-sa-mesones-refrigerados/ ; https://fullmaquinas.cl/acero-inoxidable/lavaplatos-industriales",
     "nota": "Suma de precios de publicación netos, NO de cotizaciones. Canasta: dos abatidores 290 L $7.797.980 (duplica capacidad y elimina el punto único de falla de frío señalado en el statement) + amasadora $747.815 + horno de cámara 690x500 mm $1.000.000 (SIN STOCK al 04-08-2026) + laminadora $231.000 + mesón refrigerado 150 cm $650.000 + tres congeladores 500 L $3.895.050 + campana $546.250 + mesones $352.140 + cuatro carros $806.724 + lavafondos $518.980 + dos lavamanos $207.980. Sigue excluyendo envasado, bandejas, balanza, sonda y registrador.",
     "unidad": "CLP neto",
     "valor": 16753919
    },
    "tramites_y_constitucion_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "08-legal-normativo",
     "fuente": null,
     "nota": "Constitución, resolución sanitaria, patente, GS1, análisis de laboratorio, rotulado.",
     "unidad": "CLP",
     "valor": null
    }
   },
   "comercial": {
    "cartera_objetivo_ano1_cuentas": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "11-comercial-logistica",
     "fuente": "index.html (raíz), descripción de la etapa 11: \"primeros 20 clientes\"",
     "nota": "Es una DECISIÓN de política del dossier, no una medición. Sobre el universo de prospección de 1.187 empresas del núcleo (01-mercado) equivale a 1,7% de penetración nominal. No se ha validado que 20 cuentas absorban el volumen del año 1.",
     "unidad": "n° cuentas activas al cierre del año 1",
     "valor": 20
    },
    "ciclo_venta_dias": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "11-comercial-logistica",
     "fuente": null,
     "nota": "Determina cuánto antes de la puesta en marcha debe empezar la prospección. Etapa 03 debe registrar fecha de primer contacto y fecha de compromiso en cada entrevista para producirlo.",
     "unidad": "días desde primer contacto hasta primera orden",
     "valor": null
    },
    "comodato_capex_no_contabilizado_clp": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-05",
     "etapa": "11-comercial-logistica",
     "fuente": "https://www.sii.cl/pagina/jurisprudencia/adminis/1998/renta/oct07.htm",
     "nota": "HALLAZGO. Fórmula: comodato_cuentas_ano1 x 403.361. El bien entregado en comodato NO sale del patrimonio de la empresa: el Oficio SII N°2.615 de 29-09-1998 confirma que los bienes entregados a terceros que siguen siendo de propiedad del contribuyente forman parte de su activo fijo y se deprecian. Por lo tanto es CAPEX y hoy no tiene línea en inversion.* de parametros-10-financiero.json ni en el generador de Excel. Con la holgura declarada de $3,32M contra el límite de $50M, el noveno congelador rompe la restricción de capital.",
     "unidad": "CLP neto",
     "valor": null
    },
    "comodato_congelador_costo_unitario_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "11-comercial-logistica",
     "fuente": "https://equipamientocrecer.cl/products/546652364",
     "nota": "Maigas horizontal tapa dura 300 L, $480.000 con impuesto incluido segun la ficha publicada; neto = 480.000 / 1,19 = 403.361. Garantía declarada 6 meses. Es un equipo de gama doméstica: un congelador de exhibición rotulado con la marca para punto de venta profesional cuesta más y no tiene precio público comparable.",
     "unidad": "CLP neto por congelador horizontal 300 L",
     "valor": 403361
    },
    "comodato_cuentas_ano1": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "03-validacion"
     ],
     "etapa": "11-comercial-logistica",
     "fuente": null,
     "nota": "Etapa 03 debe preguntar en cada entrevista si el local tiene capacidad de -18 °C libre. Solo esa medición define cuántos comodatos hacen falta.",
     "unidad": "n° cuentas que reciben congelador en comodato",
     "valor": null
    },
    "costo_km_tercerizado_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-05",
     "etapa": "11-comercial-logistica",
     "fuente": "https://transportesmarlop.cl/cuanto-cuesta-el-transporte-de-carga-terrestre-en-chile-guia-2026/",
     "nota": "Banda publicada $800-$1.200/km para carga general hasta 1 tonelada; el propio operador propone $900/km como fórmula rápida. LÍMITE FUERTE: es carga general, NO refrigerada. Ningún transportista chileno consultado publica tarifa de frío; el recargo por -18 °C es desconocido y se suma sobre esta base.",
     "unidad": "CLP por km de ruta, carga general tercerizada",
     "valor": 900
    },
    "descuento_volumen_escalon2_pct": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "precios.precio_venta_b2b_familiar_clp",
      "insumos.costo_mp_unidad_familiar_clp"
     ],
     "etapa": "11-comercial-logistica",
     "fuente": null,
     "nota": "Restricción publicada, valor no: descuento_max_pct <= margen_bruto_pct - margen_minimo_objetivo_pct. Fijar un descuento antes de conocer el costo unitario de etapa 06 es regalar margen a ciegas.",
     "unidad": "% de descuento sobre precio de lista",
     "valor": null
    },
    "descuento_volumen_escalon3_pct": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "precios.precio_venta_b2b_familiar_clp",
      "insumos.costo_mp_unidad_familiar_clp"
     ],
     "etapa": "11-comercial-logistica",
     "fuente": null,
     "nota": "Escalón reservado a marca blanca y cuentas ancla. Misma restricción de margen que el escalón 2.",
     "unidad": "% de descuento sobre precio de lista",
     "valor": null
    },
    "diesel_temuco_clp_litro_neto": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "11-comercial-logistica",
     "fuente": "https://preciocombustible.cl/region/araucania/temuco/ (releva CNE, bencinaenlinea.cl)",
     "nota": "Promedio de 36 estaciones de Temuco: $1.216/L con IVA al 05-08-2026; neto = 1.216 / 1,19 = 1.022. Rango observado $965-$1.235. Insumo para evaluar la alternativa de vehículo propio frente a tercerizar.",
     "unidad": "CLP neto por litro",
     "valor": 1022
    },
    "estacionalidad_ratio_peak_valle_pernoctaciones": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "11-comercial-logistica",
     "fuente": "https://regiones.ine.gob.cl/documentos/default-source/region-ix/estadisticas/actividad-del-turismo/boletines/2026/bolet%C3%ADn-encuesta-mensual-de-alojamiento-tur%C3%ADstico-(emat)-enero-2026.pdf",
     "nota": "PROXY, NO ES DEMANDA DE PIZZA. EMAT Araucanía: enero 2026 = 143.871 pernoctaciones regionales; junio 2025 = 68.612 (citado en 01-mercado). 143.871 / 68.612 = 2,10. Diciembre 2025 = 83.965 (enero menos las 59.906 pernoctaciones de variación mensual declarada). Mide alojamiento turístico regional, concentrado en Araucanía Lacustre (Anillo 1), no consumo HORECA de Temuco en el año 1. Sirve para acotar la AMPLITUD plausible, no para repartir el volumen mes a mes.",
     "unidad": "multiplicador, mes peak / mes valle",
     "valor": 2.1
    },
    "frecuencia_entrega_semanal": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "11-comercial-logistica",
     "fuente": "Política de etapa 11",
     "nota": "Una entrega semanal por cuenta permite consolidar una sola ruta y limita el stock que el cliente debe mantener a -18 °C. Queda supeditada a produccion.vida_util_meses (etapa 04) y a la capacidad del congelador del cliente.",
     "unidad": "entregas por cuenta por semana",
     "valor": 1
    },
    "pedido_minimo_unidades": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "precios.precio_venta_b2b_familiar_clp",
      "insumos.costo_mp_unidad_familiar_clp"
     ],
     "etapa": "11-comercial-logistica",
     "fuente": null,
     "nota": "Restricción: pedido_minimo x margen_bruto_unitario >= costo_de_una_entrega. El margen bruto unitario depende de precios (02/03) e insumos (06); el costo de entrega depende de la ruta. Ninguno está cerrado.",
     "unidad": "unidades por entrega",
     "valor": null
    },
    "rampa_ano2_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "mercado.som_ano1_pizzas_mes",
      "comercial.tasa_conversion_prospecto_pct"
     ],
     "etapa": "11-comercial-logistica",
     "factor_implicito_en_stub_actual": 1.4,
     "fuente": null,
     "nota": "No existe fuente pública que funde una rampa comercial B2B para una microfábrica de congelados en Temuco. Fórmula: factor_año_n = (cuentas_activas_n x consumo_mensual_promedio) / (cuentas_activas_1 x consumo_mensual_promedio). Ambas variables son de 01 y 03. Para referencia del coordinador: la forma hoy hardcodeada en modelo.volumen_ano2..5_unidades (42/54/66/72 mil sobre 30 mil) equivale a factores 1,40 / 1,80 / 2,20 / 2,40; se declara aquí para que el fallback quede explícito, NO se respalda.",
     "unidad": "multiplicador sobre el volumen del año 1",
     "valor": null
    },
    "rampa_ano3_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "mercado.som_ano1_pizzas_mes",
      "comercial.tasa_conversion_prospecto_pct"
     ],
     "etapa": "11-comercial-logistica",
     "factor_implicito_en_stub_actual": 1.8,
     "fuente": null,
     "nota": "Año 3 incorpora Anillo 1 (Villarrica, Pucón, Angol, Victoria, Nueva Imperial). El salto no es proporcional a las cuentas: exige ruta interurbana refrigerada, cuyo costo tampoco está cotizado. Ver comercial.costo_km_tercerizado_clp.",
     "unidad": "multiplicador sobre el volumen del año 1",
     "valor": null
    },
    "rampa_ano4_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "mercado.som_ano1_pizzas_mes",
      "produccion.capacidad_instalada_pizzas_dia"
     ],
     "etapa": "11-comercial-logistica",
     "factor_implicito_en_stub_actual": 2.2,
     "fuente": null,
     "nota": "Techo duro no comercial: produccion.capacidad_instalada_pizzas_dia (etapa 04/05). Ningún factor de rampa es válido si excede la capacidad del abatidor.",
     "unidad": "multiplicador sobre el volumen del año 1",
     "valor": null
    },
    "rampa_ano5_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "mercado.som_ano1_pizzas_mes",
      "produccion.capacidad_instalada_pizzas_dia"
     ],
     "etapa": "11-comercial-logistica",
     "factor_implicito_en_stub_actual": 2.4,
     "fuente": null,
     "nota": "Igual restricción de capacidad que el año 4.",
     "unidad": "multiplicador sobre el volumen del año 1",
     "valor": null
    },
    "tasa_conversion_prospecto_pct": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "03-validacion"
     ],
     "etapa": "11-comercial-logistica",
     "fuente": null,
     "nota": "Debe salir del instrumento de etapa 03. Sin esta tasa no se sabe cuántas visitas exige llegar a 20 cuentas y, por lo tanto, ni el ciclo de venta ni el gasto comercial son calculables.",
     "unidad": "% de prospectos calificados que firman",
     "valor": null
    }
   },
   "equipos": {
    "abatidor_ciclo_congelacion_min": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://calvac.cl/venta/abatidor-de-temperatura-10-bandejas-290-litros/",
     "nota": "Ciclo de catálogo del fabricante para 25 kg de +70 °C a -18 °C: 4,5 horas. Es una cota inferior del ciclo real sobre pizza con topping, que la etapa 04 debe medir con sonda al centro térmico y escribir en produccion.ciclo_abatimiento_min. Con este dato, el abatidor y no el horno es el cuello de botella de la planta.",
     "unidad": "minutos",
     "valor": 270
    },
    "abatidor_kg_ciclo_congelacion": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://calvac.cl/venta/abatidor-de-temperatura-10-bandejas-290-litros/",
     "nota": "Dato de placa del abatidor 10 bandejas 290 L de Calvac, el modelo EN STOCK. El mismo equipo declara 40 kg/ciclo en abatimiento positivo (+70 a +3 °C en ~90 min), que NO es congelación y no cumple el art. 186 del DS 977. Insumo para produccion.capacidad_instalada_pizzas_dia (E4); no escribo esa clave.",
     "unidad": "kg por ciclo de +70 °C a -18 °C",
     "valor": 25
    },
    "abatimiento_kwh_por_kg": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://calvac.cl/venta/abatidor-de-temperatura-10-bandejas-290-litros/",
     "nota": "Derivado de datos de placa: 2,40 kW x 4,5 h / 25 kg = 0,432 kWh/kg. Es independiente del gramaje, por lo que sirve a E4 y E10 sin esperar la formulación. Supone el equipo operando a potencia nominal durante todo el ciclo, lo que sobreestima (el compresor cicla) y no incluye desescarche ni carga parcial. Solo cubre la etapa de abatimiento: no incluye horno ni almacenamiento a -18 °C.",
     "unidad": "kWh por kg de producto congelado",
     "valor": 0.432
    },
    "amasadora_kg_harina_batch": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://www.supermaq.cl/amasadoras/amasadora_20_kilos/",
     "nota": "La ficha del equipo comercializado como 'amasadora 20 kilos' declara capacidad máxima de HARINA de 12 kg y bol de 50 litros. Los 20 kg son de masa, no de harina. E4 y E10 deben usar 12 kg de harina por batch, no 20. Con harina_kg_unidad de E10 en 0,2 kg/pizza, un batch rinde ~60 pizzas antes de merma.",
     "unidad": "kg de harina por batch",
     "valor": 12
    },
    "horno_camara_util_mm": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://www.supermaq.cl/hornos_pizza/horno_electrico_pizzero_2_camara_40x40/",
     "nota": "Cámara interior 400 x 400 x 140 mm, dos cámaras, 3 kW. Admite UNA pizza familiar de 30 cm por cámara. El horno que la etapa 10 valorizó en $400.000 no es un horno de microfábrica: es un horno de dos pizzas por hornada. La alternativa de cámara 690 x 500 mm (dos pizzas de 12 pulgadas por cámara) cuesta $1.000.000 neto y figura sin stock.",
     "unidad": "mm de lado útil de cámara",
     "valor": 400
    }
   },
   "escenarios": {
    "capex_base_factor": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/modelo.js",
     "nota": "Identidad.",
     "unidad": "multiplicador",
     "valor": 1
    },
    "capex_optimista_factor": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "depende_de": [
      "capex.equipamiento_base_clp",
      "local.habilitacion_sanitaria_clp"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": "AACE International 18R-97 (rev. 01-03-2016), Tabla 1 — https://services.austintexas.gov/edims/document.cfm?id=280770",
     "nota": "Extremo estrecho de la banda baja de Clase 5 (−20% a −50%). Consecuencia: CAPEX $22.869.227 y fondeo máximo $41.590.138. Simetría falsa: la banda de AACE es asimétrica hacia arriba y así debe leerse.",
     "unidad": "multiplicador sobre equipos y habilitación",
     "valor": 0.8
    },
    "capex_pesimista_factor": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "depende_de": [
      "capex.equipamiento_base_clp",
      "local.habilitacion_sanitaria_clp"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": "AACE International 18R-97 (rev. 01-03-2016), Tabla 1 — https://services.austintexas.gov/edims/document.cfm?id=280770",
     "nota": "El CAPEX vigente es una estimación Clase 5 (definición 0–2%, método de juicio y analogía, precios de publicación web y ninguna cotización de habilitación). AACE asigna a la Clase 5 un rango alto de +30% a +100% DESPUÉS de aplicar contingencia. Se toma el extremo MENOS alarmante de esa banda, +30%. Consecuencia: fondeo máximo $54.320.905, es decir NO CABE en $50.000.000. El valor de quiebre es apenas +13,03%, muy por dentro del rango propio de la clase de estimación.",
     "unidad": "multiplicador sobre equipos y habilitación",
     "valor": 1.3
    },
    "clase_estimacion_capex_aace": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "https://services.austintexas.gov/edims/document.cfm?id=280770",
     "nota": "Clasificación aplicada por esta etapa al estimado vigente. Sube a Clase 4 cuando existan dos cotizaciones formales por equipo y un presupuesto de habilitación sobre un local visitado (gate G2).",
     "unidad": "clase AACE 18R-97 (5 = menos madura)",
     "valor": 5
    },
    "costo_fijo_base_factor": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/modelo.js",
     "nota": "Identidad.",
     "unidad": "multiplicador",
     "valor": 1
    },
    "costo_fijo_optimista_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "rrhh.nomina_bruta_mensual_clp",
      "local.arriendo_mensual_clp"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": null,
     "nota": "No se propone un factor menor a 1: el costo fijo del caso base ya asume una dotación mínima sin verificar.",
     "unidad": "multiplicador sobre el costo fijo mensual",
     "valor": null
    },
    "costo_fijo_pesimista_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "rrhh.nomina_bruta_mensual_clp",
      "macro.factor_costo_empresa",
      "local.arriendo_mensual_clp",
      "operacion.seguros_mensual_clp"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": null,
     "nota": "Sin dotación de la etapa 09 ni canon real de la etapa 07 no hay ancla. Referencias del modelo sobre un costo fijo base de $4.123.720/mes: +6,51% lleva el fondeo máximo a $50.000.000; +31,35% anula el VAN.",
     "unidad": "multiplicador sobre el costo fijo mensual",
     "valor": null
    },
    "costo_variable_base_factor": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/modelo.js",
     "nota": "Identidad.",
     "unidad": "multiplicador",
     "valor": 1
    },
    "costo_variable_optimista_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "insumos.mozzarella_clp_kg"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": null,
     "nota": "Debe salir del descuento por escalón de volumen que entregue la etapa 06, no de un supuesto.",
     "unidad": "multiplicador sobre el costo variable unitario",
     "valor": null
    },
    "costo_variable_pesimista_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "insumos.mozzarella_clp_kg",
      "insumos.envase_clp_unidad",
      "produccion.merma_pct"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": null,
     "nota": "Sin cotización industrial de mozzarella no hay ancla. Referencias del modelo sobre un costo variable base de $2.653/pizza: +3,89% lleva el fondeo máximo a $50.000.000; +11,68% anula el VAN.",
     "unidad": "multiplicador sobre el costo variable unitario",
     "valor": null
    },
    "precio_base_factor": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "datos/parametros-10-financiero.json#modelo.precio_b2b_familiar_base_clp",
     "nota": "Identidad. El nivel base sigue siendo SUPUESTO; lo verificado es el multiplicador.",
     "unidad": "multiplicador",
     "valor": 1
    },
    "precio_optimista_factor": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "depende_de": [
      "precios.precio_venta_b2b_familiar_clp"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": "02-competencia/index.html",
     "nota": "Ancla: pizza familiar foodservice publicada a $5.034 netos (Meta Food, Santiago). 5.034 ÷ 4.200 = 1,199. Límite: ese precio no incluye flete a Temuco ni prueba disposición a pagar del canal local.",
     "unidad": "multiplicador sobre el precio base",
     "valor": 1.2
    },
    "precio_pesimista_factor": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "depende_de": [
      "precios.precio_venta_b2b_familiar_clp"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": "02-competencia/index.html",
     "nota": "Ancla: PF Listo familiar en promoción, $3.017 netos, precio retail regional observado en Temuco. 3.017 ÷ 4.200 = 0,718. Es un escenario definido, no un pronóstico. Consecuencia: la contribución unitaria cae de $1.547 a $364 contra un costo fijo anual de $50.969.179; VAN −$147.746.510. Recalcular si cambia precios.precio_venta_b2b_familiar_clp.",
     "unidad": "multiplicador sobre el precio base",
     "valor": 0.72
    },
    "volumen_base_factor": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "datos/parametros-10-financiero.json#modelo.volumen_ano1_unidades",
     "nota": "Identidad.",
     "unidad": "multiplicador",
     "valor": 1
    },
    "volumen_optimista_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "mercado.som_ano1_pizzas_mes",
      "produccion.capacidad_instalada_pizzas_dia"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": null,
     "nota": "Misma fórmula. Debe además quedar acotado por produccion.capacidad_instalada_pizzas_dia; hoy esa restricción no muerde porque la etapa 04 no la publicó.",
     "unidad": "multiplicador sobre el volumen del año 1",
     "valor": null
    },
    "volumen_pesimista_factor": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "mercado.som_ano1_pizzas_mes"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": null,
     "nota": "Fórmula publicada: factor = mercado.som_ano1_pizzas_mes ÷ 2.500. No se inventa un 0,80. Referencias del modelo: a 2.254 pizzas/mes el fondeo máximo alcanza $50.000.000; a 1.972 pizzas/mes el VAN se anula; el equilibrio está en 2.666 pizzas/mes, por sobre el volumen base de 2.500.",
     "unidad": "multiplicador sobre el volumen del año 1",
     "valor": null
    }
   },
   "financiamiento": {
    "antiguedad_minima_credito_comercial_meses": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "BancoEstado Microempresas; páginas de producto responden 200 pero renderizan por JavaScript y no fueron verificables en fuente primaria",
     "nota": "Restricción dura del mes cero: una SpA recién constituida no es sujeto de crédito comercial. Es la verdadera limitante del caso, más que la tasa. Confirmar en sucursal.",
     "unidad": "meses de funcionamiento",
     "valor": 12
    },
    "corfo_credito_mipyme_tope_uf": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "elegibilidad": "MIPYME con ventas anuales hasta 100.000 UF; se accede a través de un intermediario financiero no bancario (IFNB), no directamente en Corfo. Plazo hasta 10 años.",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "https://www.chileatiende.gob.cl/fichas/868-credito-corfo-mipyme",
     "instrumento": "Crédito Corfo MIPYME",
     "modelado": false,
     "nota": "ES DEUDA, NO APORTE. AÚN NO MODELADO: el statement §5 fija capital propio sin deuda como supuesto base y este dossier no construye tabla de amortización ni escudo tributario. Se registra porque es el único instrumento de la lista efectivamente disponible en la fecha base.",
     "plazo_postulacion": "Ventanilla abierta durante todo el año; vigente al 04-08-2026.",
     "unidad": "UF por RUT",
     "valor": 10000
    },
    "corfo_desarrolla_inversion_aplicable": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.corfo.gob.cl/sites/cpp/regiones/araucania/",
     "nota": "Las dos convocatorias de inversión abiertas en La Araucanía a agosto de 2026 son exclusivas del sector frutícola y de la Provincia de Malleco. Temuco está en Cautín: el proyecto queda excluido por ambas condiciones.",
     "unidad": "booleano: 0 = no aplicable hoy",
     "valor": 0
    },
    "corfo_mipyme_tope_uf": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.chileatiende.gob.cl/fichas/868-credito-corfo-mipyme",
     "nota": "Ventanilla abierta todo el año, sin convocatoria. CORFO no presta directamente: financia a intermediarios no bancarios que fijan la tasa. Plazo hasta 10 años, incluye leasing y factoring.",
     "unidad": "UF por RUT",
     "valor": 10000
    },
    "corfo_semilla_inicia_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "elegibilidad": "Emprendimiento INNOVADOR con potencial de escalamiento e internacionalización; persona jurídica con menos de 18 meses de inicio de actividades y sin ventas. Aporte del postulante 25%. $17.000.000 para empresas lideradas por mujeres.",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "https://www.corfo.gob.cl/sites/cpp/inf/semilla-inicia",
     "instrumento": "Corfo Semilla Inicia",
     "modelado": false,
     "nota": "AÚN NO MODELADO Y PROBABLEMENTE NO ELEGIBLE. Corfo declara expresamente que un emprendimiento tradicional, sin innovación, no puede postular. Una microfábrica de pizza congelada con proceso conocido no califica salvo que se construya un componente de innovación verificable, lo que este dossier no ha hecho ni debe inventar.",
     "plazo_postulacion": "Todas las convocatorias figuran CERRADAS al 04-08-2026; la última abierta corrió del 19-11-2025 al 18-12-2025.",
     "unidad": "CLP no reembolsables, hasta 75% del proyecto",
     "valor": 15000000
    },
    "credito_consumo_es_deducible": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.cmfchile.cl/educa/621/w3-propertyvalue-43579.html",
     "nota": "En el crédito de consumo el deudor es la persona natural y la SpA no es parte del contrato: el interés no entra a la renta líquida de la sociedad ni hay crédito fiscal de IVA. No se encontró prohibición normativa de destinar consumo a fines de empresa; la CMF lo define como libre disposición. No afirmar que está prohibido.",
     "unidad": "booleano: 0 = el interés no es gasto deducible de la sociedad",
     "valor": 0
    },
    "fogape_cobertura": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-04",
     "elegibilidad": "Micro, pequeños y medianos empresarios elegibles según la ley del Fondo, que no cuenten con garantías o cuyas garantías sean insuficientes. Administra BancoEstado; supervisa la CMF; se rige por el DL 3.472 de 1980.",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "https://www.fogape.cl/que-es-fogape-2/",
     "instrumento": "Fondo de Garantía para Pequeños Empresarios (FOGAPE)",
     "modelado": false,
     "nota": "NO ENTREGA DINERO Y AÚN NO ESTÁ MODELADO: garantiza un porcentaje del capital de un crédito que un banco debe aprobar antes. El porcentaje efectivo y el tope dependen de la licitación de derechos de garantía vigente y del producto de cada banco; no se pudo verificar la cifra exacta en fuente primaria (www.fogape.cl no publica la tabla y la página de garantías estatales de BancoEstado devuelve 404 al 04-08-2026). Gestión: solicitar condiciones a un ejecutivo de empresas de BancoEstado sucursal Temuco.",
     "plazo_postulacion": "Permanente; se solicita ante una institución financiera participante, no ante el Fondo.",
     "unidad": "% del capital garantizado",
     "valor": null
    },
    "fogape_cobertura_pct": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.fogape.cl/2023/06/30/preguntas-frecuentes/",
     "nota": "El fondo es permanente (DL 3.472) y se accede vía banco, no postulando. Pero la tabla de cobertura no está publicada: la entrada más reciente del sitio oficial es del 23-12-2024. Las coberturas de 95/90/85% que circulan corresponden al programa Chile Apoya, cuya vigencia terminó el 31-12-2023. No citarlas como vigentes.",
     "unidad": "% de cobertura de la garantía",
     "valor": null
    },
    "leasing_financia_pct_max": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.sii.cl/portales/mipyme/modulo_fomento/leasing_pyme.htm",
     "nota": "Contradice el supuesto del statement de que la restricción de capital 'obliga a cotizar equipo usado y leasing': el leasing alivia la restricción en vez de derivarse de ella, y Leasing Pyme de CORFO exige bienes NUEVOS. Usado y leasing son alternativas, no complementos. La tarifa no es pública.",
     "unidad": "% del bien, sin pie",
     "valor": 100
    },
    "maquila_tarifa_max_techo_30m_clp_unidad": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "depende_de": [
      "produccion.costo_maquila_clp_unidad",
      "mercado.som_ano1_pizzas_mes"
     ],
     "etapa": "13-financiamiento-societario",
     "fuente": "10-financiero/generar_modelo_excel.py#build_model",
     "nota": "Bisección sobre el fondeo máximo con habilitación sanitaria y envolvente de equipos en cero y sin tope de capacidad propia. Es un umbral de negociación, no una tarifa observada: por sobre $560/pizza la maquila deja de caber en $30.000.000. Depende del volumen del caso base, que ninguna etapa validó.",
     "unidad": "CLP/pizza de sobrecosto variable admisible",
     "valor": 560
    },
    "maquila_tarifa_max_techo_50m_clp_unidad": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "depende_de": [
      "produccion.costo_maquila_clp_unidad",
      "mercado.som_ano1_pizzas_mes"
     ],
     "etapa": "13-financiamiento-societario",
     "fuente": "10-financiero/generar_modelo_excel.py#build_model",
     "nota": "Mismo método contra el techo original de $50.000.000.",
     "unidad": "CLP/pizza de sobrecosto variable admisible",
     "valor": 810
    },
    "sercotec_capital_semilla_aplicable": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.sercotec.cl/wp-content/uploads/2026/04/Bases-Semilla-EMPRENDE-2026-Araucania-Prov.Cautin-VB%C2%B0.pdf",
     "nota": "Doblemente inaplicable: la convocatoria cerró el 13-05-2026 y las bases exigen NO tener inicio de actividades en primera categoría, lo que excluye a una SpA constituida. La página web sigue mostrándola abierta; prevalecen las bases.",
     "unidad": "booleano: 0 = no aplicable",
     "valor": 0
    },
    "sercotec_capital_semilla_emprende_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "elegibilidad": "Persona natural mayor de 18 años SIN inicio de actividades en primera categoría ante el SII; aporte empresarial obligatorio del 3% del subsidio; sin deudas laborales, previsionales ni tributarias.",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "https://www.sercotec.cl/wp-content/uploads/2026/04/Bases-Semilla-EMPRENDE-2026-Araucania-Prov.Cautin-VB%C2%B0.pdf",
     "instrumento": "Capital Semilla Emprende, Provincia de Cautín, Región de La Araucanía 2026",
     "modelado": false,
     "nota": "AÚN NO MODELADO. De los $3.500.000, entre $200.000 y $500.000 deben ir a gestión empresarial y el resto a inversión, habilitación y capital de trabajo. Cubre el 8,0% de la inversión inicial de $43.516.722. Incompatibilidad estructural: exige NO haber iniciado actividades, de modo que no puede combinarse con una empresa ya formalizada. Convocatoria 2027 no publicada al 04-08-2026.",
     "plazo_postulacion": "Desde las 12:00 del 29-04-2026 hasta las 15:00 del 13-05-2026. CERRADA al 04-08-2026.",
     "unidad": "CLP netos, no reembolsables",
     "valor": 3500000
    },
    "sercotec_crece_sostenible_max_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "elegibilidad": "Persona natural o jurídica CON inicio de actividades en primera categoría y ventas netas anuales entre 200 UF ($8.168.958) y 25.000 UF. Inversiones y acciones deben orientarse a prácticas sostenibles. Cobertura estimada: 29 empresas.",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "https://www.sercotec.cl/wp-content/uploads/2026/07/Modificacion-Bases-de-Convocatoria-Crece-Sostenible-2026.pdf",
     "instrumento": "Crece Sostenible, Región de La Araucanía 2026",
     "modelado": false,
     "nota": "ÚNICO MONTO NO REEMBOLSABLE CONCRETO Y POTENCIALMENTE APLICABLE A ESTE PROYECTO. AÚN NO MODELADO, y no puede aliviar la inversión inicial: exige ventas previas de al menos 200 UF, de modo que llega después de haber comprometido el capital, no antes. Encaja en el gate G5 (mes 12), no en el arranque. Convocatoria 2027 no publicada al 04-08-2026.",
     "plazo_postulacion": "Desde las 12:00 del 22-06-2026 hasta las 15:00 del 15-07-2026 según modificación de bases de julio 2026 (las bases originales cerraban el 08-07-2026). CERRADA al 04-08-2026.",
     "unidad": "CLP netos, no reembolsables",
     "valor": 9000000
    },
    "sercotec_crece_sostenible_min_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "https://www.sercotec.cl/convocatoria/crece-sostenible-region-de-la-araucania-2026/",
     "modelado": false,
     "nota": "Piso del rango de financiamiento del instrumento. AÚN NO MODELADO.",
     "unidad": "CLP netos, no reembolsables",
     "valor": 7000000
    },
    "subsidio_no_reembolsable_modelado_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/modelo.js",
     "nota": "Confirmación explícita de que el flujo no incorpora ningún aporte público. Si el coordinador decide agregar una línea de subsidio, debe ser una decisión declarada, no un supuesto silencioso.",
     "unidad": "CLP",
     "valor": 0
    },
    "tasa_interes_corriente_tramo_proyecto_pct": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.cmfchile.cl/portal/estadisticas/626/articles-111825_recurso_1.pdf",
     "nota": "Certificado 07/2026 de la CMF, calculado sobre operaciones de junio de 2026. Es un promedio de lo efectivamente cobrado por la banca, no una oferta: una microempresa sin historial se cotiza por sobre esa tasa, no por debajo.",
     "unidad": "% anual, no reajustable, >200 y ≤5.000 UF, 90 días o más",
     "valor": 20.46
    },
    "tasa_maxima_convencional_tramo_proyecto_pct": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.cmfchile.cl/portal/estadisticas/626/articles-111825_recurso_1.pdf",
     "nota": "Techo legal. Pactar por sobre la TMC hace que el interés se reduzca al corriente (Ley 18.010 art. 8).",
     "unidad": "% anual, mismo tramo",
     "valor": 30.69
    }
   },
   "historial": [
    {
     "cambio": "Creación del archivo. Sembrados los parámetros macro verificados contra fuentes primarias (SII para UF y dólar observado, Ley 21.751 para ingreso mínimo). Todo lo demás queda PENDIENTE.",
     "etapa": "base",
     "fecha": "2026-08-04"
    },
    {
     "cambio": "Consolidación de la ola 2/3/5: etapas 03-validacion, 04-producto-proceso, 05-maquinaria, 09-rrhh, 11-comercial-logistica, 12-riesgos-financiamiento. 107 claves nuevas, 15 pendientes cerradas. Los valores que siguen en null continúan PENDIENTE y el modelo usa el fallback declarado de la etapa 10.",
     "etapa": "coordinación",
     "fecha": "2026-08-05"
    },
    {
     "cambio": "Consolidación acumulada de etapas: 03-validacion, 04-producto-proceso, 05-maquinaria, 09-rrhh, 11-comercial-logistica, 12-riesgos-financiamiento, 13-financiamiento-societario. 19 claves nuevas, 35 pendientes cerradas. Los valores que siguen en null continúan PENDIENTE y el modelo usa el fallback declarado de la etapa 10.",
     "etapa": "coordinación",
     "fecha": "2026-08-06"
    }
   ],
   "insumos": {
    "costo_mp_unidad_familiar_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "06-insumos",
     "fuente": null,
     "nota": null,
     "unidad": "CLP/unidad",
     "valor": null
    },
    "costo_mp_unidad_individual_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "06-insumos",
     "fuente": null,
     "nota": "Materia prima + envase por pizza individual. Debe cuadrar con la formulación de E4.",
     "unidad": "CLP/unidad",
     "valor": null
    },
    "envase_clp_unidad": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "06-insumos",
     "fuente": null,
     "nota": "Film + bandeja + etiqueta + caja prorrateada.",
     "unidad": "CLP neto/unidad",
     "valor": null
    },
    "harina_clp_kg": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "06-insumos",
     "fuente": null,
     "nota": "Harina panadera/pizzera, saco 25 kg.",
     "unidad": "CLP neto/kg",
     "valor": null
    },
    "mozzarella_clp_kg": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "06-insumos",
     "fuente": null,
     "nota": "DRIVER DE COSTO N°1. Cotizar por escalón de volumen. Surlat tiene planta en Temuco; Colun en Los Ríos.",
     "unidad": "CLP neto/kg",
     "valor": null
    },
    "salsa_tomate_clp_kg": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "06-insumos",
     "fuente": null,
     "nota": null,
     "unidad": "CLP neto/kg",
     "valor": null
    }
   },
   "inversion": {
    "contingencia_pct": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "https://services.austintexas.gov/edims/document.cfm?id=280770",
     "nota": "SE MANTIENE EN 15% Y SE DECLARA POR QUÉ. No se encontró estándar chileno citable de contingencia por clase de estimación, y AACE 18R-97 es explícita en que la contingencia se determina por análisis de riesgo del proyecto y nunca se predetermina; subirla a un número redondo sería relleno. Datos duros: con 15% la reserva es de $3.321.070, prácticamente idéntica a la holgura de $3.317.555 contra el límite de $50.000.000 — es decir, consumir la contingencia equivale a agotar la holgura. Valor crítico: 29,98%; por sobre ese punto el fondeo máximo supera $50.000.000. Gestión: presupuesto desglosado de arquitecto o constructor sobre un local candidato visitado (etapa 07).",
     "unidad": "% sobre equipos, instalación y habilitación",
     "valor": 15
    },
    "flete_instalacion_pct": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": null,
     "nota": "No hay tarifa publicada auditable para Santiago-Temuco de una carga de ~700 kg con equipos de refrigeración. La única referencia encontrada es una guía comercial de un transportista (transportesmarlop.cl, $900-$1.500/km), que sobre 670 km da $603.000-$1.005.000 por camión completo, es decir 6,0%-9,9% del envolvente base: NO valida el 15% que hoy usa la etapa 10. Además el 15% mezcla tres cosas distintas que deben separarse: flete, conexión eléctrica/SEC y ductos de campana (estos últimos son de E7). Fórmula a usar cuando exista dato: flete_instalacion_pct = (flete_cotizado_clp + conexion_electrica_clp) / capex.equipamiento_base_clp * 100. Gestión que lo cierra: cotizador de Pullman Cargo y despacho a regiones de Calvac (+56 2 2695 6000 es Supermaq; Calvac despacha desde Santiago) sobre la lista exacta de equipos y pesos de placa (abatidor 184 kg, amasadora 130 kg, congelador 75 kg c/u, horno 33 kg).",
     "unidad": "% sobre equipos",
     "valor": null
    },
    "valor_residual_pct": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": null,
     "nota": "No se fija por regla contable sino por precio observado de reventa, y ese mercado no arrojó publicación citable: chileremates.cl declara la categoría 'Mesones y muebles de acero inox / Usado' con 0 productos al 04-08-2026, y Yapo y MercadoLibre no permiten citar un aviso estable (avisos efímeros, unidad única, sin ficha técnica). El valor contable lineal al año 5 con vida 10 años sería 50%, pero eso NO es valor de realización y no debe usarse como tal. El 10% que hoy usa E10 tampoco tiene fuente. Fórmula: valor_residual_pct = precio_reventa_observado_clp / capex.equipamiento_base_clp * 100. Gestión que lo cierra: pedir tasación de recompra a Calvac (contacto@calvac.cl) y a Chileremates (contacto@chileremates.cl, +56 9 6226 2317) sobre la lista de equipos con 5 años de uso.",
     "unidad": "% del CAPEX de equipos",
     "valor": null
    },
    "vida_depreciable_anios": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://www.sii.cl/valores_y_fechas/tabla_vida_util_activo_inmovilizado.html",
     "nota": "Promedio ponderado por monto de las vidas útiles NORMALES que publica el SII (Resolución Exenta 43 de 2002), aplicadas al envolvente base: equipos de aire y cámaras de refrigeración 10 años (abatidor $3.898.990); refrigeradores y conservadoras 9 años (congeladores $2.596.700, mesón refrigerado $620.000); cocinas 9 años (horno $400.000); maquinaria y equipos en general 15 años (amasadora $747.815, laminadora $231.000); instalaciones en general 10 años (campana $546.250, lavado $323.980); muebles y enseres 7 años (mesones $352.140, carros $403.362). Resultado 9,90 años, redondeado a 10. ADVERTENCIA PARA E10: esta es vida útil ECONÓMICA, no el calendario tributario. La etapa 10 ya supone régimen Pro Pyme 14 D N°3 al aplicar 12,5% el año 1; bajo ese régimen la depreciación del activo inmovilizado es INSTANTÁNEA E ÍNTEGRA en el ejercicio de adquisición (Circular SII 62/2020, https://www.sii.cl/normativa_legislacion/circulares/2020/circu62.pdf). El valor 5 que hoy usa E10 no es ninguna de las dos cosas: es la vida ACELERADA de maquinaria general, que no aplica al mix ni al régimen supuesto.",
     "unidad": "años lineales",
     "valor": 10
    }
   },
   "local": {
    "arriendo_clp_m2_mes": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "07-local-habilitacion",
     "fuente": null,
     "nota": "Zona industrial/mixta de Temuco. Muchos se publican en UF: convertir con macro.uf_clp.",
     "unidad": "CLP/m²/mes",
     "valor": null
    },
    "arriendo_mensual_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "07-local-habilitacion",
     "fuente": null,
     "nota": null,
     "unidad": "CLP/mes",
     "valor": null
    },
    "habilitacion_sanitaria_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "07-local-habilitacion",
     "fuente": null,
     "nota": "RIESGO PRINCIPAL DEL PRESUPUESTO. Pisos y muros sanitarios, lavamanos no manuales, campana, potencia trifásica, agua, residuos. Cotizar local vacío vs. local con RSA vigente.",
     "unidad": "CLP",
     "valor": null
    },
    "potencia_electrica_kw": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://calvac.cl/venta/abatidor-de-temperatura-10-bandejas-290-litros/ ; https://www.supermaq.cl/amasadoras/amasadora_20_kilos/ ; https://www.supermaq.cl/hornos_pizza/horno_electrico_pizzero_2_camara_40x40/ ; https://lacasita.cl/producto/congelador-industrial-2-puertas-500-litros-maigas/ ; https://www.supermaq.cl/selladoras_al_vacio/selladora_al_vacio_300_mm_dz300/ ; https://www.supermaq.cl/sobadoras/laminadora_de_masa_40_cm_ventus./",
     "nota": "Suma de potencias de PLACA verificadas del envolvente base: horno 3,00 + amasadora 2,75 (3 HP) + abatidor 2,40 nominal + dos congeladores 0,65 c/u = 1,30 + selladora 0,45 + laminadora 0,25 (1/3 HP) = 10,15 kW. ES UN PISO, NO EL REQUERIMIENTO: no incluye el desescarche del abatidor (1,00 kW adicional, no simultáneo con el nominal), ni el extractor de la campana (modelo HCB/4-450, potencia no publicada), ni el mesón refrigerado (potencia no publicada en la ficha), ni iluminación (el art. 34 del DS 977 exige 220 lux en salas de trabajo y 540 lux en puntos de inspección), ni agua caliente sanitaria, ni climatización. A 220 V monofásicos, 10,15 kW son ~46 A, por sobre un empalme monofásico comercial corriente: el local candidato debe tener empalme TRIFÁSICO o presupuestar uno nuevo. El dimensionamiento definitivo con factor de simultaneidad lo debe firmar un instalador eléctrico autorizado SEC. Escrito aquí y no en datos/parametros-07-local-habilitacion.json, que conserva el stub null por acuerdo de etapas.",
     "unidad": "kW de carga conectada",
     "valor": 10.15
    },
    "superficie_requerida_m2": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "07-local-habilitacion",
     "fuente": null,
     "nota": "Suma de zonas del layout: recepción, bodega seca, producción, congelado, despacho, vestidores, oficina.",
     "unidad": "m²",
     "valor": null
    }
   },
   "macro": {
    "factor_costo_empresa": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-10906.html ; https://www.chileatiende.gob.cl/fichas/130987-aportes-del-empleador-al-sistema-de-pensiones ; https://www.isl.gob.cl/cotizaciones/ ; https://www.isl.gob.cl/wp-content/uploads/2024/08/Clasificador-Actividades-Economicas-2021.pdf ; https://www.previred.com/indicadores-previsionales/",
     "nota": "MULTIPLICADOR DESNUDO, se usa tal cual (1,0853 = 8,53% sobre el bruto). Suma: 3,50% cotización de cargo del empleador Ley 21.735 vigente 08-2026 a 07-2027 (incluye el SIS, que desde agosto 2026 se financia dentro del Seguro Social Previsional y ya no se cotiza aparte) + 2,40% seguro de cesantía AFC contrato indefinido + 0,93% tasa base Ley 16.744 (0,90% básica + 0,03% SANNA) + 1,70% cotización adicional DS 110 para CIIU 107500 'elaboración de comidas y platos preparados envasados, rotulados y con información nutricional'. CONDICIONES: contrato indefinido (a plazo fijo el AFC sube a 3,00% y el factor a 1,0913); empresa nueva sin evaluación de siniestralidad (DS 67 puede subir o bajar la adicional desde el tercer año); rentas muy por debajo del tope imponible de 90 UF, por lo que todas las tasas aplican íntegras. NO APLICA al retiro de la titular por sueldo empresarial (ver rrhh.retiro_titular_mensual_clp). NO incluye provisiones de feriado ni de indemnización: para eso ver rrhh.factor_costo_empresa_con_provisiones. ADVERTENCIA: el stub 1,22 de la etapa 10 sobrestima el desembolso mensual exigible en ~14 puntos porcentuales.",
     "unidad": "multiplicador sobre sueldo bruto imponible de trabajador dependiente",
     "valor": 1.0853,
     "vigencia": "Sube a 4,25% (factor 1,0928) desde 08-2027, 5,00% desde 08-2028, 5,70% desde 08-2029, 6,40% desde 08-2030 y 7,10% desde 08-2031 por gradualidad de la Ley 21.735. El factor NO es constante en un horizonte de 5 años."
    },
    "ingreso_minimo_mensual_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "base",
     "fuente": "Ley 21.751 — https://www.bcn.cl/leychile/navegar?idNorma=1214530",
     "nota": "Vigente desde 01-05-2026 para trabajadores de 18 a 65 años. Antes $539.000. Próximo reajuste 01-01-2027 según IPC mayo-diciembre 2026.",
     "unidad": "CLP/mes",
     "valor": 553553
    },
    "ipc_proyectado_pct": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "10-financiero",
     "fuente": null,
     "nota": "Meta Banco Central o encuesta de expectativas, para proyección a 5 años.",
     "unidad": "% anual",
     "valor": null
    },
    "iva_pct": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "base",
     "fuente": "DL 825, régimen general de IVA",
     "nota": "Todos los precios del estudio se expresan NETOS salvo indicación expresa.",
     "unidad": "%",
     "valor": 19
    },
    "tasa_descuento_pct": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "https://www.cmfchile.cl/portal/estadisticas/626/w4-article-111825.html",
     "nota": "PISO OBSERVADO, no el costo de oportunidad del titular. CMF, Certificado 07/2026 (promedios de junio 2026, vigente desde el 14-07-2026): interés corriente de 20,46% anual para operaciones no reajustables en moneda nacional de 90 días o más entre 200 y 5.000 UF. La inversión inicial de $43.516.722 equivale a 1.065 UF, dentro de ese tramo. El capital propio es subordinado a esa deuda, luego la TMAR correcta es MAYOR. Reemplaza el stub de 15% de la etapa 10, que quedaba por DEBAJO del costo observado de deuda del mismo tamaño. Spread sobre la TPM (4,5%, Banco Central, https://www.bcentral.cl/areas/politica-monetaria): 15,96 puntos. NO se descompone riesgo por riesgo: no existe fuente pública que lo permita para una microempresa de alimentos en Temuco y repartir los puntos con decimales sería inventar. Límite: el interés corriente es un promedio de operaciones heterogéneas, expresado en forma lineal anual base 360 días, no una cotización para esta empresa. La decisión no es sensible a la tasa: el VAN se anula recién en 35,69% (la TIR); VAN@15% $44.017.948, VAN@20,46% $28.308.713. Gestión que lo cerraría: que el titular declare por escrito el retorno de su alternativa real de inversión.",
     "unidad": "% anual nominal",
     "valor": 20.46
    },
    "uf_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "base",
     "fuente": "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
     "nota": "UF al 04-08-2026. Se reajusta a diario; usar este valor congelado para todo el estudio y declararlo.",
     "unidad": "CLP por UF",
     "valor": 40844.79
    },
    "usd_observado_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "base",
     "fuente": "https://www.sii.cl/valores_y_fechas/dolar/dolar2026.htm",
     "nota": "Dólar observado oficial SII al 04-08-2026. Crítico para maquinaria importada (E5). Los sitios de proyección daban ~964; se usa el oficial.",
     "unidad": "CLP por USD",
     "valor": 924.89
    }
   },
   "mercado": {
    "establecimientos_horeca_anillo1": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "01-mercado",
     "fuente": null,
     "nota": "Villarrica, Pucón, Angol, Victoria, Nueva Imperial.",
     "unidad": "n° establecimientos",
     "valor": null
    },
    "establecimientos_horeca_temuco": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "01-mercado",
     "fuente": null,
     "nota": "Temuco + Padre Las Casas. Desglosar por rubro.",
     "unidad": "n° establecimientos",
     "valor": null
    },
    "indice_estacionalidad": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-05",
     "etapa": "11-comercial-logistica",
     "fuente": "https://regiones.ine.gob.cl/documentos/default-source/region-ix/estadisticas/actividad-del-turismo/boletines/2026/bolet%C3%ADn-encuesta-mensual-de-alojamiento-tur%C3%ADstico-(emat)-enero-2026.pdf",
     "meses_requeridos": 12,
     "meses_verificados": 3,
     "nota": "Se verificaron tres meses reales de pernoctaciones regionales (enero 2026 = 143.871; diciembre 2025 = 83.965, derivado de la variación mensual declarada en el mismo boletín; junio 2025 = 68.612, citado y fuenteado en 01-mercado), no doce. Completar los nueve meses faltantes por interpolación sería inventar tres cuartos del índice. Además el proxy mide alojamiento turístico regional, dominado por Pucón y Villarrica, mientras el año 1 opera en Temuco y Padre Las Casas. Método para cerrarlo: descargar la serie EMAT completa de 24 meses de la región y contrastarla con las ventas mensuales declaradas por las cuentas entrevistadas en etapa 03, segmentando núcleo y Anillo 1. Ver comercial.estacionalidad_ratio_peak_valle_pernoctaciones para la amplitud verificada.",
     "unidad": "índice mensual, base 100 = promedio",
     "valor": null
    },
    "sam_pizzas_mes": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "01-mercado",
     "fuente": null,
     "nota": "Mercado servible: establecimientos alcanzables × consumo mensual estimado. Explicitar el método.",
     "unidad": "unidades/mes",
     "valor": null
    },
    "som_ano1_pizzas_mes": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "validacion.resultados_terreno"
     ],
     "etapa": "01-mercado",
     "fuente": null,
     "nota": "DISEÑO DE MEDICIÓN: som_ano1_pizzas_mes = Σ (consumo mensual declarado en la pregunta 1 del guion) sobre las cuentas que firmaron pedido de prueba pagado, × factor de captura efectiva medido a los 60 días por recompra real. No se extrapola desde segmentos con menos de 5 observaciones válidas. Sustituye el supuesto de 2.500 u/mes que hoy corre en datos/parametros-10-financiero.json#operacion.volumen_ano1_unidades. Eco escrito por 03; la clave la cierra 01-mercado con el dato de terreno.",
     "unidad": "unidades/mes",
     "valor": null
    }
   },
   "meta": {
    "canal_objetivo": "HORECA",
    "fecha_base_estudio": "2026-08-04",
    "horizonte_evaluacion_anios": 5,
    "moneda_base": "CLP",
    "proyecto": "Microfábrica de pizzas congeladas B2B — Temuco, La Araucanía",
    "restriccion_capital_clp": 50000000
   },
   "operacion": {
    "seguros_mensual_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "capex.equipamiento_base_clp",
      "local.superficie_requerida_m2"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": null,
     "nota": "No existe tarifa pública para una planta de alimentos con cámara de frío; cualquier cifra sería inventada. Mientras esté en null el modelo usa el fallback de $60.000 de la etapa 10, declarado SUPUESTO. Gestión: cotizar póliza de incendio, equipo estático, rotura de maquinaria con daño a existencias refrigeradas y responsabilidad civil de producto, con un corredor y con BancoEstado Seguros, sobre el inventario de equipos de la etapa 05. La cobertura de daño a existencias por falla de frío es la relevante: el riesgo de cadena de frío no está representado en ninguna otra parte del modelo.",
     "unidad": "CLP/mes",
     "valor": null
    },
    "ventas_mensual_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "insumos.costo_mp_unidad_familiar_clp",
      "comercial.tasa_conversion_prospecto_pct",
      "rrhh.dotacion_comercial"
     ],
     "etapa": "11-comercial-logistica",
     "fuente": null,
     "nota": "No se sustituye el stub de 180.000 porque su componente principal no es cotizable todavía. Fórmula: muestras_mes x insumos.costo_mp_unidad_familiar_clp + km_visitas_mes / rendimiento_km_litro x 1.022 + material_grafico. El costo de la muestra es de etapa 06 y el número de visitas depende de comercial.tasa_conversion_prospecto_pct. ADVERTENCIA: esta línea NO incluye la remuneración de la fuerza de venta; esa dotación es de etapa 09 y hoy está embebida sin desglose en operacion.nomina_bruta_mensual_clp.",
     "unidad": "CLP/mes",
     "valor": null
    }
   },
   "precios": {
    "plazo_cobro_dias": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "validacion.resultados_terreno"
     ],
     "etapa": "02-competencia",
     "fuente": null,
     "nota": "DISEÑO DE MEDICIÓN: pregunta 5 del guion, cerrada y con alternativas explícitas (contado / 7 / 30 / 60 días), aplicada a TODAS las entrevistas, sobre el proveedor de congelados actual y no sobre el ideal declarado. Se tabula por separado cadenas y centrales de compra vs. independientes (pregunta 6), porque 02 pidió esa separación y porque el promedio simple la oculta. El valor a publicar es el promedio ponderado por volumen declarado, no el promedio simple. VACÍO DECLARADO: ninguna fuente pública establece la práctica de pago del canal HORECA de Temuco; la Ley 21.131 fija 30 días corridos como regla supletoria y el Ministerio de Economía mantiene un registro público de acuerdos con plazo excepcional, prueba de que se pacta por sobre ese plazo. CRÍTICO: en E10 arrastra ~$10,7 de los $14,0 millones de capital de trabajo inicial, sobre una restricción de capital de $50 millones. Eco escrito por 03; la clave la cierra 02-competencia.",
     "unidad": "días",
     "valor": null
    },
    "precio_competencia_nacional_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "02-competencia",
     "fuente": null,
     "nota": "Referencia de marca nacional puesta en Temuco. Define el techo de precio.",
     "unidad": "CLP neto/unidad",
     "valor": null
    },
    "precio_venta_b2b_familiar_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "validacion.resultados_terreno",
      "precios.precio_competencia_nacional_clp"
     ],
     "etapa": "02-competencia",
     "fuente": null,
     "nota": "DISEÑO DE MEDICIÓN: prueba monádica de la pregunta 4 del guion. Cada entrevistado ve UNA oferta cerrada (producto, caja de 12, entrega 24–48 h, comodato y plazo) a uno de tres puntos: 0,85× / 1,00× / 1,15× precios.precio_competencia_nacional_clp, asignados por rotación. El precio se fija en el punto más alto que alcance el umbral de conversión de 20%, medido con pedido pagado y no con intención declarada. Nunca se pregunta '¿cuánto pagaría usted?'. Eco escrito por 03; la clave la cierra 02-competencia.",
     "unidad": "CLP neto/unidad",
     "valor": null
    },
    "precio_venta_b2b_individual_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "validacion.resultados_terreno",
      "precios.precio_venta_b2b_familiar_clp"
     ],
     "etapa": "02-competencia",
     "fuente": null,
     "nota": "DISEÑO DE MEDICIÓN: mismo protocolo monádico, con oferta separada para el formato individual/pizzeta, dirigida a la cuota de pubs y bares, que es donde 01 ubica el consumo de formato chico. La relación individual/familiar NO se deriva por regla de tres desde el precio familiar: se mide con su propia oferta cerrada, porque el uso (unidad de servicio vs. compartir) es distinto. Eco escrito por 03; la clave la cierra 02-competencia.",
     "unidad": "CLP neto/unidad",
     "valor": null
    }
   },
   "produccion": {
    "capacidad_instalada_pizzas_dia": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "depende_de": [
      "capex.equipamiento_base_clp"
     ],
     "etapa": "04-producto-proceso",
     "formula": "capacidad_dia = floor(610/D_mm) * floor(410/D_mm) * 10 bandejas * ciclos_dia",
     "fuente": "https://calvac.cl/venta/abatidor-10-bandejas-2/ + https://www.supermaq.cl/abatidor/abatidor_congelador_5_bandejas.pdf",
     "nota": "Cuello de botella GEOMÉTRICO, no térmico. Bandeja de 610x410 mm: floor(610/300) x floor(410/300) = 2 discos de 300 mm por bandeja; 10 bandejas = 20 pizzas/ciclo = 8,5 kg, el 28% de los 30 kg declarados. Con ciclo de 240 min: 2 ciclos en jornada de 8,4 h más 1 ciclo desatendido que el equipo almacena solo al terminar = 3 ciclos/día x 20 = 60. Techo absoluto con operación 24 h: 6 ciclos = 120/día. El horno pizzero de 2 cámaras 40x40 (~24 pizzas/h) y la amasadora de 20 kg (83 bollos de 240 g) NO son limitantes. En SKU individual de 200 mm: 3x2 = 6 por bandeja = 60/ciclo = 180/día.",
     "unidad": "unidades/día (SKU familiar 30 cm)",
     "valor": 60
    },
    "ciclo_abatimiento_min": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "https://www.supermaq.cl/abatidor/abatidor_congelador_5_bandejas.pdf",
     "nota": "TECHO CONSERVADOR, NO MEDICIÓN. La ficha del abatidor Calvac de 10 bandejas NO declara tiempo de ciclo; se toma el nominal declarado por la ficha del equipo homólogo de 5 bandejas GN 1/1: 'Congelación: 8 kg por ciclo (+90 °C a -18 °C en 240 minutos)'. Ese nominal supone carga másica completa en gastronorm profunda; nuestro producto es un disco de ~15 mm a 8,5 kg sobre un equipo de 30 kg, así que el ciclo real debería ser bastante menor — pero NADIE LO HA MEDIDO y no hay fuente pública que lo haga. Toda la factibilidad del proyecto cuelga de este número: a 60 min de ciclo la capacidad sube a 160/día y el equilibrio deja de ser problema. Cerrar con piloto y sonda corazón.",
     "unidad": "minutos",
     "valor": 240
    },
    "dias_operacion_mes": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "https://www.dt.gob.cl/legislacion/1624/w3-article-129189.html",
     "nota": "CLAVE NUEVA. Jornada de 42 horas semanales desde el 26-04-2026 (Ley 21.561, confirmado por ORD. 253/21 de la Dirección del Trabajo). Turno único de 5 días x 8,4 h; 52/12 = 4,333 semanas/mes x 5 = 21,7, redondeado a 22. Es decisión de diseño operacional, no un dato: un segundo turno o sábados la cambian. Capacidad mensual = 60 x 22 = 1.320 pizzas familiares.",
     "unidad": "días/mes",
     "valor": 22
    },
    "merma_pct": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "datos/parametros-10-financiero.json#producto.merma_pct",
     "nota": "PUNTOS PORCENTUALES: 5 = 5%. modelo.js lo divide por 100. NO EXISTE fuente pública chilena de merma de proceso para esta línea; se mantiene el marcador heredado de etapa 10 en vez de inventar precisión. Componentes esperados: recorte de masa al formar, residuo de dosificado de salsa y queso, y producto no conforme de arranque (el dominante). Solo lo cierra un piloto de 3 lotes con pesaje de entrada y salida.",
     "unidad": "%",
     "valor": 5
    },
    "temperatura_centro_termico_c": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "08-legal-normativo/index.html (DS 977 art. 186 y 187, vía https://www.bcn.cl/leychile/navegar?idNorma=71271)",
     "nota": "Exigencia normativa, no objetivo de calidad. Validar con sonda en el punto más caliente del lote y registrar cada ciclo.",
     "unidad": "°C en el centro térmico del producto",
     "valor": -18
    },
    "tolerancia_conservacion_c": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "08-legal-normativo/index.html (DS 977 art. 192)",
     "nota": "Conservación a -18 °C; tolerancia breve sin superar -12 °C. Exige termómetro, registro, alarma y criterio documentado de rechazo en recepción del cliente.",
     "unidad": "°C máximo admisible en excursión breve",
     "valor": -12
    },
    "vida_util_meses": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "https://pedidos.tudisgastronomia.es/ecommerce/pdf/23010.pdf",
     "nota": "Ficha técnica de minipizza congelada de otro fabricante: 'Vida útil: 12 meses a partir de la fecha de fabricación en condiciones normales de conservación (-18 ºC)'. Es un valor de PLANIFICACIÓN de stock. Para ROTULARLO en Chile el DS 977 exige respaldo propio: estudio de vida útil y desafío microbiológico sobre nuestra formulación y nuestro envase. No usar como fecha de vencimiento hasta tener ese informe.",
     "unidad": "meses a -18 °C",
     "valor": 12
    }
   },
   "producto": {
    "distribucion_variable_clp_unidad": {
     "banda_max_clp_unidad": 288,
     "banda_min_clp_unidad": 58,
     "confianza": "PENDIENTE",
     "consultado": "2026-08-05",
     "depende_de": [
      "mercado.som_ano1_pizzas_mes",
      "comercial.cartera_objetivo_ano1_cuentas"
     ],
     "etapa": "11-comercial-logistica",
     "fuente": "https://transportesmarlop.cl/cuanto-cuesta-el-transporte-de-carga-terrestre-en-chile-guia-2026/",
     "nota": "No se sustituye el stub de 220 porque no hay tarifa de frío publicada por ningún operador chileno. Fórmula: costo_ruta / unidades_por_ruta, con costo_ruta = km_ruta x comercial.costo_km_tercerizado_clp + recargo_frio (desconocido). Sensibilidad calculada con $900/km: 40-80 km de ruta urbana y 250-625 unidades por ruta semanal dan una banda de $58 a $288 por unidad. El stub de 220 cae dentro de la banda, en su tercio alto, pero es un promedio anual que oculta que en los meses de ramp-up (pocas cuentas, la misma ruta) el costo unitario es 3 a 5 veces el maduro.",
     "unidad": "CLP neto/unidad entregada",
     "valor": null
    },
    "energia_variable_clp_unidad": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-04",
     "etapa": "05-maquinaria",
     "fuente": "https://calvac.cl/venta/abatidor-de-temperatura-10-bandejas-290-litros/ ; https://www.supermaq.cl/hornos_pizza/horno_electrico_pizzero_2_camara_40x40/",
     "nota": "Faltan las dos mitades del cálculo y ninguna es inventable. (1) El consumo por unidad exige el gramaje y el ciclo real de 04: kWh_pizza = equipos.abatimiento_kwh_por_kg x gramaje_kg + (potencia_horno_kw x tiempo_horno_h / pizzas_por_hornada) + consumo de almacenamiento congelado prorrateado por rotación. (2) La tarifa: no se obtuvo la hoja de tarifas vigente de Frontel (distribuidora de La Araucanía) para una opción tarifaria comercial BT2/BT3/AT4; la página de tarifas vigentes de Grupo Saesa solo entrega enlaces a PDF que no se pudieron abrir. El stub 120 que hoy usa E10 cita como fuente la ficha de un abatidor, que no contiene ninguna tarifa eléctrica: es una cifra sin respaldo. Gestión que lo cierra: solicitar a Frontel (Grupo Saesa) la hoja tarifaria vigente para el empalme del local candidato y contrastarla con las opciones tarifarias publicadas por la CNE.",
     "unidad": "CLP/pizza",
     "valor": null
    },
    "envase_bandeja": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "https://metafood.cl/PIZZ12400_Pizza_Mechada_30cm_-_Congelada_12",
     "nota": "SÍ lleva. Dos razones encadenadas: el sellado al vacío sobre un disco de 300 mm sin soporte rígido deforma la cobertura, y la caja máster de 12 unidades carga las de abajo. El producto se congela DESNUDO sobre la bandeja del abatidor y se monta sobre el disco de cartón recién después, en envasado: envasar en caliente antes de congelar atrapa humedad y alarga el ciclo.",
     "unidad": "1 = sí lleva bandeja/disco de cartón rígido; 0 = producto desnudo",
     "valor": 1
    },
    "envase_diametro_mm": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "06-insumos/index.html §3 (formato de caja 33x33 cm referenciado) + https://metafood.cl/PIZZ12400_Pizza_Mechada_30cm_-_Congelada_12",
     "nota": "Disco de 300 mm más 15 mm de holgura por lado. Coincide con el formato de mercado 33x33 cm. ADVERTENCIA A ETAPA 05: la selladora al vacío cotizada en parametros-10-financiero.json#inversion.selladora_vacio_clp es una DZ-300, con barra de sellado de 300 mm; NO puede sellar un envase de 330 mm. Lo señalo, no lo corrijo.",
     "unidad": "mm de diámetro interior del envase primario",
     "valor": 330
    },
    "envase_tipo_barrera": {
     "_consumo": "Parámetro de texto, no numérico; modelo.js no lo lee. Precedente de esquema: 10-financiero/generar_modelo_excel.py línea 276, {'valor': 'Base', 'unidad': 'texto', ...}.",
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "https://metafood.cl/PIZZ12400_Pizza_Mechada_30cm_-_Congelada_12",
     "nota": "Especificación: VACÍO, con film de barrera apto para contacto con alimentos y uso a -18 °C, sellado térmico. Base: el único proveedor foodservice chileno con pizza de 30 cm congelada y precio publicado la describe expresamente 'envasada al vacío', lo que demuestra que la técnica es viable sobre este formato en este mercado. El vacío protege de quemadura por frío durante 12 meses de vida útil. Etiqueta resistente a condensación, con 'PRODUCTO CONGELADO' según DS 977 art. 186 y SIN la sigla 'IQF' (etapa 08).",
     "unidad": "texto: 'vacio' | 'flow-pack' | 'film retractil'",
     "valor": "vacio"
    },
    "envase_unidades_caja_master": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "https://metafood.cl/PIZZ12400_Pizza_Mechada_30cm_-_Congelada_12",
     "nota": "Convención de mercado verificada: pizza familiar de 30 cm congelada publicada por caja de 12 a $60.408 + IVA ($5.034 unitario). Alinear nuestra caja con la del comparable evita discutir formatos con el comprador. 12 unidades es además la carga de 3 días de un pub chico. Peso bruto estimado de la caja: 12 x 0,426 kg = 5,1 kg más envase.",
     "unidad": "unidades por caja máster",
     "valor": 12
    },
    "harina_kg_unidad": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "https://eur-lex.europa.eu/legal-content/ES/TXT/HTML/?uri=CELEX:32010R0097",
     "nota": "Reglamento (UE) 97/2010, pliego Pizza Napoletana ETG: harina 1.800 g : agua 1 L : sal 50-55 g : levadura 3 g, total 2.855 g, de donde la harina es el 63,0% de la masa. Bollo de 240 g (techo del rango ETG 180-250 g) x 0,630 = 151 g. Se toma el techo porque un disco precocido congelado debe resistir manipulación, apilado en caja de 12 y transporte: densidad 0,34 g/cm² sobre 300 mm, más gruesa que una napoletana. Sustituye el supuesto de 0,2 kg de etapa 10, que era 32% mayor.",
     "unidad": "kg/pizza familiar 30 cm",
     "valor": 0.151
    },
    "mozzarella_kg_unidad": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "depende_de": [
      "insumos.mozzarella_clp_kg"
     ],
     "etapa": "04-producto-proceso",
     "fuente": "https://eur-lex.europa.eu/legal-content/ES/TXT/HTML/?uri=CELEX:32010R0097",
     "nota": "LÍNEA MÁS SENSIBLE DEL MODELO. Dos anclas independientes convergen: (a) pliego ETG Margherita, 'entre 80 y 100 g' de mozzarella; (b) ficha técnica comercial de minipizza congelada que declara mozzarella 20,5% en masa, que sobre 426 g da 89 g. Se toma 100 g, techo del rango ETG, porque sobre 300 mm da mayor densidad superficial que 100 g sobre los 350 mm que el ETG permite, y porque la carga de queso visible es el atributo que el canal compra. Sustituye el supuesto de 0,12 kg de etapa 10: a $8.403,36/kg el costo de queso baja de $1.008 a $840 por unidad. NINGUNA de las dos anclas es chilena ni foodservice, y el rendimiento al fundir no está probado: cerrar con panel de degustación en etapa 03 y con el piloto.",
     "unidad": "kg/pizza familiar 30 cm",
     "valor": 0.1
    },
    "otros_ingredientes_clp_unidad": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-04",
     "depende_de": [
      "insumos.aceite_clp_kg",
      "insumos.sal_clp_kg",
      "insumos.levadura_clp_kg"
     ],
     "etapa": "04-producto-proceso",
     "fuente": null,
     "nota": "CANTIDADES CERRADAS, PRECIO ABIERTO. Por unidad: aceite de oliva 5 g, sal 4,4 g, levadura 0,25 g (pliego ETG, escalado al bollo de 240 g) y condimentos secos <1 g. Total 9,7 g. No se encontró precio público chileno neto para aceite, sal ni levadura, así que no escribo un número. El SKU ancla es de QUESO: no lleva topping cárnico, luego esta bolsa NO debe contener topping. Si el titular quiere pepperoni o jamón, es un SKU distinto con su propio costo. NO CONSOLIDAR ESTE NULL SOBRE EL MODELO: modelo.js lee esta clave sin fallback y produciría NaN; mantener el stub de $550 de etapa 10 hasta que 06 cotice, sabiendo que $550 para 9,7 g de aceite, sal y levadura es casi con certeza una sobrestimación grande.",
     "unidad": "CLP neto/pizza familiar 30 cm",
     "valor": null
    },
    "salsa_kg_unidad": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "04-producto-proceso",
     "fuente": "https://eur-lex.europa.eu/legal-content/ES/TXT/HTML/?uri=CELEX:32010R0097",
     "nota": "Pliego ETG para la Margherita: 'entre 60 y 80 g de tomates pelados triturados'. Se toma el techo. CUADRA CON EL PRECIO DE 06: la salsa es tomate pelado triturado en crudo con sal y aceite, sin reducción, así que 1 kg de insumo ≈ 1 kg de salsa y el gramaje se valoriza directamente con datos/parametros-06-insumos.json#insumos.salsa_tomate_clp_kg. Si se decide cocer y reducir la salsa, este número sube por pérdida de agua.",
     "unidad": "kg/pizza familiar 30 cm",
     "valor": 0.08
    }
   },
   "riesgo": {
    "cadena_de_frio": {
     "clave_afectada": "operacion.seguros_mensual_clp",
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "operacion.seguros_mensual_clp"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": null,
     "impacto": "ALTO",
     "mitigacion": "Registro de temperatura por lote, alarma de cámara, criterio documentado de rechazo y póliza con cobertura de daño a existencias por falla de equipo.",
     "nota": "No se cuantifica. El daño principal es reputacional en un canal profesional pequeño y el modelo no lo representa de ninguna forma. Un número aquí sería inventado.",
     "probabilidad": "MEDIA",
     "unidad": "CLP de pérdida esperada",
     "valor": null
    },
    "holgura_capital_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). $50.000.000 − $125.493.563. Antes se publicó como +$3.317.555 con el fondeo de $46,68M; ahora es NEGATIVA en $75,5 millones. No hay holgura: hay déficit.",
     "unidad": "CLP",
     "valor": -75493563
    },
    "maquila_costo_maximo_admisible_clp_unidad": {
     "clave_afectada": "local.habilitacion_sanitaria_clp",
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "depende_de": [
      "produccion.costo_maquila_clp_unidad"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "impacto": "—",
     "mitigacion": "Es la mitigación estructural del riesgo de CAPEX, no un plan B.",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). Tarifa máxima de maquila que sigue cabiendo en $50.000.000, por bisección sobre el fondeo con habilitación y equipos propios en cero y sin tope de capacidad propia. Contra el techo de $30.000.000 que evalúa la etapa 13, el umbral baja a $560/pizza. No es una tarifa observada: es cuánto se puede pagar.",
     "probabilidad": "—",
     "unidad": "CLP netos/pizza de sobrecosto variable admisible",
     "valor": 810
    },
    "quiebre_capacidad_pizzas_dia": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). Capacidad instalada que anula el VAN: 135 unidades/día contra las 60 que deriva la etapa 04 de la geometría del abatidor cotizado, es decir +125%. El otro de los dos parámetros con raíz, y el que señala que el rediseño necesario es técnico antes que financiero.",
     "unidad": "ver nota",
     "valor": 135
    },
    "quiebre_capex_pct": {
     "clave_afectada": "capex.equipamiento_base_clp",
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "impacto": "CRÍTICO",
     "mitigacion": "Dos cotizaciones formales por equipo con flete a Temuco antes del gate G2; reclasificar el estimado a Clase 4.",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). ATENCIÓN — cambio de sentido: el fondeo máximo ($125.493.563) ya SUPERA el límite de capital, así que esta columna dejó de marcar un punto de quiebre y pasó a marcar la MEJORA REQUERIDA. SIN QUIEBRE EN EL RANGO: no existe valor físicamente admisible de este parámetro que, por sí solo, devuelva el proyecto al límite de capital o anule el VAN. Ningún lever individual lo rescata.",
     "probabilidad": "ALTA",
     "unidad": "% de sobrecosto sobre equipos y habilitación",
     "valor": null
    },
    "quiebre_contingencia_pct": {
     "clave_afectada": "inversion.contingencia_pct",
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "impacto": "CRÍTICO",
     "mitigacion": "Presupuesto desglosado de habilitación que permita bajar la contingencia con evidencia, no subirla con criterio.",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). ATENCIÓN — cambio de sentido: el fondeo máximo ($125.493.563) ya SUPERA el límite de capital, así que esta columna dejó de marcar un punto de quiebre y pasó a marcar la MEJORA REQUERIDA. SIN QUIEBRE EN EL RANGO: no existe valor físicamente admisible de este parámetro que, por sí solo, devuelva el proyecto al límite de capital o anule el VAN. Ningún lever individual lo rescata.",
     "probabilidad": "ALTA",
     "unidad": "% sobre equipos, instalación y habilitación",
     "valor": null
    },
    "quiebre_costo_fijo_pct": {
     "clave_afectada": "rrhh.nomina_bruta_mensual_clp",
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "impacto": "ALTO",
     "mitigacion": "Dotación mínima verificada por la etapa 09 y canon real de la etapa 07 antes del gate G4.",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). SIN QUIEBRE EN EL RANGO: no existe valor físicamente admisible de este parámetro que, por sí solo, devuelva el proyecto al límite de capital o anule el VAN. Ningún lever individual lo rescata. Ni con costo de personal en cero se anula el VAN.",
     "probabilidad": "MEDIA",
     "unidad": "% de alza sobre el costo fijo mensual",
     "valor": null
    },
    "quiebre_costo_variable_pct": {
     "clave_afectada": "insumos.mozzarella_clp_kg",
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "impacto": "ALTO",
     "mitigacion": "Dos proveedores aprobados con precio por escalón de 25/100/300 kg y ficha técnica antes del piloto.",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). SIN QUIEBRE EN EL RANGO: no existe valor físicamente admisible de este parámetro que, por sí solo, devuelva el proyecto al límite de capital o anule el VAN. Ningún lever individual lo rescata. Ni llevando a cero los ingredientes menores se anula el VAN.",
     "probabilidad": "MEDIA",
     "unidad": "% de alza sobre el costo variable unitario",
     "valor": null
    },
    "quiebre_habilitacion_sanitaria_clp": {
     "clave_afectada": "local.habilitacion_sanitaria_clp",
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "impacto": "CRÍTICO",
     "mitigacion": "Producir en maquila hasta disponer de presupuesto de arquitecto sobre un local real visitado; condicionar el arriendo a factibilidad sanitaria y municipal (gate G2/G4).",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). ATENCIÓN — cambio de sentido: el fondeo máximo ($125.493.563) ya SUPERA el límite de capital, así que esta columna dejó de marcar un punto de quiebre y pasó a marcar la MEJORA REQUERIDA. SIN QUIEBRE EN EL RANGO: no existe valor físicamente admisible de este parámetro que, por sí solo, devuelva el proyecto al límite de capital o anule el VAN. Ningún lever individual lo rescata. Ni siquiera con habilitación sanitaria en cero el fondeo vuelve al límite.",
     "probabilidad": "ALTA",
     "unidad": "CLP",
     "valor": null
    },
    "quiebre_plazo_cobro_dias": {
     "clave_afectada": "precios.plazo_cobro_dias",
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "impacto": "CRÍTICO",
     "mitigacion": "Pactar 15 días con descuento por pronto pago en las primeras cuentas; no aceptar 60 días sin línea de capital de trabajo aprobada. Medir el plazo real en el piloto (gate G3).",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). ATENCIÓN — cambio de sentido: el fondeo máximo ($125.493.563) ya SUPERA el límite de capital, así que esta columna dejó de marcar un punto de quiebre y pasó a marcar la MEJORA REQUERIDA. SIN QUIEBRE EN EL RANGO: no existe valor físicamente admisible de este parámetro que, por sí solo, devuelva el proyecto al límite de capital o anule el VAN. Ningún lever individual lo rescata. Ni el pago al contado devuelve el fondeo al límite.",
     "probabilidad": "ALTA",
     "unidad": "días",
     "valor": null
    },
    "quiebre_precio_clp": {
     "clave_afectada": "precios.precio_venta_b2b_familiar_clp",
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "impacto": "CRÍTICO",
     "mitigacion": "Prueba monádica de la etapa 03 antes de publicar lista de precios; no anclar al retail promocional.",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). Precio neto por familiar que anula el VAN: $6.152, es decir +46,5% sobre los $4.200 del caso base. Es uno de los dos únicos parámetros con raíz.",
     "probabilidad": "ALTA",
     "unidad": "CLP neto/unidad familiar",
     "valor": 6152
    },
    "quiebre_volumen_pizzas_mes": {
     "clave_afectada": "mercado.som_ano1_pizzas_mes",
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "12-riesgos-financiamiento",
     "fuente": "10-financiero/generar_modelo_excel.py#switching_values",
     "impacto": "CRÍTICO",
     "mitigacion": "No firmar arriendo ni comprometer CAPEX sin cartas de intención por al menos 2.666 pizzas/mes al precio de lista (gate G1).",
     "nota": "Recalculado el 06-08-2026 contra el motor vigente (TMAR 20,46%, tope de capacidad de la etapa 04, costo de personal de la etapa 09). SIN QUIEBRE EN EL RANGO: no existe valor físicamente admisible de este parámetro que, por sí solo, devuelva el proyecto al límite de capital o anule el VAN. Ningún lever individual lo rescata. Subir el SOM no ayuda porque la producción está topada por la capacidad instalada de 1.320/mes: vender más de lo que se puede fabricar no genera flujo.",
     "probabilidad": "ALTA",
     "unidad": "pizzas/mes del año 1",
     "valor": null
    },
    "rampa_anos_3_a_5": {
     "clave_afectada": "comercial.rampa_ano3_factor",
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "comercial.rampa_ano3_factor",
      "comercial.rampa_ano4_factor",
      "comercial.rampa_ano5_factor"
     ],
     "etapa": "12-riesgos-financiamiento",
     "fuente": null,
     "impacto": "CRÍTICO",
     "mitigacion": "Fijar la forma de la rampa en la etapa 11 y recalcular VAN, TIR y fondeo antes del gate G4.",
     "nota": "El VAN de $44.017.948 proviene casi íntegramente de años que ninguna etapa validó, mientras el año 1 aporta flujo negativo. No es un riesgo acotable con un valor de quiebre: es una ausencia de evidencia.",
     "probabilidad": "ALTA",
     "unidad": "—",
     "valor": null
    }
   },
   "rrhh": {
    "comision_ventas_pct": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "operacion.ventas_mensual_clp"
     ],
     "etapa": "09-rrhh",
     "fuente": null,
     "nota": "El año 1 no contempla vendedor contratado: la venta la hace la titular dentro de su jornada. Cuando la etapa 11 fije el plan de cobertura (visitas/semana y cuentas activas), esta clave define la parte remuneracional del esquema; el gasto comercial no remuneracional sigue siendo de la etapa 11. Regla de gatillo: contratar cuando visitas_requeridas_semana × horas_por_visita supere las horas comerciales disponibles de la titular.",
     "unidad": "% sobre venta neta",
     "valor": null
    },
    "costo_empresa_operario_adicional_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "09-rrhh/index.html",
     "nota": "700.000 × 1,0853. Costo marginal de cada operario adicional a jornada completa si E04 determina que se requiere un segundo turno o si el volumen valida crecer. Ya incluye el factor: no multiplicar otra vez.",
     "unidad": "CLP/mes",
     "valor": 759710
    },
    "costo_personal_mensual_marcha_blanca_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "09-rrhh/index.html",
     "nota": "DERIVADO: 700.000 × 1,0853 + 1.200.000. Aplica meses 1 a 3.",
     "unidad": "CLP/mes",
     "valor": 1959710
    },
    "costo_personal_mensual_regimen_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "09-rrhh/index.html",
     "nota": "DERIVADO, no es un dato independiente: 1.100.000 × 1,0853 + 1.200.000. Existe sólo para evitar que el retiro de la titular se pierda si el modelo cablea una sola línea de personal. Si se usa esta clave, NO multiplicar de nuevo por macro.factor_costo_empresa. Compara contra el stub de E10 (2.200.000 × 1,22 = 2.684.000): $290.170/mes menos, $3.482.040 al año.",
     "unidad": "CLP/mes",
     "valor": 2393830
    },
    "dotacion_total": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "09-rrhh/index.html",
     "nota": "Marcha blanca: 2 personas (titular + 1 operario). Régimen: 3. Dimensionada por presencia y por la supervisión que exige el art. 60 del DS 977, no por productividad medida; depende de produccion.capacidad_instalada_pizzas_dia.",
     "unidad": "personas en régimen (2 dependientes + titular)",
     "valor": 3
    },
    "factor_costo_empresa_con_provisiones": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "09-rrhh/index.html",
     "nota": "NO es macro.factor_costo_empresa y no debe cablearse en su lugar. 8,53% exigible + 5,83% feriado + 8,33% indemnización. Sirve para el escenario prudente de la etapa 12 y explica de dónde puede venir el 1,22 del stub: el 1,22 es defendible como factor CON provisiones, no como desembolso previsional mensual.",
     "unidad": "multiplicador sobre sueldo bruto",
     "valor": 1.2269
    },
    "gratificacion_tope_mensual_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "https://www.dt.gob.cl/portal/1626/w3-article-99034.html ; datos/supuestos.json#macro.ingreso_minimo_mensual_clp",
     "nota": "Art. 50 del Código del Trabajo: 25% de lo devengado con tope de 4,75 ingresos mínimos mensuales al 31-12 del ejercicio; 4,75 × 553.553 ÷ 12. La gratificación legal sólo se devenga si hay utilidad líquida, pero la práctica de pactarla garantizada la vuelve costo fijo: se incluye dentro de cada bruto.",
     "unidad": "CLP/mes por trabajador",
     "valor": 219115
    },
    "jornada_semanal_horas": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "https://www.mintrab.gob.cl/40horas-implementacion/",
     "nota": "Ley 21.561: 44 h desde 26-04-2024, 42 h desde 26-04-2026, 40 h desde 26-04-2028. El horizonte de 5 años del estudio cruza la baja a 40 h: a igual dotación, el costo por hora disponible sube ~5% desde 2028.",
     "unidad": "horas/semana",
     "valor": 42
    },
    "nomina_bruta_marcha_blanca_mensual_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "09-rrhh/index.html",
     "nota": "Meses 1 a 3 (habilitación, pruebas de proceso, validación de receta y trámite sanitario): titular + 1 operario de producción a jornada completa. Tampoco incluye el retiro de la titular.",
     "unidad": "CLP/mes",
     "valor": 700000
    },
    "nomina_bruta_mensual_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "https://www.ine.gob.cl/estadisticas-por-tema/mercado-laboral/encuesta-suplementaria-de-ingresos ; https://fcje.ufro.cl/noticias/la-araucania-frente-a-la-esi-2025-desafios-para-un-desarrollo-con-mejores-ingresos/ ; datos/supuestos.json#macro.ingreso_minimo_mensual_clp",
     "nota": "RÉGIMEN, desde el mes 4. Dotación dependiente: 1 operario de producción a jornada completa 42 h ($700.000 bruto) + 1 operario polivalente a jornada parcial 24 h ($400.000 bruto). Cada bruto incluye sueldo base + gratificación art. 50 del Código del Trabajo (25% con tope de 4,75 IMM anuales = $219.115/mes); no volver a sumarla. ESTE VALOR NO INCLUYE EL RETIRO DE LA TITULAR: el modelo debe sumar rrhh.retiro_titular_mensual_clp SIN aplicarle macro.factor_costo_empresa. Si se prefiere una sola línea ya calculada, usar rrhh.costo_personal_mensual_regimen_clp. Los sueldos son ESTIMADOS: no existe serie pública de remuneración por cargo y comuna; se anclaron en el ingreso mínimo legal y en la ESI 2025 convertida de líquido a bruto.",
     "unidad": "CLP/mes, suma de sueldos brutos imponibles de trabajadores dependientes",
     "valor": 1100000
    },
    "provision_feriado_pct": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "https://www.dt.gob.cl/portal/1626/w3-article-99034.html",
     "nota": "15 días hábiles de feriado anual ≈ 21 días corridos ≈ 0,7 mes sobre 12. Para un sueldo mensual NO es caja adicional: es costo de reemplazo o de planta detenida. No está dentro de macro.factor_costo_empresa.",
     "unidad": "% sobre el bruto",
     "valor": 5.83
    },
    "provision_indemnizacion_pct": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "https://www.dt.gob.cl/portal/1626/w3-article-99034.html",
     "nota": "Un mes por año de servicio (art. 163), sólo exigible si el término es por necesidades de la empresa (art. 161). Provisión prudente = 1/12. No está dentro de macro.factor_costo_empresa.",
     "unidad": "% sobre el bruto",
     "valor": 8.33
    },
    "retiro_titular_mensual_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "https://www.ine.gob.cl/estadisticas-por-tema/mercado-laboral/encuesta-suplementaria-de-ingresos",
     "nota": "Sueldo empresarial de la titular (art. 31 N°6 LIR). NO se le aplica macro.factor_costo_empresa: no es trabajadora dependiente, no está afecta al seguro de cesantía ni a la cotización de cargo del empleador; sus cotizaciones de AFP y salud se descuentan de este mismo bruto. Punto a confirmar con contador antes de cerrar el modelo. El monto es una DECISIÓN de la titular, no un precio de mercado observado: queda entre la mediana de ingreso de La Araucanía (ESI 2025, $550.232 líquidos) y la mediana nacional del grupo 'directores, gerentes y administradores'. Sensibilizar en la etapa 12.",
     "unidad": "CLP/mes brutos",
     "valor": 1200000
    },
    "sueldo_bruto_operario_parcial_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "datos/supuestos.json#macro.ingreso_minimo_mensual_clp",
     "nota": "Base $320.000 + gratificación art. 50 $80.000. Jornada parcial del art. 40 bis (tope: dos tercios de la jornada ordinaria, hoy 28 h). El ingreso mínimo proporcional para 24/42 h es $316.316, de modo que la base cumple el piso legal.",
     "unidad": "CLP/mes brutos, jornada parcial 24 h",
     "valor": 400000
    },
    "sueldo_bruto_operario_produccion_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "09-rrhh",
     "fuente": "https://fcje.ufro.cl/noticias/la-araucania-frente-a-la-esi-2025-desafios-para-un-desarrollo-con-mejores-ingresos/ ; datos/supuestos.json#macro.ingreso_minimo_mensual_clp",
     "nota": "Base $560.000 + gratificación art. 50 $140.000. Equivale a 1,26 ingresos mínimos y a ~$567.000 líquidos, apenas sobre la mediana de ingreso líquido de La Araucanía ($550.232, ESI 2025). Cargo con capacitación en manipulación higiénica documentada (DS 977 art. 52) y responsabilidad de registros de proceso.",
     "unidad": "CLP/mes brutos, jornada completa 42 h",
     "valor": 700000
    }
   },
   "societario": {
    "arancel_sanitario_pct_capital": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.chileatiende.gob.cl/fichas/172-autorizacion-sanitaria-de-alimentos",
     "nota": "Se suma al arancel base de $12.100 a $899.700 según instalación. Por una sola vez; la resolución dura 3 años renovables.",
     "unidad": "% del capital inicial declarado ante el SII",
     "valor": 0.5
    },
    "capital_minimo_legal_spa_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://leyes-cl.com/codigo_de_comercio/425.htm",
     "nota": "El art. 425 CCom exige indicar el capital y el número de acciones, pero no fija piso alguno. La ausencia de norma es el dato, no una omisión de la búsqueda.",
     "unidad": "CLP",
     "valor": 0
    },
    "constitucion_res_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.chileatiende.gob.cl/fichas/21409-tu-empresa-en-un-dia",
     "nota": "Gratuito sólo si se firma con firma electrónica avanzada por ClaveÚnica. Con firma manuscrita ante notario reaparece el costo notarial, que no tiene arancel público verificable.",
     "unidad": "CLP",
     "valor": 0
    },
    "costo_anual_declarar_30m_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://legacy.temuco.cl/tramite-y-servicio/pago-de-patentes-comerciales/",
     "nota": "5‰ sobre $30.000.000. Costo recurrente de declarar ese capital, más $150.000 por una vez en el arancel sanitario. Declarar capital alto no aporta nada al negocio.",
     "unidad": "CLP/año",
     "valor": 150000
    },
    "patente_municipal_temuco_por_mil": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://legacy.temuco.cl/tramite-y-servicio/pago-de-patentes-comerciales/",
     "nota": "Temuco aplica el máximo del rango 2,5‰-5‰ del DL 3.063 art. 24. Piso de 1 UTM anual si el capital es inferior a 200 UTM. Recurrente cada año, no un pago único.",
     "unidad": "por mil anual sobre capital propio tributario",
     "valor": 5
    },
    "plazo_supletorio_entero_capital_anios": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://leyes-cl.com/codigo_de_comercio/434.htm",
     "nota": "Plazo supletorio si el estatuto nada dice. Si no se entera, el capital queda reducido de pleno derecho al monto efectivamente pagado; no hay multa ni nulidad.",
     "unidad": "años",
     "valor": 5
    },
    "regimen_matrimonial_titular": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://leyes-cl.com/codigo_civil/1749.htm",
     "nota": "Determinante y no averiguado. Bajo sociedad conyugal las acciones de ambos son haber social (art. 1725 N.º 5) y el marido es dueño frente a terceros (art. 1750); si la cónyuge autoriza el aval, queda expuesto todo el haber social (art. 1749). Bajo separación total responde sólo quien avala. Verificar con abogado antes de constituir y antes de avalar.",
     "unidad": "sociedad conyugal | separación total | participación en gananciales",
     "valor": null
    },
    "spa_admite_patente_microempresa_familiar": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-05",
     "etapa": "13-financiamiento-societario",
     "fuente": "https://www.temuco.cl/tramites-servicios/patente-microempresa-familiar/",
     "nota": "La patente de microempresa familiar de Temuco admite sólo persona natural y EIRL, y exime de los requisitos de uso de suelo. Es el único punto donde elegir SpA cierra una puerta.",
     "unidad": "booleano: 0 = no admite",
     "valor": 0
    }
   },
   "validacion": {
    "n_entrevistas_objetivo": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "01-mercado §5 'Qué debe medir la etapa 03'",
     "nota": "Entrevista válida = local visitado, interlocutor con decisión o acceso al decisor, y registro completo de las 8 preguntas del guion. No es una muestra probabilística: 30 casos con cuotas no permiten inferencia poblacional, solo descartar o sostener la hipótesis.",
     "unidad": "n° entrevistas válidas",
     "valor": 30
    },
    "n_min_observaciones_por_segmento": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "01-mercado §5",
     "nota": "Bajo 5 observaciones válidas el segmento no se extrapola ni entra al cálculo de SAM/SOM. Regla heredada de 01, no verificada estadísticamente.",
     "unidad": "n° observaciones",
     "valor": 5
    },
    "n_ofertas_monadicas": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "02-competencia §3, que prescribió prueba monádica",
     "nota": "Diseño monádico puro: cada entrevistado ve UNA sola oferta cerrada, asignada por rotación. Nunca se muestran los tres precios al mismo entrevistado ni se pregunta un precio abstracto.",
     "unidad": "n° puntos de precio",
     "valor": 3
    },
    "n_prospectos_lista": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "Diseño propio de esta etapa, consistente con 01-mercado §5",
     "nota": "Cuotas: 60 pubs/bares/cafeterías, 25 hoteles y hostales, 15 casinos y concesionarias, 10 food trucks, 10 minimarkets de servicentro. Los nombres NO se pudieron obtener en gabinete: SERNATUR (https://serviciosturisticos.sernatur.cl/) filtra por comuna pero no permite descarga masiva, y la nómina de patentes comerciales de Temuco no está publicada como archivo abierto. Se entrega el marco muestral, no la lista nominal.",
     "unidad": "n° cuentas nominales",
     "valor": 120
    },
    "oferta_monadica_factor_alto": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "depende_de": [
      "precios.precio_competencia_nacional_clp"
     ],
     "etapa": "03-validacion",
     "fuente": "Diseño propio de esta etapa",
     "nota": "Oferta C. Mide directamente el supuesto crítico del statement §7: si el canal acepta sobreprecio por 'local y flexible'. Si C convierte, el precio objetivo de 02 debe fijarse ahí y no en B.",
     "unidad": "multiplicador sobre precios.precio_competencia_nacional_clp",
     "valor": 1.15
    },
    "oferta_monadica_factor_bajo": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "depende_de": [
      "precios.precio_competencia_nacional_clp"
     ],
     "etapa": "03-validacion",
     "fuente": "Diseño propio de esta etapa",
     "nota": "Oferta A, piso de descarte. Si no hay pedido pagado ni a este precio, no existe negocio a ningún precio y la evaluación se detiene.",
     "unidad": "multiplicador sobre precios.precio_competencia_nacional_clp",
     "valor": 0.85
    },
    "oferta_monadica_factor_central": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "depende_de": [
      "precios.precio_competencia_nacional_clp"
     ],
     "etapa": "03-validacion",
     "fuente": "Diseño propio de esta etapa",
     "nota": "Oferta B, paridad con el ancla nacional. Es el punto que define el umbral ir/no-ir de precio.",
     "unidad": "multiplicador sobre precios.precio_competencia_nacional_clp",
     "valor": 1.0
    },
    "pedido_prueba_min_unidades": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "Formato de caja observado por 02-competencia (caja de 12 en oferta foodservice)",
     "nota": "Unidad mínima de conversión. Un pedido pagado de una caja es el único dato duro de la entrevista; un 'sí, me interesa' no cuenta. No prueba recompra.",
     "unidad": "unidades por pedido",
     "valor": 12
    },
    "plazo_terreno_dias": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "Diseño propio de esta etapa",
     "nota": "Ventana máxima del levantamiento. Más allá caducan las promociones retail que anclan el precio de la prueba monádica y rota el interlocutor en el canal. Es un límite de gestión, no una medición.",
     "unidad": "días corridos",
     "valor": 45
    },
    "resultados_terreno": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "03-validacion",
     "fuente": null,
     "nota": "Vacío deliberado. Ninguna entrevista fue realizada: esta etapa entrega el instrumento (marco muestral, guion de 8 preguntas, protocolo monádico y umbral ir/no-ir) y no resultados. Cualquier cifra aquí sin trabajo de terreno violaría la regla 7 del statement.",
     "unidad": "registro de entrevistas",
     "valor": null
    },
    "tasa_entrevista_sobre_lista_pct": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "Razón de diseño 30/120",
     "nota": "NO es una tasa de respuesta observada: es el cociente aritmético entre la lista y la cuota de entrevistas. Si en terreno la tasa efectiva resulta menor, se amplía la lista, nunca se baja la cuota de 30.",
     "unidad": "%",
     "valor": 25
    },
    "umbral_conversion_min_cuentas": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "Criterio de decisión fijado por esta etapa",
     "nota": "Expresión absoluta de umbral_conversion_pct sobre n_entrevistas_objetivo (20% de 30). Se exige además que las 6 no provengan de un solo segmento.",
     "unidad": "n° cuentas con pedido pagado",
     "valor": 6
    },
    "umbral_conversion_pct": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "Criterio de decisión fijado por esta etapa",
     "nota": "Conversión mínima de entrevistas válidas a pedido de prueba pagado para justificar comprometer el grueso de la inversión. Fundamento: bajo 20% (6 de 30) la base de cuentas ancla no alcanza para sostener una rampa comercial ni para diversificar el riesgo de perder una cuenta. Es un criterio declarado, no una tasa observada en ningún mercado.",
     "unidad": "%",
     "valor": 20
    },
    "umbral_plazo_cobro_max_dias": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "etapa": "03-validacion",
     "fuente": "https://registrodeacuerdos.economia.gob.cl/Normativa.aspx",
     "nota": "Plazo de cobro promedio ponderado máximo aceptable para seguir adelante. Fundamento legal: la Ley 21.131 fija 30 días corridos desde la recepción de la factura como regla supletoria, y todo plazo mayor debe inscribirse en el registro del Ministerio de Economía. Fundamento financiero: en E10 la cobranza se calcula como ingresos_año1 × plazo ÷ 365, de modo que cada 30 días de plazo pesan ~$10,7 millones de capital de trabajo sobre una restricción total de $50 millones. Es un umbral de decisión, no una medición de la práctica del canal.",
     "unidad": "días corridos",
     "valor": 30
    },
    "umbral_precio_piso_factor": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-05",
     "depende_de": [
      "precios.precio_competencia_nacional_clp"
     ],
     "etapa": "03-validacion",
     "fuente": "Criterio de decisión fijado por esta etapa",
     "nota": "Precio neto puesto en el local, formato familiar, bajo el cual NO se sigue adelante. Fundamento: el ancla de 02 es un precio PROMOCIONAL de retail, que ya incluye margen minorista; exigir paridad con él en venta mayorista equivale exactamente a testear el supuesto del statement §7 (sobreprecio por local y flexible). Salvedad: el ancla es promocional y por tanto inestable; debe re-anclarse en el precio B2B puesto en Temuco cuando 02 lo cotice.",
     "unidad": "multiplicador sobre precios.precio_competencia_nacional_clp",
     "valor": 1.0
    },
    "umbral_precio_piso_familiar_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "depende_de": [
      "precios.precio_competencia_nacional_clp"
     ],
     "etapa": "03-validacion",
     "fuente": null,
     "nota": "Fórmula: umbral_precio_piso_familiar_clp = validacion.umbral_precio_piso_factor × precios.precio_competencia_nacional_clp. No se calcula aquí para no copiar ni congelar un valor de 02, que sigue siendo ESTIMADO y basado en promoción.",
     "unidad": "CLP neto/unidad familiar",
     "valor": null
    }
   }
  },
  "casob": {
   "_lea_esto_primero": {
    "como_se_corre": "build_model(data, overrides={...}) con las rutas de 'overrides_modelo'. No modifica ningún archivo del caso base.",
    "consultado": "2026-08-06",
    "por_que_no_se_llama_parametros": "A propósito NO usa el prefijo 'parametros-' para que consolidar.py no lo funda en datos/supuestos.json. Es un caso paralelo, no una etapa del estudio base: mezclarlo corrompería el caso A.",
    "que_es": "CASO ALTERNATIVO B. Overlay de una lista concreta de activos y dos insumos, sobre la MISMA base del caso principal (mercado, competencia, local, legal, RRHH, comercial, precio de venta y volúmenes)."
   },
   "equipos": {
    "abatidor_ventus_3gn_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://lacasita.cl/producto/abatidor-de-temperatura-3-gn-1-1-ventus/",
     "nota": "Alternativa menor: 3 bandejas GN 1/1, 8 kg/ciclo de congelación. 3 pizzas/ciclo = 198/mes. No se usa en el caso B por ser aún más restrictivo.",
     "unidad": "CLP neto",
     "valor": 2739500
    },
    "abatidor_ventus_5gn_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://lacasita.cl/producto/abatidor-de-temperatura-5-gn-1-1-ventus/",
     "nota": "5 bandejas GN 1/1 (530×325 mm), separación 67 mm. Ficha: 12 kg/ciclo de +90 °C a −18 °C y 18 kg de +90 °C a +3 °C. No declara tiempo de ciclo. La geometría limita a 1 disco de 30 cm por bandeja, luego 5 pizzas/ciclo, muy por debajo de las ~27 que permitiría el peso.",
     "unidad": "CLP neto",
     "valor": 3907600
    },
    "amasadora_maigas_12kg_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://maigas.cl/amasadora-12-kg",
     "nota": "Modelo HS30, motor 2,2 HP / 1,7 kW, 220 V. Precio con 20% de descuento sobre $1.124.988. La página no declara si es neto o con IVA, y la ficha no aclara si los 12 kg son de harina o de masa total: la diferencia cambia el dimensionamiento del lote.",
     "unidad": "CLP, base no declarada",
     "valor": 899990
    },
    "congeladora_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "14-caso-b-activos",
     "fuente": null,
     "nota": "Aparece en la lista sin enlace ni precio. Es el equipo que efectivamente conserva a −18 °C y sin él la cadena de frío no cierra. El caso A cotizó un congelador de 500 L AISI 304 en $1.298.350 y estimó que hacen falta dos.",
     "unidad": "CLP",
     "valor": null
    },
    "horno_gastromaq_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://lacasita.cl/producto/horno-de-piso-electrico-1-camara-2-bandejas-40x60-gastromaq/",
     "nota": "1 cámara, 2 bandejas de 40×60 cm: 2 discos de 30 cm por bandeja, 4 por hornada. MEJOR que la cámara de 400×400 mm del caso A, que solo admite uno. La ficha no declara potencia ni voltaje, ambos necesarios para dimensionar el empalme.",
     "unidad": "CLP neto",
     "valor": 495800
    },
    "meson_inox_ventus_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://www.ventuscorp.cl/meson-de-trabajo-mural-c-repisa-infer-eco-wt-1800e-ventus/p?idsku=38",
     "nota": "180×60×85 cm, acero inoxidable 430 de 1,2 mm. Un solo mesón no cubre un flujo con separación de crudo y producto terminado que exige el DS 977.",
     "unidad": "CLP, base no declarada",
     "valor": 132990
    },
    "pala_pizza_racks_lavado_extraccion_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "14-caso-b-activos",
     "fuente": null,
     "nota": "Sin enlace ni precio. El caso A asignaba $1.200.000 a racks, bandejas e instrumentos y $1.800.000 a acero, lavado y extracción, ambas líneas auditadas como supuesto puro por la etapa 05.",
     "unidad": "CLP",
     "valor": null
    },
    "selladora_dz260_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://calvac.cl/venta/selladora-al-vacio-brother-dz260/",
     "nota": "NO SIRVE PARA ESTE PRODUCTO: cámara de vacío de 380×280×120 mm y barra de sellado de 260 mm, contra un disco de 300 mm que no entra por el lado corto. Mismo defecto que la etapa 05 detectó en la DZ300 del caso A, agravado.",
     "unidad": "CLP neto",
     "valor": 497980
    },
    "visi_cooler_lg100_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://www.ventuscorp.cl/visi-cooler-sobremesa-1-pta-100-lts-lg-100-ventus/p?idsku=318",
     "nota": "NO ES CONGELADOR: rango declarado 2 °C a 12 °C, 92 litros útiles. Es un enfriador de bebidas. El producto exige −18 °C en conservación.",
     "unidad": "CLP, base no declarada",
     "valor": 159990
    }
   },
   "insumos": {
    "harina_caputo_clp_kg": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://leefood.cl/harina-fuerza-00-pizzeria-caputo-25kg",
     "nota": "Saco de 25 kg a $57.990. Es 2,76 veces la harina pizzera de $840/kg que costeó la etapa 06. Sube el punto de equilibrio de 2.170 a 2.502 pizzas/mes. La página no declara si el precio es neto y anuncia solo 7 unidades en stock.",
     "unidad": "CLP/kg, base no declarada",
     "valor": 2319.6
    },
    "mozzarella_icb_clp_kg": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://www.icbfs.cl/catalogo/104500500",
     "nota": "El catálogo de ICB no entrega precio sin ejecutar JavaScript; la ficha devolvió página vacía. Es el mayor componente del costo variable —$840 de los $2.433 por pizza en el caso A— y no se sustituye por una estimación. Cerrar pidiendo lista de precios a ICB.",
     "unidad": "CLP/kg",
     "valor": null
    },
    "pepperoni_icb_clp_kg": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://www.icbfs.cl/catalogo/103001080",
     "nota": "Misma limitación. Además es un ingrediente que el caso A no costea por separado: entraría en 'otros ingredientes', hoy en $550/unidad como supuesto.",
     "unidad": "CLP/kg",
     "valor": null
    },
    "salsa_tomate_icb_clp_kg": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-06",
     "etapa": "14-caso-b-activos",
     "fuente": "https://www.icbfs.cl/catalogo/108004050",
     "nota": "Misma limitación de catálogo que la mozzarella.",
     "unidad": "CLP/kg",
     "valor": null
    }
   },
   "overrides_modelo": {
    "capex.equipamiento_base_clp": 6094350,
    "insumos.harina_clp_kg": 2319.6,
    "produccion.capacidad_instalada_pizzas_dia": 15
   },
   "resultado": {
    "_nota": "Calculado el 06-08-2026 con el motor de 10-financiero. Comparar contra el caso A: fondeo $125,5M, VAN −$91,8M, equilibrio 2.170/mes, 164% de la capacidad.",
    "capex_total_clp": 24400000,
    "equilibrio_pizzas_mes": 2502,
    "equilibrio_sobre_capacidad_pct": 758,
    "fondeo_maximo_clp": 240600000,
    "van_clp": -153500000
   }
  },
  "financial": {
   "inversion": {
    "abatidor_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://calvac.cl/venta/abatidor-10-bandejas-2/",
     "nota": "10 bandejas, congelación declarada hasta 30 kg; precio publicado + IVA.",
     "unidad": "CLP neto",
     "valor": 2779980
    },
    "acero_lavado_extraccion_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Mesones, lavaderos, campana y elementos fijos; cotización pendiente.",
     "unidad": "CLP neto",
     "valor": 1800000
    },
    "amasadora_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://www.supermaq.cl/amasadoras/amasadora_20_kilos/",
     "nota": "Amasadora espiral 20 kg, precio internet + IVA.",
     "unidad": "CLP neto",
     "valor": 747815
    },
    "congeladores_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://gastronomicareal.cl/refrigeracion/congeladoras",
     "nota": "Bolsa para almacenamiento −18 °C; requiere selección por capacidad y redundancia.",
     "unidad": "CLP neto",
     "valor": 700000
    },
    "contingencia_pct": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Reserva de estimación conceptual; no reemplaza cotizaciones.",
     "unidad": "% sobre equipos, instalación y habilitación",
     "valor": 15
    },
    "flete_instalacion_pct": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Flete Santiago–Temuco, conexión y puesta en marcha.",
     "unidad": "% sobre equipos",
     "valor": 15
    },
    "garantia_arriendo_meses": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Activo recuperable al final si no hay daños.",
     "unidad": "meses",
     "valor": 2
    },
    "habilitacion_sanitaria_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "07-local-habilitacion/index.html",
     "nota": "Riesgo principal; reemplazar por presupuesto desglosado de un local real.",
     "unidad": "CLP neto",
     "valor": 12000000
    },
    "horno_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://www.supermaq.cl/hornos_pizza/horno_electrico_pizzero_2_camara_40x40.pdf",
     "nota": "Horno pizzero eléctrico dos cámaras, oferta + IVA; verificar capacidad real de precocción.",
     "unidad": "CLP neto",
     "valor": 400000
    },
    "meson_refrigerado_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://www.industriaminera.cl/producto/biggi-chile-sa-mesones-refrigerados/",
     "nota": "Mesón 120 cm publicado + IVA; confirmar vigencia.",
     "unidad": "CLP neto",
     "valor": 620000
    },
    "preoperacion_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Pruebas, capacitación, muestras y apertura.",
     "unidad": "CLP neto",
     "valor": 1500000
    },
    "racks_bandejas_instrumentos_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Carros, bandejas, balanzas, sondas y utensilios.",
     "unidad": "CLP neto",
     "valor": 1200000
    },
    "selladora_vacio_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://www.supermaq.cl/pdf/camara.cl_selladora_al_vacio_300_mm_dz300.pdf",
     "nota": "Ficha con precio publicado; confirmar vigencia y compatibilidad con formato.",
     "unidad": "CLP neto",
     "valor": 570000
    },
    "tramites_analisis_rotulado_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "08-legal-normativo/index.html",
     "nota": "Aranceles, laboratorio y artes; cotización pendiente.",
     "unidad": "CLP neto",
     "valor": 1000000
    },
    "valor_residual_pct": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Valor de realización al año 5 antes de impuesto.",
     "unidad": "% del CAPEX depreciable",
     "valor": 10
    },
    "vida_depreciable_anios": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://www.sii.cl/valores_y_fechas/tabla_vida_util_activo_inmovilizado.html",
     "nota": "Simplificación financiera; validar categoría y depreciación tributaria por activo.",
     "unidad": "años lineales",
     "valor": 5
    }
   },
   "modelo": {
    "horizonte_anios": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "datos/supuestos.json#meta.horizonte_evaluacion_anios",
     "nota": "Horizonte fijado en el statement.",
     "unidad": "años",
     "valor": 5
    },
    "impuesto_ano1_pct": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://www.sii.cl/normativa_legislacion/circulares/2025/circu53.pdf",
     "nota": "Aplica si la empresa califica al régimen Pro Pyme General del art. 14 D N°3.",
     "unidad": "% IDPC Pro Pyme año comercial 2027",
     "valor": 12.5
    },
    "impuesto_ano2_pct": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-06",
     "etapa": "10-financiero",
     "fuente": "https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_4708.htm",
     "nota": "Año comercial 2027. La tabla de tasas IDPC del SII muestra 12,5% para los años comerciales 2025, 2026 y 2027 bajo el art. 14 D N°3 (rebaja de la Ley 21.755, art. vigésimo quinto). Corrige el 15% anterior, que adelantaba un año la escala.",
     "unidad": "% IDPC Pro Pyme año comercial 2028",
     "valor": 12.5
    },
    "impuesto_ano3_pct": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "10-financiero",
     "fuente": "https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_4708.htm",
     "nota": "Año comercial 2028. Corrige el 25% anterior, que contradecía su propia nota: ésta decía que el 25% rige desde 2029, pero se aplicaba al año 3, que es 2028.",
     "unidad": "% IDPC permanente",
     "valor": 15
    },
    "impuesto_ano4_pct": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "10-financiero",
     "fuente": "https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_4708.htm",
     "nota": "Año comercial 2029: tasa permanente del régimen. Supone permanencia normativa.",
     "unidad": "% IDPC permanente",
     "valor": 25
    },
    "impuesto_ano5_pct": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-06",
     "etapa": "10-financiero",
     "fuente": "https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_4708.htm",
     "nota": "Año comercial 2030: tasa permanente del régimen. Supone permanencia normativa.",
     "unidad": "% IDPC permanente",
     "valor": 25
    },
    "inflacion_anual_pct": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://www.bcentral.cl/documents/33528/8413153/IPoM%2Bjunio%2B2026.pdf/93388589-0929-4ad6-b166-10981ca34946",
     "nota": "IPoM junio 2026 ubica expectativas a uno y dos años en torno a 3%. Se escala precio y costos simétricamente.",
     "unidad": "% anual desde año 2",
     "valor": 3
    },
    "precio_b2b_familiar_base_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "02-competencia/index.html",
     "nota": "Se usa solo porque el parámetro de etapa 02 está pendiente. Está entre PF retail neto ($3.017) y foodservice publicado ($5.034); no representa disposición a pagar validada.",
     "unidad": "CLP neto/unidad en pesos base 2026",
     "valor": 4200
    },
    "tasa_descuento_nominal_pct": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://www.bcentral.cl/es/areas/politica-monetaria",
     "nota": "TMAR nominal para capital propio: TPM observada 4,5% más 10,5 puntos por riesgo comercial, escala, iliquidez y concentración. Debe sustituirse por costo de oportunidad del titular.",
     "unidad": "% anual",
     "valor": 15
    },
    "volumen_ano1_unidades": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "01-mercado/index.html",
     "nota": "2.500 unidades/mes. Sustituir por mercado.som_ano1_pizzas_mes × 12 cuando etapa 03 lo valide.",
     "unidad": "pizzas/año",
     "valor": 30000
    },
    "volumen_ano2_unidades": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Rampa comercial no validada.",
     "unidad": "pizzas/año",
     "valor": 42000
    },
    "volumen_ano3_unidades": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Rampa comercial no validada.",
     "unidad": "pizzas/año",
     "valor": 54000
    },
    "volumen_ano4_unidades": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Rampa comercial no validada.",
     "unidad": "pizzas/año",
     "valor": 66000
    },
    "volumen_ano5_unidades": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Rampa comercial no validada.",
     "unidad": "pizzas/año",
     "valor": 72000
    }
   },
   "operacion": {
    "administracion_mensual_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Contabilidad, software básico, telefonía y gastos bancarios.",
     "unidad": "CLP/mes",
     "valor": 160000
    },
    "dias_cuentas_cobrar": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "datos/parametros-02-competencia.json#precios.plazo_cobro_dias",
     "nota": "Fallback consistente con el modelo de negocio; debe sustituirse por práctica validada.",
     "unidad": "días",
     "valor": 30
    },
    "dias_cuentas_pagar": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Caso conservador sin crédito de proveedores.",
     "unidad": "días de costo variable",
     "valor": 0
    },
    "dias_inventario": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Materia prima más producto terminado.",
     "unidad": "días de costo variable",
     "valor": 15
    },
    "factor_costo_empresa": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "datos/supuestos.json#macro.factor_costo_empresa",
     "nota": "Fallback dentro del rango preliminar declarado; requiere cálculo previsional de etapa 09.",
     "unidad": "multiplicador",
     "valor": 1.22
    },
    "mantenimiento_mensual_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Reserva preventiva; validar con equipos elegidos.",
     "unidad": "CLP/mes",
     "valor": 100000
    },
    "nomina_bruta_mensual_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "datos/supuestos.json#macro.ingreso_minimo_mensual_clp",
     "nota": "Incluye costo de oportunidad del trabajo del titular y apoyo productivo/comercial; etapa 09 debe reemplazarlo.",
     "unidad": "CLP/mes",
     "valor": 2200000
    },
    "seguros_mensual_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Cotización pendiente.",
     "unidad": "CLP/mes",
     "valor": 60000
    },
    "servicios_fijos_mensual_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Cargo fijo de electricidad, agua, gas, internet y residuos, separado del consumo variable.",
     "unidad": "CLP/mes",
     "valor": 180000
    },
    "superficie_m2": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "07-local-habilitacion/index.html",
     "nota": "Fallback hasta layout de etapa 04.",
     "unidad": "m²",
     "valor": 120
    },
    "ventas_mensual_clp": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Muestras, visitas y material comercial.",
     "unidad": "CLP/mes",
     "valor": 180000
    }
   },
   "produccion": {
    "costo_maquila_clp_unidad": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "10-financiero",
     "fuente": null,
     "nota": "No existe tarifa pública de maquila de pizza congelada en Chile. El modelo no la supone: entrega el COSTO MÁXIMO ADMISIBLE por bisección sobre el fondeo máximo — $810/pizza contra el techo de $50.000.000 y $560/pizza contra el de $30.000.000. La clave existe para recibir una cotización real; hasta entonces la vía de maquila se evalúa por su umbral, no por su costo.",
     "unidad": "CLP neto/pizza, sobrecosto variable sobre insumos",
     "valor": null
    }
   },
   "producto": {
    "distribucion_variable_clp_unidad": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Despacho consolidado local sin vehículo propio; cotizar por ruta.",
     "unidad": "CLP/pizza",
     "valor": 220
    },
    "energia_variable_clp_unidad": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "https://calvac.cl/venta/abatidor-10-bandejas-2/",
     "nota": "Bolsa de costo para horno, abatimiento y congelación. Debe reemplazarse por balance kWh/ciclo y tarifa contratada.",
     "unidad": "CLP/pizza",
     "valor": 120
    },
    "envase_clp_unidad": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "06-insumos/index.html",
     "nota": "Fallback hasta que etapa 06 cierre film, etiqueta y caja máster.",
     "unidad": "CLP neto/pizza",
     "valor": 300
    },
    "harina_kg_unidad": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Debe sustituirse por formulación de etapa 04.",
     "unidad": "kg/pizza",
     "valor": 0.2
    },
    "merma_pct": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Sustituir por pruebas de proceso.",
     "unidad": "% de ingredientes",
     "valor": 5
    },
    "mozzarella_kg_unidad": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Principal driver de costo; validar rendimiento y gramaje.",
     "unidad": "kg/pizza",
     "valor": 0.12
    },
    "otros_ingredientes_clp_unidad": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Aceite, levadura, sal, especias y topping; pendiente de receta y cotización.",
     "unidad": "CLP neto/pizza",
     "valor": 550
    },
    "salsa_kg_unidad": {
     "confianza": "SUPUESTO",
     "consultado": "2026-08-04",
     "etapa": "10-financiero",
     "fuente": "Etapa 10",
     "nota": "Debe sustituirse por formulación de etapa 04.",
     "unidad": "kg/pizza",
     "valor": 0.08
    }
   }
  },
  "gates": {
   "gates": [
    {
     "criterio_de_salida": "Los datos se registran con fuente, fecha, segmento y evidencia de compra; se recalcula el caso base sin fallbacks de demanda, precio ni cobranza.",
     "estado": "ABIERTO",
     "evidencia_requerida": "30 entrevistas válidas, pedidos piloto pagados, recompra a 60 días, precio aceptado y plazo de pago ponderado por volumen.",
     "id": "G1-mercado",
     "parametros_a_cerrar": [
      "mercado.som_ano1_pizzas_mes",
      "precios.precio_venta_b2b_familiar_clp",
      "precios.plazo_cobro_dias"
     ],
     "responsable": "Responsable comercial"
    },
    {
     "criterio_de_salida": "La capacidad demostrada se compara con el punto de equilibrio y cumple las condiciones sanitarias definidas por el dossier.",
     "estado": "ABIERTO",
     "evidencia_requerida": "Tres lotes piloto con registro de peso, merma, tiempo de abatimiento, temperatura de centro térmico y capacidad por jornada.",
     "id": "G2-operacion",
     "parametros_a_cerrar": [
      "produccion.merma_pct",
      "produccion.ciclo_abatimiento_min",
      "produccion.capacidad_instalada_pizzas_dia"
     ],
     "responsable": "Responsable de operaciones"
    },
    {
     "criterio_de_salida": "Cada cotización incluye alcance, moneda, impuestos, vigencia, volumen, flete y condiciones de pago; el modelo usa una alternativa seleccionada y conserva las comparables.",
     "estado": "ABIERTO",
     "evidencia_requerida": "Cotizaciones comparables y vigentes de insumos, envase, maquila, distribución, seguro, arriendo y habilitación; dos alternativas cuando el mercado lo permita.",
     "id": "G3-costos-y-ruta",
     "parametros_a_cerrar": [
      "insumos.mozzarella_clp_kg",
      "insumos.envase_clp_unidad",
      "local.arriendo_mensual_clp",
      "local.habilitacion_sanitaria_clp",
      "produccion.costo_maquila_clp_unidad"
     ],
     "responsable": "Responsable de abastecimiento"
    },
    {
     "criterio_de_salida": "Emitir una sola resolución: aprobar maquila, aprobar una planta rediseñada o rechazar/postergar. No se aprueba una ruta con datos críticos pendientes.",
     "estado": "BLOQUEADO_POR_G1_G3",
     "evidencia_requerida": "Modelo reconciliado, régimen tributario confirmado, fuente de fondos documentada y una configuración operativa única.",
     "id": "G4-decision",
     "parametros_a_cerrar": [
      "escenario.aprobado",
      "capital.requerido_clp",
      "financiamiento.fuente_confirmada"
     ],
     "responsable": "Titular del proyecto con contador"
    }
   ],
   "meta": {
    "estado_global": "VALIDACION_PENDIENTE",
    "fecha_corte": "2026-08-06",
    "proposito": "Registro operativo de lo que falta para transformar la investigación pública en una decisión de inversión.",
    "regla": "Un gate se cierra solo con evidencia fechada y enlazada al parámetro dueño; una estimación no sustituye evidencia de terreno o una cotización vigente."
   }
  },
  "inputs": {
   "insumos": {
    "costo_mp_unidad_familiar_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "06-insumos",
     "fuente": null,
     "nota": "Requiere formulación y gramajes de etapa 04.",
     "unidad": "CLP/unidad",
     "valor": null
    },
    "costo_mp_unidad_individual_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "06-insumos",
     "fuente": null,
     "nota": "Requiere formulación y gramajes de etapa 04.",
     "unidad": "CLP/unidad",
     "valor": null
    },
    "envase_clp_unidad": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-04",
     "etapa": "06-insumos",
     "fuente": "https://chileenvases.com/tienda/",
     "nota": "Hay precios públicos de cajas, pero no puede definirse film, bandeja, etiqueta y caja prorrateada sin formato y especificación de barrera de etapa 04.",
     "unidad": "CLP neto/unidad",
     "valor": null
    },
    "harina_clp_kg": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "06-insumos",
     "fuente": "https://metafood.cl/REV10100_Harina_Pizza",
     "nota": "Saco de harina para pizza 25 kg publicado a $21.000 + IVA. Falta confirmar flete y disponibilidad en Temuco.",
     "unidad": "CLP neto/kg",
     "valor": 840
    },
    "mozzarella_clp_kg": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "06-insumos",
     "fuente": "https://www.mercadolibre.cl/queso-mozzarella-barra-35-kg-aprox-molfino-argentino/up/MLCU67695246",
     "nota": "Publicación de vendedor de Temuco a $10.000/kg IVA incluido, con factura y reparto refrigerado; normalizado /1,19. No es cotización por volumen ni demuestra suministro estable.",
     "unidad": "CLP neto/kg",
     "valor": 8403.36
    },
    "salsa_tomate_clp_kg": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "06-insumos",
     "fuente": "https://metafood.cl/REV10130_Tomate_Pelado_Lata_Bolsa",
     "nota": "Tomate pelado bolsa 5 kg a $11.919 + IVA. Es insumo para formular salsa, no salsa terminada; falta flete a Temuco.",
     "unidad": "CLP neto/kg",
     "valor": 2383.8
    }
   }
  },
  "legal": {
   "capex": {
    "arancel_sanitario_base_max_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "08-legal-normativo",
     "fuente": "https://www.chileatiende.gob.cl/fichas/172-autorizacion-sanitaria-de-alimentos",
     "nota": "Extremo superior publicado; confirmar clasificación y arancel exacto en SEREMI en Línea.",
     "unidad": "CLP, antes del 0,5% del capital",
     "valor": 899700
    },
    "arancel_sanitario_base_min_clp": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "08-legal-normativo",
     "fuente": "https://www.chileatiende.gob.cl/fichas/172-autorizacion-sanitaria-de-alimentos",
     "nota": "Extremo inferior publicado; no se presume que sea la categoría aplicable a la planta.",
     "unidad": "CLP, antes del 0,5% del capital",
     "valor": 12100
    },
    "firma_notarial_res_uf": {
     "confianza": "VERIFICADO",
     "consultado": "2026-08-04",
     "etapa": "08-legal-normativo",
     "fuente": "https://www.registrodeempresasysociedades.cl/AyudaTarifasNotariasles.aspx",
     "nota": "Solo aplica si no se firma con FEA propia; el acto en el Registro de Empresas y Sociedades es gratuito.",
     "unidad": "UF por actuación",
     "valor": 0.26
    },
    "tramites_y_constitucion_clp": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-04",
     "etapa": "08-legal-normativo",
     "fuente": "https://www.chileatiende.gob.cl/fichas/172-autorizacion-sanitaria-de-alimentos ; https://www.registrodeempresasysociedades.cl/AyudaTarifasNotariasles.aspx ; https://transparencia.temuco.cl/h_tramites/FinanzasOK.htm",
     "nota": "No se suma todavía: autorización sanitaria varía entre $12.100 y $899.700 más 0,5% del capital declarado; patente depende de capital/UTM; análisis, rotulado y GS1 requieren cotización.",
     "unidad": "CLP",
     "valor": null
    }
   }
  },
  "local": {
   "local": {
    "arriendo_clp_m2_mes": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "07-local-habilitacion",
     "fuente": "https://chilepropiedades.cl/ver-publicacion/arriendo-mensual/temuco/bodega/bodega-nueva-de-1-500-m2-acceso-norte-de-tco-162267/117714745 ; https://propiedades.bmi.cl/6057",
     "nota": "Punto medio entre avisos industriales de 0,15 y 0,16 UF/m²/mes, convertido con UF base $40.844,79. Son bodegas mayores; no prueba precio de un local alimentario pequeño.",
     "unidad": "CLP/m²/mes",
     "valor": 6331
    },
    "arriendo_mensual_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "07-local-habilitacion",
     "fuente": null,
     "nota": "Depende del metraje, gastos comunes y de encontrar un inmueble compatible con uso de suelo y habilitación sanitaria.",
     "unidad": "CLP/mes",
     "valor": null
    },
    "habilitacion_sanitaria_clp": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-04",
     "etapa": "07-local-habilitacion",
     "fuente": "https://www.chileatiende.gob.cl/fichas/172-autorizacion-sanitaria-de-alimentos",
     "nota": "El arancel de autorización no aproxima obras. Requiere visita técnica y presupuesto para pisos, muros, agua, drenajes, extracción, electricidad y separación de zonas.",
     "unidad": "CLP",
     "valor": null
    },
    "potencia_electrica_kw": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "05-maquinaria",
     "fuente": null,
     "nota": "Se conserva la responsabilidad de etapa 05; verificar empalme trifásico en cada candidato.",
     "unidad": "kW",
     "valor": null
    },
    "superficie_requerida_m2": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "07-local-habilitacion",
     "fuente": null,
     "nota": "Debe salir del layout y capacidad de etapa 04; no se inventa un metraje antes de definir flujo y equipos.",
     "unidad": "m²",
     "valor": null
    }
   }
  },
  "market": {
   "mercado": {
    "establecimientos_horeca_anillo1": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "01-mercado",
     "fuente": "https://www.sii.cl/sobre_el_sii/estadisticas_de_empresas.html",
     "nota": "Suma 2024 para Villarrica, Pucón, Angol, Victoria y Nueva Imperial con la misma taxonomía del núcleo. No incluye minimarkets porque el código SII no permite aislar estaciones de servicio.",
     "unidad": "n° empresas (universo tributario amplio)",
     "valor": 1588
    },
    "establecimientos_horeca_temuco": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "01-mercado",
     "fuente": "https://www.sii.cl/sobre_el_sii/estadisticas_de_empresas.html",
     "nota": "Suma 2024 para Temuco y Padre Las Casas de actividades SII 551001, 551003, 551009, 561000, 562900, 563001 y 563009. Es un techo de prospección: incluye restaurantes/pizzerías y empresas sin encaje; no equivale a compradores potenciales validados.",
     "unidad": "n° empresas (universo tributario amplio)",
     "valor": 1187
    },
    "indice_estacionalidad": {
     "confianza": "PENDIENTE",
     "consultado": "2026-08-04",
     "etapa": "01-mercado",
     "fuente": "https://regiones.ine.gob.cl/araucania/estadisticas-regionales/economia/comercio-servicios-y-turismo/actividad-del-turismo",
     "nota": "INE confirma variación mensual del turismo regional, pero no permite convertirla en estacionalidad de compra de pizza HORECA sin datos de clientes.",
     "unidad": "índice mensual, base 100 = promedio",
     "valor": null
    },
    "sam_pizzas_mes": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "01-mercado",
     "fuente": null,
     "nota": "Requiere cribar el universo nominal y medir consumo por segmento mediante entrevistas.",
     "unidad": "unidades/mes",
     "valor": null
    },
    "som_ano1_pizzas_mes": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "01-mercado",
     "fuente": null,
     "nota": "Se define después de validación comercial, tasa de conversión y capacidad de reparto.",
     "unidad": "unidades/mes",
     "valor": null
    }
   }
  },
  "prices": {
   "precios": {
    "plazo_cobro_dias": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "02-competencia",
     "fuente": null,
     "nota": "No se encontró una fuente pública que establezca la práctica de pago HORECA local. Preguntar por segmento y tamaño de cuenta.",
     "unidad": "días",
     "valor": null
    },
    "precio_competencia_nacional_clp": {
     "confianza": "ESTIMADO",
     "consultado": "2026-08-04",
     "etapa": "02-competencia",
     "fuente": "https://super.eltit.cl/search?product_types=pizzas-congeladas&q=",
     "nota": "Precio regional publicado $3.590 IVA incluido dividido por 1,19. Es promoción retail, no tarifa B2B ni precio permanente.",
     "unidad": "CLP neto/unidad familiar PF 430–465 g",
     "valor": 3016.81
    },
    "precio_venta_b2b_familiar_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "02-competencia",
     "fuente": null,
     "nota": "Validar con ofertas reales y entrevistas de etapa 03.",
     "unidad": "CLP neto/unidad",
     "valor": null
    },
    "precio_venta_b2b_individual_clp": {
     "confianza": "PENDIENTE",
     "consultado": null,
     "etapa": "02-competencia",
     "fuente": null,
     "nota": "El retail neto observado no sustituye disposición a pagar B2B ni precio puesto en el local.",
     "unidad": "CLP neto/unidad",
     "valor": null
    }
   }
  }
 },
 "fecha": "2026-08-06",
 "huella": "005f5e9f6204883f"
};
