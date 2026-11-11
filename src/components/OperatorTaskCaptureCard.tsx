"use client";

import React, { useRef } from "react";
import {
  ALLOWED_NEGATIVE_READING_OBS,
  canSubmitFieldReading,
  OBSERVATION_OPTIONS,
  requiresMandatoryPhoto,
  UnifiedReadingTask,
  validateFieldReadingSubmission,
} from "@/lib/reading-tasks-engine";
import { formatDec, formatInt, sanitizeDecimalInputString } from "@/lib/formatters";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  GitBranch,
  Image as ImageIcon,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";

interface OperatorTaskCaptureCardProps {
  activeTask: UnifiedReadingTask;
  inputReading: string;
  setInputReading: (v: string) => void;
  selectedObs: string;
  setSelectedObs: (v: string) => void;
  hasPhotoEvidence: boolean;
  photoPreviewUrl: string | null;
  isUploadingPhoto: boolean;
  photoError: string | null;
  onCapturePhotoFile: (file: File) => void;
  handleSaveTask: () => void;
  saveToast: string | null;
  saveError: string | null;
}

export function OperatorTaskCaptureCard({
  activeTask,
  inputReading,
  setInputReading,
  selectedObs,
  setSelectedObs,
  hasPhotoEvidence,
  photoPreviewUrl,
  isUploadingPhoto,
  photoError,
  onCapturePhotoFile,
  handleSaveTask,
  saveToast,
  saveError,
}: OperatorTaskCaptureCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasValidInputText = inputReading.trim().length > 0;
  const { parsedNumber: numericInput } = sanitizeDecimalInputString(inputReading);
  const deltaLectura = numericInput - activeTask.lecturaAnterior;
  const consumoFisicoCalculado = Math.max(0, deltaLectura) * activeTask.multiplicador;

  const expectedMinPhysical = Math.round(activeTask.consumoAnteriorFisico * 0.7);
  const expectedMaxPhysical = Math.round(activeTask.consumoAnteriorFisico * 1.3);

  const isNegativeReading = deltaLectura < 0;
  const isNegativeAuthorized = ALLOWED_NEGATIVE_READING_OBS.has(selectedObs.trim().toUpperCase());
  const mandatoryPhotoNeeded = requiresMandatoryPhoto(selectedObs);

  const validation = validateFieldReadingSubmission({
    lecturaAnterior: activeTask.lecturaAnterior,
    lecturaActual: numericInput,
    observacion: selectedObs,
    hasPhotoEvidence,
  });

  const isSubmittable =
    hasValidInputText &&
    !isUploadingPhoto &&
    canSubmitFieldReading({
      lecturaAnterior: activeTask.lecturaAnterior,
      lecturaActual: numericInput,
      observacion: selectedObs,
      hasPhotoEvidence,
    });

  const isOutOfHistoricalBand =
    !isNegativeReading &&
    activeTask.consumoAnteriorFisico > 0 &&
    (consumoFisicoCalculado < expectedMinPhysical || consumoFisicoCalculado > expectedMaxPhysical);

  const isSharedCluster = activeTask.sharedCodigos.length > 1;

  return (
    <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-400/30">
              BODEGA {activeTask.bodegaId}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-xs font-bold">
              {activeTask.etiquetaServicio}
            </span>
            {isSharedCluster && (
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-xs font-black">
                COMPARTIDO /{formatInt(activeTask.sharedCodigos.length)} PUESTOS
              </span>
            )}
          </div>
          <h2 className="text-2xl font-mono font-black tracking-tight mt-1">{activeTask.codigo}</h2>
        </div>
        <div className="text-right font-mono">
          <span className="text-[11px] text-slate-400 block">Serie Medidor</span>
          <span className="text-sm font-bold text-emerald-400">{activeTask.serieMedidor}</span>
          {activeTask.areaM2 > 0 && (
            <span className="text-[11px] text-slate-400 block">{formatDec(activeTask.areaM2, 2)} m²</span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {isSharedCluster && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
            <GitBranch className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <span className="font-bold block">
                Sincronización Atómica /{formatInt(activeTask.sharedCodigos.length)} Puestos Hermanos:
              </span>
              <span className="font-mono text-[11px] text-amber-900">
                {activeTask.sharedCodigos.join(", ")}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Lectura Anterior
            </span>
            <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
              {formatInt(activeTask.lecturaAnterior)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Consumo Mes Ant.
            </span>
            <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
              {formatDec(activeTask.consumoAnteriorFisico, 1)} {activeTask.unidad}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Banda Física (±30%)
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 block mt-1 tabular-nums">
              {formatInt(expectedMinPhysical)} – {formatInt(expectedMaxPhysical)} {activeTask.unidad}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onCapturePhotoFile(file);
                }
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className={`min-h-20 p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 font-bold text-xs transition-all cursor-pointer ${
                hasPhotoEvidence
                  ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                  : mandatoryPhotoNeeded
                  ? "border-rose-400 bg-rose-50 hover:bg-rose-100 text-rose-900"
                  : "border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt={`Evidencia medidor ${activeTask.codigo}`}
                  className="w-14 h-14 rounded-lg object-cover border border-emerald-400 shrink-0"
                />
              ) : isUploadingPhoto ? (
                <UploadCloud className="w-6 h-6 text-sky-600 animate-pulse shrink-0" strokeWidth={1.75} />
              ) : (
                <Camera className="w-6 h-6 text-slate-700 shrink-0" strokeWidth={1.75} />
              )}
              <div className="text-left">
                <span className="block font-bold">
                  {isUploadingPhoto
                    ? "Comprimiendo y guardando evidencia..."
                    : hasPhotoEvidence
                    ? "Evidencia Fotográfica Registrada (Cambiar)"
                    : "1. Capturar Foto Real del Odómetro"}
                </span>
                <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                  {mandatoryPhotoNeeded
                    ? "Obligatoria para novedades técnicas o locales cerrados"
                    : "Cámara HTML5 comprimida <= 800px (IndexedDB / Storage)"}
                </span>
              </div>
            </button>
            {photoError && (
              <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                {photoError}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                2. Lectura Odómetro ({activeTask.unidad})
              </label>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                Captura 4 Dígitos Rápida
              </span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Lectura Actual Odómetro"
              value={inputReading}
              placeholder="Ej: 5890"
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const { displayRaw } = sanitizeDecimalInputString(e.target.value);
                setInputReading(displayRaw);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isSubmittable) handleSaveTask();
              }}
              className="w-full h-14 px-4 rounded-xl border-2 border-slate-300 font-mono text-2xl font-black text-slate-900 tabular-nums focus:outline-none focus:border-slate-900"
            />
            <span className="block text-[10px] text-slate-500 mt-1">
              Digita solo los últimos 4 dígitos. Acarreo y guarda anti-salto automáticos.
            </span>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            !validation.valid
              ? "bg-rose-50 border-rose-300 text-rose-950"
              : isNegativeReading && isNegativeAuthorized
              ? "bg-amber-50 border-amber-300 text-amber-950"
              : isOutOfHistoricalBand
              ? "bg-amber-50 border-amber-300 text-amber-950"
              : "bg-emerald-50 border-emerald-300 text-emerald-950"
          }`}
        >
          {!validation.valid ? (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
          ) : isOutOfHistoricalBand || isNegativeReading ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.75} />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.75} />
          )}
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between font-bold text-sm gap-2">
              <span>
                {!validation.valid
                  ? validation.reason
                  : isNegativeReading
                  ? "Lectura menor autorizada por causal técnica"
                  : isOutOfHistoricalBand
                  ? "Alerta: Consumo fuera de banda física histórica (±30%)"
                  : "Validación física OK: Dentro del rango esperado"}
              </span>
              <span className="font-mono text-base font-black tabular-nums shrink-0">
                {formatDec(consumoFisicoCalculado, 2)} {activeTask.unidad}
              </span>
            </div>
            <p className="mt-1 opacity-90">
              {isNegativeReading && !isNegativeAuthorized
                ? "Las lecturas menores a la anterior solo se permiten con causal C, DETENIDO, M, DETENIDO, C, RETIRADO o REVISAR MEDIDOR y evidencia fotográfica."
                : mandatoryPhotoNeeded && !hasPhotoEvidence
                ? `La observación "${selectedObs}" exige tomar fotografía probatoria antes de guardar.`
                : isOutOfHistoricalBand
                ? `Consumo físico (${formatDec(consumoFisicoCalculado, 2)} ${activeTask.unidad}) vs corte anterior (${formatDec(activeTask.consumoAnteriorFisico, 2)} ${activeTask.unidad}).`
                : `Consumo físico individual por puesto: ${formatDec(consumoFisicoCalculado, 2)} ${activeTask.unidad}.`}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            3. Observación / Causal Reglamentaria (Art. 46 Directiva 033-06)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {OBSERVATION_OPTIONS.map((obs) => {
              const needsPhoto = requiresMandatoryPhoto(obs);
              return (
                <button
                  key={obs}
                  type="button"
                  onClick={() => setSelectedObs(obs)}
                  className={`px-2.5 py-2 rounded-lg text-[11px] font-mono font-bold text-left border transition-all cursor-pointer flex items-center justify-between gap-1 ${
                    selectedObs === obs
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="truncate">{obs}</span>
                  {selectedObs === obs ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.75} />
                  ) : needsPhoto ? (
                    <Camera className="w-3 h-3 text-slate-400 shrink-0" strokeWidth={1.75} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveTask}
          disabled={!isSubmittable}
          className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
          <span>
            {isSharedCluster
              ? `Guardar y Sincronizar ${formatInt(activeTask.sharedCodigos.length)} Puestos`
              : "Guardar Lectura y Avanzar al Siguiente Medidor"}
          </span>
          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
        </button>

        {saveError && (
          <div className="p-3 rounded-xl bg-rose-950 text-rose-200 text-xs font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={1.75} />
            <span>{saveError}</span>
          </div>
        )}

        {saveToast && (
          <div className="p-3 rounded-xl bg-slate-900 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.75} />
            <span>{saveToast}</span>
          </div>
        )}
      </div>
    </div>
  );
}
