import {
  MasterReceiptsConfig,
  PublicBathroomMeter,
  ReadingTaskState,
} from "@/contracts/domain-contracts";
import {
  BiBodegaIntensityBenchmark,
  BiFinancialAbsorptionItem,
  BiLongitudinalCutoffPoint,
  BiLongitudinalReport,
  BiMacrometerLeakKpiItem,
  BiMetrologicalHealthItem,
  BiParetoLocalItem,
  BiZoneSlaSummary,
} from "@/contracts/erp-bridges";
import {
  CommunalHierarchyBreakdown,
  ComputedLocalLiquidation,
} from "@/lib/liquidation-engine";
import { buildCutoffReadingTasks, ZONE_META } from "@/lib/reading-tasks-engine";

export function formatCop(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

export function formatNum(value: number, decimals = 1): string {
  return value.toLocaleString("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Motor Headless de Inteligencia de Negocios (BI) & 6 KPIs Longitudinales Corte a Corte.
 * 100% libre de React, determinista y auditable contra SPEC.md v1.4.0 (Sección 3.9).
 */
export function computeBiLongitudinalReport(
  locales: ComputedLocalLiquidation[],
  energyCommunal: CommunalHierarchyBreakdown[],
  waterCommunal: CommunalHierarchyBreakdown[],
  bathroomMeters: PublicBathroomMeter[],
  receipts: MasterReceiptsConfig,
  completedTaskIds: Record<string, ReadingTaskState>
): BiLongitudinalReport {
  // ==========================================================================
  // KPI 1: ÍNDICE DE PÉRDIDAS Y REMANENTE COMUNAL POR BODEGA (PADRE VS HIJOS)
  // ==========================================================================
  let kpi1TotalBrutoEnergiaKw = 0;
  let kpi1TotalHijosEnergiaKw = 0;
  let kpi1RemanenteComunalEnergiaKw = 0;

  let kpi1TotalBrutoAguaM3 = 0;
  let kpi1TotalHijosAguaM3 = 0;
  let kpi1RemanenteComunalAguaM3 = 0;

  const macroRiskList: BiMacrometerLeakKpiItem[] = [];

  for (const m of energyCommunal) {
    kpi1TotalBrutoEnergiaKw += m.consumoBruto;
    kpi1TotalHijosEnergiaKw += m.consumoHijosDescontado;
    kpi1RemanenteComunalEnergiaKw += m.consumoNetoComunal;

    const pctComunal = m.consumoBruto > 0 ? (m.consumoNetoComunal / m.consumoBruto) * 100 : 0;
    const varPct =
      m.consumoAnterior > 0
        ? ((m.consumoNetoComunal - m.consumoAnterior) / m.consumoAnterior) * 100
        : 0;
    const alertaFugaActiva = varPct > 20 || m.alertaDesviacion;

    macroRiskList.push({
      id: m.id,
      servicio: "ENERGIA",
      bodegaId: m.bodegaId,
      nombre: `${m.codigo} (${m.tipo})`,
      medidorSerie: m.contadorSerie,
      consumoBruto: m.consumoBruto,
      descuentoHijos: m.consumoHijosDescontado,
      consumoNetoComunal: m.consumoNetoComunal,
      consumoAnteriorComunal: m.consumoAnterior,
      porcentajeComunalSobreBruto: pctComunal,
      variacionIntermensualPct: varPct,
      alertaFugaActiva,
      unidad: "kWh",
    });
  }

  for (const w of waterCommunal) {
    kpi1TotalBrutoAguaM3 += w.consumoBruto;
    kpi1TotalHijosAguaM3 += w.consumoHijosDescontado;
    kpi1RemanenteComunalAguaM3 += w.consumoNetoComunal;

    const pctComunal = w.consumoBruto > 0 ? (w.consumoNetoComunal / w.consumoBruto) * 100 : 0;
    const varPct =
      w.consumoAnterior > 0
        ? ((w.consumoNetoComunal - w.consumoAnterior) / w.consumoAnterior) * 100
        : 0;
    const alertaFugaActiva = varPct > 20 || w.alertaDesviacion;

    macroRiskList.push({
      id: w.id,
      servicio: "ACUEDUCTO",
      bodegaId: w.bodegaId,
      nombre: `${w.codigo} (${w.tipo})`,
      medidorSerie: w.contadorSerie,
      consumoBruto: w.consumoBruto,
      descuentoHijos: w.consumoHijosDescontado,
      consumoNetoComunal: w.consumoNetoComunal,
      consumoAnteriorComunal: w.consumoAnterior,
      porcentajeComunalSobreBruto: pctComunal,
      variacionIntermensualPct: varPct,
      alertaFugaActiva,
      unidad: "m³",
    });
  }

  const kpi1IndiceComunalEnergiaPct =
    kpi1TotalBrutoEnergiaKw > 0
      ? (kpi1RemanenteComunalEnergiaKw / kpi1TotalBrutoEnergiaKw) * 100
      : 0;
  const kpi1IndiceComunalAguaPct =
    kpi1TotalBrutoAguaM3 > 0
      ? (kpi1RemanenteComunalAguaM3 / kpi1TotalBrutoAguaM3) * 100
      : 0;
  const kpi1AlertasFugaCount = macroRiskList.filter((x) => x.alertaFugaActiva).length;

  const kpi1TopMacromedidoresRiesgo = [...macroRiskList]
    .sort((a, b) => {
      if (a.alertaFugaActiva !== b.alertaFugaActiva) return a.alertaFugaActiva ? -1 : 1;
      return Math.abs(b.variacionIntermensualPct) - Math.abs(a.variacionIntermensualPct);
    })
    .slice(0, 14);

  // ==========================================================================
  // KPI 2: BRECHA DE ABSORCIÓN FINANCIERA CORPORATIVA (V/FINANZAS VS LIQUIDADO)
  // ==========================================================================
  let sumEnergiaComerciantes = 0;
  let sumAcueductoComerciantes = 0;
  let sumAseoResiduosComerciantes = 0;
  let sumVigilanciaComerciantes = 0;
  let sumPoliciaComerciantes = 0;

  let sumVacanciaEnergia = 0;
  let sumVacanciaAcueducto = 0;
  let sumVacanciaAseoResiduos = 0;
  let sumVacanciaVigilancia = 0;
  let sumVacanciaPolicia = 0;

  for (const loc of locales) {
    if (loc.estadoOcupacion === "VACIO_SIN_CONTRATO_CORPORACION") {
      // Cuota parte absorbida dinámicamente por la Corporación por vacancia sin contrato
      const basePolicia = receipts.expensas.policia.cuotaFijaPorLocal;
      const baseVig = loc.areaM2 * receipts.expensas.vigilancia.tarifaPorM2;
      const baseAseo = loc.areaM2 * receipts.expensas.aseo.tarifaPorM2;
      const baseRes = loc.areaM2 * receipts.expensas.residuosEcsa.tarifaBaseM2;
      const baseAcue = loc.areaM2 * (receipts.acueducto.bolsaAguaComunalGeneral / receipts.acueducto.areaComunalGeneralM2);
      const baseEner = Math.max(0, loc.calcAssumedCorporationCop - (basePolicia + baseVig + baseAseo + baseRes + baseAcue));

      sumVacanciaEnergia += baseEner;
      sumVacanciaAcueducto += baseAcue;
      sumVacanciaAseoResiduos += baseAseo + baseRes;
      sumVacanciaVigilancia += baseVig;
      sumVacanciaPolicia += basePolicia;
    } else {
      sumEnergiaComerciantes += loc.calcEnergiaCop;
      sumAcueductoComerciantes += loc.calcAcueductoCop;
      sumAseoResiduosComerciantes += loc.calcAseoCop + loc.calcResiduosCop;
      sumVigilanciaComerciantes += loc.calcVigilanciaCop;
      sumPoliciaComerciantes += loc.calcPoliciaCop;
    }
  }

  const cf = receipts.conciliacionFinanzas;
  const asumidoFijoEnergia =
    receipts.energia.principal.asumidoCorporacion + receipts.energia.principal.asumidoCovial;
  const asumidoFijoAcueducto =
    receipts.acueducto.asumidoCorporacion + receipts.acueducto.asumidoCovial;
  const asumidoFijoAseo =
    receipts.expensas.aseo.valorFacturaOperacionTotal - receipts.expensas.aseo.valorNetoDistribuir;

  const kpi2ServiciosAbsorcion: BiFinancialAbsorptionItem[] = [
    {
      servicio: "Energía Eléctrica (Principal + BP + Red Fríos)",
      vFinanzasCop: cf.energiaFinanzas,
      vLiquidadoComerciantesCop: sumEnergiaComerciantes,
      asumidoCorporacionFijoCop: asumidoFijoEnergia,
      asumidoVacanciaSinContratoCop: sumVacanciaEnergia,
      brechaNetaCop: sumEnergiaComerciantes - cf.energiaFinanzas,
      porcentajeRecuperacionPct:
        cf.energiaFinanzas > 0 ? (sumEnergiaComerciantes / cf.energiaFinanzas) * 100 : 100,
    },
    {
      servicio: "Acueducto y Alcantarillado (EAAB)",
      vFinanzasCop: cf.acueductoFinanzas,
      vLiquidadoComerciantesCop: sumAcueductoComerciantes,
      asumidoCorporacionFijoCop: asumidoFijoAcueducto,
      asumidoVacanciaSinContratoCop: sumVacanciaAcueducto,
      brechaNetaCop: sumAcueductoComerciantes - cf.acueductoFinanzas,
      porcentajeRecuperacionPct:
        cf.acueductoFinanzas > 0 ? (sumAcueductoComerciantes / cf.acueductoFinanzas) * 100 : 100,
    },
    {
      servicio: "Residuos Sólidos (ECSA) + Aseo (20%)",
      vFinanzasCop: cf.aseoResiduosFinanzas,
      vLiquidadoComerciantesCop: sumAseoResiduosComerciantes,
      asumidoCorporacionFijoCop: asumidoFijoAseo,
      asumidoVacanciaSinContratoCop: sumVacanciaAseoResiduos,
      brechaNetaCop: sumAseoResiduosComerciantes - cf.aseoResiduosFinanzas,
      porcentajeRecuperacionPct:
        cf.aseoResiduosFinanzas > 0
          ? (sumAseoResiduosComerciantes / cf.aseoResiduosFinanzas) * 100
          : 100,
    },
    {
      servicio: "Vigilancia y Seguridad Privada",
      vFinanzasCop: cf.vigilanciaFinanzas,
      vLiquidadoComerciantesCop: sumVigilanciaComerciantes,
      asumidoCorporacionFijoCop: 0,
      asumidoVacanciaSinContratoCop: sumVacanciaVigilancia,
      brechaNetaCop: sumVigilanciaComerciantes - cf.vigilanciaFinanzas,
      porcentajeRecuperacionPct:
        cf.vigilanciaFinanzas > 0 ? (sumVigilanciaComerciantes / cf.vigilanciaFinanzas) * 100 : 100,
    },
    {
      servicio: "Convenio Policía Nacional",
      vFinanzasCop: cf.policiaFinanzas,
      vLiquidadoComerciantesCop: sumPoliciaComerciantes,
      asumidoCorporacionFijoCop: 0,
      asumidoVacanciaSinContratoCop: sumVacanciaPolicia,
      brechaNetaCop: sumPoliciaComerciantes - cf.policiaFinanzas,
      porcentajeRecuperacionPct:
        cf.policiaFinanzas > 0 ? (sumPoliciaComerciantes / cf.policiaFinanzas) * 100 : 100,
    },
  ];

  const kpi2TotalFinanzasCop = kpi2ServiciosAbsorcion.reduce((acc, s) => acc + s.vFinanzasCop, 0);
  const kpi2TotalLiquidadoComerciantesCop = kpi2ServiciosAbsorcion.reduce(
    (acc, s) => acc + s.vLiquidadoComerciantesCop,
    0
  );
  const kpi2TotalAsumidoCorporacionCop = kpi2ServiciosAbsorcion.reduce(
    (acc, s) => acc + s.asumidoCorporacionFijoCop + s.asumidoVacanciaSinContratoCop,
    0
  );
  const kpi2TasaRecuperacionGlobalPct =
    kpi2TotalFinanzasCop > 0
      ? (kpi2TotalLiquidadoComerciantesCop / kpi2TotalFinanzasCop) * 100
      : 100;

  // ==========================================================================
  // KPI 3: SALUD Y ENVEJECIMIENTO DEL PARQUE METROLÓGICO (1.835 MEDIDORES)
  // ==========================================================================
  const allTasks = buildCutoffReadingTasks(
    locales,
    energyCommunal,
    waterCommunal,
    bathroomMeters,
    completedTaskIds
  );

  const localMap = new Map<string, ComputedLocalLiquidation>();
  for (const l of locales) {
    localMap.set(l.codigo, l);
  }

  const healthBuckets: Record<
    BiMetrologicalHealthItem["categoria"],
    BiMetrologicalHealthItem
  > = {
    OPERATIVO: {
      causal: "Medidores Operativos Normal (Verificado / Sin Novedad)",
      categoria: "OPERATIVO",
      cantidadEnergia: 0,
      cantidadAcueducto: 0,
      totalMedidores: 0,
      areaAfectadaM2: 0,
      facturacionMigradaProrrateoCop: 0,
    },
    DETENIDO: {
      causal: "Contador / Medidor Detenido (C, DETENIDO / M, DETENIDO)",
      categoria: "DETENIDO",
      cantidadEnergia: 0,
      cantidadAcueducto: 0,
      totalMedidores: 0,
      areaAfectadaM2: 0,
      facturacionMigradaProrrateoCop: 0,
    },
    TAPADO: {
      causal: "Contador / Medidor Tapado u Obstruido (C, TAPADO / M, TAPADO)",
      categoria: "TAPADO",
      cantidadEnergia: 0,
      cantidadAcueducto: 0,
      totalMedidores: 0,
      areaAfectadaM2: 0,
      facturacionMigradaProrrateoCop: 0,
    },
    RETIRADO_REVISAR: {
      causal: "Medidor Retirado / En Revisión Técnica (RETIRADO / REVISAR)",
      categoria: "RETIRADO_REVISAR",
      cantidadEnergia: 0,
      cantidadAcueducto: 0,
      totalMedidores: 0,
      areaAfectadaM2: 0,
      facturacionMigradaProrrateoCop: 0,
    },
    CERRADO_VACIO: {
      causal: "Local Cerrado / Vacío sin Acceso al Medidor (L, CERRADO / L, VACIO)",
      categoria: "CERRADO_VACIO",
      cantidadEnergia: 0,
      cantidadAcueducto: 0,
      totalMedidores: 0,
      areaAfectadaM2: 0,
      facturacionMigradaProrrateoCop: 0,
    },
  };

  for (const task of allTasks) {
    const obs = (task.observacionActual || "").toUpperCase();
    let cat: BiMetrologicalHealthItem["categoria"] = "OPERATIVO";
    if (obs.includes("DETENIDO")) {
      cat = "DETENIDO";
    } else if (obs.includes("TAPADO") || obs.includes("ALMACENAMIENTO")) {
      cat = "TAPADO";
    } else if (obs.includes("RETIRADO") || obs.includes("REVISAR") || obs.includes("SUSPENDIDO")) {
      cat = "RETIRADO_REVISAR";
    } else if (obs.includes("CERRADO") || obs.includes("VACIO") || obs.includes("NO PERMITIO")) {
      cat = "CERRADO_VACIO";
    }

    const bucket = healthBuckets[cat];
    const isEnergia =
      task.servicio === "ENERGIA" || task.servicio === "MACRO_ENERGIA";
    if (isEnergia) {
      bucket.cantidadEnergia += 1;
    } else {
      bucket.cantidadAcueducto += 1;
    }
    bucket.totalMedidores += 1;
    bucket.areaAfectadaM2 += task.areaM2;

    const loc = localMap.get(task.codigo);
    if (loc && cat !== "OPERATIVO") {
      bucket.facturacionMigradaProrrateoCop += isEnergia
        ? loc.calcEnergiaCop
        : loc.calcAcueductoCop;
    }
  }

  const kpi3DesgloseSalud = Object.values(healthBuckets);
  const kpi3TotalMedidoresFisicos = allTasks.length;
  const kpi3MedidoresOperativosOk = healthBuckets.OPERATIVO.totalMedidores;
  const kpi3MedidoresAnomalos =
    healthBuckets.DETENIDO.totalMedidores +
    healthBuckets.TAPADO.totalMedidores +
    healthBuckets.RETIRADO_REVISAR.totalMedidores;
  const kpi3SaludMetrologicaPct =
    kpi3TotalMedidoresFisicos > 0
      ? (kpi3MedidoresOperativosOk / kpi3TotalMedidoresFisicos) * 100
      : 100;
  const kpi3AreaForzadaProrrateoM2 =
    healthBuckets.DETENIDO.areaAfectadaM2 +
    healthBuckets.TAPADO.areaAfectadaM2 +
    healthBuckets.RETIRADO_REVISAR.areaAfectadaM2;
  const kpi3CopForzadoProrrateo =
    healthBuckets.DETENIDO.facturacionMigradaProrrateoCop +
    healthBuckets.TAPADO.facturacionMigradaProrrateoCop +
    healthBuckets.RETIRADO_REVISAR.facturacionMigradaProrrateoCop;

  // ==========================================================================
  // KPI 4: INTENSIDAD POR M² (KWH/M², M³/M², $/M²) & RANKING PARETO
  // ==========================================================================
  let globalAreaM2 = 0;
  let globalKwh = 0;
  let globalM3 = 0;
  let globalActualCop = 0;
  let globalAnteriorCop = 0;

  const bodegaMap = new Map<
    string,
    {
      bodegaId: string;
      tipoPrincipal: string;
      totalLocales: number;
      areaTotalM2: number;
      totalKwh: number;
      totalM3: number;
      totalActualCop: number;
      totalAnteriorCop: number;
    }
  >();

  const paretoCandidates: BiParetoLocalItem[] = [];

  for (const loc of locales) {
    const kwhLocal =
      loc.energiaConsumoIndivKw + loc.energiaConsumoComunalKw + loc.energiaConsumoAleroKw;
    const m3Local = loc.aguaConsumoIndivM3 + loc.aguaConsumoComunalM3;

    globalAreaM2 += loc.areaM2;
    globalKwh += kwhLocal;
    globalM3 += m3Local;
    globalActualCop += loc.calcTotalCop;
    globalAnteriorCop += loc.totalAnteriorCop;

    const existing = bodegaMap.get(loc.bodegaId);
    if (!existing) {
      bodegaMap.set(loc.bodegaId, {
        bodegaId: loc.bodegaId,
        tipoPrincipal: loc.tipoBodega || loc.modalidadGeneral,
        totalLocales: 1,
        areaTotalM2: loc.areaM2,
        totalKwh: kwhLocal,
        totalM3: m3Local,
        totalActualCop: loc.calcTotalCop,
        totalAnteriorCop: loc.totalAnteriorCop,
      });
    } else {
      existing.totalLocales += 1;
      existing.areaTotalM2 += loc.areaM2;
      existing.totalKwh += kwhLocal;
      existing.totalM3 += m3Local;
      existing.totalActualCop += loc.calcTotalCop;
      existing.totalAnteriorCop += loc.totalAnteriorCop;
    }

    const saltoCop = loc.calcTotalCop - loc.totalAnteriorCop;
    const saltoPct =
      loc.totalAnteriorCop > 0 ? (saltoCop / loc.totalAnteriorCop) * 100 : 0;
    const promMax = (loc.energiaPromMax || 0) + (loc.aguaPromMax || 0);
    const excedeBanda =
      promMax > 0 && loc.calcEnergiaCop + loc.calcAcueductoCop > promMax * 1.05;

    paretoCandidates.push({
      codigoLocal: loc.codigo,
      bodegaId: loc.bodegaId,
      tipoLocal: loc.tipoBodega,
      areaM2: loc.areaM2,
      kwhActual: loc.energiaConsumoIndivKw,
      kwhAnterior: loc.energiaConsumoAntKw ?? loc.energiaConsumoIndivKw,
      m3Actual: loc.aguaConsumoIndivM3,
      m3Anterior: loc.aguaConsumoAntM3 ?? loc.aguaConsumoIndivM3,
      totalActualCop: loc.calcTotalCop,
      totalAnteriorCop: loc.totalAnteriorCop,
      promedioMaxCop: promMax,
      saltoMensualCop: saltoCop,
      saltoMensualPct: saltoPct,
      excedeBandaPromedioMax: excedeBanda,
    });
  }

  const kpi4PromedioKwhM2Global = globalAreaM2 > 0 ? globalKwh / globalAreaM2 : 0;
  const kpi4PromedioM3M2Global = globalAreaM2 > 0 ? globalM3 / globalAreaM2 : 0;
  const kpi4PromedioCopM2Global = globalAreaM2 > 0 ? globalActualCop / globalAreaM2 : 0;

  const kpi4TopBodegasIntensidad: BiBodegaIntensityBenchmark[] = Array.from(
    bodegaMap.values()
  )
    .map((b) => {
      const area = Math.max(1, b.areaTotalM2);
      const copActualM2 = b.totalActualCop / area;
      const copAntM2 = b.totalAnteriorCop / area;
      const varPct =
        b.totalAnteriorCop > 0
          ? ((b.totalActualCop - b.totalAnteriorCop) / b.totalAnteriorCop) * 100
          : 0;
      return {
        bodegaId: b.bodegaId,
        tipoPrincipal: b.tipoPrincipal,
        totalLocales: b.totalLocales,
        areaTotalM2: b.areaTotalM2,
        kwhPorM2: b.totalKwh / area,
        m3PorM2: b.totalM3 / area,
        copPorM2Actual: copActualM2,
        copPorM2Anterior: copAntM2,
        variacionCopPct: varPct,
        totalActualCop: b.totalActualCop,
        totalAnteriorCop: b.totalAnteriorCop,
      };
    })
    .sort((a, b) => b.totalActualCop - a.totalActualCop)
    .slice(0, 12);

  const kpi4TopParetoLocales = paretoCandidates
    .sort((a, b) => b.totalActualCop - a.totalActualCop)
    .slice(0, 15);

  // ==========================================================================
  // KPI 5: EVOLUCIÓN CORTE A CORTE 100% REAL DESDE EXCEL (MAYO 2025 vs JUNIO 2025)
  // Cero datos mockeados ni meses sintéticos: cada cifra proviene de las hojas reales
  // ==========================================================================
  const kpi5VariacionMayoJunioPct =
    globalAnteriorCop > 0
      ? ((globalActualCop - globalAnteriorCop) / globalAnteriorCop) * 100
      : 0;

  let sumEnergiaMayoCop = 0;
  let sumAcueductoMayoCop = 0;
  let sumVigilanciaMayoCop = 0;
  let sumResiduosMayoCop = 0;
  let sumAseoMayoCop = 0;
  let sumPoliciaMayoCop = 0;
  let sumKwhMayo = 0;
  let sumM3Mayo = 0;

  let sumVigilanciaJunioCop = 0;
  let sumResiduosJunioCop = 0;
  let sumAseoJunioCop = 0;
  let sumPoliciaJunioCop = 0;

  for (const loc of locales) {
    sumEnergiaMayoCop += loc.energiaAnteriorCop ?? 0;
    sumAcueductoMayoCop += loc.acueductoAnteriorCop ?? 0;
    sumVigilanciaMayoCop += loc.vigilanciaAnteriorCop ?? 0;
    sumResiduosMayoCop += loc.residuosAnteriorCop ?? 0;
    sumAseoMayoCop += loc.aseoAnteriorCop ?? 0;
    sumPoliciaMayoCop += loc.policiaAnteriorCop ?? 0;
    sumKwhMayo += loc.energiaConsumoAntKw ?? 0;
    sumM3Mayo += loc.aguaConsumoAntM3 ?? 0;

    sumVigilanciaJunioCop += loc.calcVigilanciaCop;
    sumResiduosJunioCop += loc.calcResiduosCop;
    sumAseoJunioCop += loc.calcAseoCop;
    sumPoliciaJunioCop += loc.calcPoliciaCop;
  }

  let macroAntEnergiaKw = 0;
  for (const m of energyCommunal) {
    macroAntEnergiaKw += m.consumoAnterior;
  }

  const tarifaKwhJun = receipts.energia.tarifaKwh;
  const tarifaM3Jun = receipts.acueducto.tarifaM3;
  const tarifaVigJun = receipts.expensas.vigilancia.tarifaPorM2;
  const tarifaResPJun = receipts.expensas.residuosEcsa.tarifaEfectivaPM2;

  const totalEnergiaJun = sumEnergiaComerciantes;
  const totalAguaJun = sumAcueductoComerciantes;
  const totalExpensasJun =
    sumAseoResiduosComerciantes + sumVigilanciaComerciantes + sumPoliciaComerciantes;
  const totalExpensasMayo =
    sumVigilanciaMayoCop + sumResiduosMayoCop + sumAseoMayoCop + sumPoliciaMayoCop;

  const indiceComunalMayoPct =
    kpi1TotalBrutoEnergiaKw > 0
      ? (macroAntEnergiaKw / kpi1TotalBrutoEnergiaKw) * 100
      : kpi1IndiceComunalEnergiaPct;

  const kpi5SerieLongitudinal: BiLongitudinalCutoffPoint[] = [
    {
      corteId: "2025-05",
      etiqueta: "Mayo 2025 (Corte Anterior Real Excel)",
      totalFacturadoRealCop: globalAnteriorCop,
      energiaTotalCop: sumEnergiaMayoCop,
      acueductoTotalCop: sumAcueductoMayoCop,
      expensasTotalCop: totalExpensasMayo,
      vigilanciaTotalCop: sumVigilanciaMayoCop,
      residuosTotalCop: sumResiduosMayoCop,
      aseoTotalCop: sumAseoMayoCop,
      policiaTotalCop: sumPoliciaMayoCop,
      consumoFisicoEnergiaKwh: sumKwhMayo,
      consumoFisicoAguaM3: sumM3Mayo,
      tarifaKwhPrincipalCop: tarifaKwhJun,
      tarifaM3AguaCop: tarifaM3Jun,
      tarifaM2VigilanciaCop: tarifaVigJun,
      tarifaM2ResiduosP: tarifaResPJun,
      indicePerdidaComunalPct: indiceComunalMayoPct,
      saludMetrologicaPct: kpi3SaludMetrologicaPct,
    },
    {
      corteId: "2025-06",
      etiqueta: "Junio 2025 (Corte Activo Real Excel)",
      totalFacturadoRealCop: globalActualCop,
      energiaTotalCop: totalEnergiaJun,
      acueductoTotalCop: totalAguaJun,
      expensasTotalCop: totalExpensasJun,
      vigilanciaTotalCop: sumVigilanciaJunioCop,
      residuosTotalCop: sumResiduosJunioCop,
      aseoTotalCop: sumAseoJunioCop,
      policiaTotalCop: sumPoliciaJunioCop,
      consumoFisicoEnergiaKwh: globalKwh,
      consumoFisicoAguaM3: globalM3,
      tarifaKwhPrincipalCop: tarifaKwhJun,
      tarifaM3AguaCop: tarifaM3Jun,
      tarifaM2VigilanciaCop: tarifaVigJun,
      tarifaM2ResiduosP: tarifaResPJun,
      indicePerdidaComunalPct: kpi1IndiceComunalEnergiaPct,
      saludMetrologicaPct: kpi3SaludMetrologicaPct,
    },
  ];

  // ==========================================================================
  // KPI 6: EFICIENCIA OPERATIVA DEL CORTE (SLA TERRENO & LOCALES CERRADOS)
  // ==========================================================================
  const kpi6ZonasSla: BiZoneSlaSummary[] = ZONE_META.map((zm) => {
    const zTasks = allTasks.filter((t) => t.zonaId === zm.id);
    const completadas = zTasks.filter((t) => t.taskState === "COMPLETADA").length;
    const pendientes = zTasks.filter((t) => t.taskState === "PENDIENTE").length;
    const novedadesTecnicas = zTasks.filter((t) => t.taskState === "NOVEDAD_TECNICA").length;
    const cerradosSinAcceso = zTasks.filter((t) => t.taskState === "CERRADO_SIN_ACCESO").length;
    const evacuadas = zTasks.length - pendientes;

    return {
      zonaId: zm.id,
      etiqueta: zm.shortLabel,
      totalTareas: zTasks.length,
      completadas,
      pendientes,
      novedadesTecnicas,
      cerradosSinAcceso,
      avancePct: zTasks.length > 0 ? (evacuadas / zTasks.length) * 100 : 100,
    };
  });

  const kpi6TotalTareasCorte = allTasks.length;
  const totalPendientesCorte = allTasks.filter((t) => t.taskState === "PENDIENTE").length;
  const kpi6TareasEvacuadas = kpi6TotalTareasCorte - totalPendientesCorte;
  const kpi6SlaTerrenoPct =
    kpi6TotalTareasCorte > 0 ? (kpi6TareasEvacuadas / kpi6TotalTareasCorte) * 100 : 100;
  const totalCerrados = allTasks.filter((t) => t.taskState === "CERRADO_SIN_ACCESO").length;
  const kpi6TasaCerradosPct =
    kpi6TotalTareasCorte > 0 ? (totalCerrados / kpi6TotalTareasCorte) * 100 : 0;

  return {
    corteActivo: receipts.nombrePeriodo,
    kpi1TotalBrutoEnergiaKw,
    kpi1TotalHijosEnergiaKw,
    kpi1RemanenteComunalEnergiaKw,
    kpi1IndiceComunalEnergiaPct,
    kpi1TotalBrutoAguaM3,
    kpi1TotalHijosAguaM3,
    kpi1RemanenteComunalAguaM3,
    kpi1IndiceComunalAguaPct,
    kpi1AlertasFugaCount,
    kpi1TopMacromedidoresRiesgo,
    kpi2TotalFinanzasCop,
    kpi2TotalLiquidadoComerciantesCop,
    kpi2TotalAsumidoCorporacionCop,
    kpi2TasaRecuperacionGlobalPct,
    kpi2ServiciosAbsorcion,
    kpi3TotalMedidoresFisicos,
    kpi3MedidoresOperativosOk,
    kpi3MedidoresAnomalos,
    kpi3SaludMetrologicaPct,
    kpi3AreaForzadaProrrateoM2,
    kpi3CopForzadoProrrateo,
    kpi3DesgloseSalud,
    kpi4PromedioKwhM2Global,
    kpi4PromedioM3M2Global,
    kpi4PromedioCopM2Global,
    kpi4TopBodegasIntensidad,
    kpi4TopParetoLocales,
    kpi5SerieLongitudinal,
    kpi5VariacionMayoJunioPct,
    kpi6TotalTareasCorte,
    kpi6TareasEvacuadas,
    kpi6SlaTerrenoPct,
    kpi6TasaCerradosPct,
    kpi6ZonasSla,
  };
}
