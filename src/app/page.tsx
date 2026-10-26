"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCorabastos } from "@/context/CorabastosContext";
import { MobileFieldCaptureView } from "@/components/MobileFieldCaptureView";
import { MasterReceiptsSimulatorView } from "@/components/MasterReceiptsSimulatorView";
import { LiquidationMatrixView } from "@/components/LiquidationMatrixView";
import { ErpRoadmapExpansionView } from "@/components/ErpRoadmapExpansionView";
import {
  Smartphone,
  SlidersHorizontal,
  TableProperties,
  Layers,
  Building2,
  CheckCircle2,
  Zap,
  Droplets,
  ShieldCheck,
  ExternalLink,
  Activity,
} from "lucide-react";

type ActiveTab = "SABANA" | "RECIBOS" | "TERRENO" | "ERP_ROADMAP";

export default function CorabastosDashboardPage() {
  const { locales, energyCommunal, waterCommunal, receipts, recentFieldUpdates } = useCorabastos();
  const [activeTab, setActiveTab] = useState<ActiveTab>("SABANA");

  const totalLiquidadoMes = locales.reduce((acc, l) => acc + l.calcTotalCop, 0);
  const totalContadoresEnergia = locales.filter((l) => l.modalidadEnergia === "CONTADOR").length;
  const totalContadoresAgua = locales.filter((l) => l.modalidadAcueducto === "CONTADOR").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      {/* TOP APP BAR INSTITUCIONAL (ESTÁNDAR SEGURIDAD / HELP! ON RISKS + INGYEMEL) */}
      <header className="sticky top-0 z-30 h-14 bg-[#010F22] text-white border-b border-white/10 px-4 lg:px-8 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E73A46] flex items-center justify-center font-bold text-sm shadow">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm sm:text-base">
                CORABASTOS OS
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <CheckCircle2 className="w-3 h-3" />
                CONSOLA GERENCIAL & FACTURACIÓN
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Mesa de Control Financiero, Desacoplo de Macromedidores & Sábana Oficial de 5.318 Locales
            </p>
          </div>
        </div>

        {/* ACCESO DIRECTO DESTACADO: APP MÓVIL DEL OPERADOR */}
        <div className="flex items-center gap-3">
          <Link
            href="/captura"
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">App Móvil Operador</span>
            <span className="sm:hidden">App Móvil</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-emerald-300 text-[10px] font-mono">
              /captura
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-900" />
          </Link>

          {/* Telemetría Rápida en Cabecera */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">Censo Activo</span>
              <span className="font-mono font-bold text-white">
                {locales.length.toLocaleString("es-CO")} Locales · {energyCommunal.length + waterCommunal.length} Macromedidores
              </span>
            </div>
            <div className="text-right bg-white/5 px-3 py-1 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase text-sky-300 block">
                Liquidación {receipts.nombrePeriodo}
              </span>
              <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                ${totalLiquidadoMes.toLocaleString("es-CO")} COP
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* TICKER DE MÉTRICAS OPERATIVAS (28PX COMPACTO) */}
      <div className="bg-[#1D3557] text-slate-200 px-4 lg:px-8 py-1.5 text-[11px] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <strong>Contadores Energía:</strong>{" "}
            <span className="font-mono">{totalContadoresEnergia.toLocaleString("es-CO")}</span> locales (${receipts.energia.tarifaKwh}/kWh)
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            <strong>Contadores Agua:</strong>{" "}
            <span className="font-mono">{totalContadoresAgua.toLocaleString("es-CO")}</span> locales (${receipts.acueducto.tarifaM3.toFixed(0)}/m³)
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <strong>Lecturas Recibidas en Campo:</strong>{" "}
            <span className="font-mono font-bold text-emerald-300">{recentFieldUpdates.length}</span> sincronizadas
          </span>
        </div>
      </div>

      {/* BARRA DE NAVEGACIÓN DE MÓDULOS GERENCIALES */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-8 py-2.5 shadow-2xs">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("SABANA")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "SABANA"
                ? "bg-[#1D3557] text-white shadow-sm"
                : "bg-slate-100 text-[#1D3557] hover:bg-slate-200"
            }`}
          >
            <TableProperties className="w-4 h-4" />
            1. Sábana Maestra 5.318 Locales, Planos ERP & Estados de Cuenta PDF
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("RECIBOS")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "RECIBOS"
                ? "bg-[#1D3557] text-white shadow-sm"
                : "bg-slate-100 text-[#1D3557] hover:bg-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            2. Recibos Maestros y Factores (3 Energía · 3 Agua · 4 Expensas)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TERRENO")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "TERRENO"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-slate-100 text-[#1D3557] hover:bg-slate-200"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            3. Monitor de Capturas & Desacoplo Macromedidores
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ERP_ROADMAP")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ERP_ROADMAP"
                ? "bg-[#010F22] text-white shadow-sm"
                : "bg-slate-100 text-[#1D3557] hover:bg-slate-200"
            }`}
          >
            <Layers className="w-4 h-4 text-[#E73A46]" />
            4. Escalamiento ERP Corabastos (Land & Expand · 5 Anillos)
          </button>
        </div>
      </div>

      {/* CONTENEDOR CENTRAL ESTÁNDAR 1600PX */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
        {activeTab === "SABANA" && <LiquidationMatrixView />}
        {activeTab === "RECIBOS" && <MasterReceiptsSimulatorView />}
        {activeTab === "TERRENO" && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Módulo de Captura Desacoplado para Operarios de Terreno
                  </h3>
                  <p className="text-xs text-slate-600">
                    Los operarios acceden a una PWA aislada en <code className="font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">/captura</code> sin acceso a estados de cuenta ni finanzas corporativas.
                  </p>
                </div>
              </div>
              <Link
                href="/captura"
                target="_blank"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <span>Abrir Terminal Móvil (/captura)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
            <MobileFieldCaptureView />
          </div>
        )}
        {activeTab === "ERP_ROADMAP" && <ErpRoadmapExpansionView />}
      </main>
    </div>
  );
}
