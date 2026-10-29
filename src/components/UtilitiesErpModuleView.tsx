"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LiquidationMatrixView } from "@/components/LiquidationMatrixView";
import { BodegasStatusView } from "@/components/BodegasStatusView";
import { MasterReceiptsSimulatorView } from "@/components/MasterReceiptsSimulatorView";
import { MobileFieldCaptureView } from "@/components/MobileFieldCaptureView";
import { BiLongitudinalKpisView } from "@/components/BiLongitudinalKpisView";
import { LiquidationMethodologyView } from "@/components/LiquidationMethodologyView";
import { LocalAccountModal } from "@/components/LocalAccountModal";
import { CorabastosBrandLogo } from "@/components/CorabastosBrandLogo";
import { UtilitiesSubTabId } from "@/contracts/erp-bridges";
import { useCorabastos } from "@/context/CorabastosContext";
import {
  TableProperties,
  Building2,
  SlidersHorizontal,
  Smartphone,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Sparkles,
  BookOpen,
} from "lucide-react";

interface UtilitiesErpModuleViewProps {
  activeSubTab?: UtilitiesSubTabId;
  onSelectSubTab?: (tab: UtilitiesSubTabId) => void;
}

export function UtilitiesErpModuleView({
  activeSubTab,
  onSelectSubTab,
}: UtilitiesErpModuleViewProps) {
  const { locales, receipts, resetToOfficialJune2025, completedTaskIds } = useCorabastos();
  const [internalSubTab, setInternalSubTab] = useState<UtilitiesSubTabId>("SABANA_360");
  const [inspectedLocalCode, setInspectedLocalCode] = useState<string | null>(null);

  const subTab = activeSubTab ?? internalSubTab;
  const handleSelectSubTab = (next: UtilitiesSubTabId) => {
    setInternalSubTab(next);
    if (onSelectSubTab) onSelectSubTab(next);
  };

  const inspectedLocal = inspectedLocalCode
    ? locales.find((l) => l.codigo === inspectedLocalCode) ?? null
    : null;

  const totalReal6Servicios = locales.reduce((acc, l) => acc + l.calcTotalCop, 0);
  const totalExcelColR = locales.reduce((acc, l) => acc + l.totalJunioCop, 0);
  const diffDobleConteoAcueducto = totalExcelColR - totalReal6Servicios;
  const evacuatedCount = Object.keys(completedTaskIds).length;

  return (
    <div className="space-y-4">
      {/* CABECERA COMPACTA DEL MÓDULO 01 ESTILO MJM PRECISION CLINICAL SLATE */}
      <div className="premium-card p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--outline-color)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-xs shrink-0">
              <CorabastosBrandLogo variant="isotipo" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#0B132B] text-[#f7931b] border border-[#f7931b]/30 font-mono text-[10px] font-black uppercase tracking-wider">
                  MÓDULO ERP 01 · SERVICIOS PÚBLICOS & EXPENSAS
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  Directiva No. 033-06 (Título VII · Art. 42 al 47)
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-[var(--text-main)] mt-1 tracking-tight">
                Liquidación y Transferencia de Servicios Públicos & Expensas Comunes ({receipts.nombrePeriodo})
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ALERTA FORENSE DE DOBLE CONTEO EXCEL COLUMNA R */}
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-[#f7931b]/40 text-[11px] font-mono text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#f7931b] shrink-0" />
              <span>
                <strong>Verdad Contable 6 Serv:</strong> ${totalReal6Servicios.toLocaleString("es-CO")} ·{" "}
                <span className="text-amber-700 dark:text-amber-400">
                  (Excel Col. R duplica Acueducto por +${diffDobleConteoAcueducto.toLocaleString("es-CO")})
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={resetToOfficialJune2025}
              className="px-3 py-1.5 rounded-lg border border-[var(--outline-color)] hover:bg-[var(--surface-alt)] text-[var(--text-main)] font-mono text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Restaurar valores semilla oficiales de Junio 2025"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#f7931b]" />
              <span>Restaurar Corte Base</span>
            </button>

            <Link
              href="/captura"
              target="_blank"
              className="px-3.5 py-1.5 rounded-lg bg-[#f7931b] hover:bg-orange-500 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm shadow-orange-500/20 cursor-pointer transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Cola Móvil Operador (/captura)</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* SUB-NAVEGACIÓN DE NIVEL 2 SINCRONIZADA CON EL SIDEBAR MJM */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectSubTab("SABANA_360")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "SABANA_360"
                ? "bg-[#0B132B] text-white border-l-2 border-[#f7931b] shadow-xs"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <TableProperties className={`w-3.5 h-3.5 ${subTab === "SABANA_360" ? "text-[#f7931b]" : "text-slate-400"}`} />
            <span>1.1 Sábana 5.318 Locales & Cuenta 360°</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectSubTab("BODEGAS_68")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "BODEGAS_68"
                ? "bg-[#0B132B] text-white border-l-2 border-[#f7931b] shadow-xs"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 ${subTab === "BODEGAS_68" ? "text-[#f7931b]" : "text-slate-400"}`} />
            <span>1.2 Estado 68 Bodegas & Vacancia</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectSubTab("RECIBOS_MACROS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "RECIBOS_MACROS"
                ? "bg-[#0B132B] text-white border-l-2 border-[#f7931b] shadow-xs"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${subTab === "RECIBOS_MACROS" ? "text-[#f7931b]" : "text-slate-400"}`} />
            <span>1.3 Recibos Maestros (10) & Macros (62)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectSubTab("MONITOR_CAMPO")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "MONITOR_CAMPO"
                ? "bg-[#0B132B] text-white border-l-2 border-[#f7931b] shadow-xs"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${subTab === "MONITOR_CAMPO" ? "text-[#f7931b]" : "text-slate-400"}`} />
            <span>1.4 Monitor Corte Terreno ({evacuatedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectSubTab("BI_KPIS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "BI_KPIS"
                ? "bg-[#0B132B] text-white border-l-2 border-[#f7931b] shadow-xs"
                : "border border-[#f7931b]/50 bg-[#f7931b]/10 text-[var(--text-main)] hover:bg-[#f7931b]/20"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#f7931b]" />
            <span>1.5 Inteligencia BI & 6 KPIs</span>
            <span className="px-1.5 py-0.2 rounded bg-[#f7931b] text-zinc-950 text-[9px] font-black uppercase flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> BI
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectSubTab("MEMORIA_CALCULO")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "MEMORIA_CALCULO"
                ? "bg-[#0B132B] text-white border-l-2 border-[#f7931b] shadow-xs"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 ${subTab === "MEMORIA_CALCULO" ? "text-[#f7931b]" : "text-slate-400"}`} />
            <span>1.6 Cómo se Liquidó (Reglas & Fórmulas)</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO DE LA SUB-VISTA ACTIVA DEL MÓDULO 01 */}
      {subTab === "SABANA_360" && <LiquidationMatrixView />}
      {subTab === "BODEGAS_68" && <BodegasStatusView />}
      {subTab === "RECIBOS_MACROS" && <MasterReceiptsSimulatorView />}
      {subTab === "MONITOR_CAMPO" && <MobileFieldCaptureView />}
      {subTab === "BI_KPIS" && (
        <BiLongitudinalKpisView onSelectLocalCode={(code) => setInspectedLocalCode(code)} />
      )}
      {subTab === "MEMORIA_CALCULO" && <LiquidationMethodologyView />}

      <LocalAccountModal
        local={inspectedLocal}
        onClose={() => setInspectedLocalCode(null)}
      />
    </div>
  );
}
