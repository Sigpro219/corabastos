"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCorabastos } from "@/context/CorabastosContext";
import { CORABASTOS_ERP_MODULES, ErpMacroModuleId } from "@/contracts/erp-bridges";
import { UtilitiesErpModuleView } from "@/components/UtilitiesErpModuleView";
import { ErpRoadmapExpansionView } from "@/components/ErpRoadmapExpansionView";
import {
  Smartphone,
  Building2,
  CheckCircle2,
  Zap,
  Droplets,
  ShieldCheck,
  ExternalLink,
  Activity,
  Layers,
  Plug,
} from "lucide-react";

export default function CorabastosErpShellPage() {
  const { locales, energyCommunal, waterCommunal, receipts, recentFieldUpdates } = useCorabastos();
  const [activeErpModule, setActiveErpModule] = useState<ErpMacroModuleId>(
    "MOD_1_SERVICIOS_EXPENSAS"
  );

  const totalLiquidadoMes = locales.reduce((acc, l) => acc + l.calcTotalCop, 0);
  const totalContadoresEnergia = locales.filter((l) => l.modalidadEnergia === "CONTADOR").length;
  const totalContadoresAgua = locales.filter((l) => l.modalidadAcueducto === "CONTADOR").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      {/* CAPA 1: TOP APP BAR DEL SHELL ERP CORPORATIVO (NIVEL 1) */}
      <header className="sticky top-0 z-40 h-14 bg-[#010F22] text-white border-b border-white/10 px-4 lg:px-8 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E73A46] flex items-center justify-center font-bold text-sm shadow">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm sm:text-base">
                CORABASTOS OS · ERP CORPORATIVO
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <CheckCircle2 className="w-3 h-3" />
                CHASIS MULTI-MÓDULO SDD v1.3
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Corporación de Abastos de Bogotá S.A. · 68 Bodegas · 5.318 Locales · 126.125,15 m²
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/captura"
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Satélite Móvil Operador</span>
            <span className="sm:hidden">Operador</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-emerald-300 text-[10px] font-mono">
              /captura
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-900" />
          </Link>

          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">Censo Catastral</span>
              <span className="font-mono font-bold text-white">
                {locales.length.toLocaleString("es-CO")} Locales ·{" "}
                {energyCommunal.length + waterCommunal.length} Macromedidores
              </span>
            </div>
            <div className="text-right bg-white/5 px-3 py-1 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase text-sky-300 block">
                Corte {receipts.nombrePeriodo} (6 Serv.)
              </span>
              <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm tabular-nums">
                ${totalLiquidadoMes.toLocaleString("es-CO")} COP
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* NAVEGACIÓN PRINCIPAL DE NIVEL 1: LOS 5 MACRO-MÓDULOS DEL ERP DE CORABASTOS */}
      <div className="bg-[#1D3557] text-white border-b border-white/10 px-4 lg:px-8 py-2">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 mr-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Módulos ERP:
            </span>
            {CORABASTOS_ERP_MODULES.map((mod) => {
              const isSelected = activeErpModule === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveErpModule(mod.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-[#010F22] shadow-sm"
                      : "bg-white/10 text-slate-200 hover:bg-white/20"
                  }`}
                >
                  {mod.isLive ? (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "text-emerald-600" : "text-emerald-400"
                      }`}
                    />
                  ) : (
                    <Plug
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "text-amber-600" : "text-amber-300"
                      }`}
                    />
                  )}
                  <span>{mod.shortLabel}</span>
                  {mod.isLive ? (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-500 text-[9px] font-mono font-black">
                      ACTIVO
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono">
                      ANILLO {mod.anillo}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-200 font-mono">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              E: {totalContadoresEnergia} medidores
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              A: {totalContadoresAgua} medidores
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <Activity className="w-3.5 h-3.5" />
              {recentFieldUpdates.length} tareas campo
            </span>
          </div>
        </div>
      </div>

      {/* ÁREA DE TRABAJO CENTRAL: ENCAPSULADA POR MACRO-MÓDULO ERP */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-5">
        {activeErpModule === "MOD_1_SERVICIOS_EXPENSAS" ? (
          <UtilitiesErpModuleView />
        ) : (
          <ErpRoadmapExpansionView />
        )}
      </main>

      {/* FOOTER INSTITUCIONAL */}
      <footer className="bg-white border-t border-slate-200 px-4 lg:px-8 py-3 text-[11px] text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1D3557]" />
            <span>
              <strong>Corabastos OS v1.3</strong> · Arquitectura ERP de 2 Niveles · Módulo 01 (Servicios Públicos y Expensas) 100% Activo
            </span>
          </div>
          <div className="font-mono text-slate-400">
            Puerto Oficial: 3013 · Firebase Cloud: mjm-sistema-2026-aee19
          </div>
        </div>
      </footer>
    </div>
  );
}
