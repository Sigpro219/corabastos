"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import rawSeedData from "@/data/corabastos-junio-2025.json";
import {
  CommunalEnergyMeter,
  CommunalWaterMeter,
  LocalUnitRecord,
  MasterReceiptsConfig,
  PublicBathroomMeter,
} from "@/contracts/domain-contracts";
import {
  CommunalHierarchyBreakdown,
  ComputedLocalLiquidation,
  computeEnergyCommunalHierarchy,
  computeWaterCommunalHierarchy,
  recalculateAllLocales,
} from "@/lib/liquidation-engine";

interface FieldReadingUpdate {
  codigo: string;
  servicio: "ENERGIA" | "AGUA" | "MACRO_ENERGIA" | "MACRO_AGUA";
  lecturaActual: number;
  observacion: string;
  fotoCapturada?: boolean;
  timestamp: string;
}

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
}

const STORAGE_KEY_OVERRIDES = "corabastos_os_v1_overrides";
const STORAGE_KEY_RECEIPTS = "corabastos_os_v1_receipts";

const CorabastosContext = createContext<CorabastosContextValue | null>(null);

export function CorabastosProvider({ children }: { children: React.ReactNode }) {
  const initialData = rawSeedData as unknown as {
    masterReceiptsJunio2025: MasterReceiptsConfig;
    energyCommunalMeters: CommunalEnergyMeter[];
    waterCommunalMeters: CommunalWaterMeter[];
    publicBathroomMeters: PublicBathroomMeter[];
    locales: LocalUnitRecord[];
  };

  const [receipts, setReceipts] = useState<MasterReceiptsConfig>(initialData.masterReceiptsJunio2025);
  const [baseLocales, setBaseLocales] = useState<LocalUnitRecord[]>(initialData.locales);
  const [energyMacroMeters, setEnergyMacroMeters] = useState<CommunalEnergyMeter[]>(initialData.energyCommunalMeters);
  const [waterMacroMeters, setWaterMacroMeters] = useState<CommunalWaterMeter[]>(initialData.waterCommunalMeters);
  const [recentFieldUpdates, setRecentFieldUpdates] = useState<FieldReadingUpdate[]>([]);

  useEffect(() => {
    try {
      const savedReceipts = localStorage.getItem(STORAGE_KEY_RECEIPTS);
      if (savedReceipts) {
        setReceipts(JSON.parse(savedReceipts) as MasterReceiptsConfig);
      }
      const savedUpdates = localStorage.getItem(STORAGE_KEY_OVERRIDES);
      if (savedUpdates) {
        const parsed = JSON.parse(savedUpdates) as FieldReadingUpdate[];
        setRecentFieldUpdates(parsed);
      }
    } catch {
      // fallback to clean seed
    }
  }, []);

  const updateReceipts = useCallback((next: MasterReceiptsConfig) => {
    setReceipts(next);
    try {
      localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const saveFieldReading = useCallback((update: FieldReadingUpdate) => {
    if (update.servicio === "ENERGIA") {
      setBaseLocales((prev) =>
        prev.map((loc) => {
          if (loc.codigo !== update.codigo) return loc;
          const consumoIndiv = Math.max(0, update.lecturaActual - loc.energiaLecturaAnt);
          const deltaKw = consumoIndiv - loc.energiaConsumoIndivKw;
          const deltaCop = Math.round(deltaKw * 720.48 * 1.2);
          return {
            ...loc,
            energiaLecturaAct: update.lecturaActual,
            energiaConsumoIndivKw: consumoIndiv,
            energiaObs: update.observacion,
            energiaEstado: update.observacion.includes("DETENIDO") || update.observacion.includes("REVISAR") ? "REVISAR" : "OK",
            energiaPrincipalCop: loc.bloqueEnergia === "PRINCIPAL" ? Math.max(0, loc.energiaPrincipalCop + deltaCop) : loc.energiaPrincipalCop,
            energiaBpCop: loc.bloqueEnergia === "BODEGA_POPULAR" ? Math.max(0, loc.energiaBpCop + deltaCop) : loc.energiaBpCop,
          };
        })
      );
    } else if (update.servicio === "AGUA") {
      setBaseLocales((prev) =>
        prev.map((loc) => {
          if (loc.codigo !== update.codigo) return loc;
          const consumoIndiv = Math.max(0, update.lecturaActual - loc.aguaLecturaAnt);
          const deltaM3 = consumoIndiv - loc.aguaConsumoIndivM3;
          const deltaCop = Math.round(deltaM3 * 10921.45);
          return {
            ...loc,
            aguaLecturaAct: update.lecturaActual,
            aguaConsumoIndivM3: consumoIndiv,
            aguaObs: update.observacion,
            aguaEstado: update.observacion.includes("TAPADO") || update.observacion.includes("REVISAR") ? "REVISAR" : "OK",
            acueductoCop: Math.max(0, loc.acueductoCop + deltaCop),
          };
        })
      );
    } else if (update.servicio === "MACRO_ENERGIA") {
      setEnergyMacroMeters((prev) =>
        prev.map((m) => (m.codigo === update.codigo ? { ...m, lecturaActual: update.lecturaActual, observacion: update.observacion } : m))
      );
    } else if (update.servicio === "MACRO_AGUA") {
      setWaterMacroMeters((prev) =>
        prev.map((m) => (m.codigo === update.codigo ? { ...m, lecturaActual: update.lecturaActual, observacion: update.observacion } : m))
      );
    }

    setRecentFieldUpdates((prev) => {
      const next = [update, ...prev.filter((u) => !(u.codigo === update.codigo && u.servicio === update.servicio))].slice(0, 50);
      try {
        localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const resetToOfficialJune2025 = useCallback(() => {
    setReceipts(initialData.masterReceiptsJunio2025);
    setBaseLocales(initialData.locales);
    setEnergyMacroMeters(initialData.energyCommunalMeters);
    setWaterMacroMeters(initialData.waterCommunalMeters);
    setRecentFieldUpdates([]);
    try {
      localStorage.removeItem(STORAGE_KEY_OVERRIDES);
      localStorage.removeItem(STORAGE_KEY_RECEIPTS);
    } catch {
      // ignore
    }
  }, [initialData]);

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
    bathroomMeters: initialData.publicBathroomMeters,
    saveFieldReading,
    recentFieldUpdates,
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
