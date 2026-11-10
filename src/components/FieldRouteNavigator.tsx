"use client";

import React from "react";
import { ReadingZoneId } from "@/contracts/domain-contracts";
import { UnifiedReadingTask, ZONE_META } from "@/lib/reading-tasks-engine";
import { formatInt } from "@/lib/formatters";
import { CheckCircle2, Droplets, Layers, ListChecks, Search, X, Zap } from "lucide-react";

interface FieldRouteNavigatorProps {
  allTasksCount: number;
  zoneCounts: Record<ReadingZoneId, { total: number; pending: number; done: number }>;
  selectedZone: ReadingZoneId;
  onSelectZone: (zoneId: ReadingZoneId) => void;
  zoneBodegas: [string, { total: number; pending: number }][];
  selectedBodega: string;
  onSelectBodega: (bodegaId: string) => void;
  serviceFilter: "ALL" | "ENERGIA" | "AGUA";
  onChangeServiceFilter: (srv: "ALL" | "ENERGIA" | "AGUA") => void;
  queueFilter: "PENDIENTES" | "COMPLETADAS";
  onChangeQueueFilter: (queue: "PENDIENTES" | "COMPLETADAS") => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  filteredTasks: UnifiedReadingTask[];
  activeTaskKey?: string;
  onSelectTask: (task: UnifiedReadingTask) => void;
}

export function FieldRouteNavigator({
  allTasksCount,
  zoneCounts,
  selectedZone,
  onSelectZone,
  zoneBodegas,
  selectedBodega,
  onSelectBodega,
  serviceFilter,
  onChangeServiceFilter,
  queueFilter,
  onChangeQueueFilter,
  searchQuery,
  onChangeSearchQuery,
  filteredTasks,
  activeTaskKey,
  onSelectTask,
}: FieldRouteNavigatorProps) {
  return (
    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
          1. Ruta por Zona Operativa
        </span>
        <span className="text-[11px] font-mono text-slate-400">
          Universo físico: {formatInt(allTasksCount)} odómetros
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {ZONE_META.map((z) => {
          const stats = zoneCounts[z.id];
          const isSelected = selectedZone === z.id;
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => onSelectZone(z.id)}
              className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-emerald-500/20 border-emerald-400 text-white shadow-md"
                  : "bg-slate-950/70 border-white/10 text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 truncate">
                  {z.priorityBadge}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                  {formatInt(stats.pending)} pend.
                </span>
              </div>
              <div className="font-bold text-xs mt-1 truncate">{z.shortLabel}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/10">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Bodega ({formatInt(zoneBodegas.length)} en zona)
          </label>
          <select
            value={selectedBodega}
            onChange={(e) => onSelectBodega(e.target.value)}
            className="w-full h-10 px-2.5 rounded-xl bg-slate-950 border border-white/15 font-mono text-xs text-white focus:outline-none focus:border-emerald-400"
          >
            <option value="ALL">Todas las Bodegas</option>
            {zoneBodegas.map(([bod, st]) => (
              <option key={bod} value={bod}>
                Bodega {bod} ({formatInt(st.pending)} pend. / {formatInt(st.total)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Tipo de Servicio
          </label>
          <div className="grid grid-cols-3 gap-1 h-10">
            <button
              type="button"
              onClick={() => onChangeServiceFilter("ALL")}
              className={`rounded-xl font-bold text-xs cursor-pointer ${
                serviceFilter === "ALL" ? "bg-white text-slate-950" : "bg-slate-950 text-slate-300 border border-white/10"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => onChangeServiceFilter("ENERGIA")}
              className={`rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                serviceFilter === "ENERGIA" ? "bg-amber-400 text-slate-950" : "bg-slate-950 text-slate-300 border border-white/10"
              }`}
            >
              <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
              Energía
            </button>
            <button
              type="button"
              onClick={() => onChangeServiceFilter("AGUA")}
              className={`rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                serviceFilter === "AGUA" ? "bg-sky-400 text-slate-950" : "bg-slate-950 text-slate-300 border border-white/10"
              }`}
            >
              <Droplets className="w-3.5 h-3.5" strokeWidth={1.75} />
              Agua
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Bandeja Operador
          </label>
          <div className="grid grid-cols-2 gap-1 h-10">
            <button
              type="button"
              onClick={() => onChangeQueueFilter("PENDIENTES")}
              className={`rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                queueFilter === "PENDIENTES" ? "bg-emerald-500 text-slate-950 shadow" : "bg-slate-950 text-slate-300 border border-white/10"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" strokeWidth={1.75} />
              Pendientes
            </button>
            <button
              type="button"
              onClick={() => onChangeQueueFilter("COMPLETADAS")}
              className={`rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                queueFilter === "COMPLETADAS" ? "bg-sky-500 text-slate-950 shadow" : "bg-slate-950 text-slate-300 border border-white/10"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              Evacuadas
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Buscador Omnisciente
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" strokeWidth={1.75} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Ej. 010001, 550000, ALERO..."
              className="w-full h-10 pl-8 pr-8 rounded-xl bg-slate-950 border border-white/15 font-mono text-xs text-white focus:outline-none focus:border-emerald-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onChangeSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-slate-300 font-semibold">
            {searchQuery.trim()
              ? `Resultados en 1.688 odómetros (${formatInt(filteredTasks.length)})`
              : queueFilter === "PENDIENTES"
              ? `Cola Pendiente en Ruta (${formatInt(filteredTasks.length)})`
              : `Tareas Evacuadas en Ruta (${formatInt(filteredTasks.length)})`}
          </span>
          <span className="text-[10px] font-mono text-emerald-300 hidden sm:inline">
            Salto automático al siguiente medidor pendiente
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {filteredTasks.slice(0, 40).map((t) => {
            const isCurrent = activeTaskKey === t.taskKey;
            const isEnergy = t.servicio === "ENERGIA" || t.servicio === "MACRO_ENERGIA";
            return (
              <button
                key={t.taskKey}
                type="button"
                onClick={() => onSelectTask(t)}
                className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-emerald-400 text-slate-950 ring-2 ring-emerald-200 shadow"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                {isEnergy ? (
                  <Zap className="w-3 h-3 text-amber-500" strokeWidth={1.75} />
                ) : (
                  <Droplets className="w-3 h-3 text-sky-500" strokeWidth={1.75} />
                )}
                <span>{t.codigo}</span>
                {t.sharedCodigos.length > 1 && (
                  <span className="text-[10px] opacity-80">/{formatInt(t.sharedCodigos.length)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
