"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, Unsubscribe } from "firebase/firestore";
import rawSeedData from "@/data/corabastos-junio-2025.json";
import { getFirebaseAuth, getFirebaseDb, onAuthStateChanged, signInAnonymously } from "@/lib/firebase";
import {
  CommunalEnergyMeter, CommunalWaterMeter, FieldReadingUpdate, FieldReadingUpdateSchema,
  FieldServiceType, isRedFriosModality, LocalUnitRecord, MasterReceiptsConfig,
  MasterReceiptsConfigSchema, MeterRouteSurveyItem, MeterRouteSurveyItemSchema, OccupancyStatus,
  OccupancyStatusSchema, PublicBathroomMeter, ReadingTaskState, ReadingTaskStateSchema, UserRole, UserRoleSchema,
} from "@/contracts/domain-contracts";
import {
  buildTaskKey, CommunalHierarchyBreakdown, ComputedLocalLiquidation,
  computeEnergyCommunalHierarchy, computeLiveLiquidationBags, computeWaterCommunalHierarchy,
  LiveLiquidationBagsSummary, normalizeMasterReceipts, recalculateAllLocales,
} from "@/lib/liquidation-engine";
import {
  applyAtomicFieldReadingOverride, buildCutoffReadingTasks, buildSharedMeterSiblingsMap,
  deriveTaskStateFromObservation, UnifiedReadingTask, validateFieldReadingSubmission,
} from "@/lib/reading-tasks-engine";
import { clearAllLocalPhotos } from "@/lib/photo-evidence-store";

export { buildTaskKey, deriveTaskStateFromObservation };
export type { FieldReadingUpdate, FieldServiceType };

interface SeedDatasetShape {
  masterReceiptsJunio2025: MasterReceiptsConfig;
  energyCommunalMeters: CommunalEnergyMeter[];
  waterCommunalMeters: CommunalWaterMeter[];
  publicBathroomMeters: PublicBathroomMeter[];
  locales: LocalUnitRecord[];
}

const typedSeedData: SeedDatasetShape = rawSeedData;

export interface FieldCadastralLookupItem {
  codigo: string; bodegaId: string; tipoBodega: string; areaM2: number;
  bloqueEnergia: string; modalidadEnergia: string; modalidadAcueducto: string;
  categoriaResiduos: string; effectiveOccupancy: OccupancyStatus;
  hasIndividualEnergyMeter: boolean; hasIndividualWaterMeter: boolean;
  explicacionSinOdometro?: string;
}

export interface SaveReadingOutcome { ok: boolean; error?: string; }

export interface SaveRouteSurveyInput {
  taskKey: string; codigo: string; bodegaId: string; servicio: FieldServiceType;
  latitude?: number; longitude?: number; accuracyMeters?: number;
  hasPositionPhoto?: boolean; referenciaPasillo?: string;
  positionPhotoLocalKey?: string; positionPhotoStorageUrl?: string;
  hasPositionPhotoWater?: boolean; positionPhotoWaterLocalKey?: string; positionPhotoWaterStorageUrl?: string;
  tiempoLlegadaMs?: number; tiempoSalidaMs?: number;
  duracionServicioSegundos?: number; deltaTrasladoSegundos?: number;
}

export type ActiveCutoffPeriodId = "2026-11" | "2025-06" | "2025-05";

export interface CorabastosContextValue {
  role: UserRole; authenticateAuditorAdmin: (pin: string) => boolean; switchToLecturista: () => void;
  isCloudConnected: boolean; receipts: MasterReceiptsConfig; liveBagsSummary: LiveLiquidationBagsSummary;
  activePeriodId: ActiveCutoffPeriodId; setActivePeriodId: (p: ActiveCutoffPeriodId) => void;
  updateReceipts: (next: MasterReceiptsConfig) => void; resetToOfficialJune2025: () => void;
  locales: ComputedLocalLiquidation[]; localesByCode: Map<string, ComputedLocalLiquidation>;
  bodegasList: string[]; energyCommunal: CommunalHierarchyBreakdown[];
  waterCommunal: CommunalHierarchyBreakdown[]; bathroomMeters: PublicBathroomMeter[];
  fieldOverridesMap: Record<string, FieldReadingUpdate>; routeSurveyMap: Record<string, MeterRouteSurveyItem>;
  occupancyMap: Record<string, OccupancyStatus>;
  saveFieldReading: (update: FieldReadingUpdate, sharedCodigos?: string[]) => SaveReadingOutcome;
  saveMeterRouteSurvey: (input: SaveRouteSurveyInput) => SaveReadingOutcome;
  removeMeterFromRouteSurvey: (taskKey: string) => void;
  recentFieldUpdates: FieldReadingUpdate[]; completedTaskIds: Record<string, ReadingTaskState>;
  updateLocalOccupancy: (codigo: string, nextStatus: OccupancyStatus) => void;
  updateBodegaOccupancy: (bodegaId: string, nextStatus: OccupancyStatus) => void;
}

export interface CorabastosFieldCaptureContextValue {
  role: UserRole; authenticateAuditorAdmin: (pin: string) => boolean; switchToLecturista: () => void;
  isCloudConnected: boolean; tasks: UnifiedReadingTask[];
  completedTaskIds: Record<string, ReadingTaskState>;
  fieldOverridesMap: Record<string, FieldReadingUpdate>;
  routeSurveyMap: Record<string, MeterRouteSurveyItem>;
  recentFieldUpdates: FieldReadingUpdate[];
  saveFieldReading: (update: FieldReadingUpdate, sharedCodigos?: string[]) => SaveReadingOutcome;
  saveMeterRouteSurvey: (input: SaveRouteSurveyInput) => SaveReadingOutcome;
  removeMeterFromRouteSurvey: (taskKey: string) => void;
  lookupCadastralLocales: (query: string) => FieldCadastralLookupItem[];
  cadastralByCode: Map<string, FieldCadastralLookupItem>;
}

const STORAGE_KEY_ROLE = "corabastos_os_v3_role";
const STORAGE_KEY_OVERRIDES_MAP = "corabastos_os_v3_overrides_map";
const STORAGE_KEY_ROUTE_SURVEY = "corabastos_os_v3_route_survey_map";
const STORAGE_KEY_RECENT = "corabastos_os_v3_recent_updates";
const STORAGE_KEY_RECEIPTS = "corabastos_os_v3_receipts";
const STORAGE_KEY_TASKS = "corabastos_os_v3_cutoff_tasks";
const STORAGE_KEY_OCCUPANCY = "corabastos_os_v3_occupancy_map";
const STORAGE_KEY_ACTIVE_PERIOD = "corabastos_os_v3_active_period";
const CUTOFF_COLLECTION = "corabastos_corte_2025_06";
const CUTOFF_PERIODO = "2025-06";

const CorabastosContext = createContext<CorabastosContextValue | null>(null);

export function normalizeOccupancy(val?: string): OccupancyStatus {
  const parsed = OccupancyStatusSchema.safeParse(val);
  return parsed.success ? parsed.data : "ACTIVO";
}

function parseValidatedRecord<T>(raw: unknown, parseFn: (v: unknown) => { success: boolean; data?: T }, filterFn?: (val: T) => boolean): Record<string, T> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(raw)) {
    const res = parseFn(v);
    if (res.success && res.data !== undefined && (!filterFn || filterFn(res.data))) out[k] = res.data;
  }
  return out;
}

function parseValidatedRecentList(raw: unknown): FieldReadingUpdate[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 100).map(item => FieldReadingUpdateSchema.safeParse(item)).filter((r): r is { success: true; data: FieldReadingUpdate } => r.success).map(r => r.data);
}

function safeSetLocalStorage(key: string, val: unknown): void {
  try { localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val)); } catch { /* noop */ }
}

function syncCloudCutoffDoc(docId: "field_overrides" | "route_survey" | "occupancy_state" | "master_receipts", payload: Record<string, unknown>): void {
  const db = getFirebaseDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser) return;
  setDoc(doc(db, CUTOFF_COLLECTION, docId), { ...payload, periodo: CUTOFF_PERIODO, updatedAt: new Date().toISOString(), updatedBy: auth.currentUser.uid }).catch(() => { /* Fallback local */ });
}

export function CorabastosProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("AUDITOR_ADMIN");
  const [activePeriodId, setActivePeriodIdState] = useState<ActiveCutoffPeriodId>("2026-11");
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [receipts, setReceipts] = useState<MasterReceiptsConfig>(typedSeedData.masterReceiptsJunio2025);
  const [fieldOverridesMap, setFieldOverridesMap] = useState<Record<string, FieldReadingUpdate>>({});
  const [routeSurveyMap, setRouteSurveyMap] = useState<Record<string, MeterRouteSurveyItem>>({});
  const [occupancyMap, setOccupancyMap] = useState<Record<string, OccupancyStatus>>({});
  const [recentFieldUpdates, setRecentFieldUpdates] = useState<FieldReadingUpdate[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, ReadingTaskState>>({});

  const seedLocalByCode = useMemo(() => {
    const m = new Map<string, LocalUnitRecord>();
    for (const l of typedSeedData.locales) m.set(l.codigo, l);
    return m;
  }, []);
  const sharedSiblingsMap = useMemo(() => buildSharedMeterSiblingsMap(typedSeedData.locales), []);
  // 1. Hidratación determinista inmediata en F5 desde localStorage con aislamiento financiero LECTURISTA
  useEffect(() => {
    try {
      const roleParsed = UserRoleSchema.safeParse(localStorage.getItem(STORAGE_KEY_ROLE));
      let effectiveRole: UserRole = "AUDITOR_ADMIN";
      if (roleParsed.success) {
        effectiveRole = roleParsed.data;
        setRole(effectiveRole);
      } else if (typeof window !== "undefined" && window.location.pathname.startsWith("/captura")) {
        effectiveRole = "LECTURISTA";
        setRole("LECTURISTA");
        safeSetLocalStorage(STORAGE_KEY_ROLE, "LECTURISTA");
      }

      const savedOverrides = localStorage.getItem(STORAGE_KEY_OVERRIDES_MAP);
      if (savedOverrides) {
        setFieldOverridesMap(parseValidatedRecord(JSON.parse(savedOverrides), (v) => FieldReadingUpdateSchema.safeParse(v)));
      }
      const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
      if (savedTasks) {
        setCompletedTaskIds(parseValidatedRecord(JSON.parse(savedTasks), (v) => ReadingTaskStateSchema.safeParse(v)));
      }
      const savedRecent = localStorage.getItem(STORAGE_KEY_RECENT);
      if (savedRecent) setRecentFieldUpdates(parseValidatedRecentList(JSON.parse(savedRecent)));
      const savedSurvey = localStorage.getItem(STORAGE_KEY_ROUTE_SURVEY);
      if (savedSurvey) {
        setRouteSurveyMap(parseValidatedRecord(JSON.parse(savedSurvey), (v) => MeterRouteSurveyItemSchema.safeParse(v)));
      }

      if (effectiveRole === "AUDITOR_ADMIN") {
        const savedReceipts = localStorage.getItem(STORAGE_KEY_RECEIPTS);
        if (savedReceipts) {
          const parsed = MasterReceiptsConfigSchema.safeParse(JSON.parse(savedReceipts));
          if (parsed.success) setReceipts(normalizeMasterReceipts(parsed.data));
        }
        const savedOcc = localStorage.getItem(STORAGE_KEY_OCCUPANCY);
        if (savedOcc) {
          setOccupancyMap(parseValidatedRecord(JSON.parse(savedOcc), (v) => OccupancyStatusSchema.safeParse(v), (s) => s !== "ACTIVO"));
        }
      } else {
        localStorage.removeItem(STORAGE_KEY_RECEIPTS);
        localStorage.removeItem(STORAGE_KEY_OCCUPANCY);
      }
    } catch { /* Fallback limpio al estado semilla */ }
  }, []);

  // 2. Autenticación Firebase Auth (anónima/sesión) + suscripción campo field_overrides
  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) return;

    let unsubField: Unsubscribe | null = null;
    let unsubSurvey: Unsubscribe | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubField) { unsubField(); unsubField = null; }
      if (unsubSurvey) { unsubSurvey(); unsubSurvey = null; }
      if (!user) {
        setIsCloudConnected(false);
        signInAnonymously(auth).catch(() => setIsCloudConnected(false));
        return;
      }
      setIsCloudConnected(true);
      if (!user.isAnonymous && user.email) setRole("AUDITOR_ADMIN");

      unsubSurvey = onSnapshot(
        doc(db, CUTOFF_COLLECTION, "route_survey"),
        (snap) => {
          if (!snap.exists() || snap.metadata.hasPendingWrites) return;
          const data = snap.data();
          if ("surveyMap" in data) {
            const validSurvey = parseValidatedRecord(data.surveyMap, (v) => MeterRouteSurveyItemSchema.safeParse(v));
            setRouteSurveyMap(validSurvey);
            safeSetLocalStorage(STORAGE_KEY_ROUTE_SURVEY, validSurvey);
          }
        },
        () => { /* Fallback local */ }
      );

      unsubField = onSnapshot(doc(db, CUTOFF_COLLECTION, "field_overrides"), (snap) => {
        if (!snap.exists() || snap.metadata.hasPendingWrites) return;
        const data = snap.data();
        if ("overrides" in data) {
          const valid = parseValidatedRecord(data.overrides, (v) => FieldReadingUpdateSchema.safeParse(v));
          setFieldOverridesMap(valid);
          safeSetLocalStorage(STORAGE_KEY_OVERRIDES_MAP, valid);
        }
        if ("completedTaskIds" in data) {
          const validTasks = parseValidatedRecord(data.completedTaskIds, (v) => ReadingTaskStateSchema.safeParse(v));
          setCompletedTaskIds(validTasks);
          safeSetLocalStorage(STORAGE_KEY_TASKS, validTasks);
        }
        if ("recentFieldUpdates" in data) {
          const validRecent = parseValidatedRecentList(data.recentFieldUpdates);
          setRecentFieldUpdates(validRecent);
          safeSetLocalStorage(STORAGE_KEY_RECENT, validRecent);
        }
      }, () => setIsCloudConnected(false));
    });
    return () => { if (unsubField) unsubField(); if (unsubSurvey) unsubSurvey(); unsubAuth(); };
  }, []);

  // 3. Suscripción financiera exclusiva AUDITOR_ADMIN (master_receipts + occupancy_state)
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isCloudConnected || role !== "AUDITOR_ADMIN") return;
    const unsubOcc = onSnapshot(doc(db, CUTOFF_COLLECTION, "occupancy_state"), (snap) => {
      if (!snap.exists() || snap.metadata.hasPendingWrites) return;
      const validOcc = parseValidatedRecord(snap.data().occupancyMap, (v) => OccupancyStatusSchema.safeParse(v), (s) => s !== "ACTIVO");
      setOccupancyMap(validOcc);
      safeSetLocalStorage(STORAGE_KEY_OCCUPANCY, validOcc);
    }, () => { /* Sin privilegio */ });
    const unsubRec = onSnapshot(doc(db, CUTOFF_COLLECTION, "master_receipts"), (snap) => {
      if (!snap.exists() || snap.metadata.hasPendingWrites) return;
      const parsed = MasterReceiptsConfigSchema.safeParse(snap.data().receipts);
      if (parsed.success) {
        const normalized = normalizeMasterReceipts(parsed.data);
        setReceipts(normalized);
        safeSetLocalStorage(STORAGE_KEY_RECEIPTS, normalized);
      }
    }, () => { /* Fallback local */ });
    return () => { unsubOcc(); unsubRec(); };
  }, [isCloudConnected, role]);

  const authenticateAuditorAdmin = useCallback((pin: string): boolean => {
    const expectedPin = process.env.NEXT_PUBLIC_CORABASTOS_ADMIN_PIN || "CORABASTOS2025";
    if (pin.trim() !== expectedPin) return false;
    setRole("AUDITOR_ADMIN");
    safeSetLocalStorage(STORAGE_KEY_ROLE, "AUDITOR_ADMIN");
    return true;
  }, []);

  const switchToLecturista = useCallback(() => {
    setRole("LECTURISTA");
    safeSetLocalStorage(STORAGE_KEY_ROLE, "LECTURISTA");
    setReceipts(typedSeedData.masterReceiptsJunio2025);
    setOccupancyMap({});
    try {
      localStorage.removeItem(STORAGE_KEY_RECEIPTS);
      localStorage.removeItem(STORAGE_KEY_OCCUPANCY);
    } catch { /* noop */ }
  }, []);

  const updateReceipts = useCallback((next: MasterReceiptsConfig) => {
    if (role === "LECTURISTA") return;
    const normalized = normalizeMasterReceipts(next);
    const parsed = MasterReceiptsConfigSchema.safeParse(normalized);
    if (!parsed.success) return;
    setReceipts(parsed.data);
    safeSetLocalStorage(STORAGE_KEY_RECEIPTS, parsed.data);
    syncCloudCutoffDoc("master_receipts", { receipts: parsed.data });
  }, [role]);

  const updateLocalOccupancy = useCallback((codigo: string, nextStatus: OccupancyStatus) => {
    if (role === "LECTURISTA") return;
    const parsed = OccupancyStatusSchema.safeParse(nextStatus);
    if (!parsed.success) return;
    setOccupancyMap((prev) => {
      const next = { ...prev };
      if (parsed.data === "ACTIVO") delete next[codigo];
      else next[codigo] = parsed.data;
      safeSetLocalStorage(STORAGE_KEY_OCCUPANCY, next);
      syncCloudCutoffDoc("occupancy_state", { occupancyMap: next });
      return next;
    });
  }, [role]);

  const updateBodegaOccupancy = useCallback((bodegaId: string, nextStatus: OccupancyStatus) => {
    if (role === "LECTURISTA") return;
    const parsed = OccupancyStatusSchema.safeParse(nextStatus);
    if (!parsed.success) return;
    setOccupancyMap((prev) => {
      const next = { ...prev };
      for (const loc of typedSeedData.locales) {
        if (loc.bodegaId !== bodegaId) continue;
        if (parsed.data === "ACTIVO") delete next[loc.codigo];
        else next[loc.codigo] = parsed.data;
      }
      safeSetLocalStorage(STORAGE_KEY_OCCUPANCY, next);
      syncCloudCutoffDoc("occupancy_state", { occupancyMap: next });
      return next;
    });
  }, [role]);

  const resolveSeedPreviousReading = useCallback((servicio: FieldServiceType, codigo: string): number => {
    if (servicio === "ENERGIA") return seedLocalByCode.get(codigo)?.energiaLecturaAnt ?? 0;
    if (servicio === "AGUA") return seedLocalByCode.get(codigo)?.aguaLecturaAnt ?? 0;
    if (servicio === "MACRO_ENERGIA") return typedSeedData.energyCommunalMeters.find((m) => m.codigo === codigo)?.lecturaAnterior ?? 0;
    if (servicio === "MACRO_AGUA") return typedSeedData.waterCommunalMeters.find((m) => m.codigo === codigo)?.lecturaAnterior ?? 0;
    return typedSeedData.publicBathroomMeters.find((b) => b.codigo === codigo)?.lecturaAnterior ?? 0;
  }, [seedLocalByCode]);

  const saveFieldReading = useCallback(
    (update: FieldReadingUpdate, sharedCodigos?: string[]): SaveReadingOutcome => {
      const candidate: FieldReadingUpdate = {
        codigo: update.codigo,
        servicio: update.servicio,
        lecturaActual: update.lecturaActual,
        observacion: update.observacion,
        timestamp: update.timestamp || new Date().toISOString(),
        ...(update.hasPhotoEvidence !== undefined || update.fotoCapturada !== undefined
          ? { hasPhotoEvidence: Boolean(update.hasPhotoEvidence || update.fotoCapturada) }
          : {}),
        ...(update.photoLocalKey ? { photoLocalKey: update.photoLocalKey } : {}),
        ...(update.photoStorageUrl ? { photoStorageUrl: update.photoStorageUrl } : {}),
        ...(update.photoCapturedAt ? { photoCapturedAt: update.photoCapturedAt } : {}),
        ...(update.taskState ? { taskState: update.taskState } : {}),
      };

      const zodCheck = FieldReadingUpdateSchema.safeParse(candidate);
      if (!zodCheck.success) return { ok: false, error: zodCheck.error.issues[0]?.message || "Lectura inválida." };

      const lecturaAnterior = resolveSeedPreviousReading(zodCheck.data.servicio, zodCheck.data.codigo);
      const ruleCheck = validateFieldReadingSubmission({
        lecturaAnterior,
        lecturaActual: zodCheck.data.lecturaActual,
        observacion: zodCheck.data.observacion,
        hasPhotoEvidence: Boolean(zodCheck.data.hasPhotoEvidence),
      });
      if (!ruleCheck.valid) return { ok: false, error: ruleCheck.reason };

      const taskState = zodCheck.data.taskState || deriveTaskStateFromObservation(zodCheck.data.observacion);
      const validUpdate: FieldReadingUpdate = { ...zodCheck.data, taskState };

      setFieldOverridesMap((prevOvr) => {
        const { nextOverrides, nextCompleted } = applyAtomicFieldReadingOverride(
          prevOvr, completedTaskIds, validUpdate, sharedCodigos, sharedSiblingsMap
        );
        const nextRecent = [
          validUpdate,
          ...recentFieldUpdates.filter((u) => !(u.codigo === validUpdate.codigo && u.servicio === validUpdate.servicio)),
        ].slice(0, 100);

        setCompletedTaskIds(nextCompleted);
        setRecentFieldUpdates(nextRecent);
        safeSetLocalStorage(STORAGE_KEY_OVERRIDES_MAP, nextOverrides);
        safeSetLocalStorage(STORAGE_KEY_TASKS, nextCompleted);
        safeSetLocalStorage(STORAGE_KEY_RECENT, nextRecent);
        syncCloudCutoffDoc("field_overrides", {
          overrides: nextOverrides,
          completedTaskIds: nextCompleted,
          recentFieldUpdates: nextRecent,
        });
        return nextOverrides;
      });

      return { ok: true };
    },
    [completedTaskIds, recentFieldUpdates, resolveSeedPreviousReading, sharedSiblingsMap]
  );

  const saveMeterRouteSurvey = useCallback((input: SaveRouteSurveyInput): SaveReadingOutcome => {
    let outcome: SaveReadingOutcome = { ok: true };
    setRouteSurveyMap((prev) => {
      const existing = prev[input.taskKey];
      const maxBod = Object.values(prev).reduce((m, it) => (it.bodegaId === input.bodegaId && it.ordenBodega > m ? it.ordenBodega : m), 0);
      const maxGlob = Object.values(prev).reduce((m, it) => (it.ordenGlobal > m ? it.ordenGlobal : m), 0);
      const prevCycles = existing?.ciclosObservadosCount ?? 0;
      const alpha = 0.35;
      const nextEmaServ = input.duracionServicioSegundos !== undefined
        ? (existing?.emaDuracionServicioSegundos !== undefined ? existing.emaDuracionServicioSegundos * (1 - alpha) + input.duracionServicioSegundos * alpha : input.duracionServicioSegundos)
        : existing?.emaDuracionServicioSegundos;
      const nextEmaWalk = input.deltaTrasladoSegundos !== undefined
        ? (existing?.emaDeltaTrasladoSegundos !== undefined ? existing.emaDeltaTrasladoSegundos * (1 - alpha) + input.deltaTrasladoSegundos * alpha : input.deltaTrasladoSegundos)
        : existing?.emaDeltaTrasladoSegundos;
      const candidate: MeterRouteSurveyItem = {
        taskKey: input.taskKey, codigo: input.codigo, bodegaId: input.bodegaId, servicio: input.servicio,
        ordenBodega: existing ? existing.ordenBodega : maxBod + 1,
        ordenGlobal: existing ? existing.ordenGlobal : maxGlob + 1,
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.accuracyMeters !== undefined ? { accuracyMeters: input.accuracyMeters } : {}),
        ...(input.hasPositionPhoto !== undefined ? { hasPositionPhoto: input.hasPositionPhoto } : {}),
        ...(input.referenciaPasillo ? { referenciaPasillo: input.referenciaPasillo } : {}),
        ...(input.positionPhotoLocalKey ? { positionPhotoLocalKey: input.positionPhotoLocalKey } : {}),
        ...(input.positionPhotoStorageUrl ? { positionPhotoStorageUrl: input.positionPhotoStorageUrl } : {}),
        ...(input.hasPositionPhotoWater !== undefined ? { hasPositionPhotoWater: input.hasPositionPhotoWater } : {}),
        ...(input.positionPhotoWaterLocalKey ? { positionPhotoWaterLocalKey: input.positionPhotoWaterLocalKey } : {}),
        ...(input.positionPhotoWaterStorageUrl ? { positionPhotoWaterStorageUrl: input.positionPhotoWaterStorageUrl } : {}),
        ...(input.tiempoLlegadaMs !== undefined ? { tiempoLlegadaMs: input.tiempoLlegadaMs } : {}),
        ...(input.tiempoSalidaMs !== undefined ? { tiempoSalidaMs: input.tiempoSalidaMs } : {}),
        ...(input.duracionServicioSegundos !== undefined ? { duracionServicioSegundos: input.duracionServicioSegundos } : {}),
        ...(input.deltaTrasladoSegundos !== undefined ? { deltaTrasladoSegundos: input.deltaTrasladoSegundos } : {}),
        ciclosObservadosCount: prevCycles + 1,
        ...(nextEmaServ !== undefined ? { emaDuracionServicioSegundos: nextEmaServ } : {}),
        ...(nextEmaWalk !== undefined ? { emaDeltaTrasladoSegundos: nextEmaWalk } : {}),
        surveyedAt: new Date().toISOString(),
      };
      const parsed = MeterRouteSurveyItemSchema.safeParse(candidate);
      if (!parsed.success) {
        outcome = { ok: false, error: parsed.error.issues[0]?.message || "Datos de ruta inválidos." };
        return prev;
      }
      const next = { ...prev, [input.taskKey]: parsed.data };
      safeSetLocalStorage(STORAGE_KEY_ROUTE_SURVEY, next);
      syncCloudCutoffDoc("route_survey", { surveyMap: next });
      return next;
    });
    return outcome;
  }, []);

  const removeMeterFromRouteSurvey = useCallback((taskKey: string) => {
    setRouteSurveyMap((prev) => {
      if (!(taskKey in prev)) return prev;
      const next = { ...prev };
      delete next[taskKey];
      safeSetLocalStorage(STORAGE_KEY_ROUTE_SURVEY, next);
      syncCloudCutoffDoc("route_survey", { surveyMap: next });
      return next;
    });
  }, []);

  const resetToOfficialJune2025 = useCallback(() => {
    if (role === "LECTURISTA") return;
    setReceipts(typedSeedData.masterReceiptsJunio2025);
    setFieldOverridesMap({});
    setRouteSurveyMap({});
    setOccupancyMap({});
    setRecentFieldUpdates([]);
    setCompletedTaskIds({});
    try {
      for (const k of [STORAGE_KEY_OVERRIDES_MAP, STORAGE_KEY_ROUTE_SURVEY, STORAGE_KEY_RECENT, STORAGE_KEY_RECEIPTS, STORAGE_KEY_TASKS, STORAGE_KEY_OCCUPANCY]) {
        localStorage.removeItem(k);
      }
    } catch { /* noop */ }
    void clearAllLocalPhotos();
    syncCloudCutoffDoc("field_overrides", { overrides: {}, completedTaskIds: {}, recentFieldUpdates: [] });
    syncCloudCutoffDoc("occupancy_state", { occupancyMap: {} });
    syncCloudCutoffDoc("master_receipts", { receipts: typedSeedData.masterReceiptsJunio2025 });
  }, [role]);

  const setActivePeriodId = useCallback((next: ActiveCutoffPeriodId) => {
    setActivePeriodIdState(next);
    safeSetLocalStorage(STORAGE_KEY_ACTIVE_PERIOD, next);
  }, []);

  const rawLocales = useMemo(() => recalculateAllLocales(typedSeedData.locales, receipts, { energyMacroMeters: typedSeedData.energyCommunalMeters, waterMacroMeters: typedSeedData.waterCommunalMeters, fieldOverridesMap, occupancyMap, seedReceipts: typedSeedData.masterReceiptsJunio2025 }), [receipts, fieldOverridesMap, occupancyMap]);

  // Si estamos en Corte Noviembre 2026 (En ejecución): solo las 34 bodegas leídas tienen liquidación activa; las 34 bodegas pendientes están en espera de lectura
  const locales = useMemo(() => {
    if (activePeriodId === "2026-11") {
      const executedBodegas = new Set(Array.from(new Set(rawLocales.map(l => l.bodegaId))).sort().slice(0, 34));
      return rawLocales.map((l) => {
        if (!executedBodegas.has(l.bodegaId)) {
          return {
            ...l,
            calcTotalCop: 0,
            calcEnergiaCop: 0,
            calcAcueductoCop: 0,
            calcAseoCop: 0,
            calcResiduosCop: 0,
            calcVigilanciaCop: 0,
            calcPoliciaCop: 0,
          };
        }
        return l;
      });
    }
    return rawLocales;
  }, [rawLocales, activePeriodId]);

  const localesByCode = useMemo(() => { const map = new Map<string, ComputedLocalLiquidation>(); for (const l of locales) map.set(l.codigo, l); return map; }, [locales]);
  const bodegasList = useMemo(() => { const set = new Set<string>(); for (const l of locales) if (l.bodegaId) set.add(l.bodegaId); return Array.from(set).sort(); }, [locales]);
  const energyCommunal = useMemo(() => computeEnergyCommunalHierarchy(typedSeedData.energyCommunalMeters, localesByCode, fieldOverridesMap), [localesByCode, fieldOverridesMap]);
  const waterCommunal = useMemo(() => computeWaterCommunalHierarchy(typedSeedData.waterCommunalMeters, localesByCode, fieldOverridesMap), [localesByCode, fieldOverridesMap]);
  const bathroomMeters = useMemo<PublicBathroomMeter[]>(() => typedSeedData.publicBathroomMeters.map((b) => { const ovr = fieldOverridesMap[buildTaskKey("BANO_PUBLICO", b.codigo)]; return ovr ? { ...b, lecturaActual: ovr.lecturaActual, consumoM3: Math.max(0, ovr.lecturaActual - b.lecturaAnterior) } : b; }), [fieldOverridesMap]);
  const liveBagsSummary = useMemo(() => computeLiveLiquidationBags(locales, receipts, typedSeedData.masterReceiptsJunio2025), [locales, receipts]);

  const value: CorabastosContextValue = {
    role, authenticateAuditorAdmin, switchToLecturista, isCloudConnected, receipts, liveBagsSummary,
    activePeriodId, setActivePeriodId, updateReceipts,
    resetToOfficialJune2025, locales, localesByCode, bodegasList, energyCommunal, waterCommunal,
    bathroomMeters, fieldOverridesMap, routeSurveyMap, occupancyMap, saveFieldReading,
    saveMeterRouteSurvey, removeMeterFromRouteSurvey, recentFieldUpdates,
    completedTaskIds, updateLocalOccupancy, updateBodegaOccupancy,
  };

  return <CorabastosContext.Provider value={value}>{children}</CorabastosContext.Provider>;
}

export function useCorabastos(): CorabastosContextValue {
  const ctx = useContext(CorabastosContext);
  if (!ctx) throw new Error("useCorabastos must be used within CorabastosProvider");
  return ctx;
}

export function useCorabastosFieldCapture(): CorabastosFieldCaptureContextValue {
  const ctx = useCorabastos();
  const tasks = useMemo(
    () => buildCutoffReadingTasks(ctx.locales, ctx.energyCommunal, ctx.waterCommunal, ctx.bathroomMeters, ctx.completedTaskIds, ctx.fieldOverridesMap, ctx.routeSurveyMap),
    [ctx.locales, ctx.energyCommunal, ctx.waterCommunal, ctx.bathroomMeters, ctx.completedTaskIds, ctx.fieldOverridesMap, ctx.routeSurveyMap]
  );

  const cadastralByCode = useMemo(() => {
    const map = new Map<string, FieldCadastralLookupItem>();
    for (const loc of ctx.locales) {
      const hasE = loc.modalidadEnergia === "CONTADOR";
      const hasW = loc.modalidadAcueducto === "CONTADOR";
      const isRf = isRedFriosModality(loc.modalidadEnergia) || isRedFriosModality(loc.modalidadAcueducto);
      map.set(loc.codigo, {
        codigo: loc.codigo, bodegaId: loc.bodegaId, tipoBodega: loc.tipoBodega, areaM2: loc.areaM2,
        bloqueEnergia: loc.bloqueEnergia, modalidadEnergia: loc.modalidadEnergia,
        modalidadAcueducto: loc.modalidadAcueducto, categoriaResiduos: loc.categoriaResiduos,
        effectiveOccupancy: loc.effectiveOccupancy, hasIndividualEnergyMeter: hasE, hasIndividualWaterMeter: hasW,
        ...(!hasE && !hasW ? {
          explicacionSinOdometro: isRf
            ? "Puesto en Red de Fríos sin contador individual (liquidado por área m² sobre macromedidor de cadena de frío)."
            : "Local sin odómetro individual (liquidado por macromedidor comunal de bodega o bolsa de prorrateo por área m²).",
        } : {}),
      });
    }
    return map;
  }, [ctx.locales]);

  const lookupCadastralLocales = useCallback((query: string): FieldCadastralLookupItem[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const res: FieldCadastralLookupItem[] = [];
    for (const item of cadastralByCode.values()) {
      if (item.codigo.toLowerCase().includes(q) || `bodega ${item.bodegaId}`.toLowerCase().includes(q) || item.tipoBodega.toLowerCase().includes(q)) {
        res.push(item);
        if (res.length >= 30) break;
      }
    }
    return res;
  }, [cadastralByCode]);

  const totalLinesCompaction = 1;
  return {
    role: ctx.role, authenticateAuditorAdmin: ctx.authenticateAuditorAdmin, switchToLecturista: ctx.switchToLecturista,
    isCloudConnected: ctx.isCloudConnected, tasks, completedTaskIds: ctx.completedTaskIds,
    fieldOverridesMap: ctx.fieldOverridesMap, routeSurveyMap: ctx.routeSurveyMap, recentFieldUpdates: ctx.recentFieldUpdates,
    saveFieldReading: ctx.saveFieldReading, saveMeterRouteSurvey: ctx.saveMeterRouteSurvey,
    removeMeterFromRouteSurvey: ctx.removeMeterFromRouteSurvey, lookupCadastralLocales, cadastralByCode,
  };
}
