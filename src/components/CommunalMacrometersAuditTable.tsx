"use client";

import React, { useState } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { formatDec, formatInt } from "@/lib/formatters";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Droplets,
  GitBranch,
  Zap,
} from "lucide-react";

type MacroTab = "ENERGIA_38" | "AGUA_24" | "BANOS_16";

export function CommunalMacrometersAuditTable() {
  const { energyCommunal, waterCommunal, bathroomMeters } = useCorabastos();
  const [activeTab, setActiveTab] = useState<MacroTab>("ENERGIA_38");

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--outline-color)] p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--outline-color)] pb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5" strokeWidth={1.75} />
            AUDITORÍA DE DESACOPLO PADRE-HIJO DE MACROMEDIDORES COMUNALES & BAÑOS PÚBLICOS
          </span>
          <h3 className="text-base font-bold text-[var(--text-main)] mt-0.5">
            {formatInt(energyCommunal.length)} Macromedidores Energía + {formatInt(waterCommunal.length)} Agua Comunal + {formatInt(bathroomMeters.length)} Baños Públicos
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("ENERGIA_38")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ENERGIA_38"
                ? "bg-amber-500 text-slate-950 shadow-2xs"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Energía Comunal ({formatInt(energyCommunal.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("AGUA_24")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "AGUA_24"
                ? "bg-sky-500 text-slate-950 shadow-2xs"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Agua Comunal ({formatInt(waterCommunal.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BANOS_16")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "BANOS_16"
                ? "bg-[#0B132B] text-white shadow-2xs"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Baños Públicos ({formatInt(bathroomMeters.length)})</span>
          </button>
        </div>
      </div>

      {activeTab === "ENERGIA_38" && (
        <div className="overflow-x-auto border border-[var(--outline-color)] rounded-xl">
          <table
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
            className="w-full text-left text-xs font-mono"
          >
            <thead>
              <tr className="bg-[#0B132B] text-white text-[10px] uppercase">
                <th className="py-2.5 px-3">Macromedidor</th>
                <th className="py-2.5 px-3">Bod / Tipo</th>
                <th className="py-2.5 px-3">Serie</th>
                <th className="py-2.5 px-3 text-right">Lect. Ant → Act</th>
                <th className="py-2.5 px-3 text-right">Bruto (kWh)</th>
                <th className="py-2.5 px-3 text-right">Hijos Saneados (kWh)</th>
                <th className="py-2.5 px-3 text-right">Neto Comunal (kWh)</th>
                <th className="py-2.5 px-3 text-right">Área m²</th>
                <th className="py-2.5 px-3 text-right">Factor kWh/m²</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {energyCommunal.map((m) => (
                <tr key={m.id} className="hover:bg-sky-500/10">
                  <td className="py-2 px-3 font-black text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {m.codigo}
                  </td>
                  <td className="py-2 px-3 text-[var(--text-muted)] border-b border-[var(--outline-color)]">
                    Bod {m.bodegaId} · {m.tipo}
                  </td>
                  <td className="py-2 px-3 text-[var(--text-muted)] border-b border-[var(--outline-color)]">
                    {m.contadorSerie}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatInt(m.lecturaAnterior)} → {formatInt(m.lecturaActual)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatDec(m.consumoBruto, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 tabular-nums border-b border-[var(--outline-color)]">
                    -{formatDec(m.consumoHijosDescontado, 2)} ({formatInt(m.hijosCount)})
                  </td>
                  <td className="py-2 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums border-b border-[var(--outline-color)]">
                    {formatDec(m.consumoNetoComunal, 2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatDec(m.areaComunalM2, 2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatDec(m.factorPorM2, 4)}
                  </td>
                  <td className="py-2 px-3 text-center border-b border-[var(--outline-color)]">
                    {m.alertaDesviacion ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                        {m.observacion}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
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
        <div className="overflow-x-auto border border-[var(--outline-color)] rounded-xl">
          <table
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
            className="w-full text-left text-xs font-mono"
          >
            <thead>
              <tr className="bg-[#0B132B] text-white text-[10px] uppercase">
                <th className="py-2.5 px-3">Macromedidor Agua</th>
                <th className="py-2.5 px-3">Bodega</th>
                <th className="py-2.5 px-3">Serie</th>
                <th className="py-2.5 px-3 text-right">Lect. Ant → Act</th>
                <th className="py-2.5 px-3 text-right">Bruto (m³)</th>
                <th className="py-2.5 px-3 text-right">Hijos Saneados (m³)</th>
                <th className="py-2.5 px-3 text-right">Neto Comunal (m³)</th>
                <th className="py-2.5 px-3 text-right">Área m²</th>
                <th className="py-2.5 px-3 text-right">Factor m³/m²</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {waterCommunal.map((w) => (
                <tr key={w.id} className="hover:bg-sky-500/10">
                  <td className="py-2 px-3 font-black text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {w.codigo}
                  </td>
                  <td className="py-2 px-3 text-[var(--text-muted)] border-b border-[var(--outline-color)]">
                    Bod {w.bodegaId}
                  </td>
                  <td className="py-2 px-3 text-[var(--text-muted)] border-b border-[var(--outline-color)]">
                    {w.contadorSerie}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatInt(w.lecturaAnterior)} → {formatInt(w.lecturaActual)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatDec(w.consumoBruto, 2)}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 tabular-nums border-b border-[var(--outline-color)]">
                    -{formatDec(w.consumoHijosDescontado, 2)} ({formatInt(w.hijosCount)})
                  </td>
                  <td className="py-2 px-3 text-right font-black text-sky-600 dark:text-sky-400 tabular-nums border-b border-[var(--outline-color)]">
                    {formatDec(w.consumoNetoComunal, 2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatDec(w.areaComunalM2, 2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatDec(w.factorPorM2, 4)}
                  </td>
                  <td className="py-2 px-3 text-center border-b border-[var(--outline-color)]">
                    {w.alertaDesviacion ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                        {w.observacion}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
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
        <div className="overflow-x-auto border border-[var(--outline-color)] rounded-xl">
          <table
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
            className="w-full text-left text-xs font-mono"
          >
            <thead>
              <tr className="bg-[#0B132B] text-white text-[10px] uppercase">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Batería Sanitaria / Baño Público</th>
                <th className="py-2.5 px-3">Serie Medidor</th>
                <th className="py-2.5 px-3 text-right">Lectura Anterior</th>
                <th className="py-2.5 px-3 text-right">Lectura Actual</th>
                <th className="py-2.5 px-3 text-right">Consumo Mes (m³)</th>
              </tr>
            </thead>
            <tbody>
              {bathroomMeters.map((b) => (
                <tr key={b.id} className="hover:bg-sky-500/10">
                  <td className="py-2 px-3 text-[var(--text-muted)] border-b border-[var(--outline-color)]">
                    {b.id}
                  </td>
                  <td className="py-2 px-3 font-black text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {b.codigo}
                  </td>
                  <td className="py-2 px-3 text-[var(--text-muted)] border-b border-[var(--outline-color)]">
                    {b.contadorSerie}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatInt(b.lecturaAnterior)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {formatInt(b.lecturaActual)}
                  </td>
                  <td className="py-2 px-3 text-right font-black text-sky-600 dark:text-sky-400 tabular-nums border-b border-[var(--outline-color)]">
                    {formatDec(b.consumoM3, 0, 2)} m³
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
