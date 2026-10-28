"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import rawSeedData from "@/data/corabastos-junio-2025.json";
import {
  CommunalEnergyMeter,
  CommunalWaterMeter,
  LocalUnitRecord,
  MasterReceiptsConfig,
  OccupancyStatus,
  PublicBathroomMeter,
  ReadingTaskState,
} from "@/contracts/domain-contracts";
import {
  CommunalHierarchyBreakdown,
  ComputedLocalLiquidation,
  computeEnergyCommunalHierarchy,
  computeWaterCommunalHierarchy,
  recalculateAllLocales,
} from "@/lib/liquidation-engine";

export type FieldServiceType =
  | "ENERGIA"
  | "AGUA"
  | "MACRO_ENERGIA"
  | "MACRO_AGUA"
  | "BANO_PUBLICO";

export interface FieldReadingUpdate {
  codigo: string;
  servicio: FieldServiceType;
  lecturaActual: number;
  observacion: string;
  fotoCapturada?: boolean;
  taskState?: ReadingTaskState;
  timestamp: string;
}

interface SeedDatasetShape {
  masterReceiptsJunio2025: MasterReceiptsConfig;
  energyCommunalMeters: CommunalEnergyMeter[];
  waterCommunalMeters: CommunalWaterMeter[];
  publicBathroomMeters: PublicBathroomMeter[];
  locales: LocalUnitRecord[];
}

const typedSeedData: SeedDatasetShape = rawSeedData;

interface CorabastosContextValue {
  receipts: MasterReceiptsConfig;
  updateReceipts: (next: MasterReceiptsConfig) => void;
  resetToOfficialJune2025: () => void;
  locales: ComputedLocalLiquidation[];
  localesByCode: Map<string, ComputedLocalLiquidation>;
  bodegasList: string[];
  energyCommunal: CommunalHierarchyBreakdown[];
  waterCommunal: CommunalHierarchyBreakdown[];
  bathroomMeters: PublicBathroomMeter[];
  saveFieldReading: (update: FieldReadingUpdate) => void;
  recentFieldUpdates: FieldReadingUpdate[];
  completedTaskIds: Record<string, ReadingTaskState>;
  updateLocalOccupancy: (codigo: string, nextStatus: OccupancyStatus) => void;
  updateBodegaOccupancy: (bodegaId: string, nextStatus: OccupancyStatus) => void;
}

const STORAGE_KEY_OVERRIDES = "corabastos_os_v1_overrides";
const STORAGE_KEY_RECEIPTS = "corabastos_os_v1_receipts";
const STORAGE_KEY_TASKS = "corabastos_os_v1_cutoff_tasks";
const STORAGE_KEY_OCCUPANCY = "corabastos_os_v1_occupancy_map";

const CorabastosContext = createContext<CorabastosContextValue | null>(null);

export function buildTaskKey(servicio: FieldServiceType, codigo: string): string {
  return `${servicio}::${codigo}`;
}

export function normalizeOccupancy(val?: string): OccupancyStatus {
  if (val === "VACIO_CON_CONTRATO" || val === "VACIO_SIN_CONTRATO_CORPORACION") {
    return val;
  }
  return "ACTIVO";
}

export function deriveTaskStateFromObservation(obs: string): ReadingTaskState {
  const upper = obs.toUpperCase();
  if (upper.includes("VACIO") || upper.includes("CERRADO") || upper.includes("NO PERMITIO")) {
    return "CERRADO_SIN_ACCESO";
  }
  if (
    upper.includes("DETENIDO") ||
    upper.includes("TAPADO") ||
    upper.includes("RETIRADO") ||
    upper.includes("SUSPENDIDO") ||
    upper.includes("REVISAR")
  ) {
    return "NOVEDAD_TECNICA";
  }
  return "COMPLETADA";
}

export function CorabastosProvider({ children }: { children: React.ReactNode }) {
  const [receipts, setReceipts] = useState<MasterReceiptsConfig>(typedSeedData.masterReceiptsJunio2025);
  const [baseLocales, setBaseLocales] = useState<LocalUnitRecord[]>(typedSeedData.locales);
  const [energyMacroMeters, setEnergyMacroMeters] = useState<CommunalEnergyMeter[]>(
    typedSeedData.energyCommunalMeters
  );
  const [waterMacroMeters, setWaterMacroMeters] = useState<CommunalWaterMeter[]>(
    typedSeedData.waterCommunalMeters
  );
  const [bathroomMeters, setBathroomMeters] = useState<PublicBathroomMeter[]>(
    typedSeedData.publicBathroomMeters
  );
  const [recentFieldUpdates, setRecentFieldUpdates] = useState<FieldReadingUpdate[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, ReadingTaskState>>({});

  useEffect(() => {
    try {
      const savedReceipts = localStorage.getItem(STORAGE_KEY_RECEIPTS);
      if (savedReceipts) {
        setReceipts(JSON.parse(savedReceipts) as MasterReceiptsConfig);
      }
      const savedUpdates = localStorage.getItem(STORAGE_KEY_OVERRIDES);
      if (savedUpdates) {
        setRecentFieldUpdates(JSON.parse(savedUpdates) as FieldReadingUpdate[]);
      }
      const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
      if (savedTasks) {
        setCompletedTaskIds(JSON.parse(savedTasks) as Record<string, ReadingTaskState>);
      }
      const savedOccupancy = localStorage.getItem(STORAGE_KEY_OCCUPANCY);
      if (savedOccupancy) {
        const occMap = JSON.parse(savedOccupancy) as Record<string, OccupancyStatus>;
        setBaseLocales((prev) =>
          prev.map((l) => (occMap[l.codigo] ? { ...l, estadoOcupacion: occMap[l.codigo] } : l))
        );
      }
    } catch (err) {
      console.warn("CorabastosContext: fallback to deterministic seed state", err);
    }
  }, []);

  const updateReceipts = useCallback((next: MasterReceiptsConfig) => {
    setReceipts(next);
    try {
      localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(next));
    } catch (err) {
      console.warn("CorabastosContext: failed to persist receipts", err);
    }
  }, []);

  const updateLocalOccupancy = useCallback((codigo: string, nextStatus: OccupancyStatus) => {
    setBaseLocales((prev) => {
      const updated = prev.map((loc) => {
        if (loc.codigo !== codigo) return loc;
        if (nextStatus === "VACIO_CON_CONTRATO") {
          return {
            ...loc,
            estadoOcupacion: nextStatus,
            energiaLecturaAct: loc.energiaLecturaAnt,
            energiaObs: "L, VACIO",
            aguaLecturaAct: loc.aguaLecturaAnt,
            aguaObs: "L, VACIO",
          };
        }
        return { ...loc, estadoOcupacion: nextStatus };
      });
      try {
        const occMap: Record<string, OccupancyStatus> = {};
        for (const item of updated) {
          const norm = normalizeOccupancy(item.estadoOcupacion);
          if (norm !== "ACTIVO") {
            occMap[item.codigo] = norm;
          }
        }
        localStorage.setItem(STORAGE_KEY_OCCUPANCY, JSON.stringify(occMap));
      } catch (err) {
        console.warn("CorabastosContext: failed to persist local occupancy", err);
      }
      return updated;
    });
  }, []);

  const updateBodegaOccupancy = useCallback((bodegaId: string, nextStatus: OccupancyStatus) => {
    setBaseLocales((prev) => {
      const updated = prev.map((loc) => {
        if (loc.bodegaId !== bodegaId) return loc;
        if (nextStatus === "VACIO_CON_CONTRATO") {
          return {
            ...loc,
            estadoOcupacion: nextStatus,
            energiaLecturaAct: loc.energiaLecturaAnt,
            energiaObs: "L, VACIO",
            aguaLecturaAct: loc.aguaLecturaAnt,
            aguaObs: "L, VACIO",
          };
        }
        return { ...loc, estadoOcupacion: nextStatus };
      });
      try {
        const occMap: Record<string, OccupancyStatus> = {};
        for (const item of updated) {
          const norm = normalizeOccupancy(item.estadoOcupacion);
          if (norm !== "ACTIVO") {
            occMap[item.codigo] = norm;
          }
        }
        localStorage.setItem(STORAGE_KEY_OCCUPANCY, JSON.stringify(occMap));
      } catch (err) {
        console.warn("CorabastosContext: failed to persist bodega occupancy", err);
      }
      return updated;
    });
  }, []);

  const saveFieldReading = useCallback((update: FieldReadingUpdate) => {
    const taskState = update.taskState || deriveTaskStateFromObservation(update.observacion);
    const taskKey = buildTaskKey(update.servicio, update.codigo);

    setCompletedTaskIds((prev) => {
      const next = { ...prev, [taskKey]: taskState };
      try {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(next));
      } catch (err) {
        console.warn("CorabastosContext: failed to persist completedTaskIds", err);
      }
      return next;
    });

    if (update.servicio === "ENERGIA") {
      setBaseLocales((prev) =>
        prev.map((loc) => {
          if (loc.codigo !== update.codigo) return loc;
          const nextOcupacion: OccupancyStatus =
            taskState === "CERRADO_SIN_ACCESO"
              ? "VACIO_CON_CONTRATO"
              : normalizeOccupancy(loc.estadoOcupacion);
          return {
            ...loc,
            energiaLecturaAct: update.lecturaActual,
            energiaObs: update.observacion,
            energiaTareaEstado: taskState,
            estadoOcupacion: nextOcupacion,
            energiaEstado:
              taskState === "NOVEDAD_TECNICA" || update.observacion.includes("REVISAR") ? "REVISAR" : "OK",
          };
        })
      );
    } else if (update.servicio === "AGUA") {
      setBaseLocales((prev) =>
        prev.map((loc) => {
          if (loc.codigo !== update.codigo) return loc;
          const nextOcupacion: OccupancyStatus =
            taskState === "CERRADO_SIN_ACCESO"
              ? "VACIO_CON_CONTRATO"
              : normalizeOccupancy(loc.estadoOcupacion);
          return {
            ...loc,
            aguaLecturaAct: update.lecturaActual,
            aguaObs: update.observacion,
            aguaTareaEstado: taskState,
            estadoOcupacion: nextOcupacion,
            aguaEstado:
              taskState === "NOVEDAD_TECNICA" || update.observacion.includes("REVISAR") ? "REVISAR" : "OK",
          };
        })
      );
    } else if (update.servicio === "MACRO_ENERGIA") {
      setEnergyMacroMeters((prev) =>
        prev.map((m) =>
          m.codigo === update.codigo
            ? { ...m, lecturaActual: update.lecturaActual, observacion: update.observacion }
            : m
        )
      );
    } else if (update.servicio === "MACRO_AGUA") {
      setWaterMacroMeters((prev) =>
        prev.map((m) =>
          m.codigo === update.codigo
            ? { ...m, lecturaActual: update.lecturaActual, observacion: update.observacion }
            : m
        )
      );
    } else if (update.servicio === "BANO_PUBLICO") {
      setBathroomMeters((prev) =>
        prev.map((b) =>
          b.codigo === update.codigo
            ? {
                ...b,
                lecturaActual: update.lecturaActual,
                consumoM3: Math.max(0, update.lecturaActual - b.lecturaAnterior),
              }
            : b
        )
      );
    }

    setRecentFieldUpdates((prev) => {
      const enrichedUpdate: FieldReadingUpdate = { ...update, taskState };
      const next = [
        enrichedUpdate,
        ...prev.filter((u) => !(u.codigo === update.codigo && u.servicio === update.servicio)),
      ].slice(0, 100);
      try {
        localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(next));
      } catch (err) {
        console.warn("CorabastosContext: failed to persist recentFieldUpdates", err);
      }
      return next;
    });
  }, []);

  const resetToOfficialJune2025 = useCallback(() => {
    setReceipts(typedSeedData.masterReceiptsJunio2025);
    setBaseLocales(typedSeedData.locales);
    setEnergyMacroMeters(typedSeedData.energyCommunalMeters);
    setWaterMacroMeters(typedSeedData.waterCommunalMeters);
    setBathroomMeters(typedSeedData.publicBathroomMeters);
    setRecentFieldUpdates([]);
    setCompletedTaskIds({});
    try {
      localStorage.removeItem(STORAGE_KEY_OVERRIDES);
      localStorage.removeItem(STORAGE_KEY_RECEIPTS);
      localStorage.removeItem(STORAGE_KEY_TASKS);
      localStorage.removeItem(STORAGE_KEY_OCCUPANCY);
    } catch (err) {
      console.warn("CorabastosContext: failed to clear storage keys", err);
    }
  }, []);

  const locales = useMemo(() => recalculateAllLocales(baseLocales, receipts), [baseLocales, receipts]);

  const localesByCode = useMemo(() => {
    const map = new Map<string, ComputedLocalLiquidation>();
    for (const l of locales) {
      map.set(l.codigo, l);
    }
    return map;
  }, [locales]);

  const bodegasList = useMemo(() => {
    const set = new Set<string>();
    for (const l of locales) {
      if (l.bodegaId) set.add(l.bodegaId);
    }
    return Array.from(set).sort();
  }, [locales]);

  const energyCommunal = useMemo(
    () => computeEnergyCommunalHierarchy(energyMacroMeters, localesByCode),
    [energyMacroMeters, localesByCode]
  );

  const waterCommunal = useMemo(
    () => computeWaterCommunalHierarchy(waterMacroMeters, localesByCode),
    [waterMacroMeters, localesByCode]
  );

  const value: CorabastosContextValue = {
    receipts,
    updateReceipts,
    resetToOfficialJune2025,
    locales,
    localesByCode,
    bodegasList,
    energyCommunal,
    waterCommunal,
    bathroomMeters,
    saveFieldReading,
    recentFieldUpdates,
    completedTaskIds,
    updateLocalOccupancy,
    updateBodegaOccupancy,
  };

  return <CorabastosContext.Provider value={value}>{children}</CorabastosContext.Provider>;
}

export function useCorabastos() {
  const ctx = useContext(CorabastosContext);
  if (!ctx) {
    throw new Error("useCorabastos must be used within CorabastosProvider");
  }
  return ctx;
}
