"use client";

import React, { useState } from "react";
import { LiquidationMatrixView } from "@/components/LiquidationMatrixView";
import { BodegasStatusView } from "@/components/BodegasStatusView";
import { MasterReceiptsSimulatorView } from "@/components/MasterReceiptsSimulatorView";
import { MobileFieldCaptureView } from "@/components/MobileFieldCaptureView";
import { BiLongitudinalKpisView } from "@/components/BiLongitudinalKpisView";
import { LiquidationMethodologyView } from "@/components/LiquidationMethodologyView";
import { ExecutiveViewId } from "@/contracts/erp-bridges";
import { BarChart3, BookOpen, Smartphone } from "lucide-react";

type BiInternalTabId = "BI_KPIS" | "MONITOR_CAMPO" | "MEMORIA_CALCULO";

interface UtilitiesErpModuleViewProps {
  activeView: ExecutiveViewId;
  onSelectLocalCode: (codigo: string) => void;
}

export function UtilitiesErpModuleView({
  activeView,
  onSelectLocalCode,
}: UtilitiesErpModuleViewProps) {
  const [biSubTab, setBiSubTab] = useState<BiInternalTabId>("BI_KPIS");

  if (activeView === "SABANA_360") {
    return <LiquidationMatrixView onSelectLocalCode={onSelectLocalCode} />;
  }

  if (activeView === "BODEGAS_68") {
    return <BodegasStatusView onSelectLocalCode={onSelectLocalCode} />;
  }

  if (activeView === "RECIBOS_MACROS") {
    return <MasterReceiptsSimulatorView />;
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--surface)] border border-[var(--outline-color)] rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setBiSubTab("BI_KPIS")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
              biSubTab === "BI_KPIS"
                ? "bg-[#0B132B] text-white dark:bg-[#f7931b] dark:text-slate-950 shadow-xs"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-main)]"
            }`}
          >
            <BarChart3 className="w-4 h-4" strokeWidth={1.75} />
            <span>6 KPIs Longitudinales BI</span>
          </button>

          <button
            type="button"
            onClick={() => setBiSubTab("MONITOR_CAMPO")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
              biSubTab === "MONITOR_CAMPO"
                ? "bg-[#0B132B] text-white dark:bg-[#f7931b] dark:text-slate-950 shadow-xs"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-main)]"
            }`}
          >
            <Smartphone className="w-4 h-4" strokeWidth={1.75} />
            <span>Monitor de Terreno (1.688 Odómetros)</span>
          </button>

          <button
            type="button"
            onClick={() => setBiSubTab("MEMORIA_CALCULO")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
              biSubTab === "MEMORIA_CALCULO"
                ? "bg-[#0B132B] text-white dark:bg-[#f7931b] dark:text-slate-950 shadow-xs"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-main)]"
            }`}
          >
            <BookOpen className="w-4 h-4" strokeWidth={1.75} />
            <span>Memoria de Cálculo Oficial (Art. 42–47)</span>
          </button>
        </div>

        <span className="px-2.5 py-1 rounded-md bg-[var(--surface-alt)] text-[var(--text-muted)] font-mono text-[10px] font-semibold hidden md:inline-block">
          Auditoría Longitudinal · Directiva 033-06
        </span>
      </div>

      {biSubTab === "BI_KPIS" && (
        <BiLongitudinalKpisView onSelectLocalCode={onSelectLocalCode} />
      )}
      {biSubTab === "MONITOR_CAMPO" && <MobileFieldCaptureView />}
      {biSubTab === "MEMORIA_CALCULO" && <LiquidationMethodologyView />}
    </div>
  );
}
