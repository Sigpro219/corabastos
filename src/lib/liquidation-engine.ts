import {
  CommunalEnergyMeter,
  CommunalWaterMeter,
  computeOfficialMayTotalCop,
  FieldReadingUpdate,
  FieldServiceType,
  isRedFriosModality,
  JUNE_2025_REFERENCE_RECEIPTS,
  LocalUnitRecord,
  MasterReceiptsConfig,
  OccupancyStatus,
} from "@/contracts/domain-contracts";

export function buildTaskKey(servicio: FieldServiceType, codigo: string): string {
  return `${servicio}::${codigo}`;
}

export interface CommunalHierarchyBreakdown {
  id: string; codigo: string; bodegaId: string; tipo: string; contadorSerie: string;
  lecturaAnterior: number; lecturaActual: number; consumoBruto: number;
  hijosCount: number; hijosCodigos: string[]; consumoHijosDescontado: number;
  consumoNetoComunal: number; consumoAnterior: number; variacionPct: number;
  areaComunalM2: number; factorPorM2: number; deltaFactorPorM2: number;
  observacion: string; alertaDesviacion: boolean;
}

export interface ComputedLocalLiquidation extends LocalUnitRecord {
  effectiveOccupancy: OccupancyStatus; totalMayoOficialCop: number;
  energiaConsumoIndivActualKw: number; energiaConsumoComunalActualKw: number; energiaConsumoAleroActualKw: number;
  aguaConsumoIndivActualM3: number; aguaConsumoComunalActualM3: number;
  seedEnergiaLecturaAnt: number; seedEnergiaLecturaAct: number; seedEnergiaConsumoIndivKw: number;
  seedEnergiaConsumoComunalKw: number; seedEnergiaConsumoAleroKw: number;
  seedAguaLecturaAnt: number; seedAguaLecturaAct: number; seedAguaConsumoIndivM3: number; seedAguaConsumoComunalM3: number;
  hasEnergiaOverride: boolean; hasAguaOverride: boolean;
  hasCommunalEnergyDelta: boolean; hasCommunalWaterDelta: boolean;
  calcEnergiaCop: number; calcAcueductoCop: number; calcAseoCop: number;
  calcResiduosCop: number; calcVigilanciaCop: number; calcPoliciaCop: number;
  calcTotalCop: number; calcAssumedCorporationCop: number; variacionTotalPct: number;
}

export interface LiveLiquidationBagsSummary {
  bolsaProrrateoPrincipalCop: number; bolsaProrrateoBpCop: number; bolsaProrrateoAguaCop: number;
  deltaCostoBaseMedidoYComunalPrincipal: number; deltaCostoBaseContadorBP: number; deltaCostoBaseMedidoYComunalAgua: number;
  bolsaNpCop: number; bolsaMpCop: number; bolsaRestantePCop: number;
  tarifaProrrateoPrincipalM2: number; tarifaProrrateoBpM2: number; tarifaComunalBpM2: number; tarifaAlumbradoGeneralM2: number;
  tarifaProrrateoAguaM2: number; tarifaRedFriosAguaM2: number; tarifaAguaComunalGeneralM2: number;
  tarifaVigilanciaM2: number; tarifaAseoM2: number; cuotaPoliciaPorLocal: number;
  tarifaBaseResiduosM2: number; tarifaEfectivaNpM2: number; tarifaEfectivaMpM2: number; tarifaEfectivaPM2: number;
}

export interface LiquidationEngineOptions {
  energyMacroMeters?: CommunalEnergyMeter[]; waterMacroMeters?: CommunalWaterMeter[];
  fieldOverridesMap?: Record<string, FieldReadingUpdate>; occupancyMap?: Record<string, OccupancyStatus>;
  seedReceipts?: MasterReceiptsConfig;
}

function isDefectiveMeterObservation(obs: string): boolean {
  const u = (obs || "").toUpperCase();
  return u.includes("DETENIDO") || u.includes("TAPADO") || u.includes("RETIRADO") || u.includes("REVISAR") || u.includes("DEFECTUOSO");
}

function isAnomalousOrClosedObservation(obs: string): boolean {
  const u = (obs || "").toUpperCase();
  return isDefectiveMeterObservation(u) || u.includes("SUSPENDIDO") || u.includes("VACIO") || u.includes("CERRADO") || u.includes("NO PERMITIO");
}

export function hasServiceAlertEstado(estado: string): boolean {
  const u = (estado || "").trim().toUpperCase();
  if (!u || u === "OK" || u === "42") return false;
  return (
    u === "REVISAR" ||
    u === "PROMEDIO <" ||
    u === "PROMEDIO >" ||
    isAnomalousOrClosedObservation(u)
  );
}

export function hasLocalServiceAlert(loc: Pick<LocalUnitRecord, "energiaEstado" | "aguaEstado">): boolean {
  return hasServiceAlertEstado(loc.energiaEstado) || hasServiceAlertEstado(loc.aguaEstado);
}

function resolveDynamicServiceEstado(seedEstado: string, ovr: FieldReadingUpdate | undefined, calcCop: number, promMin: number, promMax: number): string {
  if (ovr === undefined) return seedEstado;
  if (isAnomalousOrClosedObservation(ovr.observacion)) return ovr.observacion;
  if (promMin > 0 && calcCop < promMin) return "PROMEDIO <";
  if (promMax > 0 && calcCop > promMax) return "PROMEDIO >";
  return "OK";
}

function deriveResiduosTariffs(resCfg: MasterReceiptsConfig["expensas"]["residuosEcsa"]) {
  const baseM2 = resCfg.areaTotalProrrateoM2 > 0 ? resCfg.valorNetoProrratear / resCfg.areaTotalProrrateoM2 : resCfg.tarifaBaseM2;
  const npM2 = baseM2 * resCfg.factorNP;
  const mpM2 = baseM2 * resCfg.factorMP;
  const bolsaNpCop = resCfg.areaNpM2 * npM2;
  const bolsaMpCop = resCfg.areaMpM2 * mpM2;
  const bolsaRestantePCop = Math.max(0, resCfg.valorNetoProrratear - bolsaNpCop - bolsaMpCop);
  const pM2 = resCfg.areaPM2 > 0 ? bolsaRestantePCop / resCfg.areaPM2 : resCfg.tarifaEfectivaPM2;
  return { baseM2, npM2, mpM2, pM2, bolsaNpCop, bolsaMpCop, bolsaRestantePCop };
}

export function normalizeMasterReceipts(next: MasterReceiptsConfig): MasterReceiptsConfig {
  const alum = next.energia.alumbradoGeneral;
  const vig = next.expensas.vigilancia;
  const aseo = next.expensas.aseo;
  const pol = next.expensas.policia;
  const res = deriveResiduosTariffs(next.expensas.residuosEcsa);
  return {
    ...next,
    energia: {
      ...next.energia,
      alumbradoGeneral: { ...alum, tarifaPorM2: alum.areaTotalM2 > 0 ? alum.bolsaTotal / alum.areaTotalM2 : alum.tarifaPorM2 },
    },
    expensas: {
      ...next.expensas,
      policia: { ...pol, cuotaFijaPorLocal: pol.localesActivosDivisor > 0 ? pol.valorFactura / pol.localesActivosDivisor : pol.cuotaFijaPorLocal },
      vigilancia: { ...vig, tarifaPorM2: vig.areaTotalM2 > 0 ? vig.valorNetoDistribuir / vig.areaTotalM2 : vig.tarifaPorM2 },
      aseo: { ...aseo, tarifaPorM2: aseo.areaTotalM2 > 0 ? aseo.valorNetoDistribuir / aseo.areaTotalM2 : aseo.tarifaPorM2 },
      residuosEcsa: {
        ...next.expensas.residuosEcsa,
        tarifaBaseM2: res.baseM2,
        tarifaEfectivaNpM2: res.npM2,
        tarifaEfectivaMpM2: res.mpM2,
        tarifaEfectivaPM2: res.pM2,
      },
    },
  };
}

function computeGenericHierarchy(
  meters: Array<{
    id: string; codigo: string; bodegaId: string; lecturaAnterior: number; lecturaActual: number;
    consumoNeto: number; consumoAnt: number; tipo: string; areaM2: number; contadorSerie: string;
    observacion: string; hijosContadorCodigos: string[];
  }>,
  servicio: "MACRO_ENERGIA" | "MACRO_AGUA",
  localesByCode: Map<string, LocalUnitRecord | ComputedLocalLiquidation>,
  fieldOverridesMap: Record<string, FieldReadingUpdate>,
  resolveFallbackArea: (bodegaId: string, tipo: string) => number,
  getChildVals: (child: LocalUnitRecord | ComputedLocalLiquidation) => { actual: number; seed: number },
  alertCheck: (obs: string) => boolean
): CommunalHierarchyBreakdown[] {
  return meters.map((m) => {
    const validChildren = Array.from(new Set(m.hijosContadorCodigos)).filter(
      (c) => localesByCode.get(c)?.bodegaId === m.bodegaId
    );
    const mOvr = fieldOverridesMap[buildTaskKey(servicio, m.codigo)];
    const effLectAct = mOvr ? mOvr.lecturaActual : m.lecturaActual;
    const effObs = mOvr ? mOvr.observacion : m.observacion;
    const brutoSemilla = Math.max(0, m.lecturaActual - m.lecturaAnterior);
    const brutoEfectivo = mOvr ? Math.max(0, effLectAct - m.lecturaAnterior) : brutoSemilla;
    const deltaPadre = mOvr ? brutoEfectivo - brutoSemilla : 0;

    let sumaHijosActual = 0;
    let deltaHijos = 0;
    for (const code of validChildren) {
      const child = localesByCode.get(code);
      if (!child) continue;
      const { actual, seed } = getChildVals(child);
      sumaHijosActual += Math.max(0, actual);
      deltaHijos += actual - seed;
    }

    const netoActual = Math.max(0, m.consumoNeto + deltaPadre - deltaHijos);
    const areaEfectiva = m.areaM2 > 0 ? m.areaM2 : resolveFallbackArea(m.bodegaId, m.tipo);
    const factorPorM2 = areaEfectiva > 0 ? netoActual / areaEfectiva : 0;
    const deltaFactorPorM2 = areaEfectiva > 0 ? (netoActual - m.consumoNeto) / areaEfectiva : 0;
    const variacionPct = m.consumoAnt > 0 ? netoActual / m.consumoAnt - 1 : 0;

    return {
      id: m.id, codigo: m.codigo, bodegaId: m.bodegaId, tipo: m.tipo, contadorSerie: m.contadorSerie,
      lecturaAnterior: m.lecturaAnterior, lecturaActual: effLectAct, consumoBruto: brutoEfectivo,
      hijosCount: validChildren.length, hijosCodigos: validChildren, consumoHijosDescontado: sumaHijosActual,
      consumoNetoComunal: netoActual, consumoAnterior: m.consumoAnt, variacionPct,
      areaComunalM2: areaEfectiva, factorPorM2, deltaFactorPorM2, observacion: effObs,
      alertaDesviacion: Math.abs(variacionPct) > 0.25 || alertCheck(effObs),
    };
  });
}

export function computeEnergyCommunalHierarchy(
  meters: CommunalEnergyMeter[],
  localesByCode: Map<string, LocalUnitRecord | ComputedLocalLiquidation>,
  fieldOverridesMap: Record<string, FieldReadingUpdate> = {}
): CommunalHierarchyBreakdown[] {
  const communalArea = new Map<string, number>();
  const allArea = new Map<string, number>();
  for (const loc of localesByCode.values()) {
    allArea.set(loc.bodegaId, (allArea.get(loc.bodegaId) ?? 0) + loc.areaM2);
    if (loc.modalidadEnergia === "COMUNAL") communalArea.set(loc.bodegaId, (communalArea.get(loc.bodegaId) ?? 0) + loc.areaM2);
  }
  return computeGenericHierarchy(
    meters.map((m) => ({ ...m, consumoNeto: m.consumoNetoKw, consumoAnt: m.consumoAnteriorKw })),
    "MACRO_ENERGIA", localesByCode, fieldOverridesMap,
    (bod, tipo) => (tipo === "ALERO" ? allArea.get(bod) ?? 0 : communalArea.get(bod) ?? 0),
    (c) => ({
      actual: "energiaConsumoIndivActualKw" in c ? c.energiaConsumoIndivActualKw : c.energiaConsumoIndivKw,
      seed: "seedEnergiaConsumoIndivKw" in c ? c.seedEnergiaConsumoIndivKw : c.energiaConsumoIndivKw,
    }),
    (obs) => obs.includes("DETENIDO") || obs.includes("RETIRADO")
  );
}

export function computeWaterCommunalHierarchy(
  meters: CommunalWaterMeter[],
  localesByCode: Map<string, LocalUnitRecord | ComputedLocalLiquidation>,
  fieldOverridesMap: Record<string, FieldReadingUpdate> = {}
): CommunalHierarchyBreakdown[] {
  const communalArea = new Map<string, number>();
  for (const loc of localesByCode.values()) {
    if (loc.modalidadAcueducto === "COMUNAL") communalArea.set(loc.bodegaId, (communalArea.get(loc.bodegaId) ?? 0) + loc.areaM2);
  }
  return computeGenericHierarchy(
    meters.map((m) => ({ ...m, consumoNeto: m.consumoNetoM3, consumoAnt: m.consumoAnteriorM3, tipo: "ACUEDUCTO COMUNAL" })),
    "MACRO_AGUA", localesByCode, fieldOverridesMap,
    (bod) => communalArea.get(bod) ?? 0,
    (c) => ({
      actual: "aguaConsumoIndivActualM3" in c ? c.aguaConsumoIndivActualM3 : c.aguaConsumoIndivM3,
      seed: "seedAguaConsumoIndivM3" in c ? c.seedAguaConsumoIndivM3 : c.aguaConsumoIndivM3,
    }),
    (obs) => obs.includes("TAPADO") || obs.includes("REVISAR")
  );
}

/**
 * Pipeline Topológico Determinista sobre los 5.318 Locales (SPEC.md v3.1.0 §3.1, §3.2, §3.3).
 */
export function recalculateAllLocales(
  locales: LocalUnitRecord[],
  receipts: MasterReceiptsConfig,
  options: LiquidationEngineOptions = {}
): ComputedLocalLiquidation[] {
  const seed = options.seedReceipts ?? JUNE_2025_REFERENCE_RECEIPTS;
  const fieldOverridesMap = options.fieldOverridesMap ?? {};
  const occupancyMap = options.occupancyMap ?? {};
  const energyMacros = options.energyMacroMeters ?? [];
  const waterMacros = options.waterMacroMeters ?? [];

  const step1Map = new Map<
    string,
    LocalUnitRecord & {
      effectiveOccupancy: OccupancyStatus; energiaConsumoIndivActualKw: number; seedEnergiaConsumoIndivKw: number;
      aguaConsumoIndivActualM3: number; seedAguaConsumoIndivM3: number;
    }
  >();

  for (const loc of locales) {
    const effectiveOccupancy: OccupancyStatus = occupancyMap[loc.codigo] ?? "ACTIVO";
    const eOvr = fieldOverridesMap[buildTaskKey("ENERGIA", loc.codigo)];
    const wOvr = fieldOverridesMap[buildTaskKey("AGUA", loc.codigo)];
    const divE = Math.max(1, loc.energiaDivisorContador || 1);
    const divA = Math.max(1, loc.aguaDivisorContador || 1);
    const indivKw = effectiveOccupancy === "VACIO_CON_CONTRATO" ? 0
      : loc.modalidadEnergia === "CONTADOR" && eOvr !== undefined ? Math.max(0, eOvr.lecturaActual - loc.energiaLecturaAnt) / divE : loc.energiaConsumoIndivKw;
    const indivM3 = effectiveOccupancy === "VACIO_CON_CONTRATO" ? 0
      : loc.modalidadAcueducto === "CONTADOR" && wOvr !== undefined ? Math.max(0, wOvr.lecturaActual - loc.aguaLecturaAnt) / divA : loc.aguaConsumoIndivM3;

    step1Map.set(loc.codigo, {
      ...loc, effectiveOccupancy,
      energiaConsumoIndivActualKw: indivKw, seedEnergiaConsumoIndivKw: loc.energiaConsumoIndivKw,
      aguaConsumoIndivActualM3: indivM3, seedAguaConsumoIndivM3: loc.aguaConsumoIndivM3,
    });
  }

  const eBreakdowns = computeEnergyCommunalHierarchy(energyMacros, step1Map, fieldOverridesMap);
  const wBreakdowns = computeWaterCommunalHierarchy(waterMacros, step1Map, fieldOverridesMap);

  const deltaAleroByBodega = new Map<string, number>();
  const deltaBodegaEnergyByBodega = new Map<string, number>();
  for (const eb of eBreakdowns) {
    if (eb.tipo === "ALERO") deltaAleroByBodega.set(eb.bodegaId, eb.deltaFactorPorM2);
    else deltaBodegaEnergyByBodega.set(eb.bodegaId, eb.deltaFactorPorM2);
  }
  const deltaWaterByBodega = new Map<string, number>();
  for (const wb of wBreakdowns) {
    deltaWaterByBodega.set(wb.bodegaId, wb.deltaFactorPorM2);
  }

  const normCur = normalizeMasterReceipts(receipts);
  const normSeed = normalizeMasterReceipts(seed);
  const curKwh = normCur.energia.tarifaKwh;
  const seedKwh = normSeed.energia.tarifaKwh;
  const curM3 = normCur.acueducto.tarifaM3;
  const seedM3 = normSeed.acueducto.tarifaM3;

  const tarifaAlumbradoM2 = normCur.energia.alumbradoGeneral.tarifaPorM2;
  const seedAlumbradoM2 = normSeed.energia.alumbradoGeneral.tarifaPorM2;
  const tarifaAguaComunalM2 = normCur.acueducto.areaComunalGeneralM2 > 0
    ? normCur.acueducto.bolsaAguaComunalGeneral / normCur.acueducto.areaComunalGeneralM2 : 198.2038;
  const seedAguaComunalM2 = normSeed.acueducto.areaComunalGeneralM2 > 0
    ? normSeed.acueducto.bolsaAguaComunalGeneral / normSeed.acueducto.areaComunalGeneralM2 : 198.2038;

  const isEnergyReceiptModified =
    Math.abs(curKwh - seedKwh) > 1e-6 || Math.abs(tarifaAlumbradoM2 - seedAlumbradoM2) > 1e-6 ||
    Math.abs(normCur.energia.principal.topeMinimaCop - normSeed.energia.principal.topeMinimaCop) > 1e-6 ||
    Math.abs(normCur.energia.bodegaPopular.topeMinimaCop - normSeed.energia.bodegaPopular.topeMinimaCop) > 1e-6 ||
    Math.abs(normCur.energia.bodegaPopular.tasaCregPct - normSeed.energia.bodegaPopular.tasaCregPct) > 1e-6;
  const isWaterReceiptModified =
    Math.abs(curM3 - seedM3) > 1e-6 || Math.abs(tarifaAguaComunalM2 - seedAguaComunalM2) > 1e-6 ||
    Math.abs(normCur.acueducto.topeMinimaCop - normSeed.acueducto.topeMinimaCop) > 1e-6;

  const aseoRatio = normSeed.expensas.aseo.tarifaPorM2 > 0 ? normCur.expensas.aseo.tarifaPorM2 / normSeed.expensas.aseo.tarifaPorM2 : 1;
  const vigRatio = normSeed.expensas.vigilancia.tarifaPorM2 > 0 ? normCur.expensas.vigilancia.tarifaPorM2 / normSeed.expensas.vigilancia.tarifaPorM2 : 1;
  const policiaRatio = normSeed.expensas.policia.cuotaFijaPorLocal > 0 ? normCur.expensas.policia.cuotaFijaPorLocal / normSeed.expensas.policia.cuotaFijaPorLocal : 1;

  const curRes = deriveResiduosTariffs(normCur.expensas.residuosEcsa);
  const seedRes = deriveResiduosTariffs(normSeed.expensas.residuosEcsa);
  const npRatio = seedRes.npM2 > 0 ? curRes.npM2 / seedRes.npM2 : 1;
  const mpRatio = seedRes.mpM2 > 0 ? curRes.mpM2 / seedRes.mpM2 : 1;
  const pRatio = seedRes.pM2 > 0 ? curRes.pM2 / seedRes.pM2 : 1;
  const basicosRatio = normSeed.expensas.residuosEcsa.valorBasicos > 0
    ? normCur.expensas.residuosEcsa.valorBasicos / normSeed.expensas.residuosEcsa.valorBasicos : 1;

  let deltaCostoBaseMedidoYComunalPrincipal = 0;
  let deltaCostoBaseContadorBP = 0;
  let deltaCostoBaseMedidoYComunalAgua = 0;

  const pass1Records = locales.map((loc) => {
    const s1 = step1Map.get(loc.codigo)!;
    const dfAlero = deltaAleroByBodega.get(loc.bodegaId) ?? 0;
    const dfBodE = deltaBodegaEnergyByBodega.get(loc.bodegaId) ?? 0;
    const dfWat = deltaWaterByBodega.get(loc.bodegaId) ?? 0;

    const aleroChanged = Math.abs(dfAlero) > 1e-7;
    const bodEChanged = Math.abs(dfBodE) > 1e-7 && (loc.modalidadEnergia === "COMUNAL" || loc.energiaConsumoComunalKw > 0);
    const watComChanged = Math.abs(dfWat) > 1e-7 && (loc.modalidadAcueducto === "COMUNAL" || loc.aguaConsumoComunalM3 > 0);

    const energiaConsumoAleroActualKw = aleroChanged ? Math.max(0, loc.energiaConsumoAleroKw + loc.areaM2 * dfAlero) : loc.energiaConsumoAleroKw;
    const energiaConsumoComunalActualKw = bodEChanged ? Math.max(0, loc.energiaConsumoComunalKw + loc.areaM2 * dfBodE) : loc.energiaConsumoComunalKw;
    const aguaConsumoComunalActualM3 = watComChanged ? Math.max(0, loc.aguaConsumoComunalM3 + loc.areaM2 * dfWat) : loc.aguaConsumoComunalM3;

    const eOvr = fieldOverridesMap[buildTaskKey("ENERGIA", loc.codigo)];
    const wOvr = fieldOverridesMap[buildTaskKey("AGUA", loc.codigo)];
    const isEDefective = eOvr !== undefined && isDefectiveMeterObservation(eOvr.observacion);
    const isWDefective = wOvr !== undefined && isDefectiveMeterObservation(wOvr.observacion);

    const isBp = loc.bloqueEnergia === "BODEGA_POPULAR";
    const topeAct = isBp ? normCur.energia.bodegaPopular.topeMinimaCop : normCur.energia.principal.topeMinimaCop;
    const topeSeed = isBp ? normSeed.energia.bodegaPopular.topeMinimaCop : normSeed.energia.principal.topeMinimaCop;
    const energyTariffOrMinChanged = Math.abs(curKwh - seedKwh) > 1e-6 || Math.abs(topeAct - topeSeed) > 1e-6;

    if (
      (loc.modalidadEnergia === "CONTADOR" || loc.modalidadEnergia === "COMUNAL") &&
      (eOvr !== undefined || aleroChanged || bodEChanged || s1.effectiveOccupancy === "VACIO_CON_CONTRATO" || energyTariffOrMinChanged)
    ) {
      const kwSeed = loc.energiaConsumoIndivKw + loc.energiaConsumoAleroKw + loc.energiaConsumoComunalKw;
      const kwAct = s1.energiaConsumoIndivActualKw + energiaConsumoAleroActualKw + energiaConsumoComunalActualKw;
      const baseSeed = Math.max(topeSeed, kwSeed * seedKwh);
      const baseAct = isEDefective ? 0 : Math.max(topeAct, kwAct * curKwh);
      if (isBp && loc.modalidadEnergia === "CONTADOR") deltaCostoBaseContadorBP += baseAct - baseSeed;
      else if (!isBp) deltaCostoBaseMedidoYComunalPrincipal += baseAct - baseSeed;
    }

    const waterTariffOrMinChanged = Math.abs(curM3 - seedM3) > 1e-6 || Math.abs(normCur.acueducto.topeMinimaCop - normSeed.acueducto.topeMinimaCop) > 1e-6;

    if (
      (loc.modalidadAcueducto === "CONTADOR" || loc.modalidadAcueducto === "COMUNAL") &&
      (wOvr !== undefined || watComChanged || s1.effectiveOccupancy === "VACIO_CON_CONTRATO" || waterTariffOrMinChanged)
    ) {
      const m3Seed = loc.aguaConsumoIndivM3 + loc.aguaConsumoComunalM3;
      const m3Act = s1.aguaConsumoIndivActualM3 + aguaConsumoComunalActualM3;
      const baseSeed = Math.max(normSeed.acueducto.topeMinimaCop, m3Seed * seedM3);
      const baseAct = isWDefective ? 0 : Math.max(normCur.acueducto.topeMinimaCop, m3Act * curM3);
      deltaCostoBaseMedidoYComunalAgua += baseAct - baseSeed;
    }

    return {
      loc, s1, eOvr, wOvr, isEDefective, isWDefective, aleroChanged, bodEChanged, watComChanged,
      energiaConsumoAleroActualKw, energiaConsumoComunalActualKw, aguaConsumoComunalActualM3,
    };
  });

  const bolsaProrrateoPrincipalAct = Math.max(
    0,
    normCur.energia.principal.bolsaProrrateo +
      (normCur.energia.principal.valorNetoServicio - normSeed.energia.principal.valorNetoServicio) -
      deltaCostoBaseMedidoYComunalPrincipal
  );
  const bolsaProrrateoBpAct = Math.max(
    0,
    normCur.energia.bodegaPopular.bolsaProrrateo +
      (normCur.energia.bodegaPopular.valorFacturaNeto - normSeed.energia.bodegaPopular.valorFacturaNeto) -
      deltaCostoBaseContadorBP
  );
  const bolsaProrrateoAguaAct = Math.max(
    0,
    normCur.acueducto.bolsaProrrateo +
      (normCur.acueducto.valorFacturaGeneral - normSeed.acueducto.valorFacturaGeneral) -
      deltaCostoBaseMedidoYComunalAgua
  );

  const tarifaProrrateoEnergiaM2 = normCur.energia.principal.areaProrrateoM2 > 0
    ? bolsaProrrateoPrincipalAct / normCur.energia.principal.areaProrrateoM2 : 10548.66;
  const tarifaProrrateoBpM2 = normCur.energia.bodegaPopular.areaProrrateoM2 > 0
    ? bolsaProrrateoBpAct / normCur.energia.bodegaPopular.areaProrrateoM2 : 7041.5;
  const tarifaProrrateoAguaM2 = normCur.acueducto.areaProrrateoM2 > 0
    ? bolsaProrrateoAguaAct / normCur.acueducto.areaProrrateoM2 : 1249.4436;

  const ratioProrrateoPrincipal = normSeed.energia.principal.bolsaProrrateo > 0
    ? bolsaProrrateoPrincipalAct / normSeed.energia.principal.bolsaProrrateo : 1;
  const ratioProrrateoBp = normSeed.energia.bodegaPopular.bolsaProrrateo > 0
    ? bolsaProrrateoBpAct / normSeed.energia.bodegaPopular.bolsaProrrateo : 1;
  const cregBpRatio = (1 + normCur.energia.bodegaPopular.tasaCregPct) / (1 + normSeed.energia.bodegaPopular.tasaCregPct);
  const ratioRedFriosEnergia = normSeed.energia.redFrios.valorNetoServicio > 0
    ? normCur.energia.redFrios.valorNetoServicio / normSeed.energia.redFrios.valorNetoServicio : 1;
  const ratioProrrateoAgua = normSeed.acueducto.bolsaProrrateo > 0
    ? bolsaProrrateoAguaAct / normSeed.acueducto.bolsaProrrateo : 1;
  const ratioRedFriosAgua = normSeed.acueducto.valorFacturaRedFrios > 0
    ? normCur.acueducto.valorFacturaRedFrios / normSeed.acueducto.valorFacturaRedFrios : 1;

  return pass1Records.map((item) => {
    const {
      loc, s1, eOvr, wOvr, isEDefective, isWDefective, aleroChanged, bodEChanged, watComChanged,
      energiaConsumoAleroActualKw, energiaConsumoComunalActualKw, aguaConsumoComunalActualM3,
    } = item;
    const isBp = loc.bloqueEnergia === "BODEGA_POPULAR";
    const cregRate = isBp ? normCur.energia.bodegaPopular.tasaCregPct : 0.2;
    const seedEnergiaCop = loc.energiaBpCop + loc.energiaPrincipalCop;

    let calcEnergiaCop = seedEnergiaCop;
    if (s1.effectiveOccupancy === "VACIO_CON_CONTRATO") {
      const topeMin = isBp ? normCur.energia.bodegaPopular.topeMinimaCop : normCur.energia.principal.topeMinimaCop;
      const baseConsumo = Math.max(topeMin, (energiaConsumoAleroActualKw + energiaConsumoComunalActualKw) * curKwh);
      calcEnergiaCop = Math.round((baseConsumo + loc.areaM2 * tarifaAlumbradoM2) * (1 + cregRate));
    } else if (isEDefective && loc.modalidadEnergia === "CONTADOR") {
      const pTariff = isBp ? tarifaProrrateoBpM2 : tarifaProrrateoEnergiaM2;
      calcEnergiaCop = Math.round(loc.areaM2 * (pTariff + tarifaAlumbradoM2) * (1 + cregRate));
    } else if (isRedFriosModality(loc.modalidadEnergia)) {
      calcEnergiaCop = Math.round(seedEnergiaCop * ratioRedFriosEnergia);
    } else if (loc.modalidadEnergia === "PRORRATEO") {
      const deltaComKw = (energiaConsumoAleroActualKw - loc.energiaConsumoAleroKw) + (energiaConsumoComunalActualKw - loc.energiaConsumoComunalKw);
      const bolsaRatio = isBp ? ratioProrrateoBp * cregBpRatio : ratioProrrateoPrincipal;
      calcEnergiaCop = Math.max(0, Math.round(seedEnergiaCop * bolsaRatio + deltaComKw * curKwh * (1 + cregRate)));
    } else if (eOvr !== undefined || aleroChanged || bodEChanged || isEnergyReceiptModified) {
      const topeMin = isBp ? normCur.energia.bodegaPopular.topeMinimaCop : normCur.energia.principal.topeMinimaCop;
      const totalKw = s1.energiaConsumoIndivActualKw + energiaConsumoAleroActualKw + energiaConsumoComunalActualKw;
      calcEnergiaCop = Math.round((Math.max(topeMin, totalKw * curKwh) + loc.areaM2 * tarifaAlumbradoM2) * (1 + cregRate));
    }

    let calcAcueductoCop = loc.acueductoCop;
    if (s1.effectiveOccupancy === "VACIO_CON_CONTRATO") {
      const baseAgua = Math.max(normCur.acueducto.topeMinimaCop, aguaConsumoComunalActualM3 * curM3);
      calcAcueductoCop = Math.round(baseAgua + loc.areaM2 * tarifaAguaComunalM2);
    } else if (isWDefective && loc.modalidadAcueducto === "CONTADOR") {
      calcAcueductoCop = Math.round(loc.areaM2 * (tarifaProrrateoAguaM2 + tarifaAguaComunalM2));
    } else if (isRedFriosModality(loc.modalidadAcueducto)) {
      calcAcueductoCop = Math.round(loc.acueductoCop * ratioRedFriosAgua);
    } else if (loc.modalidadAcueducto === "PRORRATEO") {
      calcAcueductoCop = Math.round(loc.acueductoCop * ratioProrrateoAgua);
    } else if (wOvr !== undefined || watComChanged || isWaterReceiptModified) {
      const costoAgua = Math.max(normCur.acueducto.topeMinimaCop, (s1.aguaConsumoIndivActualM3 + aguaConsumoComunalActualM3) * curM3);
      calcAcueductoCop = Math.round(costoAgua + loc.areaM2 * tarifaAguaComunalM2);
    }

    const calcAseoCop = loc.aseoCop > 0 ? Math.round(loc.aseoCop * aseoRatio) : 0;
    let calcResiduosCop = loc.residuosCop;
    if (loc.residuosCop > 0) {
      if (loc.categoriaResiduos === "NP") calcResiduosCop = Math.round(loc.residuosCop * npRatio);
      else if (loc.categoriaResiduos === "MP") calcResiduosCop = Math.round(loc.residuosCop * mpRatio);
      else if (loc.categoriaResiduos === "P") calcResiduosCop = Math.round(loc.residuosCop * pRatio);
      else if (loc.categoriaResiduos === "BASICOS") calcResiduosCop = Math.round(loc.residuosCop * basicosRatio);
    }
    const calcVigilanciaCop = loc.vigilanciaCop > 0 ? Math.round(loc.vigilanciaCop * vigRatio) : 0;
    const calcPoliciaCop = loc.policiaCop > 0 ? Math.round(loc.policiaCop * policiaRatio) : 0;

    const rawTotalCop = calcEnergiaCop + calcAcueductoCop + calcAseoCop + calcResiduosCop + calcVigilanciaCop + calcPoliciaCop;
    const isAssumedByCorp = s1.effectiveOccupancy === "VACIO_SIN_CONTRATO_CORPORACION";
    const calcAssumedCorporationCop = isAssumedByCorp ? rawTotalCop : 0;
    const calcTotalCop = isAssumedByCorp ? 0 : rawTotalCop;
    const totalMayoOficialCop = computeOfficialMayTotalCop(loc);
    const variacionTotalPct = totalMayoOficialCop > 0 ? (calcTotalCop - totalMayoOficialCop) / totalMayoOficialCop : 0;

    return {
      ...loc,
      estadoOcupacion: s1.effectiveOccupancy, effectiveOccupancy: s1.effectiveOccupancy, totalMayoOficialCop,
      energiaLecturaAct: eOvr ? eOvr.lecturaActual : loc.energiaLecturaAct,
      energiaObs: eOvr ? eOvr.observacion : loc.energiaObs,
      energiaEstado: resolveDynamicServiceEstado(loc.energiaEstado, eOvr, calcEnergiaCop, loc.energiaPromMin, loc.energiaPromMax),
      energiaTareaEstado: eOvr?.taskState ?? loc.energiaTareaEstado,
      aguaLecturaAct: wOvr ? wOvr.lecturaActual : loc.aguaLecturaAct,
      aguaObs: wOvr ? wOvr.observacion : loc.aguaObs,
      aguaEstado: resolveDynamicServiceEstado(loc.aguaEstado, wOvr, calcAcueductoCop, loc.aguaPromMin, loc.aguaPromMax),
      aguaTareaEstado: wOvr?.taskState ?? loc.aguaTareaEstado,
      energiaConsumoIndivKw: s1.energiaConsumoIndivActualKw, energiaConsumoComunalKw: energiaConsumoComunalActualKw,
      energiaConsumoAleroKw: energiaConsumoAleroActualKw, aguaConsumoIndivM3: s1.aguaConsumoIndivActualM3,
      aguaConsumoComunalM3: aguaConsumoComunalActualM3, energiaConsumoIndivActualKw: s1.energiaConsumoIndivActualKw,
      energiaConsumoComunalActualKw, energiaConsumoAleroActualKw,
      aguaConsumoIndivActualM3: s1.aguaConsumoIndivActualM3, aguaConsumoComunalActualM3,
      seedEnergiaLecturaAnt: loc.energiaLecturaAnt, seedEnergiaLecturaAct: loc.energiaLecturaAct,
      seedEnergiaConsumoIndivKw: loc.energiaConsumoIndivKw, seedEnergiaConsumoComunalKw: loc.energiaConsumoComunalKw,
      seedEnergiaConsumoAleroKw: loc.energiaConsumoAleroKw, seedAguaLecturaAnt: loc.aguaLecturaAnt,
      seedAguaLecturaAct: loc.aguaLecturaAct, seedAguaConsumoIndivM3: loc.aguaConsumoIndivM3,
      seedAguaConsumoComunalM3: loc.aguaConsumoComunalM3,
      hasEnergiaOverride: eOvr !== undefined, hasAguaOverride: wOvr !== undefined,
      hasCommunalEnergyDelta: aleroChanged || bodEChanged, hasCommunalWaterDelta: watComChanged,
      calcEnergiaCop, calcAcueductoCop, calcAseoCop, calcResiduosCop,
      calcVigilanciaCop, calcPoliciaCop, calcTotalCop, calcAssumedCorporationCop, variacionTotalPct,
    };
  });
}

export function computeLiveLiquidationBags(
  locales: ComputedLocalLiquidation[],
  receipts: MasterReceiptsConfig,
  seedReceipts: MasterReceiptsConfig = JUNE_2025_REFERENCE_RECEIPTS
): LiveLiquidationBagsSummary {
  const norm = normalizeMasterReceipts(receipts);
  const seed = normalizeMasterReceipts(seedReceipts);
  const res = deriveResiduosTariffs(norm.expensas.residuosEcsa);
  let deltaCostoBaseMedidoYComunalPrincipal = 0;
  let deltaCostoBaseContadorBP = 0;
  let deltaCostoBaseMedidoYComunalAgua = 0;

  const energyTariffChanged = Math.abs(norm.energia.tarifaKwh - seed.energia.tarifaKwh) > 1e-6;
  const bpMinChanged = Math.abs(norm.energia.bodegaPopular.topeMinimaCop - seed.energia.bodegaPopular.topeMinimaCop) > 1e-6;
  const princMinChanged = Math.abs(norm.energia.principal.topeMinimaCop - seed.energia.principal.topeMinimaCop) > 1e-6;
  const waterTariffOrMinChanged = Math.abs(norm.acueducto.tarifaM3 - seed.acueducto.tarifaM3) > 1e-6 || Math.abs(norm.acueducto.topeMinimaCop - seed.acueducto.topeMinimaCop) > 1e-6;

  for (const loc of locales) {
    const isBp = loc.bloqueEnergia === "BODEGA_POPULAR";
    const energyTariffOrMinChanged = energyTariffChanged || (isBp ? bpMinChanged : princMinChanged);

    if ((loc.modalidadEnergia === "CONTADOR" || loc.modalidadEnergia === "COMUNAL") && (loc.hasEnergiaOverride || loc.hasCommunalEnergyDelta || loc.effectiveOccupancy === "VACIO_CON_CONTRATO" || energyTariffOrMinChanged)) {
      const topeAct = isBp ? norm.energia.bodegaPopular.topeMinimaCop : norm.energia.principal.topeMinimaCop;
      const topeSeed = isBp ? seed.energia.bodegaPopular.topeMinimaCop : seed.energia.principal.topeMinimaCop;
      const kwSeed = loc.seedEnergiaConsumoIndivKw + loc.seedEnergiaConsumoAleroKw + loc.seedEnergiaConsumoComunalKw;
      const kwAct = loc.energiaConsumoIndivActualKw + loc.energiaConsumoAleroActualKw + loc.energiaConsumoComunalActualKw;
      const baseSeed = Math.max(topeSeed, kwSeed * seed.energia.tarifaKwh);
      const baseAct = loc.hasEnergiaOverride && isDefectiveMeterObservation(loc.energiaObs) ? 0 : Math.max(topeAct, kwAct * norm.energia.tarifaKwh);
      if (isBp && loc.modalidadEnergia === "CONTADOR") deltaCostoBaseContadorBP += baseAct - baseSeed;
      else if (!isBp) deltaCostoBaseMedidoYComunalPrincipal += baseAct - baseSeed;
    }
    if ((loc.modalidadAcueducto === "CONTADOR" || loc.modalidadAcueducto === "COMUNAL") && (loc.hasAguaOverride || loc.hasCommunalWaterDelta || loc.effectiveOccupancy === "VACIO_CON_CONTRATO" || waterTariffOrMinChanged)) {
      const m3Seed = loc.seedAguaConsumoIndivM3 + loc.seedAguaConsumoComunalM3;
      const m3Act = loc.aguaConsumoIndivActualM3 + loc.aguaConsumoComunalActualM3;
      const baseSeed = Math.max(seed.acueducto.topeMinimaCop, m3Seed * seed.acueducto.tarifaM3);
      const baseAct = loc.hasAguaOverride && isDefectiveMeterObservation(loc.aguaObs) ? 0 : Math.max(norm.acueducto.topeMinimaCop, m3Act * norm.acueducto.tarifaM3);
      deltaCostoBaseMedidoYComunalAgua += baseAct - baseSeed;
    }
  }

  const bolsaProrrateoPrincipalCop = Math.max(0, norm.energia.principal.bolsaProrrateo + (norm.energia.principal.valorNetoServicio - seed.energia.principal.valorNetoServicio) - deltaCostoBaseMedidoYComunalPrincipal);
  const bolsaProrrateoBpCop = Math.max(0, norm.energia.bodegaPopular.bolsaProrrateo + (norm.energia.bodegaPopular.valorFacturaNeto - seed.energia.bodegaPopular.valorFacturaNeto) - deltaCostoBaseContadorBP);
  const bolsaProrrateoAguaCop = Math.max(0, norm.acueducto.bolsaProrrateo + (norm.acueducto.valorFacturaGeneral - seed.acueducto.valorFacturaGeneral) - deltaCostoBaseMedidoYComunalAgua);

  return {
    bolsaProrrateoPrincipalCop, bolsaProrrateoBpCop, bolsaProrrateoAguaCop,
    deltaCostoBaseMedidoYComunalPrincipal, deltaCostoBaseContadorBP, deltaCostoBaseMedidoYComunalAgua,
    bolsaNpCop: res.bolsaNpCop, bolsaMpCop: res.bolsaMpCop, bolsaRestantePCop: res.bolsaRestantePCop,
    tarifaProrrateoPrincipalM2: norm.energia.principal.areaProrrateoM2 > 0 ? bolsaProrrateoPrincipalCop / norm.energia.principal.areaProrrateoM2 : 10548.66,
    tarifaProrrateoBpM2: norm.energia.bodegaPopular.areaProrrateoM2 > 0 ? bolsaProrrateoBpCop / norm.energia.bodegaPopular.areaProrrateoM2 : 7041.5,
    tarifaComunalBpM2: norm.energia.bodegaPopular.areaTotalM2 > 0 ? norm.energia.bodegaPopular.consumoComunal20Pct / norm.energia.bodegaPopular.areaTotalM2 : 0,
    tarifaAlumbradoGeneralM2: norm.energia.alumbradoGeneral.tarifaPorM2,
    tarifaProrrateoAguaM2: norm.acueducto.areaProrrateoM2 > 0 ? bolsaProrrateoAguaCop / norm.acueducto.areaProrrateoM2 : 1249.4436,
    tarifaRedFriosAguaM2: norm.acueducto.areaRedFriosM2 > 0 ? norm.acueducto.valorFacturaRedFrios / norm.acueducto.areaRedFriosM2 : 0,
    tarifaAguaComunalGeneralM2: norm.acueducto.areaComunalGeneralM2 > 0 ? norm.acueducto.bolsaAguaComunalGeneral / norm.acueducto.areaComunalGeneralM2 : 198.2038,
    tarifaVigilanciaM2: norm.expensas.vigilancia.tarifaPorM2,
    tarifaAseoM2: norm.expensas.aseo.tarifaPorM2,
    cuotaPoliciaPorLocal: norm.expensas.policia.cuotaFijaPorLocal,
    tarifaBaseResiduosM2: res.baseM2, tarifaEfectivaNpM2: res.npM2, tarifaEfectivaMpM2: res.mpM2, tarifaEfectivaPM2: res.pM2,
  };
}
