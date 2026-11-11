"use client";

import React, { useEffect, useState } from "react";
import { CorabastosBrandLogo } from "@/components/CorabastosBrandLogo";
import { formatInt } from "@/lib/formatters";
import { Clock, Lock, ShieldAlert } from "lucide-react";

/**
 * Ventana de Vigencia Operativa de 30 Días (Lanzamiento: 2026-11-10 -> Vencimiento: 2026-12-10 23:59:59-05:00)
 */
export const TRIAL_START_ISO = "2026-11-10T00:00:00-05:00";
export const TRIAL_EXPIRATION_ISO = "2026-12-10T23:59:59-05:00";
export const TRIAL_EXPIRATION_MS = new Date(TRIAL_EXPIRATION_ISO).getTime();

export function getTrialExpirationStatus(nowMs: number = Date.now()): {
  isExpired: boolean;
  daysRemaining: number;
  expirationDateLabel: string;
} {
  const diffMs = TRIAL_EXPIRATION_MS - nowMs;
  const isExpired = diffMs <= 0;
  const daysRemaining = isExpired ? 0 : Math.ceil(diffMs / 86_400_000);
  return {
    isExpired,
    daysRemaining,
    expirationDateLabel: "10 de diciembre de 2026",
  };
}

export function TrialExpirationGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState(() => getTrialExpirationStatus());

  useEffect(() => {
    setStatus(getTrialExpirationStatus());
    const interval = setInterval(() => {
      setStatus(getTrialExpirationStatus());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (status.isExpired) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-rose-500/40 bg-slate-900/95 p-8 shadow-2xl space-y-6 text-center">
          <div className="flex justify-center">
            <CorabastosBrandLogo variant="horizontal-dark" size={44} />
          </div>

          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Lock size={28} strokeWidth={1.75} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <ShieldAlert size={13} strokeWidth={1.75} />
              Vigencia Operativa Expirada (30 Días)
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Periodo de Demostración y Despliegue Concluido
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              La ventana de operación habilitada por {formatInt(30)} días para el Sistema de Liquidación de Servicios Públicos, Expensas Comunes y Captura de Medidores finalizó el{" "}
              <strong className="text-white">{status.expirationDateLabel}</strong>.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-4 text-left text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Estado del Servicio Cloud:</span>
              <span className="text-rose-400 font-bold">Suspendido por Fecha Límite</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Fecha de Corte Programada:</span>
              <span className="font-mono text-slate-200">2026-12-10 23:59:59 GMT-5</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Para renovar la licencia de operación o habilitar el entorno definitivo de producción, comuníquese con la Dirección de Ingeniería del proyecto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-print-hide bg-amber-500/10 border-b border-amber-500/30 px-3 py-1 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 font-medium">
        <Clock size={12} strokeWidth={1.75} className="shrink-0" />
        <span>
          Entorno activo por ventana de {formatInt(30)} días · Vence el{" "}
          <strong>{status.expirationDateLabel}</strong> ({formatInt(status.daysRemaining)} días restantes)
        </span>
      </div>
      {children}
    </>
  );
}
