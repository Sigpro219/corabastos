"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LiquidationMatrixView } from "@/components/LiquidationMatrixView";
import { BodegasStatusView } from "@/components/BodegasStatusView";
import { MasterReceiptsSimulatorView } from "@/components/MasterReceiptsSimulatorView";
import { MobileFieldCaptureView } from "@/components/MobileFieldCaptureView";
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
} from "lucide-react";

type UtilitiesSubTab = "SABANA_360" | "BODEGAS_68" | "RECIBOS_MACROS" | "MONITOR_CAMPO";

export function UtilitiesErpModuleView() {
  const { locales, receipts, resetToOfficialJune2025, completedTaskIds } = useCorabastos();
  const [subTab, setSubTab] = useState<UtilitiesSubTab>("SABANA_360");

  const totalReal6Servicios = locales.reduce((acc, l) => acc + l.calcTotalCop, 0);
  const totalExcelColR = locales.reduce((acc, l) => acc + l.totalJunioCop, 0);
  const diffDobleConteoAcueducto = totalExcelColR - totalReal6Servicios;
  const evacuatedCount = Object.keys(completedTaskIds).length;

  return (
    <div className="space-y-4">
      {/* SUB-BARRA DEDICADA DEL MÓDULO 01: LIQUIDACIÓN DE SERVICIOS PÚBLICOS Y EXPENSAS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[10px] font-black">
                MÓDULO ERP 01 · DOMINIO AUTOCONTENIDO
              </span>
              <span className="text-xs font-mono text-slate-500">
                Directiva de Gerencia No. 033-06 (Título VII · Art. 42 al 47)
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              Liquidación y Transferencia de Servicios Públicos & Expensas Comunes ({receipts.nombrePeriodo})
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ALERTA FORENSE DE DOBLE CONTEO EXCEL COLUMNA R */}
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-mono text-amber-950 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>Verdad Contable 6 Serv:</strong> ${totalReal6Servicios.toLocaleString("es-CO")} ·{" "}
                <span className="text-amber-700">
                  (Excel Col. R duplica Acueducto por +${diffDobleConteoAcueducto.toLocaleString("es-CO")})
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={resetToOfficialJune2025}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-mono text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              title="Restaurar valores semilla oficiales de Junio 2025"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Corte Base</span>
            </button>

            <Link
              href="/captura"
              target="_blank"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Abrir Cola Móvil Operador (/captura)</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* SUB-NAVEGACIÓN DE NIVEL 2 (EXCLUSIVA DEL MÓDULO DE SERVICIOS PÚBLICOS) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("SABANA_360")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "SABANA_360"
                ? "bg-[#010F22] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <TableProperties className="w-4 h-4 text-emerald-400" />
            <span>1.1 Sábana 5.318 Locales & Cuenta Individual 360°</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("BODEGAS_68")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "BODEGAS_68"
                ? "bg-[#010F22] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>1.2 Estado de las 68 Bodegas & Motor de Vacancia</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("RECIBOS_MACROS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "RECIBOS_MACROS"
                ? "bg-[#010F22] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <span>1.3 Recibos Maestros (10) & Macromedidores Padre-Hijo (62)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("MONITOR_CAMPO")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "MONITOR_CAMPO"
                ? "bg-[#010F22] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>1.4 Monitor de Corte & Auditoría Terreno ({evacuatedCount} leídas)</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO DE LA SUB-VISTA ACTIVA DEL MÓDULO 01 */}
      {subTab === "SABANA_360" && <LiquidationMatrixView />}
      {subTab === "BODEGAS_68" && <BodegasStatusView />}
      {subTab === "RECIBOS_MACROS" && <MasterReceiptsSimulatorView />}
      {subTab === "MONITOR_CAMPO" && <MobileFieldCaptureView />}
    </div>
  );
}
