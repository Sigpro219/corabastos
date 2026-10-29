import {
  CommunalEnergyMeter,
  CommunalWaterMeter,
  ErpModuleExpansionRing,
  LocalUnitRecord,
  MasterReceiptsConfig,
} from "@/contracts/domain-contracts";

export interface CommunalHierarchyBreakdown {
  id: string;
  codigo: string;
  bodegaId: string;
  tipo: string;
  contadorSerie: string;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoBruto: number;
  hijosCount: number;
  hijosCodigos: string[];
  consumoHijosDescontado: number;
  consumoNetoComunal: number;
  consumoAnterior: number;
  variacionPct: number;
  areaComunalM2: number;
  factorPorM2: number;
  observacion: string;
  alertaDesviacion: boolean;
}

export interface ComputedLocalLiquidation extends LocalUnitRecord {
  calcEnergiaCop: number;
  calcAcueductoCop: number;
  calcAseoCop: number;
  calcResiduosCop: number;
  calcVigilanciaCop: number;
  calcPoliciaCop: number;
  calcTotalCop: number;
  calcAssumedCorporationCop: number;
  variacionTotalPct: number;
}

/**
 * Desacoplo Automático Padre-Hijo para Macromedidores Comunales (Energía y Agua).
 * Elimina las fórmulas manuales del Excel que restaban celda por celda (-F309-F310...).
 */
export function computeEnergyCommunalHierarchy(
  meters: CommunalEnergyMeter[],
  localesByCode: Map<string, LocalUnitRecord>
): CommunalHierarchyBreakdown[] {
  return meters.map((m) => {
    const bruto = Math.max(0, m.lecturaActual - m.lecturaAnterior);
    let sumaHijos = 0;
    for (const code of m.hijosContadorCodigos) {
      const child = localesByCode.get(code);
      if (child) {
        sumaHijos += Math.max(0, child.energiaConsumoIndivKw);
      }
    }
    const neto = m.hijosContadorCodigos.length > 0 ? Math.max(0, bruto - sumaHijos) : m.consumoNetoKw;
    const variacionPct = m.consumoAnteriorKw > 0 ? neto / m.consumoAnteriorKw - 1 : 0;
    const factorPorM2 = m.areaM2 > 0 ? neto / m.areaM2 : 0;

    return {
      id: m.id,
      codigo: m.codigo,
      bodegaId: m.bodegaId,
      tipo: m.tipo,
      contadorSerie: m.contadorSerie,
      lecturaAnterior: m.lecturaAnterior,
      lecturaActual: m.lecturaActual,
      consumoBruto: Number(bruto.toFixed(2)),
      hijosCount: m.hijosContadorCodigos.length,
      hijosCodigos: m.hijosContadorCodigos,
      consumoHijosDescontado: Number(sumaHijos.toFixed(2)),
      consumoNetoComunal: Number(neto.toFixed(2)),
      consumoAnterior: m.consumoAnteriorKw,
      variacionPct: Number(variacionPct.toFixed(4)),
      areaComunalM2: m.areaM2,
      factorPorM2: Number(factorPorM2.toFixed(6)),
      observacion: m.observacion,
      alertaDesviacion: Math.abs(variacionPct) > 0.25 || m.observacion.includes("DETENIDO") || m.observacion.includes("RETIRADO"),
    };
  });
}

export function computeWaterCommunalHierarchy(
  meters: CommunalWaterMeter[],
  localesByCode: Map<string, LocalUnitRecord>
): CommunalHierarchyBreakdown[] {
  return meters.map((m) => {
    const bruto = Math.max(0, m.lecturaActual - m.lecturaAnterior);
    let sumaHijos = 0;
    for (const code of m.hijosContadorCodigos) {
      const child = localesByCode.get(code);
      if (child) {
        sumaHijos += Math.max(0, child.aguaConsumoIndivM3);
      }
    }
    const neto = m.hijosContadorCodigos.length > 0 ? Math.max(0, bruto - sumaHijos) : m.consumoNetoM3;
    const variacionPct = m.consumoAnteriorM3 > 0 ? neto / m.consumoAnteriorM3 - 1 : 0;
    const factorPorM2 = m.areaM2 > 0 ? neto / m.areaM2 : 0;

    return {
      id: m.id,
      codigo: m.codigo,
      bodegaId: m.bodegaId,
      tipo: "ACUEDUCTO COMUNAL",
      contadorSerie: m.contadorSerie,
      lecturaAnterior: m.lecturaAnterior,
      lecturaActual: m.lecturaActual,
      consumoBruto: Number(bruto.toFixed(2)),
      hijosCount: m.hijosContadorCodigos.length,
      hijosCodigos: m.hijosContadorCodigos,
      consumoHijosDescontado: Number(sumaHijos.toFixed(2)),
      consumoNetoComunal: Number(neto.toFixed(2)),
      consumoAnterior: m.consumoAnteriorM3,
      variacionPct: Number(variacionPct.toFixed(4)),
      areaComunalM2: m.areaM2,
      factorPorM2: Number(factorPorM2.toFixed(6)),
      observacion: m.observacion,
      alertaDesviacion: Math.abs(variacionPct) > 0.25 || m.observacion.includes("TAPADO") || m.observacion.includes("REVISAR"),
    };
  });
}

/**
 * Recalcula dinámicamente la liquidación de los 5.318 locales ante cambios en:
 * - Lecturas de medidores individuales en terreno (conmutando a prorrateo por m² si el contador está defectuoso, Art. 46)
 * - Tarifas o montos de los recibos maestros según las fórmulas exactas del Reglamento Interno (Directiva de Gerencia No. 033-06)
 */
export function recalculateAllLocales(
  locales: LocalUnitRecord[],
  receipts: MasterReceiptsConfig
): ComputedLocalLiquidation[] {
  // Factores y Tarifas Oficiales del Reglamento Interno (Art. 46)
  const baseKwhTariff = 720.48;
  const currentKwhTariff = receipts.energia.tarifaKwh;
  const isKwhModified = Math.abs(currentKwhTariff - baseKwhTariff) > 0.001;

  const baseM3Tariff = 10921.4494;
  const currentM3Tariff = receipts.acueducto.tarifaM3;
  const isM3Modified = Math.abs(currentM3Tariff - baseM3Tariff) > 0.001;

  const tarifaAlumbradoM2 =
    receipts.energia.alumbradoGeneral.areaTotalM2 > 0
      ? receipts.energia.alumbradoGeneral.bolsaTotal / receipts.energia.alumbradoGeneral.areaTotalM2
      : receipts.energia.alumbradoGeneral.tarifaPorM2;

  const tarifaProrrateoEnergiaM2 =
    receipts.energia.principal.areaProrrateoM2 > 0
      ? receipts.energia.principal.bolsaProrrateo / receipts.energia.principal.areaProrrateoM2
      : 10548.66;

  const topeMinimaEnergia = receipts.energia.principal.topeMinimaCop;

  const tarifaAguaComunalM2 =
    receipts.acueducto.areaComunalGeneralM2 > 0
      ? receipts.acueducto.bolsaAguaComunalGeneral / receipts.acueducto.areaComunalGeneralM2
      : 198.2038;

  const tarifaAguaProrrateoM2 =
    receipts.acueducto.areaProrrateoM2 > 0
      ? receipts.acueducto.bolsaProrrateo / receipts.acueducto.areaProrrateoM2
      : 1249.4436;

  const tarifaAseoM2 =
    receipts.expensas.aseo.areaTotalM2 > 0
      ? receipts.expensas.aseo.valorNetoDistribuir / receipts.expensas.aseo.areaTotalM2
      : receipts.expensas.aseo.tarifaPorM2;

  const tarifaVigilanciaM2 =
    receipts.expensas.vigilancia.areaTotalM2 > 0
      ? receipts.expensas.vigilancia.valorNetoDistribuir / receipts.expensas.vigilancia.areaTotalM2
      : receipts.expensas.vigilancia.tarifaPorM2;

  const cuotaPolicia =
    receipts.expensas.policia.localesActivosDivisor > 0
      ? receipts.expensas.policia.valorFactura / receipts.expensas.policia.localesActivosDivisor
      : receipts.expensas.policia.cuotaFijaPorLocal;

  // Residuos ECSA factors (NP = 0.4, MP = 1.2, P = remainder) - PGIRS Art. 42 y 43
  const resCfg = receipts.expensas.residuosEcsa;
  const tarifaBaseResiduosM2 =
    resCfg.areaTotalProrrateoM2 > 0
      ? resCfg.valorNetoProrratear / resCfg.areaTotalProrrateoM2
      : resCfg.tarifaBaseM2;
  const tarifaNpM2 = tarifaBaseResiduosM2 * resCfg.factorNP;
  const tarifaMpM2 = tarifaBaseResiduosM2 * resCfg.factorMP;
  const totalNp = resCfg.areaNpM2 * tarifaNpM2;
  const totalMp = resCfg.areaMpM2 * tarifaMpM2;
  const bolsaP = Math.max(0, resCfg.valorNetoProrratear - totalNp - totalMp);
  const tarifaPM2 = resCfg.areaPM2 > 0 ? bolsaP / resCfg.areaPM2 : resCfg.tarifaEfectivaPM2;

  return locales.map((loc) => {
    // -------------------------------------------------------------
    // 1. ENERGÍA ELÉCTRICA (Reglamento Interno Art. 46)
    // Fórmula: (Consumo kWh * Tarifa kWh) + (Alumbrado Comunal m²) + (20% Sobrecosto CREG 079/97)
    // Excepción reglamentaria: Si el contador está defectuoso o detenido, liquidación a prorrata de área.
    // -------------------------------------------------------------
    let calcEnergiaCop = loc.energiaBpCop + loc.energiaPrincipalCop;
    const divisorEnergia = Math.max(1, loc.energiaDivisorContador || 1);
    const computedIndivKw =
      loc.estadoOcupacion === "VACIO_CON_CONTRATO"
        ? 0
        : loc.modalidadEnergia === "CONTADOR"
        ? Math.max(0, loc.energiaLecturaAct - loc.energiaLecturaAnt) / divisorEnergia
        : loc.energiaConsumoIndivKw;

    const isMeterDefective =
      loc.energiaObs.includes("DETENIDO") ||
      loc.energiaObs.includes("DEFECTUOSO") ||
      loc.energiaObs.includes("RETIRADO");

    const readingChanged =
      Boolean(loc.energiaTareaEstado) ||
      (loc.modalidadEnergia === "CONTADOR" &&
        Math.abs(computedIndivKw - loc.energiaConsumoIndivKw) > 0.01);

    if (loc.estadoOcupacion === "VACIO_CON_CONTRATO") {
      // Mandato SDD §3.7 Caso 2: Local vacío/cerrado CON contrato vigente (consumo individual 0, paga mínima + comunales m² + CREG)
      const topeMin =
        loc.bloqueEnergia === "BODEGA_POPULAR"
          ? receipts.energia.bodegaPopular.topeMinimaCop
          : topeMinimaEnergia;
      const comunalKw = loc.energiaConsumoAleroKw + loc.energiaConsumoComunalKw;
      const baseConsumo = Math.max(topeMin, comunalKw * currentKwhTariff);
      const alumbrado = loc.areaM2 * tarifaAlumbradoM2;
      const cregRate =
        loc.bloqueEnergia === "BODEGA_POPULAR"
          ? receipts.energia.bodegaPopular.tasaCregPct || 0.157
          : 0.2;
      calcEnergiaCop = Math.round((baseConsumo + alumbrado) * (1 + cregRate));
    } else if (isMeterDefective && loc.modalidadEnergia === "CONTADOR") {
      // Mandato legal Art. 46: Liquidación por área arrendada a prorrata
      calcEnergiaCop = Math.round(loc.areaM2 * tarifaProrrateoEnergiaM2);
    } else if (readingChanged || isKwhModified) {
      if (loc.modalidadEnergia === "CONTADOR" && loc.bloqueEnergia === "PRINCIPAL") {
        const totalKw = computedIndivKw + loc.energiaConsumoAleroKw + loc.energiaConsumoComunalKw;
        const costoConsumo = Math.max(topeMinimaEnergia, totalKw * currentKwhTariff);
        const alumbrado = loc.areaM2 * tarifaAlumbradoM2;
        const creg = (costoConsumo + alumbrado) * 0.2;
        calcEnergiaCop = Math.round(costoConsumo + alumbrado + creg);
      } else if (loc.modalidadEnergia === "CONTADOR" && loc.bloqueEnergia === "BODEGA_POPULAR") {
        const totalKw = computedIndivKw + loc.energiaConsumoComunalKw;
        const costoConsumo = Math.max(
          receipts.energia.bodegaPopular.topeMinimaCop,
          totalKw * currentKwhTariff
        );
        const alumbrado = loc.areaM2 * tarifaAlumbradoM2;
        const creg =
          (costoConsumo + alumbrado) * (receipts.energia.bodegaPopular.tasaCregPct || 0.157);
        calcEnergiaCop = Math.round(costoConsumo + alumbrado + creg);
      } else {
        calcEnergiaCop = Math.round(calcEnergiaCop * (currentKwhTariff / baseKwhTariff));
      }
    }

    // -------------------------------------------------------------
    // 2. ACUEDUCTO Y ALCANTARILLADO (Reglamento Interno Art. 46)
    // -------------------------------------------------------------
    let calcAcueductoCop = loc.acueductoCop;
    const divisorAgua = Math.max(1, loc.aguaDivisorContador || 1);
    const computedIndivM3 =
      loc.estadoOcupacion === "VACIO_CON_CONTRATO"
        ? 0
        : loc.modalidadAcueducto === "CONTADOR"
        ? Math.max(0, loc.aguaLecturaAct - loc.aguaLecturaAnt) / divisorAgua
        : loc.aguaConsumoIndivM3;

    const isWaterDefective =
      loc.aguaObs.includes("DEFECTUOSO") ||
      loc.aguaObs.includes("TAPADO") ||
      loc.aguaObs.includes("DETENIDO") ||
      loc.aguaObs.includes("REVISAR");

    const waterReadingChanged =
      Boolean(loc.aguaTareaEstado) ||
      (loc.modalidadAcueducto === "CONTADOR" &&
        Math.abs(computedIndivM3 - loc.aguaConsumoIndivM3) > 0.01);

    if (loc.estadoOcupacion === "VACIO_CON_CONTRATO") {
      // Mandato SDD §3.7 Caso 2: Tope mínimo 1 m³ ($10.921,45) + Cuota Agua Comunal m²
      const baseAgua = Math.max(
        receipts.acueducto.topeMinimaCop,
        loc.aguaConsumoComunalM3 * currentM3Tariff
      );
      const cuotaComunalArea = loc.areaM2 * tarifaAguaComunalM2;
      calcAcueductoCop = Math.round(baseAgua + cuotaComunalArea);
    } else if (isWaterDefective && loc.modalidadAcueducto === "CONTADOR") {
      calcAcueductoCop = Math.round(loc.areaM2 * tarifaAguaProrrateoM2);
    } else if (waterReadingChanged || isM3Modified) {
      if (loc.modalidadAcueducto === "CONTADOR") {
        const costoIndiv = Math.max(
          receipts.acueducto.topeMinimaCop,
          (computedIndivM3 + loc.aguaConsumoComunalM3) * currentM3Tariff
        );
        const cuotaComunalArea = loc.areaM2 * tarifaAguaComunalM2;
        calcAcueductoCop = Math.round(costoIndiv + cuotaComunalArea);
      } else {
        calcAcueductoCop = Math.round(loc.acueductoCop * (currentM3Tariff / baseM3Tariff));
      }
    }

    // -------------------------------------------------------------
    // 3. ASEO Y BARRIDO COMUNAL (Reglamento Interno Art. 46)
    // Distribución solidaria por área ocupada (m²)
    // -------------------------------------------------------------
    const calcAseoCop =
      loc.aseoCop > 0
        ? Math.round(loc.areaM2 * tarifaAseoM2 * (loc.aseoCop / Math.max(1, loc.areaM2 * 1631.1436)))
        : 0;

    // -------------------------------------------------------------
    // 4. RESIDUOS SÓLIDOS ECSA (Reglamento Interno Art. 42 y 43 - PGIRS)
    // Separación en fuente y tarifas escalonadas NP (0.4) / MP (1.2) / P (Saldo)
    // -------------------------------------------------------------
    let calcResiduosCop = loc.residuosCop;
    if (loc.residuosCop > 0 && loc.categoriaResiduos !== "BASICOS") {
      if (loc.categoriaResiduos === "NP") {
        calcResiduosCop = Math.round(loc.areaM2 * tarifaNpM2);
      } else if (loc.categoriaResiduos === "MP") {
        calcResiduosCop = Math.round(loc.areaM2 * tarifaMpM2);
      } else if (loc.categoriaResiduos === "P") {
        calcResiduosCop = Math.round(loc.areaM2 * tarifaPM2);
      }
    }

    // -------------------------------------------------------------
    // 5. VIGILANCIA PRIVADA (Reglamento Interno Art. 46)
    // Distribución proporcional al área comercial (m²)
    // -------------------------------------------------------------
    const calcVigilanciaCop =
      loc.vigilanciaCop > 0
        ? Math.round(loc.areaM2 * tarifaVigilanciaM2 * (loc.vigilanciaCop / Math.max(1, loc.areaM2 * 13785.9124)))
        : 0;

    // -------------------------------------------------------------
    // 6. POLICÍA NACIONAL (Reglamento Interno Art. 46)
    // Cuota fija solidaria en partes iguales entre los locales comerciales activos
    // -------------------------------------------------------------
    const calcPoliciaCop = loc.policiaCop > 0 ? Math.round(cuotaPolicia) : 0;

    const rawTotalCop =
      calcEnergiaCop +
      calcAcueductoCop +
      calcAseoCop +
      calcResiduosCop +
      calcVigilanciaCop +
      calcPoliciaCop;

    // Regla SDD §3.7: Si el local/bodega está VACIO_SIN_CONTRATO_CORPORACION (restituido a Corabastos),
    // no infla la tarifa m² de los vecinos y su cuota se imputa a VALOR ASUMIDO CORPORACIÓN.
    const isAssumedByCorp = loc.estadoOcupacion === "VACIO_SIN_CONTRATO_CORPORACION";
    const calcAssumedCorporationCop = isAssumedByCorp ? rawTotalCop : 0;
    const calcTotalCop = rawTotalCop;

    const variacionTotalPct =
      loc.totalAnteriorCop > 0 ? (calcTotalCop - loc.totalAnteriorCop) / loc.totalAnteriorCop : 0;

    return {
      ...loc,
      energiaConsumoIndivKw: computedIndivKw,
      aguaConsumoIndivM3: computedIndivM3,
      calcEnergiaCop,
      calcAcueductoCop,
      calcAseoCop,
      calcResiduosCop,
      calcVigilanciaCop,
      calcPoliciaCop,
      calcTotalCop,
      calcAssumedCorporationCop,
      variacionTotalPct,
    };
  });
}

export const ERP_EXPANSION_RINGS: ErpModuleExpansionRing[] = [
  {
    anillo: 1,
    id: "RING-1-UTILITIES",
    titulo: "Anillo 1: Captura Móvil de Contadores & Motor de Liquidación de Servicios Públicos",
    subtitulo: "Nuestro Boleto de Entrada (Caballo de Troya Operativo — 5.318 Locales)",
    estado: "ACTIVO_MVP",
    origenArsenal: "Ingeniería Inversa 06. LIQUIDACION JUNIO 2025.xlsm + frufresco (/ops/compras) + galeria-sticky-industrial",
    dolorQueResuelve:
      "Reemplaza la macro-sábana Excel de 10,7 MB, las fórmulas manuales con #REF! en macromedidores comunales y la digitación tardía de fotos de contadores en oficina.",
    entregablesClave: [
      "App Móvil PWA para Lecturistas en Terreno con alerta in-situ de desviación y foto probatoria",
      "Desacoplo automático Padre-Hijo en los 62 macromedidores comunales (Aleros, Bodega Energía y Agua Comunal)",
      "Motor matemático exacto para los 3 recibos de Energía, 3 de Acueducto y 4 facturas de expensas (Policía partes iguales, Vigilancia/Aseo por m², Residuos NP 0,4 / MP 1,2 / P Saldo)",
      "Conciliación V/Finanzas vs V/Liquidado y planos contables (PL109, PL008, PL009, PL253, PL086, PL250)",
    ],
    impactoFinancieroEstimado: "$3.861 Millones COP/mes auditados al centavo · Reducción del ciclo de liquidación de 12 días a 4 horas",
    payloadPuenteEjemplo: {
      periodo: "2025-06",
      localesLiquidados: 5318,
      recaudoTotalCop: 3861030410,
      planoContablePrincipal: "PL109 / PL009 / PL250",
    },
  },
  {
    anillo: 2,
    id: "RING-2-BILLING-CARTERA",
    titulo: "Anillo 2: Facturación Electrónica DIAN, Recaudo Omnicanal & Cartera de Comerciantes",
    subtitulo: "Expansión Financiera Inmediata (Trasplante directo desde frufresco /admin/commercial/billing)",
    estado: "CABLE_PELADO_LISTO",
    origenArsenal: "frufresco (Billing & WorldOffice/ERP 57-col Homologation) + REF-PDF-GOLDEN-PRINT-MEMBRETE.md",
    dolorQueResuelve:
      "Conecta el resultado de la liquidación mensual directamente con la emisión masiva de estados de cuenta PDF Golden Print, envío automático por WhatsApp/Email al comerciante, link de pago PSE y conciliación de cartera morosa por local.",
    entregablesClave: [
      "Generación masiva en 1 clic de los 5.318 Estados de Cuenta en PDF de alta precisión",
      "Despacho automatizado por WhatsApp E.164 con botón de pago PSE / Wompi y lectura de soporte bancario con IA",
      "Semáforo de Cartera por Edades (30/60/90/180 días) y acuerdos de pago por local comercial",
    ],
    impactoFinancieroEstimado: "Aceleración del recaudo de expensas en +28% durante los primeros 10 días del mes",
    payloadPuenteEjemplo: {
      bridgeContract: "src/contracts/billing-bridge.ts",
      localCode: "010001",
      cufeDian: "94a8b7c6...f3e2",
      totalCobroCop: 3741275,
      estadoCartera: "AL_DIA",
    },
  },
  {
    anillo: 3,
    id: "RING-3-CATASTRO-INMOBILIARIO",
    titulo: "Anillo 3: Catastro Inmobiliario de Bodegas, Contratos de Concesión & Compliance SAGRILAFT",
    subtitulo: "Gobierno de Activos y Tenencia de Locales (Trasplante desde frufresco + Seguridad Help! On Risks)",
    estado: "CABLE_PELADO_LISTO",
    origenArsenal: "Seguridad (Debida Diligencia SAGRILAFT / Ley 1581) + frufresco (SpecialAgreementsModule)",
    dolorQueResuelve:
      "Centraliza quién es el propietario, arrendatario o concesionario real de cada uno de los 5.318 locales, controla subdivisiones de área (m²), cambios de vocación comercial (NP -> MP -> P) y ejecuta debida diligencia SAGRILAFT sobre cesiones de derechos.",
    entregablesClave: [
      "Expediente digital único por local (escrituras, área m² auditada, historial de medidores y titulares)",
      "Flujo de aprobación para cambio de categoría de residuos (NP/MP/P) o instalación de nuevo contador",
      "Validación SAGRILAFT / Listas Restrictivas integrada para nuevos arrendatarios y asociados",
    ],
    impactoFinancieroEstimado: "Eliminación de fugas de área no facturada y blindaje jurídico 100% ante Supersociedades",
    payloadPuenteEjemplo: {
      bridgeContract: "src/contracts/real-estate-bridge.ts",
      localCode: "010001",
      areaAuditadaM2: 165.68,
      titularNit: "900.412.881-3",
      complianceStatus: "FAVORABLE_SAGRILAFT",
    },
  },
  {
    anillo: 4,
    id: "RING-4-CMMS-INFRAESTRUCTURA",
    titulo: "Anillo 4: Mantenimiento Industrial CMMS (Red de Fríos, Subestaciones, Macromedidores y Cubiertas)",
    subtitulo: "Confiabilidad de Planta Física (Trasplante directo desde ingyemel_mantenimiento)",
    estado: "CABLE_PELADO_LISTO",
    origenArsenal: "ingyemel_mantenimiento (maintenanceLifecycle.ts, Kanban OT, Cronograma Preventivo) + REF-SUITE-GESTION-METROLOGICA-ISO10012.md",
    dolorQueResuelve:
      "Cada vez que un lecturista reporta en terreno 'C, DETENIDO', 'C, TAPADO' o 'REVISAR MEDIDOR', hoy queda en una celda de texto de Excel y nadie lo repara. Este anillo convierte cada hallazgo en una Orden de Trabajo (OT) automática para el equipo técnico.",
    entregablesClave: [
      "Disparo automático de Orden de Trabajo (OT) cuando un lecturista reporta contador detenido, tapado o fuga de agua comunal",
      "Control metrológico ISO 10012 de los 62 macromedidores, transformadores y cuartos de la Red de Fríos",
      "Indicadores MTBF, MTTR y control de pérdidas técnicas y no técnicas de energía y agua",
    ],
    impactoFinancieroEstimado: "Recuperación de >$85 Millones COP/mes en consumos no medidos por contadores detenidos o averiados",
    payloadPuenteEjemplo: {
      bridgeContract: "src/contracts/cmms-bridge.ts",
      triggerEvento: "MEDIDOR_DETENIDO_EN_TERRENO",
      localOrMacroCode: "ALERO BOD 11",
      ordenTrabajoId: "OT-COR-2026-0891",
      prioridad: "ALTA_PERDIDA_ENERGIA",
    },
  },
  {
    anillo: 5,
    id: "RING-5-PGIRS-SAC-BASCULAS",
    titulo: "Anillo 5: Gestión Ambiental PGIRS (Acopio ECSA), Básculas de Acceso & SAC Comerciantes",
    subtitulo: "Ecosistema Operativo Integral de Central de Abastos (Trasplante desde frufresco SAC & Logística)",
    estado: "CABLE_PELADO_LISTO",
    origenArsenal: "frufresco (SAC PQR Widget + RCA Audit Modal + Recepción en Muelle) + REF-TMS-TELEMETRIA-HIBRIDA-GPS-PWA-BEACON.md",
    dolorQueResuelve:
      "Audita el cobro de $680,9M/mes de ECSA cruzando los aforos reales de toneladas de residuos orgánicos e inorgánicos por bodega con la clasificación NP/MP/P de cada comerciante, y atiende reclamos de facturación con trazabilidad fotográfica.",
    entregablesClave: [
      "Portal de Atención al Comerciante (SAC / PQRS de Servicios Públicos) con evidencia fotográfica inmediata del contador",
      "Control de puntos de acopio ambiental ECSA, cajones estacionarios y auditoría de aforos P / MP / NP",
      "Tablero de Comando Presidencial de la Corporación de Abastos de Bogotá S.A.",
    ],
    impactoFinancieroEstimado: "Reducción del 80% en tiempos de respuesta a reclamos de facturación de comerciantes",
    payloadPuenteEjemplo: {
      bridgeContract: "src/contracts/pgirs-sac-bridge.ts",
      radicadoPqr: "PQR-COR-2026-0142",
      localCode: "030002",
      evidenciaFotoUrl: "verified-meter-030002.jpg",
      tiempoResolucionMin: 4,
    },
  },
];
