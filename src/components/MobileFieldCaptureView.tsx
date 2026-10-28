"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useCorabastos } from "@/context/CorabastosContext";
import { buildCutoffReadingTasks, ZONE_META } from "@/lib/reading-tasks-engine";
import {
  Smartphone,
  ExternalLink,
  CheckCircle2,
  ListChecks,
  AlertTriangle,
  Layers,
  MapPin,
} from "lucide-react";

export function MobileFieldCaptureView() {
  const {
    locales,
    energyCommunal,
    waterCommunal,
    bathroomMeters,
    completedTaskIds,
    recentFieldUpdates,
  } = useCorabastos();

  const allTasks = useMemo(
    () =>
      buildCutoffReadingTasks(
        locales,
        energyCommunal,
        waterCommunal,
        bathroomMeters,
        completedTaskIds
      ),
    [locales, energyCommunal, waterCommunal, bathroomMeters, completedTaskIds]
  );

  const zoneBreakdown = useMemo(() => {
    return ZONE_META.map((z) => {
      const zoneItems = allTasks.filter((t) => t.zonaId === z.id);
      const pending = zoneItems.filter((t) => t.taskState === "PENDIENTE").length;
      const completed = zoneItems.length - pending;
      const pct = zoneItems.length > 0 ? Math.round((completed / zoneItems.length) * 100) : 100;
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
    <div className="space-y-5">
      {/* CABECERA MONITOR GERENCIAL DEL CORTE */}
      <div className="bg-[#010F22] text-white rounded-2xl p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block">
            SUB-MÓDULO 1.4 · MONITOR EJECUTIVO DE LA COLA DE TAREAS DEL CORTE
          </span>
          <h2 className="text-lg sm:text-xl font-bold mt-0.5">
            Avance de Lectura de Medidores por Zonas Operativas ({allTasks.length.toLocaleString("es-CO")} Medidores Físicos)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            En el celular del operador (/captura) solo se muestran las tareas en estado PENDIENTE de cada zona y bodega.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right bg-white/5 px-4 py-2 rounded-xl border border-white/10 font-mono">
            <span className="text-[10px] uppercase text-slate-400 block">Pendientes / Total</span>
            <span className="text-base font-black text-amber-400">
              {totalPending.toLocaleString("es-CO")}
            </span>{" "}
            <span className="text-xs text-slate-400">/ {allTasks.length.toLocaleString("es-CO")}</span>
          </div>

          <Link
            href="/captura"
            target="_blank"
            className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Simular Celular Operador (/captura)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* TARJETAS DE LAS 5 ZONAS OPERATIVAS DEL CORTE */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {zoneBreakdown.map((z) => (
          <div
            key={z.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-300 font-mono text-[10px] font-bold">
                  {z.priorityBadge}
                </span>
                <span className="font-mono text-xs font-black text-slate-700">{z.pct}%</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 mt-2">{z.shortLabel}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{z.title}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 font-mono text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <ListChecks className="w-3.5 h-3.5 text-amber-600" />
                  Pendientes:
                </span>
                <span className="font-black text-amber-700">{z.pending.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Evacuadas:
                </span>
                <span className="font-black text-emerald-700">{z.completed.toLocaleString("es-CO")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* BITÁCORA EN VIVO DE LECTURAS Y NOVEDADES SINCRONIZADAS DESDE /CAPTURA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>
              Bitácora de Terreno en Tiempo Real ({totalCompleted} tareas evacuadas en este corte)
            </span>
          </h3>
          <span className="text-xs font-mono text-slate-500">
            Sincronización reactiva con /captura
          </span>
        </div>

        {recentFieldUpdates.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
            Aún no se han enviado nuevas lecturas manuales en esta sesión. Abre{" "}
            <Link href="/captura" target="_blank" className="font-bold text-emerald-700 underline">
              /captura
            </Link>{" "}
            para registrar una lectura y ver cómo se actualiza inmediatamente el corte y la liquidación.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase">
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Local / Medidor</th>
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3 text-right">Lectura Capturada</th>
                  <th className="py-2.5 px-3">Observación Reglamentaria</th>
                  <th className="py-2.5 px-3 text-center">Estado Tarea</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentFieldUpdates.map((u, idx) => (
                  <tr key={`${u.codigo}-${u.servicio}-${idx}`} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-500">{u.timestamp}</td>
                    <td className="py-2 px-3 font-black text-slate-900">{u.codigo}</td>
                    <td className="py-2 px-3 text-slate-700">{u.servicio}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {u.lecturaActual.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 px-3 text-slate-700">{u.observacion}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.taskState === "NOVEDAD_TECNICA"
                            ? "bg-rose-100 text-rose-900"
                            : u.taskState === "CERRADO_SIN_ACCESO"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {u.taskState === "NOVEDAD_TECNICA" ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
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
