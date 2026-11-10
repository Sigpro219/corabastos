import {
  BiBodegaIntensityBenchmark,
  BiFinancialAbsorptionItem,
  BiLongitudinalCutoffPoint,
  BiLongitudinalReport,
  BiMacrometerLeakKpiItem,
  BiMetrologicalHealthItem,
  BiParetoLocalItem,
  BiZoneSlaSummary,
  computeOfficialMayTotalCop,
  FieldReadingUpdate,
  MasterReceiptsConfig,
  PublicBathroomMeter,
  ReadingTaskState,
} from "@/contracts/domain-contracts";
import {
  CommunalHierarchyBreakdown,
  ComputedLocalLiquidation,
  normalizeMasterReceipts,
} from "@/lib/liquidation-engine";
import { buildCutoffReadingTasks, ZONE_META } from "@/lib/reading-tasks-engine";

export { formatCop, formatDec as formatNum } from "@/lib/formatters";

/**
 * Motor Headless de Inteligencia de Negocios (BI) & 6 KPIs Longitudinales Corte a Corte.
 * Cumple SPEC.md v3.1.0 §3.1.2 y §3.3.3:
 * - Cero lectura de loc.totalAnteriorCop o loc.totalJunioCop crudos.
 * - KPI 2 alimentado con la suma exacta al peso de calcEnergiaCop..calcPoliciaCop en vacancia sin contrato.
 */
export function computeBiLongitudinalReport(
  locales: ComputedLocalLiquidation[],
  energyCommunal: CommunalHierarchyBreakdown[],
  waterCommunal: CommunalHierarchyBreakdown[],
  bathroomMeters: PublicBathroomMeter[],
  receipts: MasterReceiptsConfig,
  completedTaskIds: Record<string, ReadingTaskState>,
  fieldOverridesMap: Record<string, FieldReadingUpdate> = {}
): BiLongitudinalReport {
  const normReceipts = normalizeMasterReceipts(receipts);
  // KPI 1: Pérdidas y remanente comunal Padre vs Hijos
  let kpi1TotalBrutoEnergiaKw = 0;
  let kpi1TotalHijosEnergiaKw = 0;
  let kpi1RemanenteComunalEnergiaKw = 0;
  let kpi1TotalBrutoAguaM3 = 0;
  let kpi1TotalHijosAguaM3 = 0;
  let kpi1RemanenteComunalAguaM3 = 0;

  const macroRiskList: BiMacrometerLeakKpiItem[] = [];
  const pushMacroItem = (
    m: CommunalHierarchyBreakdown,
    servicio: "ENERGIA" | "ACUEDUCTO",
    unidad: "kWh" | "m³"
  ) => {
    const pctComunal = m.consumoBruto > 0 ? (m.consumoNetoComunal / m.consumoBruto) * 100 : 0;
    const varPct =
      m.consumoAnterior > 0 ? ((m.consumoNetoComunal - m.consumoAnterior) / m.consumoAnterior) * 100 : 0;
    macroRiskList.push({
      id: m.id,
      servicio,
      bodegaId: m.bodegaId,
      nombre: `${m.codigo} (${m.tipo})`,
      medidorSerie: m.contadorSerie,
      consumoBruto: m.consumoBruto,
      descuentoHijos: m.consumoHijosDescontado,
      consumoNetoComunal: m.consumoNetoComunal,
      consumoAnteriorComunal: m.consumoAnterior,
      porcentajeComunalSobreBruto: pctComunal,
      variacionIntermensualPct: varPct,
      alertaFugaActiva: varPct > 20 || m.alertaDesviacion,
      unidad,
    });
  };

  for (const m of energyCommunal) {
    kpi1TotalBrutoEnergiaKw += m.consumoBruto;
    kpi1TotalHijosEnergiaKw += m.consumoHijosDescontado;
    kpi1RemanenteComunalEnergiaKw += m.consumoNetoComunal;
    pushMacroItem(m, "ENERGIA", "kWh");
  }
  for (const w of waterCommunal) {
    kpi1TotalBrutoAguaM3 += w.consumoBruto;
    kpi1TotalHijosAguaM3 += w.consumoHijosDescontado;
    kpi1RemanenteComunalAguaM3 += w.consumoNetoComunal;
    pushMacroItem(w, "ACUEDUCTO", "m³");
  }

  const kpi1IndiceComunalEnergiaPct =
    kpi1TotalBrutoEnergiaKw > 0 ? (kpi1RemanenteComunalEnergiaKw / kpi1TotalBrutoEnergiaKw) * 100 : 0;
  const kpi1IndiceComunalAguaPct =
    kpi1TotalBrutoAguaM3 > 0 ? (kpi1RemanenteComunalAguaM3 / kpi1TotalBrutoAguaM3) * 100 : 0;
  const kpi1AlertasFugaCount = macroRiskList.filter((x) => x.alertaFugaActiva).length;
  const kpi1TopMacromedidoresRiesgo = [...macroRiskList]
    .sort((a, b) =>
      a.alertaFugaActiva !== b.alertaFugaActiva
        ? a.alertaFugaActiva ? -1 : 1
        : Math.abs(b.variacionIntermensualPct) - Math.abs(a.variacionIntermensualPct)
    )
    .slice(0, 14);

  // KPI 2: Brecha de absorción financiera corporativa exacta al peso (SPEC.md §3.3.3)
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

  let sumAseoComerciantes = 0;
  let sumResiduosComerciantes = 0;

  for (const loc of locales) {
    if (loc.effectiveOccupancy === "VACIO_SIN_CONTRATO_CORPORACION") {
      sumVacanciaEnergia += loc.calcEnergiaCop;
      sumVacanciaAcueducto += loc.calcAcueductoCop;
      sumVacanciaAseoResiduos += loc.calcAseoCop + loc.calcResiduosCop;
      sumVacanciaVigilancia += loc.calcVigilanciaCop;
      sumVacanciaPolicia += loc.calcPoliciaCop;
    } else {
      sumEnergiaComerciantes += loc.calcEnergiaCop;
      sumAcueductoComerciantes += loc.calcAcueductoCop;
      sumAseoComerciantes += loc.calcAseoCop;
      sumResiduosComerciantes += loc.calcResiduosCop;
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

  const buildAbsItem = (
    servicio: string,
    vFinanzasCop: number,
    vLiquidadoComerciantesCop: number,
    asumidoCorporacionFijoCop: number,
    asumidoVacanciaSinContratoCop: number
  ): BiFinancialAbsorptionItem => ({
    servicio,
    vFinanzasCop,
    vLiquidadoComerciantesCop,
    asumidoCorporacionFijoCop,
    asumidoVacanciaSinContratoCop,
    brechaNetaCop: vLiquidadoComerciantesCop - vFinanzasCop,
    porcentajeRecuperacionPct: vFinanzasCop > 0 ? (vLiquidadoComerciantesCop / vFinanzasCop) * 100 : 100,
  });

  const kpi2ServiciosAbsorcion: BiFinancialAbsorptionItem[] = [
    buildAbsItem("Energía Eléctrica (Principal + BP + Red Fríos)", cf.energiaFinanzas, sumEnergiaComerciantes, asumidoFijoEnergia, sumVacanciaEnergia),
    buildAbsItem("Acueducto y Alcantarillado (EAAB)", cf.acueductoFinanzas, sumAcueductoComerciantes, asumidoFijoAcueducto, sumVacanciaAcueducto),
    buildAbsItem("Residuos Sólidos (ECSA) + Aseo (20%)", cf.aseoResiduosFinanzas, sumAseoResiduosComerciantes, asumidoFijoAseo, sumVacanciaAseoResiduos),
    buildAbsItem("Vigilancia y Seguridad Privada", cf.vigilanciaFinanzas, sumVigilanciaComerciantes, 0, sumVacanciaVigilancia),
    buildAbsItem("Convenio Policía Nacional", cf.policiaFinanzas, sumPoliciaComerciantes, 0, sumVacanciaPolicia),
  ];

  const kpi2TotalFinanzasCop = kpi2ServiciosAbsorcion.reduce((acc, s) => acc + s.vFinanzasCop, 0);
  const kpi2TotalLiquidadoComerciantesCop = kpi2ServiciosAbsorcion.reduce((acc, s) => acc + s.vLiquidadoComerciantesCop, 0);
  const kpi2TotalAsumidoCorporacionCop = kpi2ServiciosAbsorcion.reduce(
    (acc, s) => acc + s.asumidoCorporacionFijoCop + s.asumidoVacanciaSinContratoCop,
    0
  );
  const kpi2TasaRecuperacionGlobalPct =
    kpi2TotalFinanzasCop > 0 ? (kpi2TotalLiquidadoComerciantesCop / kpi2TotalFinanzasCop) * 100 : 100;

  // KPI 3: Salud del Parque Metrológico (1.688 medidores físicos únicos sobre 1.835 registros)
  const allTasks = buildCutoffReadingTasks(
    locales,
    energyCommunal,
    waterCommunal,
    bathroomMeters,
    completedTaskIds,
    fieldOverridesMap
  );

  const localMap = new Map<string, ComputedLocalLiquidation>();
  for (const l of locales) localMap.set(l.codigo, l);

  const createBucket = (
    categoria: BiMetrologicalHealthItem["categoria"],
    causal: string
  ): BiMetrologicalHealthItem => ({
    causal, categoria, cantidadEnergia: 0, cantidadAcueducto: 0, totalMedidores: 0,
    areaAfectadaM2: 0, facturacionMigradaProrrateoCop: 0,
  });

  const healthBuckets: Record<BiMetrologicalHealthItem["categoria"], BiMetrologicalHealthItem> = {
    OPERATIVO: createBucket("OPERATIVO", "Medidores Operativos Normal (Verificado / Sin Novedad)"),
    DETENIDO: createBucket("DETENIDO", "Contador / Medidor Detenido (C, DETENIDO / M, DETENIDO)"),
    TAPADO: createBucket("TAPADO", "Contador / Medidor Tapado u Obstruido (C, TAPADO / M, TAPADO)"),
    RETIRADO_REVISAR: createBucket("RETIRADO_REVISAR", "Medidor Retirado / En Revisión Técnica (RETIRADO / REVISAR)"),
    CERRADO_VACIO: createBucket("CERRADO_VACIO", "Local Cerrado / Vacío sin Acceso al Medidor (L, CERRADO / L, VACIO)"),
  };

  for (const task of allTasks) {
    const obs = (task.observacionActual || "").toUpperCase();
    let cat: BiMetrologicalHealthItem["categoria"] = "OPERATIVO";
    if (obs.includes("DETENIDO")) cat = "DETENIDO";
    else if (obs.includes("TAPADO") || obs.includes("ALMACENAMIENTO")) cat = "TAPADO";
    else if (obs.includes("RETIRADO") || obs.includes("REVISAR") || obs.includes("SUSPENDIDO")) cat = "RETIRADO_REVISAR";
    else if (obs.includes("CERRADO") || obs.includes("VACIO") || obs.includes("NO PERMITIO")) cat = "CERRADO_VACIO";

    const bucket = healthBuckets[cat];
    const isEnergia = task.servicio === "ENERGIA" || task.servicio === "MACRO_ENERGIA";
    if (isEnergia) bucket.cantidadEnergia += 1;
    else bucket.cantidadAcueducto += 1;
    bucket.totalMedidores += 1;
    bucket.areaAfectadaM2 += task.areaM2;

    if (cat !== "OPERATIVO") {
      for (const code of task.sharedCodigos) {
        const loc = localMap.get(code);
        if (loc) bucket.facturacionMigradaProrrateoCop += isEnergia ? loc.calcEnergiaCop : loc.calcAcueductoCop;
      }
    }
  }

  const kpi3DesgloseSalud = Object.values(healthBuckets);
  const kpi3TotalMedidoresFisicos = allTasks.length;
  const kpi3MedidoresOperativosOk = healthBuckets.OPERATIVO.totalMedidores;
  const kpi3MedidoresAnomalos =
    healthBuckets.DETENIDO.totalMedidores + healthBuckets.TAPADO.totalMedidores + healthBuckets.RETIRADO_REVISAR.totalMedidores;
  const kpi3SaludMetrologicaPct =
    kpi3TotalMedidoresFisicos > 0 ? (kpi3MedidoresOperativosOk / kpi3TotalMedidoresFisicos) * 100 : 100;
  const kpi3AreaForzadaProrrateoM2 =
    healthBuckets.DETENIDO.areaAfectadaM2 + healthBuckets.TAPADO.areaAfectadaM2 + healthBuckets.RETIRADO_REVISAR.areaAfectadaM2;
  const kpi3CopForzadoProrrateo =
    healthBuckets.DETENIDO.facturacionMigradaProrrateoCop +
    healthBuckets.TAPADO.facturacionMigradaProrrateoCop +
    healthBuckets.RETIRADO_REVISAR.facturacionMigradaProrrateoCop;

  // KPI 4: Intensidad por m² y Ranking Pareto usando TotalMayoOficial (SPEC.md §3.1.2)
  let globalAreaM2 = 0;
  let globalKwh = 0;
  let globalM3 = 0;
  let globalActualCop = 0;
  let globalMayoOficialCop = 0;

  const bodegaMap = new Map<
    string,
    {
      bodegaId: string; tipoPrincipal: string; totalLocales: number; areaTotalM2: number;
      totalKwh: number; totalM3: number; totalActualCop: number; totalAnteriorCop: number;
    }
  >();
  const paretoCandidates: BiParetoLocalItem[] = [];

  for (const loc of locales) {
    const mayoOficial = loc.totalMayoOficialCop ?? computeOfficialMayTotalCop(loc);
    const kwhLocal =
      loc.energiaConsumoIndivActualKw + loc.energiaConsumoComunalActualKw + loc.energiaConsumoAleroActualKw;
    const m3Local = loc.aguaConsumoIndivActualM3 + loc.aguaConsumoComunalActualM3;

    globalAreaM2 += loc.areaM2;
    globalKwh += kwhLocal;
    globalM3 += m3Local;
    globalActualCop += loc.calcTotalCop;
    globalMayoOficialCop += mayoOficial;

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
        totalAnteriorCop: mayoOficial,
      });
    } else {
      existing.totalLocales += 1;
      existing.areaTotalM2 += loc.areaM2;
      existing.totalKwh += kwhLocal;
      existing.totalM3 += m3Local;
      existing.totalActualCop += loc.calcTotalCop;
      existing.totalAnteriorCop += mayoOficial;
    }

    const saltoCop = loc.calcTotalCop - mayoOficial;
    const saltoPct = mayoOficial > 0 ? (saltoCop / mayoOficial) * 100 : 0;
    const promMax = (loc.energiaPromMax || 0) + (loc.aguaPromMax || 0);
    const excedeBanda = promMax > 0 && loc.calcEnergiaCop + loc.calcAcueductoCop > promMax * 1.05;

    paretoCandidates.push({
      codigoLocal: loc.codigo,
      bodegaId: loc.bodegaId,
      tipoLocal: loc.tipoBodega,
      areaM2: loc.areaM2,
      kwhActual: loc.energiaConsumoIndivActualKw,
      kwhAnterior: loc.energiaConsumoAntKw ?? loc.seedEnergiaConsumoIndivKw,
      m3Actual: loc.aguaConsumoIndivActualM3,
      m3Anterior: loc.aguaConsumoAntM3 ?? loc.seedAguaConsumoIndivM3,
      totalActualCop: loc.calcTotalCop,
      totalAnteriorCop: mayoOficial,
      promedioMaxCop: promMax,
      saltoMensualCop: saltoCop,
      saltoMensualPct: saltoPct,
      excedeBandaPromedioMax: excedeBanda,
    });
  }

  const kpi4PromedioKwhM2Global = globalAreaM2 > 0 ? globalKwh / globalAreaM2 : 0;
  const kpi4PromedioM3M2Global = globalAreaM2 > 0 ? globalM3 / globalAreaM2 : 0;
  const kpi4PromedioCopM2Global = globalAreaM2 > 0 ? globalActualCop / globalAreaM2 : 0;

  const kpi4TopBodegasIntensidad: BiBodegaIntensityBenchmark[] = Array.from(bodegaMap.values())
    .map((b) => {
      const area = Math.max(1, b.areaTotalM2);
      return {
        bodegaId: b.bodegaId,
        tipoPrincipal: b.tipoPrincipal,
        totalLocales: b.totalLocales,
        areaTotalM2: b.areaTotalM2,
        kwhPorM2: b.totalKwh / area,
        m3PorM2: b.totalM3 / area,
        copPorM2Actual: b.totalActualCop / area,
        copPorM2Anterior: b.totalAnteriorCop / area,
        variacionCopPct:
          b.totalAnteriorCop > 0 ? ((b.totalActualCop - b.totalAnteriorCop) / b.totalAnteriorCop) * 100 : 0,
        totalActualCop: b.totalActualCop,
        totalAnteriorCop: b.totalAnteriorCop,
      };
    })
    .sort((a, b) => b.totalActualCop - a.totalActualCop)
    .slice(0, 12);

  const kpi4TopParetoLocales = paretoCandidates
    .sort((a, b) => b.totalActualCop - a.totalActualCop)
    .slice(0, 15);

  // KPI 5: Comparativo Longitudinal Real Corte a Corte (Mayo 2025 Certificado vs Junio 2025)
  const kpi5VariacionMayoJunioPct =
    globalMayoOficialCop > 0 ? ((globalActualCop - globalMayoOficialCop) / globalMayoOficialCop) * 100 : 0;

  let sumEnergiaMayoCop = 0;
  let sumAcueductoMayoCop = 0;
  let sumVigilanciaMayoCop = 0;
  let sumResiduosMayoCop = 0;
  let sumAseoMayoCop = 0;
  let sumPoliciaMayoCop = 0;
  let sumKwhMayo = 0;
  let sumM3Mayo = 0;

  for (const loc of locales) {
    sumEnergiaMayoCop += loc.energiaAnteriorCop ?? 0;
    sumAcueductoMayoCop += loc.acueductoAnteriorCop ?? 0;
    sumVigilanciaMayoCop += loc.vigilanciaAnteriorCop ?? 0;
    sumResiduosMayoCop += loc.residuosAnteriorCop ?? 0;
    sumAseoMayoCop += loc.aseoAnteriorCop ?? 0;
    sumPoliciaMayoCop += loc.policiaAnteriorCop ?? 0;
    sumKwhMayo += loc.energiaConsumoAntKw ?? 0;
    sumM3Mayo += loc.aguaConsumoAntM3 ?? 0;
  }

  const macroAntEnergiaKw = energyCommunal.reduce((acc, m) => acc + m.consumoAnterior, 0);
  const tarifaKwhJun = normReceipts.energia.tarifaKwh;
  const tarifaM3Jun = normReceipts.acueducto.tarifaM3;
  const tarifaVigJun = normReceipts.expensas.vigilancia.tarifaPorM2;
  const tarifaResPJun = normReceipts.expensas.residuosEcsa.tarifaEfectivaPM2;

  const totalExpensasJun = sumAseoResiduosComerciantes + sumVigilanciaComerciantes + sumPoliciaComerciantes;
  const totalExpensasMayo = sumVigilanciaMayoCop + sumResiduosMayoCop + sumAseoMayoCop + sumPoliciaMayoCop;
  const indiceComunalMayoPct =
    kpi1TotalBrutoEnergiaKw > 0 ? (macroAntEnergiaKw / kpi1TotalBrutoEnergiaKw) * 100 : kpi1IndiceComunalEnergiaPct;

  const kpi5SerieLongitudinal: BiLongitudinalCutoffPoint[] = [
    {
      corteId: "2025-05",
      etiqueta: "Mayo 2025 (Corte Anterior Certificado)",
      totalFacturadoRealCop: globalMayoOficialCop,
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
      etiqueta: "Junio 2025 (Corte Activo Oficial)",
      totalFacturadoRealCop: globalActualCop,
      energiaTotalCop: sumEnergiaComerciantes,
      acueductoTotalCop: sumAcueductoComerciantes,
      expensasTotalCop: totalExpensasJun,
      vigilanciaTotalCop: sumVigilanciaComerciantes,
      residuosTotalCop: sumResiduosComerciantes,
      aseoTotalCop: sumAseoComerciantes,
      policiaTotalCop: sumPoliciaComerciantes,
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

  // KPI 6: Eficiencia Operativa del Corte (SLA Terreno sobre 1.688 tareas físicas)
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
