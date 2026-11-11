"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildCompositePhysicalStops,
  computeRouteWorkloadDistribution,
  computeWorkforceCapacityPlan,
  UnifiedReadingTask,
} from "@/lib/reading-tasks-engine";
import { SaveRouteSurveyInput } from "@/context/CorabastosContext";
import { getLocalPhotoUrl, persistFieldEvidencePhoto } from "@/lib/photo-evidence-store";
import { formatDec, formatInt, formatPct } from "@/lib/formatters";
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  Droplets,
  Image as ImageIcon,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";

interface RoutePlannerSurveyCardProps {
  activeTask: UnifiedReadingTask;
  allTasks: UnifiedReadingTask[];
  bodegaTasks: UnifiedReadingTask[];
  onSaveSurveyStop: (payload: SaveRouteSurveyInput) => void;
  onRemoveSurveyStop: (taskKey: string) => void;
  onSelectTask: (task: UnifiedReadingTask) => void;
  surveyToast: string | null;
}

interface GpsReadingState {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  updatedAt: string;
}

export function RoutePlannerSurveyCard({
  activeTask,
  allTasks,
  bodegaTasks,
  onSaveSurveyStop,
  onRemoveSurveyStop,
  onSelectTask,
  surveyToast,
}: RoutePlannerSurveyCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const waterFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const stopEnteredMsRef = useRef<number>(Date.now());
  const lastCommitMsRef = useRef<number | null>(null);

  const [gpsCoords, setGpsCoords] = useState<GpsReadingState | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("Buscando señal GPS del dispositivo...");
  const [referenciaPasillo, setReferenciaPasillo] = useState<string>("");
  const [hasPositionPhoto, setHasPositionPhoto] = useState<boolean>(false);
  const [positionPhotoLocalKey, setPositionPhotoLocalKey] = useState<string | undefined>(undefined);
  const [positionPhotoStorageUrl, setPositionPhotoStorageUrl] = useState<string | undefined>(undefined);
  const [hasPositionPhotoWater, setHasPositionPhotoWater] = useState<boolean>(false);
  const [positionPhotoWaterLocalKey, setPositionPhotoWaterLocalKey] = useState<string | undefined>(undefined);
  const [positionPhotoWaterStorageUrl, setPositionPhotoWaterStorageUrl] = useState<string | undefined>(undefined);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [operatorsCount, setOperatorsCount] = useState<number>(1);

  const requestGpsFix = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsStatus("Geolocalización no disponible en este navegador.");
      return;
    }
    setGpsStatus("Capturando coordenadas GPS de alta precisión...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (lat === 0 && lng === 0) {
          setGpsStatus("Coordenada (0,0) descartada. Reintenta al aire libre o pasillo.");
          return;
        }
        setGpsCoords({
          latitude: lat,
          longitude: lng,
          accuracyMeters: Math.round(pos.coords.accuracy),
          updatedAt: new Date().toISOString().slice(11, 19),
        });
        setGpsStatus("Coordenada GPS fijada en vivo.");
      },
      (err) => {
        setGpsStatus(`Aviso GPS: ${err.message}. Puedes guardar posición con foto y orden.`);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );
  };

  useEffect(() => {
    stopEnteredMsRef.current = Date.now();
    requestGpsFix();
  }, [activeTask.taskKey]);

  useEffect(() => {
    const existing = activeTask.routeSurvey;
    setReferenciaPasillo(existing?.referenciaPasillo ?? "");
    setHasPositionPhoto(Boolean(existing?.hasPositionPhoto));
    setPositionPhotoLocalKey(existing?.positionPhotoLocalKey);
    setPositionPhotoStorageUrl(existing?.positionPhotoStorageUrl);
    setHasPositionPhotoWater(Boolean(existing?.hasPositionPhotoWater));
    setPositionPhotoWaterLocalKey(existing?.positionPhotoWaterLocalKey);
    setPositionPhotoWaterStorageUrl(existing?.positionPhotoWaterStorageUrl);
    setPhotoError(null);

    if (existing?.latitude !== undefined && existing?.longitude !== undefined) {
      setGpsCoords({
        latitude: existing.latitude,
        longitude: existing.longitude,
        accuracyMeters: existing.accuracyMeters ?? 5,
        updatedAt: existing.surveyedAt.slice(11, 19),
      });
    }

    let cancelled = false;
    const localKey = existing?.positionPhotoLocalKey;
    if (localKey) {
      getLocalPhotoUrl(localKey).then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (activeBlobUrlRef.current) URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = url;
        setPhotoPreviewUrl(url || existing?.positionPhotoStorageUrl || null);
      });
    } else {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
      setPhotoPreviewUrl(existing?.positionPhotoStorageUrl || null);
    }

    return () => {
      cancelled = true;
    };
  }, [activeTask]);

  const surveyedInBodega = useMemo(
    () =>
      bodegaTasks
        .filter((t) => t.routeSurvey !== undefined)
        .sort((a, b) => (a.routeSurvey?.ordenBodega ?? 0) - (b.routeSurvey?.ordenBodega ?? 0)),
    [bodegaTasks]
  );

  const nextStopNumberInBodega = useMemo(() => {
    if (activeTask.routeSurvey) return activeTask.routeSurvey.ordenBodega;
    const maxOrder = surveyedInBodega.reduce(
      (m, t) => Math.max(m, t.routeSurvey?.ordenBodega ?? 0),
      0
    );
    return maxOrder + 1;
  }, [activeTask.routeSurvey, surveyedInBodega]);

  const workloadSummary = useMemo(
    () => computeRouteWorkloadDistribution(allTasks, operatorsCount),
    [allTasks, operatorsCount]
  );

  const capacityPlan = useMemo(
    () => computeWorkforceCapacityPlan(allTasks, { operadoresAsignados: operatorsCount, jornadaEfectivaMinutos: 420 }),
    [allTasks, operatorsCount]
  );

  const compositeStopForActive = useMemo(() => {
    const stops = buildCompositePhysicalStops(bodegaTasks);
    return stops.find((s) => s.codigo === activeTask.codigo);
  }, [bodegaTasks, activeTask.codigo]);

  const handleCapturePositionPhoto = async (file: File, target: "LUZ" | "AGUA" = "LUZ") => {
    setIsUploadingPhoto(true);
    setPhotoError(null);
    try {
      const posKey = target === "AGUA" ? `pos_agua_${activeTask.taskKey}` : `pos_${activeTask.taskKey}`;
      const stored = await persistFieldEvidencePhoto(posKey, file);
      if (target === "AGUA") {
        setHasPositionPhotoWater(true);
        setPositionPhotoWaterLocalKey(stored.photoLocalKey);
        setPositionPhotoWaterStorageUrl(stored.photoStorageUrl);
      } else {
        const localUrl = await getLocalPhotoUrl(stored.photoLocalKey);
        if (activeBlobUrlRef.current) URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = localUrl;
        setPhotoPreviewUrl(localUrl || stored.photoStorageUrl || null);
        setHasPositionPhoto(true);
        setPositionPhotoLocalKey(stored.photoLocalKey);
        setPositionPhotoStorageUrl(stored.photoStorageUrl);
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Error al procesar foto de posición.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCommitStop = () => {
    const nowMs = Date.now();
    const durSec = Math.max(1, Math.round((nowMs - stopEnteredMsRef.current) / 1000));
    const walkSec = lastCommitMsRef.current ? Math.max(1, Math.round((stopEnteredMsRef.current - lastCommitMsRef.current) / 1000)) : 15;
    lastCommitMsRef.current = nowMs;

    onSaveSurveyStop({
      taskKey: activeTask.taskKey,
      codigo: activeTask.codigo,
      bodegaId: activeTask.bodegaId,
      servicio: activeTask.servicio,
      ...(gpsCoords
        ? {
            latitude: gpsCoords.latitude,
            longitude: gpsCoords.longitude,
            accuracyMeters: gpsCoords.accuracyMeters,
          }
        : {}),
      hasPositionPhoto,
      ...(referenciaPasillo.trim() ? { referenciaPasillo: referenciaPasillo.trim() } : {}),
      ...(positionPhotoLocalKey ? { positionPhotoLocalKey } : {}),
      ...(positionPhotoStorageUrl ? { positionPhotoStorageUrl } : {}),
      hasPositionPhotoWater,
      ...(positionPhotoWaterLocalKey ? { positionPhotoWaterLocalKey } : {}),
      ...(positionPhotoWaterStorageUrl ? { positionPhotoWaterStorageUrl } : {}),
      tiempoLlegadaMs: stopEnteredMsRef.current,
      tiempoSalidaMs: nowMs,
      duracionServicioSegundos: durSec,
      deltaTrasladoSegundos: walkSec,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono text-xs font-black">
                PARADA #{formatInt(nextStopNumberInBodega)} EN BODEGA {activeTask.bodegaId}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-xs font-bold">
                {activeTask.etiquetaServicio}
              </span>
              {activeTask.routeSurvey && (
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 font-mono text-xs font-bold">
                  YA EN RUTA IDEAL ({formatInt(activeTask.routeSurvey.ordenBodega)}°)
                </span>
              )}
            </div>
            <h2 className="text-2xl font-mono font-black tracking-tight mt-1">{activeTask.codigo}</h2>
          </div>

          <div className="text-right font-mono">
            <span className="text-[11px] text-slate-400 block">Serie Contador</span>
            <span className="text-sm font-bold text-emerald-400">{activeTask.serieMedidor}</span>
            {activeTask.sharedCodigos.length > 1 && (
              <span className="text-[11px] text-amber-300 block">
                Compartido /{formatInt(activeTask.sharedCodigos.length)} locales
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700 shrink-0">
                <Navigation className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  1. Georreferenciación GPS del Contador
                </span>
                {gpsCoords ? (
                  <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                    Lat: {formatDec(gpsCoords.latitude, 5, 6)} · Lng: {formatDec(gpsCoords.longitude, 5, 6)}{" "}
                    <span className="text-emerald-700">
                      (±{formatInt(gpsCoords.accuracyMeters)} m)
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 block mt-0.5">
                    {gpsStatus}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={requestGpsFix}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Capturar GPS</span>
            </button>
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
                  if (file) handleCapturePositionPhoto(file);
                  e.currentTarget.value = "";
                }}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className={`min-h-24 p-3.5 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 font-bold text-xs transition-all cursor-pointer ${
                  hasPositionPhoto
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                    : "border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800"
                }`}
              >
                {photoPreviewUrl ? (
                  <img
                    src={photoPreviewUrl}
                    alt={`Posición medidor ${activeTask.codigo}`}
                    className="w-16 h-16 rounded-lg object-cover border border-emerald-400 shrink-0"
                  />
                ) : isUploadingPhoto ? (
                  <UploadCloud className="w-6 h-6 text-sky-600 animate-pulse shrink-0" strokeWidth={1.75} />
                ) : (
                  <Camera className="w-6 h-6 text-slate-700 shrink-0" strokeWidth={1.75} />
                )}
                <div className="text-left">
                  <span className="block font-bold">
                    {isUploadingPhoto
                      ? "Guardando foto de ubicación..."
                      : hasPositionPhoto
                      ? "Foto de Posición Guardada (Tocar para cambiar)"
                      : "2. Tomar Foto de Posición del Contador"}
                  </span>
                  <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                    Fotografía panorámica del gabinete, pared o caja donde está instalado el medidor
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

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  3. Orden Automático en el Recorrido
                </span>
                <div className="text-lg font-mono font-black text-slate-900 mt-1">
                  Secuencia #{formatInt(nextStopNumberInBodega)}° en Bodega {activeTask.bodegaId}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Al guardar, este contador queda fijado como parada #{formatInt(nextStopNumberInBodega)}° de la Ruta Ideal que los lecturistas seguirán cada mes.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isUploadingPhoto}
            onClick={handleCommitStop}
            className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <MapPin className="w-5 h-5" strokeWidth={1.75} />
            <span>
              Fijar Posición #{formatInt(nextStopNumberInBodega)}° en Ruta Ideal y Pasar al Siguiente Contador
            </span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
          </button>

          {surveyToast && (
            <div className="p-3 rounded-xl bg-slate-900 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.75} />
              <span>{surveyToast}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Secuencia de Ruta Ideal en Bodega {activeTask.bodegaId} ({formatInt(surveyedInBodega.length)} / {formatInt(bodegaTasks.length)} contadores)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Orden exacto caminado: 1° → 2° → 3°...
          </span>
        </div>

        {surveyedInBodega.length === 0 ? (
          <p className="text-xs text-slate-400">
            Aún no has fijado el primer contador en la Bodega {activeTask.bodegaId}. Camina hacia el primer medidor y pulsa el botón verde para inaugurar la parada #1°.
          </p>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {surveyedInBodega.map((t) => {
              const sv = t.routeSurvey;
              return (
                <div
                  key={t.taskKey}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/30 shrink-0 flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTask(t)}
                    className="text-left font-mono cursor-pointer"
                  >
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black mr-1.5">
                      {formatInt(sv?.ordenBodega ?? 1)}°
                    </span>
                    <span className="text-xs font-bold text-white">{t.codigo}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {sv?.latitude !== undefined ? "GPS OK" : "Sin GPS"} ·{" "}
                      {sv?.hasPositionPhoto ? "Foto OK" : "Sin Foto"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveSurveyStop(t.taskKey)}
                    title="Quitar parada de la ruta"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" strokeWidth={1.75} />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Distribución de Trabajo por Cuadrilla ({formatInt(workloadSummary.surveyedMeters)} / {formatInt(workloadSummary.totalMeters)} georreferenciados · {formatPct(workloadSummary.surveyProgressPct, 1)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-semibold">Lecturistas en turno:</span>
            {[2, 4, 6, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setOperatorsCount(n)}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold cursor-pointer ${
                  operatorsCount === n
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-950 text-slate-300 border border-white/10"
                }`}
              >
                {formatInt(n)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {workloadSummary.shifts.map((sh) => (
            <div
              key={sh.operatorIndex}
              className="p-3 rounded-xl bg-slate-950/90 border border-white/10 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-300 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {sh.etiquetaOperario}
                </span>
                <span className="font-mono text-xs font-black text-white">
                  {formatInt(sh.totalMedidores)} med.
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Tiempo est.: ~{formatDec(sh.tiempoEstimadoMinutos / 60, 1)} h ({formatInt(sh.tiempoEstimadoMinutos)} min)
              </div>
              <div className="text-[10px] font-mono text-slate-300 truncate">
                Bodegas: {sh.bodegasAsignadas.join(", ")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
