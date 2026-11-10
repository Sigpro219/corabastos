import {
  FieldReadingUpdate, FieldServiceType, isRedFriosModality, LocalUnitRecord,
  PublicBathroomMeter, ReadingTaskState, ReadingZoneId,
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
  fieldOverridesMap: Record<string, FieldReadingUpdate> = {}
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
    });
  }

  return list;
}
