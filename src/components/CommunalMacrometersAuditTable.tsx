"use client";

import React, { useState } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { formatDec, formatInt } from "@/lib/formatters";
import {
  GitBranch,
  Zap,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Building2,
} from "lucide-react";

type MacroTab = "ENERGIA_38" | "AGUA_24" | "BANOS_16";

export function CommunalMacrometersAuditTable() {
  const { energyCommunal, waterCommunal, bathroomMeters } = useCorabastos();
  const [activeTab, setActiveTab] = useState<MacroTab>("ENERGIA_38");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5" />
            AUDITORÍA DE DESACOPLO PADRE-HIJO DE MACROMEDIDORES COMUNALES & BAÑOS PÚBLICOS
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            38 Macromedidores Energía + 24 Macromedidores Agua Comunal + 16 Baños Públicos
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("ENERGIA_38")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ENERGIA_38"
                ? "bg-amber-500 text-slate-950 shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Energía Comunal ({energyCommunal.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("AGUA_24")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "AGUA_24"
                ? "bg-sky-500 text-slate-950 shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Agua Comunal ({waterCommunal.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BANOS_16")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "BANOS_16"
                ? "bg-[#010F22] text-white shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Baños Públicos ({bathroomMeters.length})</span>
          </button>
        </div>
      </div>

      {activeTab === "ENERGIA_38" && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#010F22] text-white text-[10px] uppercase">
                <th className="py-2.5 px-3">Macromedidor</th>
                <th className="py-2.5 px-3">Bod / Tipo</th>
                <th className="py-2.5 px-3">Serie</th>
                <th className="py-2.5 px-3 text-right">Lect. Ant → Act</th>
                <th className="py-2.5 px-3 text-right">Bruto (kWh)</th>
                <th className="py-2.5 px-3 text-right">Hijos Desc. (kWh)</th>
                <th className="py-2.5 px-3 text-right">Neto Comunal (kWh)</th>
                <th className="py-2.5 px-3 text-right">Área m²</th>
                <th className="py-2.5 px-3 text-right">Factor kWh/m²</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {energyCommunal.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-black text-slate-900">{m.codigo}</td>
                  <td className="py-2 px-3 text-slate-700">
                    Bod {m.bodegaId} · {m.tipo}
                  </td>
                  <td className="py-2 px-3 text-slate-500">{m.contadorSerie}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {formatInt(m.lecturaAnterior)} → {formatInt(m.lecturaActual)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold tabular-nums">
                    {formatDec(m.consumoBruto, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-700 tabular-nums">
                    -{formatDec(m.consumoHijosDescontado, 2)} ({formatInt(m.hijosCount)})
                  </td>
                  <td className="py-2 px-3 text-right font-black text-emerald-700 tabular-nums">
                    {formatDec(m.consumoNetoComunal, 2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {formatDec(m.areaComunalM2, 2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatDec(m.factorPorM2, 4)}</td>
                  <td className="py-2 px-3 text-center">
                    {m.alertaDesviacion ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        {m.observacion}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "AGUA_24" && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#010F22] text-white text-[10px] uppercase">
                <th className="py-2.5 px-3">Macromedidor Agua</th>
                <th className="py-2.5 px-3">Bodega</th>
                <th className="py-2.5 px-3">Serie</th>
                <th className="py-2.5 px-3 text-right">Lect. Ant → Act</th>
                <th className="py-2.5 px-3 text-right">Bruto (m³)</th>
                <th className="py-2.5 px-3 text-right">Hijos Desc. (m³)</th>
                <th className="py-2.5 px-3 text-right">Neto Comunal (m³)</th>
                <th className="py-2.5 px-3 text-right">Área m²</th>
                <th className="py-2.5 px-3 text-right">Factor m³/m²</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {waterCommunal.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-black text-slate-900">{w.codigo}</td>
                  <td className="py-2 px-3 text-slate-700">Bod {w.bodegaId}</td>
                  <td className="py-2 px-3 text-slate-500">{w.contadorSerie}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {formatInt(w.lecturaAnterior)} → {formatInt(w.lecturaActual)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold tabular-nums">
                    {formatDec(w.consumoBruto, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-700 tabular-nums">
                    -{formatDec(w.consumoHijosDescontado, 2)} ({formatInt(w.hijosCount)})
                  </td>
                  <td className="py-2 px-3 text-right font-black text-sky-700 tabular-nums">
                    {formatDec(w.consumoNetoComunal, 2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {formatDec(w.areaComunalM2, 2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatDec(w.factorPorM2, 4)}</td>
                  <td className="py-2 px-3 text-center">
                    {w.alertaDesviacion ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        {w.observacion}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "BANOS_16" && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#010F22] text-white text-[10px] uppercase">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Batería Sanitaria / Baño Público</th>
                <th className="py-2.5 px-3">Serie Medidor</th>
                <th className="py-2.5 px-3 text-right">Lectura Anterior</th>
                <th className="py-2.5 px-3 text-right">Lectura Actual</th>
                <th className="py-2.5 px-3 text-right">Consumo Mes (m³)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bathroomMeters.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-500">{b.id}</td>
                  <td className="py-2 px-3 font-black text-slate-900">{b.codigo}</td>
                  <td className="py-2 px-3 text-slate-600">{b.contadorSerie}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {b.lecturaAnterior.toLocaleString("es-CO")}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {b.lecturaActual.toLocaleString("es-CO")}
                  </td>
                  <td className="py-2 px-3 text-right font-black text-sky-700 tabular-nums">
                    {b.consumoM3.toLocaleString("es-CO")} m³
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
