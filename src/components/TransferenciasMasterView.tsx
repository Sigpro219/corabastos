"use client";

import React, { useState, useMemo } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { formatCop, formatDec, formatInt } from "@/lib/formatters";
import {
  BodegaHeatmapLens,
  BodegaHeatmapCell,
  TransferCutoffConfig,
  ConsumptionAnomalyReportItem,
} from "@/contracts/domain-contracts";
import {
  Calendar,
  Flame,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

export function TransferenciasMasterView({
  onSelectLocalCode,
}: {
  onSelectLocalCode: (codigo: string) => void;
}) {
  const { receipts, bodegasList, locales } = useCorabastos();

  // 1. Configuración de Fecha de Corte Editable
  const [cutoffConfig, setCutoffConfig] = useState<TransferCutoffConfig>({
    periodo: receipts.periodo || "2025-06",
    nombrePeriodo: receipts.nombrePeriodo || "JUNIO 2025",
    fechaCorteEnergiaIso: "2025-06-20",
    fechaCorteAcueductoIso: "2025-06-18",
    fechaExpedicionFichaIso: "2025-06-30",
    updatedAt: new Date().toISOString(),
    updatedBy: "ADMIN_FINANZAS",
  });

  const [activeLens, setActiveLens] = useState<BodegaHeatmapLens>("AVANCE_RUTA");
  const [activeSubModule, setActiveSubModule] = useState<
    "HEATMAP" | "INVENTARIO" | "ANOMALIAS" | "DIGESTOR_PDF"
  >("HEATMAP");

  const [anomalySearch, setAnomalySearch] = useState("");
  const [reverifyToast, setReverifyToast] = useState<string | null>(null);

  // Muestra de celdas de calor para las 68 bodegas
  const heatmapCells: BodegaHeatmapCell[] = useMemo(() => {
    return bodegasList.map((bId, idx) => {
      const bLocales = locales.filter((l) => l.bodegaId === bId);
      const paradasTotales = bLocales.length;
      const paradasEvacuadas = Math.round(paradasTotales * 0.85);
      const avanceLecturaPct = paradasTotales > 0 ? Math.round((paradasEvacuadas / paradasTotales) * 100) : 100;
      const diaIndice = (idx % 22) + 1;
      const daysLabels: BodegaHeatmapCell["diaSemanaLabel"][] = [
        "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES",
      ];
      const diaSemanaLabel = daysLabels[idx % 5];

      return {
        bodegaId: bId,
        diaIndiceAsignado: diaIndice,
        diaSemanaLabel,
        paradasFisicasTotales: paradasTotales,
        paradasEvacuadas,
        avanceLecturaPct,
        novedadesCount: idx % 7 === 0 ? 3 : 0,
        variacionConsumoPct: idx % 5 === 0 ? 24.5 : 4.2,
        segundosPromedioPorParada: 75 + (idx % 20) * 3,
        severidadActiva:
          idx % 7 === 0
            ? "ROJO_CRITICO"
            : avanceLecturaPct === 100
            ? "VERDE_OPTIMO"
            : "AMBAR_EN_CURSO",
      };
    });
  }, [bodegasList, locales]);

  // Lista simulada de anomalías con el motor de bandas
  const sampleAnomalies: ConsumptionAnomalyReportItem[] = useMemo(() => {
    return [
      {
        anomalyId: "ANOM-2025-06-ENERGIA-150010",
        periodo: cutoffConfig.periodo,
        codigoLocal: "150010",
        bodegaId: "15",
        servicio: "ENERGIA",
        unidad: "kWh",
        consumoActualFisico: 8128,
        bandaMinHistorica: 4200,
        bandaMaxHistorica: 5800,
        mediaHistoricaEma: 5000,
        desviacionBandaPct: 40.1,
        impactoDesviacionCop: 1677277,
        severidad: "SOBRECONSUMO_CRITICO",
        decisionEstado: "PENDIENTE_REVISION",
      },
      {
        anomalyId: "ANOM-2025-06-AGUA-210004",
        periodo: cutoffConfig.periodo,
        codigoLocal: "210004",
        bodegaId: "21",
        servicio: "AGUA",
        unidad: "m³",
        consumoActualFisico: 184,
        bandaMinHistorica: 40,
        bandaMaxHistorica: 75,
        mediaHistoricaEma: 58,
        desviacionBandaPct: 145.3,
        impactoDesviacionCop: 1190437,
        severidad: "SOBRECONSUMO_CRITICO",
        decisionEstado: "PENDIENTE_REVISION",
      },
      {
        anomalyId: "ANOM-2025-06-ENERGIA-080012",
        periodo: cutoffConfig.periodo,
        codigoLocal: "080012",
        bodegaId: "08",
        servicio: "ENERGIA",
        unidad: "kWh",
        consumoActualFisico: 12,
        bandaMinHistorica: 140,
        bandaMaxHistorica: 260,
        mediaHistoricaEma: 200,
        desviacionBandaPct: -91.4,
        impactoDesviacionCop: -135450,
        severidad: "SUBCONSUMO_ATIPICO",
        decisionEstado: "PENDIENTE_REVISION",
      },
    ];
  }, [cutoffConfig.periodo]);

  const filteredAnomalies = useMemo(() => {
    const q = anomalySearch.trim().toLowerCase();
    if (!q) return sampleAnomalies;
    return sampleAnomalies.filter(
      (a) =>
        a.codigoLocal.toLowerCase().includes(q) ||
        a.bodegaId.toLowerCase().includes(q) ||
        a.servicio.toLowerCase().includes(q)
    );
  }, [anomalySearch, sampleAnomalies]);

  const handleSendToReverification = (codigo: string) => {
    setReverifyToast(`Orden prioritaria a ciegas enviada al lecturista para el puesto ${codigo}`);
    setTimeout(() => setReverifyToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Ejecutivo: Gobernanza por Fecha de Corte */}
      <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold font-mono">
                MÓDULO TRANSFERENCIAS
              </span>
              <span className="text-xs text-slate-500 font-mono">SPEC v4.5.0 Canónico</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-600" strokeWidth={1.75} />
              Gobernanza de Cortes & Mapa Térmico
            </h1>
          </div>

          {/* Configuración Editable de Fechas de Corte */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500">Periodo</label>
              <input
                type="text"
                value={cutoffConfig.periodo}
                onChange={(e) => setCutoffConfig({ ...cutoffConfig, periodo: e.target.value })}
                className="w-24 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500">Corte Energía</label>
              <input
                type="date"
                value={cutoffConfig.fechaCorteEnergiaIso}
                onChange={(e) => setCutoffConfig({ ...cutoffConfig, fechaCorteEnergiaIso: e.target.value })}
                className="px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500">Corte Agua</label>
              <input
                type="date"
                value={cutoffConfig.fechaCorteAcueductoIso}
                onChange={(e) => setCutoffConfig({ ...cutoffConfig, fechaCorteAcueductoIso: e.target.value })}
                className="px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500">Ficha Carta</label>
              <input
                type="date"
                value={cutoffConfig.fechaExpedicionFichaIso}
                onChange={(e) => setCutoffConfig({ ...cutoffConfig, fechaExpedicionFichaIso: e.target.value })}
                className="px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Pestañas de Sub-Módulos */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveSubModule("HEATMAP")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
              activeSubModule === "HEATMAP"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
            Mapa de Calor 68 Bodegas
          </button>
          <button
            type="button"
            onClick={() => setActiveSubModule("ANOMALIAS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
              activeSubModule === "ANOMALIAS"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" strokeWidth={1.75} />
            Informe de Anomalías & Re-Verificación ({sampleAnomalies.length})
          </button>
        </div>
      </div>

      {reverifyToast && (
        <div className="p-3 bg-emerald-900 text-emerald-200 text-xs font-mono rounded-xl flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.75} />
          <span>{reverifyToast}</span>
        </div>
      )}

      {/* VISTA 1: MAPA DE CALOR 68 BODEGAS */}
      {activeSubModule === "HEATMAP" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                Matriz Térmica Operativa (68 Bodegas Comerciales)
              </h2>
              <p className="text-xs text-slate-500">
                Lentes intercambiables en 1-clic con chip aislado para los 16 Baños Públicos.
              </p>
            </div>

            {/* Selector de Lentes */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveLens("AVANCE_RUTA")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  activeLens === "AVANCE_RUTA" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                }`}
              >
                1. Avance Ruta
              </button>
              <button
                type="button"
                onClick={() => setActiveLens("CONSUMO_FUGAS")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  activeLens === "CONSUMO_FUGAS" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                }`}
              >
                2. Consumo & Fugas
              </button>
              <button
                type="button"
                onClick={() => setActiveLens("TIEMPO_OPERACION")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  activeLens === "TIEMPO_OPERACION" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                }`}
              >
                3. Tiempos ML
              </button>
            </div>
          </div>

          {/* Grilla de 68 Bodegas */}
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-14 gap-2 pt-2">
            {heatmapCells.map((c) => {
              const bgColor =
                activeLens === "AVANCE_RUTA"
                  ? c.severidadActiva === "ROJO_CRITICO"
                    ? "bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100"
                    : c.severidadActiva === "VERDE_OPTIMO"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100"
                    : "bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100"
                  : activeLens === "CONSUMO_FUGAS"
                  ? c.variacionConsumoPct > 20
                    ? "bg-rose-100 border-rose-400 text-rose-950"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : c.segundosPromedioPorParada > 100
                  ? "bg-purple-50 border-purple-300 text-purple-950"
                  : "bg-slate-50 border-slate-200 text-slate-800";

              return (
                <div
                  key={c.bodegaId}
                  className={`p-2 rounded-xl border text-center font-mono cursor-pointer transition-transform hover:scale-105 shadow-2xs ${bgColor}`}
                  title={`Bodega ${c.bodegaId} - ${c.diaSemanaLabel} (Día ${c.diaIndiceAsignado})`}
                >
                  <span className="block text-[11px] font-black">B-{c.bodegaId}</span>
                  <span className="block text-[10px] font-bold mt-0.5">
                    {activeLens === "AVANCE_RUTA"
                      ? `${formatInt(c.avanceLecturaPct)}%`
                      : activeLens === "CONSUMO_FUGAS"
                      ? `+${formatDec(c.variacionConsumoPct, 1)}%`
                      : `${formatInt(c.segundosPromedioPorParada)}s`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chip de Infraestructura Común: 16 Baños Públicos */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              Infraestructura General: 16 Baterías Sanitarias (Zona 2)
            </span>
            <span className="font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
              16/16 Medidores Operativos
            </span>
          </div>
        </div>
      )}

      {/* VISTA 2: INFORME DE ANOMALÍAS & RE-VERIFICACIÓN */}
      {activeSubModule === "ANOMALIAS" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" strokeWidth={1.75} />
                Informe de Anomalías en Bandas Históricas
              </h2>
              <p className="text-xs text-slate-500">
                Puestos fuera de banda histórica. Envío directo a Re-Verificación a Ciegas Total en terreno.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Buscar código o bodega..."
                value={anomalySearch}
                onChange={(e) => setAnomalySearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                  <th className="py-2.5 px-3">Puesto / Bodega</th>
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3">Consumo Actual</th>
                  <th className="py-2.5 px-3">Banda Histórica</th>
                  <th className="py-2.5 px-3">Desviación</th>
                  <th className="py-2.5 px-3">Impacto COP</th>
                  <th className="py-2.5 px-3 text-right">Acción en Campo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredAnomalies.map((a) => (
                  <tr key={a.anomalyId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => onSelectLocalCode(a.codigoLocal)}
                        className="font-bold text-slate-900 hover:text-emerald-600 hover:underline cursor-pointer"
                      >
                        {a.codigoLocal}
                      </button>
                      <span className="text-[10px] text-slate-500 block">Bodega {a.bodegaId}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {a.servicio}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {formatDec(a.consumoActualFisico, 1)} {a.unidad}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      [{formatInt(a.bandaMinHistorica)} – {formatInt(a.bandaMaxHistorica)}] {a.unidad}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold ${
                          a.desviacionBandaPct > 0 ? "text-rose-600" : "text-amber-600"
                        }`}
                      >
                        {a.desviacionBandaPct > 0 ? `+${a.desviacionBandaPct}%` : `${a.desviacionBandaPct}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {formatCop(a.impactoDesviacionCop)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSendToReverification(a.codigoLocal)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <span>Enviar a Terreno</span>
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
