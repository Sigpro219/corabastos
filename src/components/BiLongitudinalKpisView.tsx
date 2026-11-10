"use client";

import React, { useMemo, useState } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { computeBiLongitudinalReport, formatNum } from "@/lib/bi-kpis-engine";
import { formatCop, formatInt, formatPct } from "@/lib/formatters";
import { Activity, AlertTriangle, ArrowUpRight, BarChart3, Building2, CheckCircle2, ClipboardCheck, Droplets, Eye, Gauge, Layers, Scale, TrendingUp, Zap } from "lucide-react";

interface BiLongitudinalKpisViewProps { onSelectLocalCode: (codigo: string) => void; }
type KpiSectionFilter = "TODOS" | "KPI1_MACROS" | "KPI2_ABSORCION" | "KPI3_METROLOGIA" | "KPI4_PARETO" | "KPI5_6_EVOLUCION";

const KPI_SECTION_TABS: { id: KpiSectionFilter; label: string }[] = [
  { id: "TODOS", label: "Vista Integral (6 KPIs)" },
  { id: "KPI1_MACROS", label: "KPI 1 · Fugas Padre-Hijo" },
  { id: "KPI2_ABSORCION", label: "KPI 2 · Brecha Finanzas" },
  { id: "KPI3_METROLOGIA", label: "KPI 3 · Parque Medidores" },
  { id: "KPI4_PARETO", label: "KPI 4 · Intensidad & Pareto" },
  { id: "KPI5_6_EVOLUCION", label: "KPI 5 & 6 · Mayo vs Junio & SLA" },
];

export function BiLongitudinalKpisView({ onSelectLocalCode }: BiLongitudinalKpisViewProps) {
  const { locales, localesByCode, energyCommunal, waterCommunal, bathroomMeters, receipts, completedTaskIds, fieldOverridesMap } = useCorabastos();
  const [sectionFilter, setSectionFilter] = useState<KpiSectionFilter>("TODOS");
  const [macroServiceFilter, setMacroServiceFilter] = useState<"ALL" | "ENERGIA" | "ACUEDUCTO">("ALL");

  const biReport = useMemo(
    () => computeBiLongitudinalReport(locales, energyCommunal, waterCommunal, bathroomMeters, receipts, completedTaskIds, fieldOverridesMap),
    [locales, energyCommunal, waterCommunal, bathroomMeters, receipts, completedTaskIds, fieldOverridesMap]
  );

  const filteredMacros = useMemo(() => {
    if (macroServiceFilter === "ALL") return biReport.kpi1TopMacromedidoresRiesgo;
    return biReport.kpi1TopMacromedidoresRiesgo.filter((m) => m.servicio === macroServiceFilter);
  }, [biReport.kpi1TopMacromedidoresRiesgo, macroServiceFilter]);

  const maxSerieFacturado = useMemo(
    () => Math.max(...biReport.kpi5SerieLongitudinal.map((s) => s.totalFacturadoRealCop), 1),
    [biReport.kpi5SerieLongitudinal]
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* BARRA DE ENFOQUE BI & CINTA DE LOS 6 KPIS ESTRATÉGICOS */}
      <div className="bg-[#0B132B] text-white rounded-xl p-4 border border-white/10 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#f7931b]" strokeWidth={1.75} />
            <h2 className="text-sm sm:text-base font-bold tracking-tight">
              6 Indicadores Estratégicos de Auditoría Longitudinal ({biReport.corteActivo})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {KPI_SECTION_TABS.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSectionFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sectionFilter === btn.id
                    ? "bg-[#f7931b] text-slate-950 shadow-sm"
                    : "bg-white/10 text-slate-300 hover:bg-white/20"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>KPI 1 · Remanente Comunal</span>
              <Zap className="w-4 h-4 text-amber-400" strokeWidth={1.75} />
            </div>
            <div className="text-lg font-black text-white mt-1 tabular-nums">
              {formatPct(biReport.kpi1IndiceComunalEnergiaPct, 1)} E · {formatPct(biReport.kpi1IndiceComunalAguaPct, 1)} A
            </div>
            <div className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
              {formatInt(biReport.kpi1AlertasFugaCount)} macromedidores &gt; +20%
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>KPI 2 · Absorción Corp.</span>
              <Scale className="w-4 h-4 text-sky-400" strokeWidth={1.75} />
            </div>
            <div className="text-lg font-black text-sky-300 mt-1 tabular-nums">
              {formatCop(biReport.kpi2TotalAsumidoCorporacionCop)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Recuperación tarifas: <strong className="text-emerald-400">{formatPct(biReport.kpi2TasaRecuperacionGlobalPct, 2)}</strong>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>KPI 3 · Salud Metrológica</span>
              <Gauge className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
            </div>
            <div className="text-lg font-black text-emerald-300 mt-1 tabular-nums">
              {formatPct(biReport.kpi3SaludMetrologicaPct, 1)} ({formatInt(biReport.kpi3MedidoresOperativosOk)}/{formatInt(biReport.kpi3TotalMedidoresFisicos)})
            </div>
            <div className="text-[11px] text-amber-300 mt-1">
              {formatInt(biReport.kpi3MedidoresAnomalos)} dañados/tapados ({formatCop(biReport.kpi3CopForzadoProrrateo)})
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>KPI 4 · Intensidad / m²</span>
              <Building2 className="w-4 h-4 text-purple-400" strokeWidth={1.75} />
            </div>
            <div className="text-lg font-black text-white mt-1 tabular-nums">
              {formatCop(biReport.kpi4PromedioCopM2Global)} / m²
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {formatNum(biReport.kpi4PromedioKwhM2Global, 2)} kWh/m² · {formatNum(biReport.kpi4PromedioM3M2Global, 2)} m³/m²
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>KPI 5 · Variación May→Jun</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
            </div>
            <div className="text-lg font-black text-white mt-1 tabular-nums">
              {biReport.kpi5VariacionMayoJunioPct >= 0 ? "+" : ""}
              {formatPct(biReport.kpi5VariacionMayoJunioPct, 2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Jun: {formatCop(biReport.kpi2TotalLiquidadoComerciantesCop)}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>KPI 6 · SLA Lectura Corte</span>
              <ClipboardCheck className="w-4 h-4 text-cyan-400" strokeWidth={1.75} />
            </div>
            <div className="text-lg font-black text-cyan-300 mt-1 tabular-nums">
              {formatPct(biReport.kpi6SlaTerrenoPct, 1)} ({formatInt(biReport.kpi6TareasEvacuadas)}/{formatInt(biReport.kpi6TotalTareasCorte)})
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Locales cerrados: {formatPct(biReport.kpi6TasaCerradosPct, 1)}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN KPI 5 & KPI 6: EVOLUCIÓN CORTE A CORTE (MAYO 2025 VS JUNIO 2025) & SLA ZONAS */}
      {(sectionFilter === "TODOS" || sectionFilter === "KPI5_6_EVOLUCION") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  KPI 5 · Comparativo Longitudinal Corte Anterior vs. Corte Actual
                </span>
                <h3 className="text-base font-black text-[var(--text-main)] mt-1">
                  Facturación y Consumos Físicos Certificados (Mayo 2025 → Junio 2025)
                </h3>
              </div>
              <div className="text-right text-xs text-[var(--text-muted)]">
                <div>Tarifa kWh: <strong className="text-[var(--text-main)]">{formatCop(receipts.energia.tarifaKwh, 2)}</strong></div>
                <div>Tarifa m³ Agua: <strong className="text-[var(--text-main)]">{formatCop(receipts.acueducto.tarifaM3, 2)}</strong></div>
              </div>
            </div>

            <div className="space-y-3">
              {biReport.kpi5SerieLongitudinal.map((pt) => {
                const widthPct = Math.min(100, Math.max(15, (pt.totalFacturadoRealCop / maxSerieFacturado) * 100));
                const isCurrent = pt.corteId === "2025-06";
                return (
                  <div
                    key={pt.corteId}
                    className={`p-3.5 rounded-lg border ${
                      isCurrent
                        ? "bg-slate-900 text-white border-slate-800"
                        : "bg-[var(--surface-alt)] border-[var(--outline-color)] text-[var(--text-main)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                      <span className="font-bold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                        {pt.etiqueta}
                      </span>
                      <div className="flex flex-wrap items-center gap-3 tabular-nums">
                        <span className={isCurrent ? "text-amber-300" : "text-amber-700 dark:text-amber-400"}>
                          Energía: <strong>{formatNum(pt.consumoFisicoEnergiaKwh, 0)} kWh</strong> ({formatCop(pt.energiaTotalCop)})
                        </span>
                        <span className={isCurrent ? "text-sky-300" : "text-sky-700 dark:text-sky-400"}>
                          Agua: <strong>{formatNum(pt.consumoFisicoAguaM3, 0)} m³</strong> ({formatCop(pt.acueductoTotalCop)})
                        </span>
                        <span className="font-black text-sm text-emerald-500">{formatCop(pt.totalFacturadoRealCop)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-2 tabular-nums">
                      <div className={isCurrent ? "text-slate-300" : "text-[var(--text-muted)]"}>
                        Vigilancia: <strong>{formatCop(pt.vigilanciaTotalCop)}</strong>
                      </div>
                      <div className={isCurrent ? "text-slate-300" : "text-[var(--text-muted)]"}>
                        Residuos: <strong>{formatCop(pt.residuosTotalCop)}</strong>
                      </div>
                      <div className={isCurrent ? "text-slate-300" : "text-[var(--text-muted)]"}>
                        Barrido/Aseo: <strong>{formatCop(pt.aseoTotalCop)}</strong>
                      </div>
                      <div className={isCurrent ? "text-slate-300" : "text-[var(--text-muted)]"}>
                        Policía: <strong>{formatCop(pt.policiaTotalCop)}</strong>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-200/70 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className={`h-full rounded-full ${isCurrent ? "bg-emerald-400" : "bg-slate-600 dark:bg-slate-400"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm p-5">
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                KPI 6 · SLA Operativo de Lectura en Terreno
              </span>
              <h3 className="text-base font-black text-[var(--text-main)] mt-1">
                Rendimiento por Zona ({formatInt(biReport.kpi6TotalTareasCorte)} Odómetros Físicos Únicos)
              </h3>
            </div>

            <div className="space-y-2.5">
              {biReport.kpi6ZonasSla.map((z) => (
                <div key={z.zonaId} className="p-3 rounded-lg bg-[var(--surface-alt)] border border-[var(--outline-color)]">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--text-main)] mb-1">
                    <span>{z.etiqueta}</span>
                    <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatPct(z.avancePct, 1)} ({formatInt(z.totalTareas - z.pendientes)}/{formatInt(z.totalTareas)})
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div style={{ width: `${Math.min(100, z.avancePct)}%` }} className="h-full bg-emerald-600 rounded-full" />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] text-[var(--text-muted)] tabular-nums">
                    <div>Pendientes: <strong className="text-amber-700 dark:text-amber-400">{formatInt(z.pendientes)}</strong></div>
                    <div>Leídos OK: <strong className="text-emerald-700 dark:text-emerald-400">{formatInt(z.completadas)}</strong></div>
                    <div>Novedad: <strong className="text-rose-700 dark:text-rose-400">{formatInt(z.novedadesTecnicas)}</strong></div>
                    <div>Cerrados: <strong className="text-[var(--text-main)]">{formatInt(z.cerradosSinAcceso)}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN KPI 1: RADAR DE PÉRDIDAS Y FUGAS EN MACROMEDIDORES PADRE-HIJO */}
      {(sectionFilter === "TODOS" || sectionFilter === "KPI1_MACROS") && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[var(--outline-color)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                KPI 1 · Índice de Pérdidas y Remanente Comunal Padre-Hijo (62 Macromedidores)
              </span>
              <h3 className="text-base font-black text-[var(--text-main)] mt-1">
                Radar de Desacoplo: Consumo Bruto Macromedidor vs. Contadores Hijos y Saltos &gt; +20%
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Energía Bruta: <strong>{formatNum(biReport.kpi1TotalBrutoEnergiaKw, 0)} kWh</strong> (Hijos: {formatNum(biReport.kpi1TotalHijosEnergiaKw, 0)} kWh · Comunal: {formatNum(biReport.kpi1RemanenteComunalEnergiaKw, 0)} kWh) | Agua Bruta: <strong>{formatNum(biReport.kpi1TotalBrutoAguaM3, 0)} m³</strong> (Hijos: {formatNum(biReport.kpi1TotalHijosAguaM3, 0)} m³ · Comunal: {formatNum(biReport.kpi1RemanenteComunalAguaM3, 0)} m³)
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {(["ALL", "ENERGIA", "ACUEDUCTO"] as const).map((srv) => (
                <button
                  key={srv}
                  type="button"
                  onClick={() => setMacroServiceFilter(srv)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    macroServiceFilter === srv
                      ? "bg-[#010F22] text-white"
                      : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--outline-color)]"
                  }`}
                >
                  {srv === "ALL" ? "Todos (62)" : srv === "ENERGIA" ? "Energía (38)" : "Acueducto (24)"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr className="bg-[#010F22] text-slate-200 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3">Bodega / Macromedidor Padre</th>
                  <th className="py-2.5 px-3">Serie Medidor</th>
                  <th className="py-2.5 px-3 text-right">Consumo Bruto Padre</th>
                  <th className="py-2.5 px-3 text-right">Descuento Hijos</th>
                  <th className="py-2.5 px-3 text-right">Neto Comunal Actual</th>
                  <th className="py-2.5 px-3 text-right">Neto Mes Anterior</th>
                  <th className="py-2.5 px-3 text-right">% Remanente</th>
                  <th className="py-2.5 px-3 text-right">Variación Mes</th>
                  <th className="py-2.5 px-3 text-center">Diagnóstico BI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--outline-color)]">
                {filteredMacros.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--surface-alt)]">
                    <td className="py-2.5 px-3 font-bold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.servicio === "ENERGIA"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                        }`}
                      >
                        {m.servicio === "ENERGIA" ? (
                          <Zap className="w-3 h-3" strokeWidth={1.75} />
                        ) : (
                          <Droplets className="w-3 h-3" strokeWidth={1.75} />
                        )}
                        {m.servicio}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[var(--text-main)]">Bod. {m.bodegaId} · {m.nombre}</td>
                    <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">{m.medidorSerie}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-[var(--text-main)]">
                      {formatNum(m.consumoBruto, 1)} {m.unidad}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      -{formatNum(m.descuentoHijos, 1)} {m.unidad}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-[var(--text-main)]">
                      {formatNum(m.consumoNetoComunal, 1)} {m.unidad}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)]">
                      {formatNum(m.consumoAnteriorComunal, 1)} {m.unidad}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-[var(--text-main)]">
                      {formatPct(m.porcentajeComunalSobreBruto, 1)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right tabular-nums font-bold ${
                        m.variacionIntermensualPct > 20 ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-main)]"
                      }`}
                    >
                      {m.variacionIntermensualPct >= 0 ? "+" : ""}
                      {formatPct(m.variacionIntermensualPct, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {m.alertaFugaActiva ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                          AUDITAR FUGA / DERIVACIÓN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                          ESTABLE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN KPI 2 & KPI 3: BRECHA FINANCIERA Y SALUD PARQUE METROLÓGICO */}
      {(sectionFilter === "TODOS" || sectionFilter === "KPI2_ABSORCION" || sectionFilter === "KPI3_METROLOGIA") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--outline-color)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                KPI 2 · Brecha de Absorción Financiera Corporativa
              </span>
              <h3 className="text-base font-black text-[var(--text-main)] mt-1">
                Conciliación V/Finanzas vs. V/Liquidado + Asumido Corporación
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-[#010F22] text-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Servicio Público / Expensa</th>
                    <th className="py-2.5 px-3 text-right">V/Finanzas</th>
                    <th className="py-2.5 px-3 text-right">V/Liquidado</th>
                    <th className="py-2.5 px-3 text-right">Asumido Corp.</th>
                    <th className="py-2.5 px-3 text-right">% Recup.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-color)]">
                  {biReport.kpi2ServiciosAbsorcion.map((item) => (
                    <tr key={item.servicio} className="hover:bg-[var(--surface-alt)]">
                      <td className="py-2.5 px-3 font-bold text-[var(--text-main)]">{item.servicio}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)]">{formatCop(item.vFinanzasCop)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCop(item.vLiquidadoComerciantesCop)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                        {formatCop(item.asumidoCorporacionFijoCop + item.asumidoVacanciaSinContratoCop)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-black text-[var(--text-main)]">
                        {formatPct(item.porcentajeRecuperacionPct, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--outline-color)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                KPI 3 · Salud del Parque Metrológico ({formatInt(biReport.kpi3TotalMedidoresFisicos)} Medidores Físicos Únicos)
              </span>
              <h3 className="text-base font-black text-[var(--text-main)] mt-1">
                Impacto de Medidores Detenidos/Tapados Forzados a Prorrateo (Art. 46)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-[#010F22] text-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Estado Técnico Medidor</th>
                    <th className="py-2.5 px-3 text-right">Energía</th>
                    <th className="py-2.5 px-3 text-right">Agua</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">Área (m²)</th>
                    <th className="py-2.5 px-3 text-right">COP en Prorrateo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-color)]">
                  {biReport.kpi3DesgloseSalud.map((h) => (
                    <tr key={h.categoria} className="hover:bg-[var(--surface-alt)]">
                      <td className="py-2.5 px-3 font-bold text-[var(--text-main)]">{h.causal}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-main)]">{formatInt(h.cantidadEnergia)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-main)]">{formatInt(h.cantidadAcueducto)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-black text-[var(--text-main)]">{formatInt(h.totalMedidores)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(h.areaAfectadaM2, 1)} m²</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        {h.categoria === "OPERATIVO" ? "—" : formatCop(h.facturacionMigradaProrrateoCop)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN KPI 4: INTENSIDAD POR M² (BODEGAS) Y TOP 15 PARETO DE LOCALES */}
      {(sectionFilter === "TODOS" || sectionFilter === "KPI4_PARETO") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--outline-color)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                KPI 4A · Benchmark de Intensidad por Bodega
              </span>
              <h3 className="text-base font-black text-[var(--text-main)] mt-1">
                Top 12 Bodegas por Intensidad Energética, Hídrica y $/m²
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-[#010F22] text-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Bodega</th>
                    <th className="py-2.5 px-3 text-right">Área m²</th>
                    <th className="py-2.5 px-3 text-right">kWh/m²</th>
                    <th className="py-2.5 px-3 text-right">m³/m²</th>
                    <th className="py-2.5 px-3 text-right">$/m² Jun</th>
                    <th className="py-2.5 px-3 text-right">Δ vs May</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-color)]">
                  {biReport.kpi4TopBodegasIntensidad.map((b) => (
                    <tr key={b.bodegaId} className="hover:bg-[var(--surface-alt)]">
                      <td className="py-2.5 px-3 font-bold text-[var(--text-main)]">
                        Bod. {b.bodegaId} <span className="text-[10px] font-normal text-[var(--text-muted)]">({formatInt(b.totalLocales)} loc)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(b.areaTotalM2, 0)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">{formatNum(b.kwhPorM2, 2)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-sky-700 dark:text-sky-400">{formatNum(b.m3PorM2, 2)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[var(--text-main)]">{formatCop(b.copPorM2Actual)}</td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-bold ${b.variacionCopPct > 5 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                        {b.variacionCopPct >= 0 ? "+" : ""}
                        {formatPct(b.variacionCopPct, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--outline-color)] flex items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                  KPI 4B · Ranking Pareto de Locales (Auditoría 360°)
                </span>
                <h3 className="text-base font-black text-[var(--text-main)] mt-1">
                  Top 15 Locales de Mayor Impacto Financiero y Comparativo Junio vs. Mayo Oficial
                </h3>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" strokeWidth={1.75} />
                Clic en cualquier local para abrir Cuenta 360°
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-[#010F22] text-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Local / Bodega</th>
                    <th className="py-2.5 px-3 text-right">Área m²</th>
                    <th className="py-2.5 px-3 text-right">kWh (Act / Ant)</th>
                    <th className="py-2.5 px-3 text-right">Mayo Oficial</th>
                    <th className="py-2.5 px-3 text-right">Total Junio</th>
                    <th className="py-2.5 px-3 text-right">Variación</th>
                    <th className="py-2.5 px-3 text-center">Cuenta 360°</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-color)]">
                  {biReport.kpi4TopParetoLocales.map((loc) => {
                    const liveLocal = localesByCode.get(loc.codigoLocal);
                    const mayoOficialCop = liveLocal ? liveLocal.totalMayoOficialCop : 0;
                    return (
                      <tr
                        key={loc.codigoLocal}
                        onClick={() => onSelectLocalCode(loc.codigoLocal)}
                        className="hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-bold text-[var(--text-main)]">
                          <span className="font-mono text-emerald-700 dark:text-emerald-400">{loc.codigoLocal}</span> · Bod. {loc.bodegaId}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(loc.areaM2, 1)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-main)]">
                          <strong>{formatNum(loc.kwhActual, 0)}</strong>{" "}
                          <span className="text-[var(--text-muted)]">/ {formatNum(loc.kwhAnterior, 0)}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)]">{formatCop(mayoOficialCop)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-black text-[var(--text-main)]">{formatCop(loc.totalActualCop)}</td>
                        <td className={`py-2.5 px-3 text-right tabular-nums font-bold ${loc.saltoMensualPct > 15 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                          {loc.saltoMensualPct >= 0 ? "+" : ""}
                          {formatPct(loc.saltoMensualPct, 1)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLocalCode(loc.codigoLocal);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-800 text-white hover:bg-emerald-600 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" strokeWidth={1.75} />
                            Auditar
                            <ArrowUpRight className="w-3 h-3" strokeWidth={1.75} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
