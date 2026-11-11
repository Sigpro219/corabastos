import {
  CompositePhysicalStop, FieldReadingUpdate, FieldServiceType, isRedFriosModality, LocalUnitRecord,
  MeterRouteSurveyItem, PublicBathroomMeter, ReadingTaskState, ReadingZoneId,
  WorkforceCapacityPlan, WorkforceShiftDayBucket,
} from "@/contracts/domain-contracts";
import { buildTaskKey, CommunalHierarchyBreakdown, ComputedLocalLiquidation } from "@/lib/liquidation-engine";

export const OBSERVATION_OPTIONS: readonly string[] = [
  "VERIFICADO POR IMAGEN", "SIN NOVEDAD", "C, DETENIDO", "M, DETENIDO", "C, TAPADO", "M, TAPADO",
  "C, RETIRADO", "M, RETIRADO", "C, SUSPENDIDO", "M, SUSPENDIDO", "REVISAR MEDIDOR",
  "L, CERRADO", "L, VACIO", "NO PERMITIO INGRESO", "ALMACENAMIENTO DE PRODUCTOS",
];

export const ALLOWED_NEGATIVE_READING_OBS: ReadonlySet<string> = new Set([
  "C, DETENIDO", "M, DETENIDO", "C, RETIRADO", "REVISAR MEDIDOR",
]);

export function requiresMandatoryPhoto(obs: string): boolean {
  const u = (obs || "").trim().toUpperCase();
  return u.includes("DETENIDO") || u.includes("TAPADO") || u.includes("RETIRADO") || u.includes("SUSPENDIDO") || u.includes("REVISAR") || u.includes("CERRADO") || u.includes("VACIO") || u.includes("NO PERMITIO");
}

export interface FieldReadingValidationInput {
  lecturaAnterior: number; lecturaActual: number; observacion: string; hasPhotoEvidence: boolean;
}

export function validateFieldReadingSubmission(input: FieldReadingValidationInput): { valid: boolean; reason?: string } {
  if (!Number.isFinite(input.lecturaActual) || input.lecturaActual < 0) {
    return { valid: false, reason: "La lectura actual debe ser un número finito mayor o igual a 0." };
  }
  const obsNorm = (input.observacion || "").trim().toUpperCase();
  if (input.lecturaActual < input.lecturaAnterior && !ALLOWED_NEGATIVE_READING_OBS.has(obsNorm)) {
    return { valid: false, reason: "Lectura regresiva bloqueada sin causal técnica autorizada." };
  }
  if (requiresMandatoryPhoto(obsNorm) && !input.hasPhotoEvidence) {
    return { valid: false, reason: "Evidencia fotográfica obligatoria para novedades o locales sin acceso." };
  }
  return { valid: true };
}

export function canSubmitFieldReading(input: FieldReadingValidationInput): boolean;
export function canSubmitFieldReading(lecturaAnterior: number, lecturaActual: number, observacion: string, hasPhotoEvidence: boolean): boolean;
export function canSubmitFieldReading(
  arg1: FieldReadingValidationInput | number, lecturaActual?: number, observacion?: string, hasPhotoEvidence?: boolean
): boolean {
  return typeof arg1 === "object"
    ? validateFieldReadingSubmission(arg1).valid
    : validateFieldReadingSubmission({ lecturaAnterior: arg1, lecturaActual: lecturaActual ?? 0, observacion: observacion ?? "", hasPhotoEvidence: Boolean(hasPhotoEvidence) }).valid;
}

export function deriveTaskStateFromObservation(obs: string): ReadingTaskState {
  const u = (obs || "").toUpperCase();
  if (u.includes("VACIO") || u.includes("CERRADO") || u.includes("NO PERMITIO")) return "CERRADO_SIN_ACCESO";
  if (u.includes("DETENIDO") || u.includes("TAPADO") || u.includes("RETIRADO") || u.includes("SUSPENDIDO") || u.includes("REVISAR")) return "NOVEDAD_TECNICA";
  return "COMPLETADA";
}

export interface UnifiedReadingTask {
  taskKey: string; codigo: string; bodegaId: string; zonaId: ReadingZoneId;
  servicio: FieldServiceType; etiquetaServicio: string; unidad: "kWh" | "m³";
  serieMedidor: string; areaM2: number; multiplicador: number;
  lecturaAnterior: number; lecturaActual: number; consumoAnteriorFisico: number;
  observacionActual: string; taskState: ReadingTaskState;
  sharedCodigos: string[]; hasPhotoEvidence: boolean; photoLocalKey?: string; photoStorageUrl?: string;
  routeSurvey?: MeterRouteSurveyItem;
}

export const ZONE_META: { id: ReadingZoneId; shortLabel: string; title: string; priorityBadge: string }[] = [
  { id: "ZONA_1_MACROMEDIDORES", shortLabel: "Z1 · Macromedidores", title: "Zona 1: Macromedidores Comunales (62 Medidores)", priorityBadge: "PRIORIDAD CRÍTICA" },
  { id: "ZONA_2_BANOS_PUBLICOS", shortLabel: "Z2 · Baños Públicos", title: "Zona 2: Baterías Sanitarias y Baños Públicos (16 Medidores)", priorityBadge: "PRIORIDAD ALTA" },
  { id: "ZONA_3_COMERCIANTES_PRINCIPAL", shortLabel: "Z3 · Comerciantes", title: "Zona 3: Bodegas Comerciantes Principal (Contadores)", priorityBadge: "RUTA BODEGAS" },
  { id: "ZONA_4_BODEGA_POPULAR", shortLabel: "Z4 · Bodega Popular", title: "Zona 4: Bodega Popular (Contadores Individuales/Compartidos)", priorityBadge: "BODEGA POPULAR" },
  { id: "ZONA_5_RED_FRIOS", shortLabel: "Z5 · Red de Fríos", title: "Zona 5: Puestos Red de Fríos con Contador (Bodega 98)", priorityBadge: "CADENA FRÍO" },
];

function resolveLocalZone(loc: LocalUnitRecord): ReadingZoneId {
  if (loc.bodegaId === "98" || isRedFriosModality(loc.tipoBodega) || loc.tipoBodega.toUpperCase().includes("FRIOS")) {
    return "ZONA_5_RED_FRIOS";
  }
  return loc.bloqueEnergia === "BODEGA_POPULAR" ? "ZONA_4_BODEGA_POPULAR" : "ZONA_3_COMERCIANTES_PRINCIPAL";
}

type SeedAwareLocal = LocalUnitRecord &
  Partial<Pick<ComputedLocalLiquidation, "seedEnergiaLecturaAnt" | "seedEnergiaLecturaAct" | "seedAguaLecturaAnt" | "seedAguaLecturaAct">>;

function partitionServiceMeterClusters<T extends SeedAwareLocal>(sortedLocales: T[], servicio: "ENERGIA" | "AGUA"): T[][] {
  const isE = servicio === "ENERGIA";
  const singletons: T[][] = [];
  const sharedGroups = new Map<string, { div: number; members: T[] }>();

  for (const loc of sortedLocales) {
    if ((isE ? loc.modalidadEnergia : loc.modalidadAcueducto) !== "CONTADOR") continue;
    const div = Math.max(1, Math.round((isE ? loc.energiaDivisorContador : loc.aguaDivisorContador) || 1));
    if (div <= 1) {
      singletons.push([loc]);
    } else {
      const seedAnt = isE ? (loc.seedEnergiaLecturaAnt ?? loc.energiaLecturaAnt) : (loc.seedAguaLecturaAnt ?? loc.aguaLecturaAnt);
      const seedAct = isE ? (loc.seedEnergiaLecturaAct ?? loc.energiaLecturaAct) : (loc.seedAguaLecturaAct ?? loc.aguaLecturaAct);
      const groupKey = `${servicio}|${loc.bodegaId}|${seedAnt}|${seedAct}|${div}`;
      const bucket = sharedGroups.get(groupKey) ?? { div, members: [] };
      bucket.members.push(loc);
      sharedGroups.set(groupKey, bucket);
    }
  }

  const chunks: T[][] = [...singletons];
  for (const { div, members } of sharedGroups.values()) {
    for (let i = 0; i < members.length; i += div) chunks.push(members.slice(i, i + div));
  }
  return chunks.sort((a, b) => a[0].codigo.localeCompare(b[0].codigo));
}

export function buildSharedMeterSiblingsMap(locales: LocalUnitRecord[]): Map<string, string[]> {
  const sorted = [...locales].sort((a, b) => a.codigo.localeCompare(b.codigo));
  const map = new Map<string, string[]>();
  for (const svc of ["ENERGIA", "AGUA"] as const) {
    for (const chunk of partitionServiceMeterClusters(sorted, svc)) {
      const codes = chunk.map((x) => x.codigo);
      for (const c of codes) map.set(buildTaskKey(svc, c), codes);
    }
  }
  return map;
}

export function applyAtomicFieldReadingOverride(
  prevOverrides: Record<string, FieldReadingUpdate>,
  prevCompleted: Record<string, ReadingTaskState>,
  update: FieldReadingUpdate,
  sharedCodigos?: string[],
  siblingsLookup?: Map<string, string[]>
): {
  nextOverrides: Record<string, FieldReadingUpdate>;
  nextCompleted: Record<string, ReadingTaskState>;
  resolvedCodigos: string[];
} {
  const taskState = update.taskState || deriveTaskStateFromObservation(update.observacion);
  const autoSiblings = siblingsLookup?.get(buildTaskKey(update.servicio, update.codigo));
  const resolvedCodigos = Array.from(
    new Set(sharedCodigos && sharedCodigos.length > 0 ? sharedCodigos : autoSiblings ?? [update.codigo])
  ).sort((a, b) => a.localeCompare(b));
  const canonicalCodigo = resolvedCodigos[0] ?? update.codigo;
  const nextOverrides = { ...prevOverrides };
  const nextCompleted = { ...prevCompleted };
  for (const code of resolvedCodigos) {
    const k = buildTaskKey(update.servicio, code);
    nextOverrides[k] = {
      codigo: code, servicio: update.servicio, lecturaActual: update.lecturaActual,
      observacion: update.observacion, taskState, timestamp: update.timestamp,
      ...(update.hasPhotoEvidence !== undefined ? { hasPhotoEvidence: update.hasPhotoEvidence } : {}),
      ...(update.fotoCapturada !== undefined ? { fotoCapturada: update.fotoCapturada } : {}),
      ...(update.photoLocalKey !== undefined ? { photoLocalKey: update.photoLocalKey } : {}),
      ...(update.photoStorageUrl !== undefined ? { photoStorageUrl: update.photoStorageUrl } : {}),
      ...(update.photoCapturedAt !== undefined ? { photoCapturedAt: update.photoCapturedAt } : {}),
    };
    if (code === canonicalCodigo) nextCompleted[k] = taskState;
    else delete nextCompleted[k];
  }
  return { nextOverrides, nextCompleted, resolvedCodigos };
}

function resolveClusterMeta(
  svc: "ENERGIA" | "AGUA",
  sharedCodigos: string[],
  completedTaskIds: Record<string, ReadingTaskState>,
  fieldOverridesMap: Record<string, FieldReadingUpdate>,
  seedState?: ReadingTaskState
): { ovr?: FieldReadingUpdate; taskState: ReadingTaskState } {
  let ovr: FieldReadingUpdate | undefined;
  let completed: ReadingTaskState | undefined;
  for (const c of sharedCodigos) {
    const k = buildTaskKey(svc, c);
    if (!ovr && fieldOverridesMap[k]) ovr = fieldOverridesMap[k];
    if (!completed && completedTaskIds[k]) completed = completedTaskIds[k];
  }
  return { ovr, taskState: completed || ovr?.taskState || seedState || "PENDIENTE" };
}

function extractPhotoMeta(ovr?: FieldReadingUpdate) {
  return {
    hasPhotoEvidence: Boolean(ovr?.hasPhotoEvidence || ovr?.fotoCapturada),
    ...(ovr?.photoLocalKey ? { photoLocalKey: ovr.photoLocalKey } : {}),
    ...(ovr?.photoStorageUrl ? { photoStorageUrl: ovr.photoStorageUrl } : {}),
  };
}

export function buildCutoffReadingTasks(
  locales: ComputedLocalLiquidation[],
  energyCommunal: CommunalHierarchyBreakdown[],
  waterCommunal: CommunalHierarchyBreakdown[],
  bathroomMeters: PublicBathroomMeter[],
  completedTaskIds: Record<string, ReadingTaskState>,
  fieldOverridesMap: Record<string, FieldReadingUpdate> = {},
  routeSurveyMap: Record<string, MeterRouteSurveyItem> = {}
): UnifiedReadingTask[] {
  const list: UnifiedReadingTask[] = [];

  for (const m of energyCommunal) {
    const key = buildTaskKey("MACRO_ENERGIA", m.codigo);
    const ovr = fieldOverridesMap[key];
    list.push({
      taskKey: key, codigo: m.codigo, bodegaId: m.bodegaId, zonaId: "ZONA_1_MACROMEDIDORES",
      servicio: "MACRO_ENERGIA", etiquetaServicio: `MACRO ENERGÍA (${m.tipo})`, unidad: "kWh",
      serieMedidor: m.contadorSerie || `ME-${m.bodegaId}`, areaM2: m.areaComunalM2, multiplicador: 1,
      lecturaAnterior: m.lecturaAnterior, lecturaActual: ovr ? ovr.lecturaActual : m.lecturaActual,
      consumoAnteriorFisico: m.consumoAnterior > 0 ? m.consumoAnterior : m.consumoBruto,
      observacionActual: ovr ? ovr.observacion : m.observacion,
      taskState: completedTaskIds[key] || ovr?.taskState || "PENDIENTE",
      sharedCodigos: [m.codigo], ...extractPhotoMeta(ovr),
      ...(routeSurveyMap[key] ? { routeSurvey: routeSurveyMap[key] } : {}),
    });
  }

  for (const w of waterCommunal) {
    const key = buildTaskKey("MACRO_AGUA", w.codigo);
    const ovr = fieldOverridesMap[key];
    list.push({
      taskKey: key, codigo: w.codigo, bodegaId: w.bodegaId, zonaId: "ZONA_1_MACROMEDIDORES",
      servicio: "MACRO_AGUA", etiquetaServicio: "MACRO AGUA COMUNAL", unidad: "m³",
      serieMedidor: w.contadorSerie || `MA-${w.bodegaId}`, areaM2: w.areaComunalM2, multiplicador: 1,
      lecturaAnterior: w.lecturaAnterior, lecturaActual: ovr ? ovr.lecturaActual : w.lecturaActual,
      consumoAnteriorFisico: w.consumoAnterior > 0 ? w.consumoAnterior : w.consumoBruto,
      observacionActual: ovr ? ovr.observacion : w.observacion,
      taskState: completedTaskIds[key] || ovr?.taskState || "PENDIENTE",
      sharedCodigos: [w.codigo], ...extractPhotoMeta(ovr),
      ...(routeSurveyMap[key] ? { routeSurvey: routeSurveyMap[key] } : {}),
    });
  }

  for (const b of bathroomMeters) {
    const key = buildTaskKey("BANO_PUBLICO", b.codigo);
    const ovr = fieldOverridesMap[key];
    list.push({
      taskKey: key, codigo: b.codigo, bodegaId: "BAÑOS", zonaId: "ZONA_2_BANOS_PUBLICOS",
      servicio: "BANO_PUBLICO", etiquetaServicio: "ACUEDUCTO BAÑO PÚBLICO", unidad: "m³",
      serieMedidor: b.contadorSerie, areaM2: 0, multiplicador: 1,
      lecturaAnterior: b.lecturaAnterior, lecturaActual: ovr ? ovr.lecturaActual : b.lecturaActual,
      consumoAnteriorFisico: b.consumoM3, observacionActual: ovr ? ovr.observacion : "VERIFICADO POR IMAGEN",
      taskState: completedTaskIds[key] || ovr?.taskState || "PENDIENTE",
      sharedCodigos: [b.codigo], ...extractPhotoMeta(ovr),
      ...(routeSurveyMap[key] ? { routeSurvey: routeSurveyMap[key] } : {}),
    });
  }

  const sortedLocales = [...locales].sort((a, b) => a.codigo.localeCompare(b.codigo));

  for (const chunk of partitionServiceMeterClusters(sortedLocales, "ENERGIA")) {
    const rep = chunk[0];
    const sharedCodigos = chunk.map((x) => x.codigo);
    const key = buildTaskKey("ENERGIA", rep.codigo);
    const { ovr, taskState } = resolveClusterMeta("ENERGIA", sharedCodigos, completedTaskIds, fieldOverridesMap, rep.energiaTareaEstado);
    const divE = Math.max(1, Math.round(rep.energiaDivisorContador || 1));
    const isBP = rep.bloqueEnergia === "BODEGA_POPULAR";
    list.push({
      taskKey: key, codigo: rep.codigo, bodegaId: rep.bodegaId, zonaId: resolveLocalZone(rep), servicio: "ENERGIA",
      etiquetaServicio: isBP ? (divE > 1 ? `ENERGÍA BP (/${divE})` : "ENERGÍA BP INDIV.") : divE > 1 ? `ENERGÍA COMPARTIDA (/${divE})` : "ENERGÍA INDIVIDUAL",
      unidad: "kWh", serieMedidor: `EN-${rep.codigo}`, areaM2: chunk.reduce((s, x) => s + x.areaM2, 0), multiplicador: 1 / divE,
      lecturaAnterior: rep.energiaLecturaAnt, lecturaActual: ovr ? ovr.lecturaActual : rep.energiaLecturaAct,
      consumoAnteriorFisico: (rep.energiaConsumoAntKw ?? rep.seedEnergiaConsumoIndivKw) * divE,
      observacionActual: ovr ? ovr.observacion : rep.energiaObs || "VERIFICADO POR IMAGEN",
      taskState, sharedCodigos, ...extractPhotoMeta(ovr),
      ...(routeSurveyMap[key] ? { routeSurvey: routeSurveyMap[key] } : {}),
    });
  }

  for (const chunk of partitionServiceMeterClusters(sortedLocales, "AGUA")) {
    const rep = chunk[0];
    const sharedCodigos = chunk.map((x) => x.codigo);
    const key = buildTaskKey("AGUA", rep.codigo);
    const { ovr, taskState } = resolveClusterMeta("AGUA", sharedCodigos, completedTaskIds, fieldOverridesMap, rep.aguaTareaEstado);
    const divA = Math.max(1, Math.round(rep.aguaDivisorContador || 1));
    list.push({
      taskKey: key, codigo: rep.codigo, bodegaId: rep.bodegaId, zonaId: resolveLocalZone(rep),
      servicio: "AGUA", etiquetaServicio: divA > 1 ? `ACUEDUCTO COMPARTIDO (/${divA})` : "ACUEDUCTO INDIVIDUAL",
      unidad: "m³", serieMedidor: `AQ-${rep.codigo}`, areaM2: chunk.reduce((s, x) => s + x.areaM2, 0), multiplicador: 1 / divA,
      lecturaAnterior: rep.aguaLecturaAnt, lecturaActual: ovr ? ovr.lecturaActual : rep.aguaLecturaAct,
      consumoAnteriorFisico: (rep.aguaConsumoAntM3 ?? rep.seedAguaConsumoIndivM3) * divA,
      observacionActual: ovr ? ovr.observacion : rep.aguaObs || "VERIFICADO POR IMAGEN",
      taskState, sharedCodigos, ...extractPhotoMeta(ovr),
      ...(routeSurveyMap[key] ? { routeSurvey: routeSurveyMap[key] } : {}),
    });
  }

  // Si existen medidores con ruta ideal levantada, ordenar primero por su orden de recorrido en bodega/global
  if (Object.keys(routeSurveyMap).length > 0) {
    list.sort((a, b) => {
      const sa = a.routeSurvey;
      const sb = b.routeSurvey;
      if (a.bodegaId === b.bodegaId) {
        if (sa && sb) return sa.ordenBodega - sb.ordenBodega;
        if (sa) return -1;
        if (sb) return 1;
        return a.codigo.localeCompare(b.codigo);
      }
      if (sa && sb) return sa.ordenGlobal - sb.ordenGlobal;
      if (sa) return -1;
      if (sb) return 1;
      return a.bodegaId.localeCompare(b.bodegaId) || a.codigo.localeCompare(b.codigo);
    });
  }

  return list;
}

export interface OperatorShiftAssignment {
  operatorIndex: number;
  etiquetaOperario: string;
  bodegasAsignadas: string[];
  totalMedidores: number;
  medidoresGeorreferenciados: number;
  tiempoEstimadoMinutos: number;
}

export function computeRouteWorkloadDistribution(
  tasks: UnifiedReadingTask[],
  operatorsCount = 4
): {
  totalMeters: number;
  surveyedMeters: number;
  surveyProgressPct: number;
  shifts: OperatorShiftAssignment[];
} {
  const safeOps = Math.max(1, Math.min(20, Math.round(operatorsCount)));
  const totalMeters = tasks.length;
  let surveyedMeters = 0;

  const byBodega = new Map<string, { total: number; surveyed: number }>();
  for (const t of tasks) {
    if (t.routeSurvey) surveyedMeters += 1;
    const cur = byBodega.get(t.bodegaId) ?? { total: 0, surveyed: 0 };
    cur.total += 1;
    if (t.routeSurvey) cur.surveyed += 1;
    byBodega.set(t.bodegaId, cur);
  }

  const sortedBodegas = Array.from(byBodega.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const shifts: OperatorShiftAssignment[] = Array.from({ length: safeOps }, (_, idx) => ({
    operatorIndex: idx + 1,
    etiquetaOperario: `Lecturista ${idx + 1}`,
    bodegasAsignadas: [],
    totalMedidores: 0,
    medidoresGeorreferenciados: 0,
    tiempoEstimadoMinutos: 0,
  }));

  const targetPerOp = totalMeters / safeOps;
  let currentOpIdx = 0;

  for (const [bodegaId, stats] of sortedBodegas) {
    if (
      currentOpIdx < safeOps - 1 &&
      shifts[currentOpIdx].totalMedidores > 0 &&
      shifts[currentOpIdx].totalMedidores + stats.total / 2 > targetPerOp
    ) {
      currentOpIdx += 1;
    }
    const shift = shifts[currentOpIdx];
    shift.bodegasAsignadas.push(bodegaId);
    shift.totalMedidores += stats.total;
    shift.medidoresGeorreferenciados += stats.surveyed;
    shift.tiempoEstimadoMinutos = Math.round((shift.totalMedidores * 45) / 60);
  }

  return {
    totalMeters,
    surveyedMeters,
    surveyProgressPct: totalMeters > 0 ? (surveyedMeters / totalMeters) * 100 : 0,
    shifts,
  };
}

/**
 * Agrupa las 1.688 tareas físicas atómicas en paradas físicas unificadas por (bodegaId, codigo)
 * sin alterar la Invariante 3 de BDD-Guard. Calcula el tiempo esperado por parada usando
 * aprendizaje continuo EMA (\alpha = 0.35) sobre los deltas reales observados en Gemba.
 */
export function buildCompositePhysicalStops(
  tasks: UnifiedReadingTask[]
): CompositePhysicalStop[] {
  const map = new Map<string, CompositePhysicalStop>();

  for (const t of tasks) {
    const isLocalService = t.servicio === "ENERGIA" || t.servicio === "AGUA";
    const stopKey = isLocalService ? `STOP::${t.bodegaId}::${t.codigo}` : `STOP::${t.taskKey}`;
    const existing = map.get(stopKey);
    const survey = t.routeSurvey;
    const learnedSec =
      survey && (survey.emaDuracionServicioSegundos !== undefined || survey.duracionServicioSegundos !== undefined)
        ? (survey.emaDuracionServicioSegundos ?? survey.duracionServicioSegundos ?? 25) +
          (survey.emaDeltaTrasladoSegundos ?? survey.deltaTrasladoSegundos ?? 15)
        : undefined;

    if (!existing) {
      const hasE = t.servicio === "ENERGIA" || t.servicio === "MACRO_ENERGIA";
      const hasW = t.servicio === "AGUA" || t.servicio === "MACRO_AGUA" || t.servicio === "BANO_PUBLICO";
      map.set(stopKey, {
        stopKey,
        bodegaId: t.bodegaId,
        codigo: t.codigo,
        zonaId: t.zonaId,
        hasEnergyMeter: hasE,
        hasWaterMeter: hasW,
        ...(hasE ? { energyTaskKey: t.taskKey } : {}),
        ...(hasW ? { waterTaskKey: t.taskKey } : {}),
        sharedCodigos: [...t.sharedCodigos],
        estimatedStopSeconds: learnedSec ?? 40,
      });
    } else {
      if (t.servicio === "ENERGIA") {
        existing.hasEnergyMeter = true;
        existing.energyTaskKey = t.taskKey;
      }
      if (t.servicio === "AGUA") {
        existing.hasWaterMeter = true;
        existing.waterTaskKey = t.taskKey;
      }
      for (const sc of t.sharedCodigos) {
        if (!existing.sharedCodigos.includes(sc)) existing.sharedCodigos.push(sc);
      }
      existing.estimatedStopSeconds = learnedSec !== undefined ? Math.max(existing.estimatedStopSeconds, learnedSec) : 55;
    }
  }

  return Array.from(map.values());
}

const WEEKDAY_LABELS: Readonly<Record<number, WorkforceShiftDayBucket["diaSemanaLabel"]>> = {
  1: "LUNES",
  2: "MARTES",
  3: "MIERCOLES",
  4: "JUEVES",
  5: "VIERNES",
};

function snapUtcMsToWeekday(utcMs: number): { snappedMs: number; diaSemanaLabel: WorkforceShiftDayBucket["diaSemanaLabel"] } {
  const d = new Date(utcMs);
  const dow = d.getUTCDay();
  let adjustedMs = utcMs;
  if (dow === 6) adjustedMs += 2 * 86_400_000;
  else if (dow === 0) adjustedMs += 1 * 86_400_000;
  const finalDow = new Date(adjustedMs).getUTCDay();
  return { snappedMs: adjustedMs, diaSemanaLabel: WEEKDAY_LABELS[finalDow] ?? "LUNES" };
}

function advanceWeekdaysUtcMs(startUtcMs: number, businessDaysOffset: number): { snappedMs: number; diaSemanaLabel: WorkforceShiftDayBucket["diaSemanaLabel"] } {
  let cur = snapUtcMsToWeekday(startUtcMs).snappedMs;
  let remaining = Math.max(0, Math.round(businessDaysOffset));
  while (remaining > 0) {
    cur += 86_400_000;
    const dow = new Date(cur).getUTCDay();
    if (dow >= 1 && dow <= 5) remaining -= 1;
  }
  const finalDow = new Date(cur).getUTCDay();
  return { snappedMs: cur, diaSemanaLabel: WEEKDAY_LABELS[finalDow] ?? "LUNES" };
}

/**
 * Reconstruye la lectura completa del odómetro a partir de los últimos 4 dígitos (o 5 en alta demanda)
 * con Guarda Anti-Rollover Fantasma (Propuesta RFC-1 del Tirano):
 * Solo aplica el acarreo (+ modulus) si el odómetro anterior estaba cerca de la frontera (>= 70%)
 * y el nuevo sufijo es bajo (<= 30%), o si el salto proyectado no excede el consumo histórico plausible.
 * En caso contrario, preserva el prefijo base para que el sistema detecte lectura regresiva.
 */
export function reconstructReadingFromTrailingDigits(
  lecturaAnterior: number,
  trailingDigitsRaw: string,
  digitCount: 4 | 5 = 4,
  consumoAnteriorPlausible?: number
): number {
  const clean = trailingDigitsRaw.replace(/\D/g, "").slice(-digitCount);
  if (!clean) return Math.max(0, lecturaAnterior);
  const suffixVal = Number.parseInt(clean, 10);
  if (!Number.isFinite(suffixVal)) return Math.max(0, lecturaAnterior);
  const safePrev = Math.max(0, Math.floor(lecturaAnterior));
  const modulus = digitCount === 5 ? 100_000 : 10_000;
  const prevPrefix = Math.floor(safePrev / modulus) * modulus;
  const prevSuffix = safePrev % modulus;

  if (suffixVal >= prevSuffix) {
    return prevPrefix + suffixVal;
  }

  // Guarda Anti-Rollover: ¿Realmente el odómetro dio la vuelta completa?
  const isRolloverBoundary = prevSuffix >= modulus * 0.70 && suffixVal <= modulus * 0.30;
  const plausibleDeltaMax = Math.max(modulus * 0.25, (consumoAnteriorPlausible ?? 0) * 3);
  const projectedRolloverDelta = prevPrefix + modulus + suffixVal - safePrev;

  if (isRolloverBoundary || (consumoAnteriorPlausible !== undefined && projectedRolloverDelta <= plausibleDeltaMax)) {
    return prevPrefix + modulus + suffixVal;
  }

  // Si no cumple el umbral de frontera, no inventa +10.000: retorna la lectura base para alertar lectura regresiva
  return prevPrefix + suffixVal;
}

/**
 * Determina si una tarea requiere captura de 5 dígitos (macromedidores de energía de alta carga
 * o medidores con consumo histórico >= 8.000 kWh/mes).
 */
export function requiresFiveDigitCapture(task: Pick<UnifiedReadingTask, "servicio" | "consumoAnteriorFisico" | "codigo">): boolean {
  if (task.servicio === "MACRO_ENERGIA") return true;
  if (task.servicio === "ENERGIA" && task.consumoAnteriorFisico >= 8000) return true;
  return false;
}

/**
 * Motor Determinista de Capacidad y Cronograma Mensual en Jornadas de 8 Horas (480 min brutos),
 * exclusivo de Lunes a Viernes (22 días hábiles/mes), con Bodega Indivisible y Candado de Ciclo de 30 Días.
 */
export function computeWorkforceCapacityPlan(
  tasks: UnifiedReadingTask[],
  options?: {
    jornadaEfectivaMinutos?: number;
    operadoresAsignados?: number;
    fechaInicioCicloIso?: string;
  }
): WorkforceCapacityPlan {
  const jornadaEfectivaMinutos = Math.max(60, Math.min(480, Math.round(options?.jornadaEfectivaMinutos ?? 420)));
  const operadoresAsignados = Math.max(1, Math.min(20, Math.round(options?.operadoresAsignados ?? 1)));
  const baseDateMs = options?.fechaInicioCicloIso ? new Date(options.fechaInicioCicloIso).getTime() : Date.UTC(2025, 5, 16);
  const safeBaseMs = Number.isFinite(baseDateMs) ? baseDateMs : Date.UTC(2025, 5, 16);

  const stops = buildCompositePhysicalStops(tasks);
  const byBodega = new Map<string, { stopsCount: number; tasksCount: number; totalSec: number }>();
  for (const s of stops) {
    const cur = byBodega.get(s.bodegaId) ?? { stopsCount: 0, tasksCount: 0, totalSec: 0 };
    cur.stopsCount += 1; cur.tasksCount += (s.hasEnergyMeter ? 1 : 0) + (s.hasWaterMeter ? 1 : 0);
    cur.totalSec += s.estimatedStopSeconds; byBodega.set(s.bodegaId, cur);
  }

  const sortedBodegas = Array.from(byBodega.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const dailyCapacityMinutes = jornadaEfectivaMinutos * operadoresAsignados;
  const cronogramaDiario: WorkforceShiftDayBucket[] = [];
  let currentBucket: WorkforceShiftDayBucket | null = null;

  const openNextDayBucket = (dayIdx: number): WorkforceShiftDayBucket => {
    const { snappedMs: anchorMs, diaSemanaLabel } = advanceWeekdaysUtcMs(safeBaseMs, dayIdx - 1);
    const { snappedMs: nextCycleMs } = snapUtcMsToWeekday(anchorMs + 30 * 86_400_000);
    return {
      diaIndice: dayIdx, diaSemanaLabel,
      fechaAnclaIso: new Date(anchorMs).toISOString().slice(0, 10),
      fechaProximoCiclo30dIso: new Date(nextCycleMs).toISOString().slice(0, 10),
      bodegasAsignadas: [], paradasFisicasCount: 0, tareasAtomicasCount: 0,
      minutosEstimadosJornada: 0, utilizacionJornada8hPct: 0,
    };
  };

  for (const [bodegaId, bStats] of sortedBodegas) {
    const bodegaMinutes = bStats.totalSec / 60;
    if (!currentBucket || (currentBucket.bodegasAsignadas.length > 0 && currentBucket.minutosEstimadosJornada + bodegaMinutes > dailyCapacityMinutes)) {
      if (currentBucket) cronogramaDiario.push(currentBucket);
      currentBucket = openNextDayBucket(cronogramaDiario.length + 1);
    }
    currentBucket.bodegasAsignadas.push(bodegaId);
    currentBucket.paradasFisicasCount += bStats.stopsCount;
    currentBucket.tareasAtomicasCount += bStats.tasksCount;
    currentBucket.minutosEstimadosJornada = Math.round((currentBucket.minutosEstimadosJornada + bodegaMinutes) * 10) / 10;
    currentBucket.utilizacionJornada8hPct = Math.min(200, Math.round((currentBucket.minutosEstimadosJornada / dailyCapacityMinutes) * 1000) / 10);
  }

  if (currentBucket && currentBucket.bodegasAsignadas.length > 0) cronogramaDiario.push(currentBucket);

  const tiempoTotalRutaMinutos = Math.round(cronogramaDiario.reduce((s, d) => s + d.minutosEstimadosJornada, 0) * 10) / 10;
  const diasRequeridosAlMes = Math.max(1, cronogramaDiario.length);
  const diasAhorradosVsMesCompleto = Math.max(0, 22 - diasRequeridosAlMes);

  return {
    jornadaBrutaMinutos: 480,
    jornadaEfectivaMinutos,
    soloEntreSemanaLunesViernes: true,
    diasHabilesBaseMes: 22,
    gapCicloLecturaDias: 30,
    operadoresAsignados,
    tiempoTotalRutaMinutos,
    diasRequeridosAlMes,
    diasAhorradosVsMesCompleto,
    cronogramaDiario,
  };
}
