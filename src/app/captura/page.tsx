"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  deriveTaskStateFromObservation,
  useCorabastosFieldCapture,
} from "@/context/CorabastosContext";
import { ReadingZoneId } from "@/contracts/domain-contracts";
import { UnifiedReadingTask } from "@/lib/reading-tasks-engine";
import { getLocalPhotoUrl, persistFieldEvidencePhoto } from "@/lib/photo-evidence-store";
import { formatDec, formatInt, sanitizeDecimalInputString } from "@/lib/formatters";
import { FieldRouteNavigator } from "@/components/FieldRouteNavigator";
import { OperatorTaskCaptureCard } from "@/components/OperatorTaskCaptureCard";
import { CorabastosBrandLogo } from "@/components/CorabastosBrandLogo";
import {
  Camera,
  CheckCircle2,
  Cloud,
  CloudOff,
  Info,
  KeyRound,
  LayoutDashboard,
  Lock,
  MapPin,
  X,
} from "lucide-react";

export default function OperadorTerrenoCapturePage() {
  const {
    role,
    authenticateAuditorAdmin,
    isCloudConnected,
    tasks: allTasks,
    recentFieldUpdates,
    saveFieldReading,
    lookupCadastralLocales,
  } = useCorabastosFieldCapture();

  const [selectedZone, setSelectedZone] = useState<ReadingZoneId>("ZONA_3_COMERCIANTES_PRINCIPAL");
  const [selectedBodega, setSelectedBodega] = useState<string>("ALL");
  const [serviceFilter, setServiceFilter] = useState<"ALL" | "ENERGIA" | "AGUA">("ALL");
  const [queueFilter, setQueueFilter] = useState<"PENDIENTES" | "COMPLETADAS">("PENDIENTES");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskKey, setSelectedTaskKey] = useState<string>("");

  const [inputReading, setInputReading] = useState<string>("");
  const [selectedObs, setSelectedObs] = useState<string>("VERIFICADO POR IMAGEN");
  const [hasPhotoEvidence, setHasPhotoEvidence] = useState<boolean>(false);
  const [photoLocalKey, setPhotoLocalKey] = useState<string | undefined>(undefined);
  const [photoStorageUrl, setPhotoStorageUrl] = useState<string | undefined>(undefined);
  const [photoCapturedAt, setPhotoCapturedAt] = useState<string | undefined>(undefined);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinValue, setPinValue] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);

  const activeBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, []);

  const zoneCounts = useMemo(() => {
    const map: Record<ReadingZoneId, { total: number; pending: number; done: number }> = {
      ZONA_1_MACROMEDIDORES: { total: 0, pending: 0, done: 0 },
      ZONA_2_BANOS_PUBLICOS: { total: 0, pending: 0, done: 0 },
      ZONA_3_COMERCIANTES_PRINCIPAL: { total: 0, pending: 0, done: 0 },
      ZONA_4_BODEGA_POPULAR: { total: 0, pending: 0, done: 0 },
      ZONA_5_RED_FRIOS: { total: 0, pending: 0, done: 0 },
    };
    for (const t of allTasks) {
      map[t.zonaId].total += 1;
      if (t.taskState === "PENDIENTE") map[t.zonaId].pending += 1;
      else map[t.zonaId].done += 1;
    }
    return map;
  }, [allTasks]);

  const zoneBodegas = useMemo(() => {
    const map = new Map<string, { total: number; pending: number }>();
    for (const t of allTasks) {
      if (t.zonaId !== selectedZone) continue;
      const prev = map.get(t.bodegaId) || { total: 0, pending: 0 };
      prev.total += 1;
      if (t.taskState === "PENDIENTE") prev.pending += 1;
      map.set(t.bodegaId, prev);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allTasks, selectedZone]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allTasks.filter((t) => {
      if (q.length > 0) {
        const matchesTask =
          t.codigo.toLowerCase().includes(q) ||
          t.serieMedidor.toLowerCase().includes(q) ||
          `bodega ${t.bodegaId}`.toLowerCase().includes(q) ||
          t.sharedCodigos.some((code) => code.toLowerCase().includes(q));
        if (!matchesTask) return false;
      } else {
        if (t.zonaId !== selectedZone) return false;
        if (selectedBodega !== "ALL" && t.bodegaId !== selectedBodega) return false;
        if (queueFilter === "PENDIENTES" && t.taskState !== "PENDIENTE") return false;
        if (queueFilter === "COMPLETADAS" && t.taskState === "PENDIENTE") return false;
      }
      if (serviceFilter === "ENERGIA" && t.servicio !== "ENERGIA" && t.servicio !== "MACRO_ENERGIA") {
        return false;
      }
      if (
        serviceFilter === "AGUA" &&
        t.servicio !== "AGUA" &&
        t.servicio !== "MACRO_AGUA" &&
        t.servicio !== "BANO_PUBLICO"
      ) {
        return false;
      }
      return true;
    });
  }, [allTasks, selectedZone, selectedBodega, serviceFilter, queueFilter, searchQuery]);

  const cadastralLookupResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return lookupCadastralLocales(q).filter(
      (item) => !item.hasIndividualEnergyMeter && !item.hasIndividualWaterMeter
    );
  }, [searchQuery, lookupCadastralLocales]);

  const activeTask = useMemo<UnifiedReadingTask | null>(() => {
    const found = filteredTasks.find((t) => t.taskKey === selectedTaskKey);
    return found || filteredTasks[0] || null;
  }, [filteredTasks, selectedTaskKey]);

  const syncTaskFormState = (t: UnifiedReadingTask) => {
    setInputReading(String(t.lecturaActual).replace(".", ","));
    setSelectedObs(t.observacionActual || "VERIFICADO POR IMAGEN");
    setHasPhotoEvidence(Boolean(t.hasPhotoEvidence));
    setPhotoLocalKey(t.photoLocalKey);
    setPhotoStorageUrl(t.photoStorageUrl);
    setPhotoCapturedAt(undefined);
    setPhotoError(null);
    setSaveError(null);

    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }

    if (t.photoLocalKey) {
      void getLocalPhotoUrl(t.photoLocalKey).then((url) => {
        if (url) {
          activeBlobUrlRef.current = url;
          setPhotoPreviewUrl(url);
        } else {
          setPhotoPreviewUrl(t.photoStorageUrl ?? null);
        }
      });
    } else {
      setPhotoPreviewUrl(t.photoStorageUrl ?? null);
    }
  };

  const prevTaskKeyRef = useRef<string>("");
  useEffect(() => {
    if (activeTask && activeTask.taskKey !== prevTaskKeyRef.current) {
      prevTaskKeyRef.current = activeTask.taskKey;
      syncTaskFormState(activeTask);
    }
  }, [activeTask]);

  const selectTask = (t: UnifiedReadingTask) => {
    setSelectedTaskKey(t.taskKey);
    prevTaskKeyRef.current = t.taskKey;
    syncTaskFormState(t);
  };

  const handleCapturePhotoFile = async (file: File) => {
    if (!activeTask) return;
    setIsUploadingPhoto(true);
    setPhotoError(null);
    try {
      const stored = await persistFieldEvidencePhoto(activeTask.taskKey, file);
      const localUrl = await getLocalPhotoUrl(stored.photoLocalKey);
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
      activeBlobUrlRef.current = localUrl;
      setPhotoPreviewUrl(localUrl || stored.photoStorageUrl || null);
      setHasPhotoEvidence(true);
      setPhotoLocalKey(stored.photoLocalKey);
      setPhotoStorageUrl(stored.photoStorageUrl);
      setPhotoCapturedAt(stored.photoCapturedAt);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "No fue posible procesar la fotografía.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveTask = () => {
    if (!activeTask || inputReading.trim().length === 0) return;
    const { parsedNumber: numericInput } = sanitizeDecimalInputString(inputReading);

    const currentIndex = filteredTasks.findIndex((t) => t.taskKey === activeTask.taskKey);
    const nextCandidate =
      currentIndex >= 0 && currentIndex + 1 < filteredTasks.length
        ? filteredTasks[currentIndex + 1]
        : filteredTasks.find((t) => t.taskKey !== activeTask.taskKey) || null;

    const nextTaskState = deriveTaskStateFromObservation(selectedObs);

    const outcome = saveFieldReading(
      {
        codigo: activeTask.codigo,
        servicio: activeTask.servicio,
        lecturaActual: numericInput,
        observacion: selectedObs,
        hasPhotoEvidence,
        ...(photoLocalKey ? { photoLocalKey } : {}),
        ...(photoStorageUrl ? { photoStorageUrl } : {}),
        ...(photoCapturedAt ? { photoCapturedAt } : {}),
        taskState: nextTaskState,
        timestamp: new Date().toISOString().slice(11, 19),
      },
      activeTask.sharedCodigos
    );

    if (!outcome.ok) {
      setSaveError(outcome.error || "Lectura rechazada por las reglas metrológicas.");
      return;
    }

    setSaveError(null);
    setSaveToast(
      `Medidor ${activeTask.codigo} (${formatInt(activeTask.sharedCodigos.length)} puesto[s]) registrado como ${nextTaskState}.`
    );

    if (nextCandidate) {
      selectTask(nextCandidate);
    }

    setTimeout(() => setSaveToast(null), 2600);
  };

  const handleUnlockPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authenticateAuditorAdmin(pinValue)) {
      setPinValue("");
      setPinError(null);
      setIsPinModalOpen(false);
    } else {
      setPinError("PIN incorrecto. Verifica credenciales de auditoría.");
    }
  };

  const totalPendingGlobal = allTasks.filter((t) => t.taskState === "PENDIENTE").length;
  const totalDoneGlobal = allTasks.length - totalPendingGlobal;

  return (
    <div className="min-h-screen bg-[#010F22] text-white flex flex-col">
      <header className="sticky top-0 z-30 bg-[#010F22]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border border-white/20 flex items-center justify-center p-1 shadow-xs">
            <CorabastosBrandLogo variant="isotipo" size={28} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                CORABASTOS · TERMINAL DE LECTURA EN TERRENO
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-400/30 inline-flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" strokeWidth={1.75} />
                {role === "LECTURISTA" ? "ROL LECTURISTA (AISLADO)" : "AUDITOR ADMIN"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono inline-flex items-center gap-1 border ${
                  isCloudConnected
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                    : "bg-slate-800 text-slate-300 border-white/15"
                }`}
              >
                {isCloudConnected ? (
                  <Cloud className="w-2.5 h-2.5" strokeWidth={1.75} />
                ) : (
                  <CloudOff className="w-2.5 h-2.5" strokeWidth={1.75} />
                )}
                {isCloudConnected ? "Cloud" : "Local IndexedDB"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cola deduplicada: {formatInt(allTasks.length)} medidores físicos únicos sobre 1.835 registros
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400 block">Pendientes</span>
            <span className="font-mono font-black text-amber-400 text-sm tabular-nums">
              {formatInt(totalPendingGlobal)}
            </span>
          </div>
          <div className="text-right pl-3 border-l border-white/10">
            <span className="text-[10px] uppercase text-slate-400 block">Evacuadas</span>
            <span className="font-mono font-black text-emerald-400 text-sm tabular-nums">
              {formatInt(totalDoneGlobal)}
            </span>
          </div>

          {role === "AUDITOR_ADMIN" ? (
            <Link
              href="/"
              className="ml-2 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Consola Ejecutiva</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPinError(null);
                setPinValue("");
                setIsPinModalOpen(true);
              }}
              className="ml-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
              <span>Desbloquear Modo Auditor (PIN)</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 space-y-4">
        <FieldRouteNavigator
          allTasksCount={allTasks.length}
          zoneCounts={zoneCounts}
          selectedZone={selectedZone}
          onSelectZone={(zId) => {
            setSelectedZone(zId);
            setSelectedBodega("ALL");
            setSelectedTaskKey("");
          }}
          zoneBodegas={zoneBodegas}
          selectedBodega={selectedBodega}
          onSelectBodega={(bod) => {
            setSelectedBodega(bod);
            setSelectedTaskKey("");
          }}
          serviceFilter={serviceFilter}
          onChangeServiceFilter={setServiceFilter}
          queueFilter={queueFilter}
          onChangeQueueFilter={setQueueFilter}
          searchQuery={searchQuery}
          onChangeSearchQuery={setSearchQuery}
          filteredTasks={filteredTasks}
          activeTaskKey={activeTask?.taskKey}
          onSelectTask={selectTask}
        />

        {activeTask ? (
          <OperatorTaskCaptureCard
            activeTask={activeTask}
            inputReading={inputReading}
            setInputReading={setInputReading}
            selectedObs={selectedObs}
            setSelectedObs={setSelectedObs}
            hasPhotoEvidence={hasPhotoEvidence}
            photoPreviewUrl={photoPreviewUrl}
            isUploadingPhoto={isUploadingPhoto}
            photoError={photoError}
            onCapturePhotoFile={handleCapturePhotoFile}
            handleSaveTask={handleSaveTask}
            saveToast={saveToast}
            saveError={saveError}
          />
        ) : cadastralLookupResults.length === 0 ? (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" strokeWidth={1.75} />
            <h3 className="text-base font-bold text-white">Cero tareas pendientes en este filtro</h3>
            <p className="text-xs text-slate-400">
              Todos los medidores de esta selección ya fueron evacuados en el corte actual. Cambia de Bodega o Zona para continuar.
            </p>
          </div>
        ) : null}

        {cadastralLookupResults.length > 0 && (
          <div className="bg-slate-900/95 border border-amber-400/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Info className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>
                Ficha Catastral de Locales sin Odómetro Individual ({formatInt(cadastralLookupResults.length)})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {cadastralLookupResults.slice(0, 6).map((item) => (
                <div key={item.codigo} className="p-3 rounded-xl bg-slate-950/90 border border-white/10 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono font-bold">
                    <span className="text-amber-300">Local {item.codigo} · Bod. {item.bodegaId}</span>
                    <span className="text-slate-400">{formatDec(item.areaM2, 2)} m²</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    Energía: <strong>{item.modalidadEnergia}</strong> · Agua: <strong>{item.modalidadAcueducto}</strong>
                  </div>
                  {item.explicacionSinOdometro && (
                    <p className="text-[11px] text-slate-400 leading-snug">{item.explicacionSinOdometro}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {recentFieldUpdates.length > 0 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
              Últimas Lecturas Registradas ({formatInt(recentFieldUpdates.length)})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentFieldUpdates.slice(0, 6).map((u, idx) => (
                <div
                  key={`${u.codigo}-${u.servicio}-${idx}`}
                  className="p-2.5 rounded-xl bg-slate-950/90 border border-white/10 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-400">{u.codigo}</span>
                      <span className="text-slate-400">({u.servicio})</span>
                      {u.hasPhotoEvidence && <Camera className="w-3.5 h-3.5 text-sky-400" strokeWidth={1.75} />}
                    </div>
                    <span className="block text-[10px] text-slate-400">{u.observacion}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white tabular-nums">{formatDec(u.lecturaActual, 0, 2)}</span>
                    <span className="block text-[10px] text-emerald-400">{u.taskState || "COMPLETADA"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <KeyRound className="w-4 h-4" strokeWidth={1.75} />
                <span>Desbloquear Modo Auditor</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Ingresa el PIN administrativo de Auditoría Financiera para habilitar el acceso a la Consola Ejecutiva.
            </p>
            <form onSubmit={handleUnlockPinSubmit} className="space-y-3">
              <input
                type="password"
                autoFocus
                value={pinValue}
                onChange={(e) => {
                  setPinValue(e.target.value);
                  setPinError(null);
                }}
                placeholder="PIN Administrativo"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-white/20 font-mono text-sm text-white focus:outline-none focus:border-emerald-400"
              />
              {pinError && <p className="text-xs text-rose-400 font-semibold">{pinError}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 cursor-pointer"
                >
                  Autenticar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
