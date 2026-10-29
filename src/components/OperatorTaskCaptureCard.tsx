"use client";

import React from "react";
import { OBSERVATION_OPTIONS, UnifiedReadingTask } from "@/lib/reading-tasks-engine";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Check,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

interface OperatorTaskCaptureCardProps {
  activeTask: UnifiedReadingTask;
  inputReading: string;
  setInputReading: (v: string) => void;
  selectedObs: string;
  setSelectedObs: (v: string) => void;
  photoCaptured: boolean;
  ocrRunning: boolean;
  simulateOcrCapture: () => void;
  handleSaveTask: () => void;
  saveToast: string | null;
}

export function OperatorTaskCaptureCard({
  activeTask,
  inputReading,
  setInputReading,
  selectedObs,
  setSelectedObs,
  photoCaptured,
  ocrRunning,
  simulateOcrCapture,
  handleSaveTask,
  saveToast,
}: OperatorTaskCaptureCardProps) {
  const numericInput = Number(inputReading);
  const deltaLectura = numericInput - activeTask.lecturaAnterior;
  const consumoFisicoCalculado = Math.max(0, deltaLectura) * activeTask.multiplicador;

  const expectedMinPhysical = Math.round(activeTask.consumoAnteriorFisico * 0.7);
  const expectedMaxPhysical = Math.round(activeTask.consumoAnteriorFisico * 1.3);

  const isNegativeReading = deltaLectura < 0;
  const isOutOfHistoricalBand =
    !isNegativeReading &&
    activeTask.consumoAnteriorFisico > 0 &&
    (consumoFisicoCalculado < expectedMinPhysical || consumoFisicoCalculado > expectedMaxPhysical);

  return (
    <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-400/30">
              BODEGA {activeTask.bodegaId}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-xs font-bold">
              {activeTask.etiquetaServicio}
            </span>
            {activeTask.multiplicador < 1 && (
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-xs font-black">
                COMPARTIDO /{Math.round(1 / activeTask.multiplicador)} LOCALES
              </span>
            )}
          </div>
          <h2 className="text-2xl font-mono font-black tracking-tight mt-1">{activeTask.codigo}</h2>
        </div>
        <div className="text-right font-mono">
          <span className="text-[11px] text-slate-400 block">Serie Medidor</span>
          <span className="text-sm font-bold text-emerald-400">{activeTask.serieMedidor}</span>
          {activeTask.areaM2 > 0 && (
            <span className="text-[11px] text-slate-400 block">{activeTask.areaM2} m²</span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Lectura Anterior
            </span>
            <span className="text-lg font-mono font-bold text-slate-800 tabular-nums">
              {activeTask.lecturaAnterior.toLocaleString("es-CO")}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Consumo Mes Ant.
            </span>
            <span className="text-lg font-mono font-bold text-slate-800 tabular-nums">
              {activeTask.consumoAnteriorFisico.toLocaleString("es-CO")} {activeTask.unidad}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Banda Física (±30%)
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 block mt-1 tabular-nums">
              {expectedMinPhysical.toLocaleString("es-CO")} –{" "}
              {expectedMaxPhysical.toLocaleString("es-CO")} {activeTask.unidad}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={simulateOcrCapture}
            className={`h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer ${
              photoCaptured
                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                : "border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
            }`}
          >
            {ocrRunning ? (
              <>
                <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
                <span>Leyendo odómetro con OCR...</span>
              </>
            ) : photoCaptured ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Evidencia Fotográfica Adjunta</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 text-slate-700" />
                <span>1. Tomar Foto del Medidor (OCR)</span>
              </>
            )}
          </button>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              2. Lectura Actual Odómetro
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={inputReading}
              onChange={(e) => setInputReading(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTask();
              }}
              className="w-full h-14 px-4 rounded-xl border-2 border-slate-300 font-mono text-2xl font-black text-slate-900 tabular-nums focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isNegativeReading
              ? "bg-rose-50 border-rose-300 text-rose-950"
              : isOutOfHistoricalBand
              ? "bg-amber-50 border-amber-300 text-amber-950"
              : "bg-emerald-50 border-emerald-300 text-emerald-950"
          }`}
        >
          {isNegativeReading ? (
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          ) : isOutOfHistoricalBand ? (
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between font-bold text-sm">
              <span>
                {isNegativeReading
                  ? "ERROR: Lectura menor a la anterior"
                  : isOutOfHistoricalBand
                  ? "ALERTA: Consumo fuera de la banda física histórica (±30%)"
                  : "VALIDACIÓN FÍSICA OK: Dentro del rango histórico"}
              </span>
              <span className="font-mono text-base font-black tabular-nums">
                {consumoFisicoCalculado.toLocaleString("es-CO")} {activeTask.unidad}
              </span>
            </div>
            <p className="mt-1 opacity-90">
              {isNegativeReading
                ? "Verifica los dígitos del medidor o reporta cambio/reinicio de contador."
                : isOutOfHistoricalBand
                ? `El consumo calculado (${consumoFisicoCalculado} ${activeTask.unidad}) se desvía del mes anterior (${activeTask.consumoAnteriorFisico} ${activeTask.unidad}). Confirma con foto o selecciona causal técnica.`
                : "Lectura consistente con el comportamiento histórico del medidor."}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            3. Observación / Causal Reglamentaria (Art. 46 Directiva 033-06)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {OBSERVATION_OPTIONS.map((obs) => (
              <button
                key={obs}
                type="button"
                onClick={() => setSelectedObs(obs)}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-mono font-bold text-left border transition-all cursor-pointer flex items-center justify-between ${
                  selectedObs === obs
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="truncate">{obs}</span>
                {selectedObs === obs && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveTask}
          disabled={isNegativeReading && selectedObs === "SIN NOVEDAD"}
          className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Guardar Lectura, Marcar Completada y Siguiente Pendiente</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {saveToast && (
          <div className="p-3 rounded-xl bg-slate-900 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>
    </div>
  );
}
