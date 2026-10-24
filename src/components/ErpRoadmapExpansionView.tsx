"use client";

import React from "react";
import { ERP_EXPANSION_RINGS } from "@/lib/liquidation-engine";
import {
  Layers,
  CheckCircle2,
  PlugZap,
  ArrowUpRight,
  ShieldCheck,
  Code2,
} from "lucide-react";

export function ErpRoadmapExpansionView() {
  return (
    <div className="space-y-6">
      {/* Banner Estratégico Land & Expand */}
      <div className="bg-[#010F22] text-white rounded-3xl p-6 border-l-8 border-[#E73A46] shadow-xl">
        <div className="max-w-4xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E73A46]/20 border border-[#E73A46]/40 text-[#E73A46] text-[11px] font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            ESTRATEGIA COMERCIAL LAND & EXPAND · DELTA CORETECH
          </span>
          <h2 className="text-2xl font-bold tracking-tight">
            Del Motor de Servicios Públicos al ERP Corporativo Integral de Corabastos
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Este primer módulo (Captura Móvil de Contadores + Liquidación de Servicios Públicos y Expensas para los 5.318 locales) es nuestro{" "}
            <strong className="text-white">Boleto de Entrada</strong>. Su arquitectura de{" "}
            <strong className="text-emerald-400">Cables Pelados (Clean Boundary Harness)</strong> deja listas las costuras técnicas para activar e ir vendiendo progresivamente los módulos probados en{" "}
            <code className="font-mono text-sky-300">frufresco</code>,{" "}
            <code className="font-mono text-sky-300">Seguridad (Help! On Risks)</code> e{" "}
            <code className="font-mono text-sky-300">ingyemel_mantenimiento</code>.
          </p>
        </div>
      </div>

      {/* Los 5 Anillos de Expansión Comercial */}
      <div className="grid grid-cols-1 gap-5">
        {ERP_EXPANSION_RINGS.map((ring) => {
          const isMvp = ring.estado === "ACTIVO_MVP";
          return (
            <div
              key={ring.id}
              className={`bg-white rounded-2xl border-2 p-6 shadow-sm transition-all ${
                isMvp ? "border-emerald-600" : "border-slate-200 hover:border-[#1D3557]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isMvp
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-sky-100 text-[#1D3557] border border-sky-300"
                      }`}
                    >
                      {isMvp ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          ANILLO {ring.anillo} · BOLETO DE ENTRADA (100% OPERATIVO)
                        </>
                      ) : (
                        <>
                          <PlugZap className="w-3 h-3 text-[#E73A46]" />
                          ANILLO {ring.anillo} · CABLE PELADO LISTO PARA VENTA MODULAR
                        </>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{ring.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1D3557]">{ring.titulo}</h3>
                  <p className="text-xs font-medium text-[#E73A46]">{ring.subtitulo}</p>
                </div>

                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    ROI / Impacto Operativo en Corabastos
                  </span>
                  <span className="text-xs font-bold text-[#1D3557]">
                    {ring.impactoFinancieroEstimado}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
                <div className="lg:col-span-7 space-y-3">
                  <p className="text-xs text-[#4C607B] leading-relaxed">
                    <strong className="text-[#1D3557]">Dolor Operativo que Resuelve: </strong>
                    {ring.dolorQueResuelve}
                  </p>

                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1D3557] mb-2">
                      Entregables Funcionales del Módulo:
                    </h4>
                    <ul className="space-y-1.5">
                      {ring.entregablesClave.map((item, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-[#1D3557]" />
                    <span>
                      <strong>Refacción Base Trasplantada:</strong> {ring.origenArsenal}
                    </span>
                  </div>
                </div>

                {/* Conector Técnico ("Cable Pelado") */}
                <div className="lg:col-span-5 bg-[#010F22] text-slate-200 rounded-2xl p-4 font-mono text-[11px] space-y-2 border border-[#1D3557]">
                  <div className="flex items-center justify-between text-sky-300 border-b border-white/10 pb-1.5">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Code2 className="w-3.5 h-3.5" />
                      Contrato de Frontera (Cable Pelado)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      READY
                    </span>
                  </div>
                  <pre className="text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                    {JSON.stringify(ring.payloadPuenteEjemplo, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
