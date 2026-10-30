"use client";

import React from "react";
import { ERP_EXPANSION_RINGS } from "@/lib/liquidation-engine";
import { ErpMacroModuleId } from "@/contracts/erp-bridges";
import { formatCop, formatInt } from "@/lib/formatters";
import { useCorabastos } from "@/context/CorabastosContext";
import {
  CheckCircle2,
  ArrowUpRight,
  ArrowLeft,
  Building2,
  FileSpreadsheet,
  Wrench,
  Leaf,
} from "lucide-react";

interface ErpRoadmapExpansionViewProps {
  activeModuleId?: ErpMacroModuleId;
  onReturnToCore?: () => void;
}

const MODULE_RING_MAP: Record<ErpMacroModuleId, number> = {
  MOD_1_SERVICIOS_EXPENSAS: 1,
  MOD_2_FACTURACION_CARTERA: 2,
  MOD_3_CATASTRO_CONTRATOS: 3,
  MOD_4_MANTENIMIENTO_CMMS: 4,
  MOD_5_AMBIENTAL_PGIRS_SAC: 5,
};

export function ErpRoadmapExpansionView({
  activeModuleId = "MOD_2_FACTURACION_CARTERA",
  onReturnToCore,
}: ErpRoadmapExpansionViewProps) {
  const { locales, receipts } = useCorabastos();
  const targetRingNum = MODULE_RING_MAP[activeModuleId] || 2;
  const ring =
    ERP_EXPANSION_RINGS.find((r) => r.anillo === targetRingNum) || ERP_EXPANSION_RINGS[1];

  const totalLiquidadoMes = locales.reduce((acc, l) => acc + l.calcTotalCop, 0);

  const getModuleIcon = () => {
    switch (activeModuleId) {
      case "MOD_2_FACTURACION_CARTERA":
        return <FileSpreadsheet className="w-6 h-6 text-[#f7931b]" />;
      case "MOD_3_CATASTRO_CONTRATOS":
        return <Building2 className="w-6 h-6 text-[#f7931b]" />;
      case "MOD_4_MANTENIMIENTO_CMMS":
        return <Wrench className="w-6 h-6 text-[#f7931b]" />;
      default:
        return <Leaf className="w-6 h-6 text-[#f7931b]" />;
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#0B132B] text-white rounded-2xl p-6 border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4 max-w-3xl">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            {getModuleIcon()}
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#f7931b]/20 border border-[#f7931b]/40 text-[#f7931b] text-[10px] font-mono font-bold uppercase tracking-wider">
              MÓDULO CORPORATIVO EN FASE DE HABILITACIÓN · ANILLO {ring.anillo}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">{ring.titulo}</h2>
            <p className="text-xs text-slate-300 mt-1">{ring.subtitulo}</p>
          </div>
        </div>

        {onReturnToCore && (
          <button
            type="button"
            onClick={onReturnToCore}
            className="px-4 py-2.5 rounded-xl bg-[#f7931b] hover:bg-orange-500 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Servicios Públicos & Expensas</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Censo Conectado desde Módulo 01
            </span>
            <span className="text-lg font-mono font-black text-slate-900 mt-0.5 block">
              {formatInt(locales.length)} Locales · 68 Bodegas
            </span>
            <span className="text-[11px] text-slate-500">
              126.125,2 m² sincronizados en tiempo real
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Base Liquidada ({receipts.nombrePeriodo})
            </span>
            <span className="text-lg font-mono font-black text-emerald-700 mt-0.5 block">
              {formatCop(totalLiquidadoMes)} COP
            </span>
            <span className="text-[11px] text-slate-500">
              Lista para integración contable y operativa
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Impacto Operativo Esperado
            </span>
            <span className="text-sm font-bold text-[#1D3557] mt-1 block">
              {ring.impactoFinancieroEstimado}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-slate-100">
          <div className="lg:col-span-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Alcance Operativo en Corabastos S.A.
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">{ring.dolorQueResuelve}</p>
          </div>

          <div className="lg:col-span-7 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Capacidades Incluidas al Activar este Módulo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ring.entregablesClave.map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
