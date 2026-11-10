"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useCorabastos } from "@/context/CorabastosContext";
import { buildCutoffReadingTasks, ZONE_META } from "@/lib/reading-tasks-engine";
import { formatDec, formatInt, formatPct } from "@/lib/formatters";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  MapPin,
  Smartphone,
} from "lucide-react";

export function MobileFieldCaptureView() {
  const {
    locales,
    energyCommunal,
    waterCommunal,
    bathroomMeters,
    completedTaskIds,
    fieldOverridesMap,
    recentFieldUpdates,
  } = useCorabastos();

  const allTasks = useMemo(
    () =>
      buildCutoffReadingTasks(
        locales,
        energyCommunal,
        waterCommunal,
        bathroomMeters,
        completedTaskIds,
        fieldOverridesMap
      ),
    [
      locales,
      energyCommunal,
      waterCommunal,
      bathroomMeters,
      completedTaskIds,
      fieldOverridesMap,
    ]
  );

  const zoneBreakdown = useMemo(() => {
    return ZONE_META.map((z) => {
      const zoneItems = allTasks.filter((t) => t.zonaId === z.id);
      const pending = zoneItems.filter((t) => t.taskState === "PENDIENTE").length;
      const completed = zoneItems.length - pending;
      const pct = zoneItems.length > 0 ? (completed / zoneItems.length) * 100 : 100;
      return {
        ...z,
        total: zoneItems.length,
        pending,
        completed,
        pct,
      };
    });
  }, [allTasks]);

  const totalPending = allTasks.filter((t) => t.taskState === "PENDIENTE").length;
  const totalCompleted = allTasks.length - totalPending;

  return (
    <div className="space-y-4">
      <div className="bg-[#0B132B] text-white rounded-xl px-5 py-3.5 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold">
            Avance Operativo de Lectura por Zonas ({formatInt(allTasks.length)} Medidores Físicos Únicos)
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Deduplicación exacta /N sobre 1.835 registros con medidor sincronizada en vivo con /captura.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right bg-white/5 px-3.5 py-1.5 rounded-lg border border-white/10 font-mono">
            <span className="text-[10px] uppercase text-slate-400 block">Pendientes / Total</span>
            <span className="text-sm font-black text-amber-400">
              {formatInt(totalPending)}
            </span>{" "}
            <span className="text-xs text-slate-400">/ {formatInt(allTasks.length)}</span>
          </div>

          <Link
            href="/captura"
            target="_blank"
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Smartphone className="w-4 h-4" strokeWidth={1.75} />
            <span>Abrir Terminal (/captura)</span>
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {zoneBreakdown.map((z) => (
          <div
            key={z.id}
            className="bg-[var(--surface)] rounded-2xl border border-[var(--outline-color)] p-4 shadow-2xs flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#0B132B] text-emerald-300 font-mono text-[10px] font-bold">
                  {z.priorityBadge}
                </span>
                <span className="font-mono text-xs font-black text-[var(--text-main)]">
                  {formatPct(z.pct, 0)}
                </span>
              </div>
              <h3 className="font-bold text-sm text-[var(--text-main)] mt-2">{z.shortLabel}</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{z.title}</p>
            </div>

            <div className="pt-2 border-t border-[var(--outline-color)] font-mono text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] flex items-center gap-1">
                  <ListChecks className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.75} />
                  Pendientes:
                </span>
                <span className="font-black text-amber-600 dark:text-amber-400">
                  {formatInt(z.pending)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                  Evacuadas:
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {formatInt(z.completed)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--outline-color)] p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
            <span>
              Bitácora de Terreno en Tiempo Real ({formatInt(totalCompleted)} tareas evacuadas)
            </span>
          </h3>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Sincronización reactiva con /captura
          </span>
        </div>

        {recentFieldUpdates.length === 0 ? (
          <div className="p-6 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] text-center text-xs text-[var(--text-muted)]">
            Sin nuevas lecturas manuales registradas en este corte. Abre{" "}
            <Link
              href="/captura"
              target="_blank"
              className="font-bold text-emerald-600 dark:text-emerald-400 underline"
            >
              /captura
            </Link>{" "}
            para registrar lecturas con cámara HTML5 y verificar el recálculo instantáneo.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--outline-color)] rounded-xl">
            <table
              style={{ borderCollapse: "separate", borderSpacing: 0 }}
              className="w-full text-left text-xs font-mono"
            >
              <thead>
                <tr className="bg-[#0B132B] text-white text-[11px] uppercase">
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Local / Medidor</th>
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3 text-right">Lectura Capturada</th>
                  <th className="py-2.5 px-3">Observación Reglamentaria</th>
                  <th className="py-2.5 px-3 text-center">Evidencia</th>
                  <th className="py-2.5 px-3 text-center">Estado Tarea</th>
                </tr>
              </thead>
              <tbody>
                {recentFieldUpdates.map((u, idx) => (
                  <tr key={`${u.codigo}-${u.servicio}-${idx}`} className="hover:bg-sky-500/10">
                    <td className="py-2 px-3 text-[var(--text-muted)] border-b border-[var(--outline-color)]">
                      {u.timestamp}
                    </td>
                    <td className="py-2 px-3 font-black text-[var(--text-main)] border-b border-[var(--outline-color)]">
                      {u.codigo}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)] border-b border-[var(--outline-color)]">
                      {u.servicio}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[var(--text-main)] tabular-nums border-b border-[var(--outline-color)]">
                      {formatDec(u.lecturaActual, 0, 2)}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-main)] border-b border-[var(--outline-color)]">
                      {u.observacion}
                    </td>
                    <td className="py-2 px-3 text-center border-b border-[var(--outline-color)]">
                      {u.hasPhotoEvidence ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                          <Camera className="w-3 h-3" strokeWidth={1.75} />
                          FOTO
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center border-b border-[var(--outline-color)]">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.taskState === "NOVEDAD_TECNICA"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : u.taskState === "CERRADO_SIN_ACCESO"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {u.taskState === "NOVEDAD_TECNICA" ? (
                          <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                        )}
                        <span>{u.taskState || "COMPLETADA"}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
