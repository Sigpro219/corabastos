"use client";

import React, { useState, useMemo } from "react";
import {
  useCorabastos,
  deriveTaskStateFromObservation,
} from "@/context/CorabastosContext";
import { ReadingZoneId } from "@/contracts/domain-contracts";
import {
  buildCutoffReadingTasks,
  UnifiedReadingTask,
  ZONE_META,
} from "@/lib/reading-tasks-engine";
import { OperatorTaskCaptureCard } from "@/components/OperatorTaskCaptureCard";
import { CorabastosBrandLogo } from "@/components/CorabastosBrandLogo";
import {
  Zap,
  Droplets,
  CheckCircle2,
  Search,
  Smartphone,
  MapPin,
  Lock,
  Layers,
  ListChecks,
} from "lucide-react";

export default function OperadorTerrenoCapturePage() {
  const {
    locales,
    energyCommunal,
    waterCommunal,
    bathroomMeters,
    saveFieldReading,
    recentFieldUpdates,
    completedTaskIds,
  } = useCorabastos();

  const [selectedZone, setSelectedZone] = useState<ReadingZoneId>("ZONA_3_COMERCIANTES_PRINCIPAL");
  const [selectedBodega, setSelectedBodega] = useState<string>("ALL");
  const [serviceFilter, setServiceFilter] = useState<"ALL" | "ENERGIA" | "AGUA">("ALL");
  const [queueFilter, setQueueFilter] = useState<"PENDIENTES" | "COMPLETADAS">("PENDIENTES");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskKey, setSelectedTaskKey] = useState<string>("");

  const [inputReading, setInputReading] = useState<string>("");
  const [selectedObs, setSelectedObs] = useState<string>("VERIFICADO POR IMAGEN");
  const [photoCaptured, setPhotoCaptured] = useState<boolean>(false);
  const [ocrRunning, setOcrRunning] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const allTasks = useMemo<UnifiedReadingTask[]>(
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

  // Estadísticas por Zona
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
      if (t.taskState === "PENDIENTE") {
        map[t.zonaId].pending += 1;
      } else {
        map[t.zonaId].done += 1;
      }
    }
    return map;
  }, [allTasks]);

  // Bodegas disponibles dentro de la zona activa con su conteo de pendientes
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

  // Tareas filtradas según Zona, Bodega, Servicio y Bandeja (Solo Pendientes por defecto)
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (t.zonaId !== selectedZone) return false;
      if (selectedBodega !== "ALL" && t.bodegaId !== selectedBodega) return false;
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
      if (queueFilter === "PENDIENTES" && t.taskState !== "PENDIENTE") return false;
      if (queueFilter === "COMPLETADAS" && t.taskState === "PENDIENTE") return false;
      if (searchQuery.trim().length > 0 && !t.codigo.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [allTasks, selectedZone, selectedBodega, serviceFilter, queueFilter, searchQuery]);

  const activeTask = useMemo(() => {
    const found = filteredTasks.find((t) => t.taskKey === selectedTaskKey);
    return found || filteredTasks[0] || null;
  }, [filteredTasks, selectedTaskKey]);

  const selectTask = (t: UnifiedReadingTask) => {
    setSelectedTaskKey(t.taskKey);
    setInputReading(String(t.lecturaActual));
    setSelectedObs(t.observacionActual || "VERIFICADO POR IMAGEN");
    setPhotoCaptured(false);
  };

  const prevTaskRef = React.useRef<string>("");
  React.useEffect(() => {
    if (activeTask && activeTask.taskKey !== prevTaskRef.current) {
      prevTaskRef.current = activeTask.taskKey;
      setInputReading(String(activeTask.lecturaActual));
      setSelectedObs(activeTask.observacionActual || "VERIFICADO POR IMAGEN");
      setPhotoCaptured(false);
    }
  }, [activeTask]);

  const numericInput = Number(inputReading.replace(",", "."));

  const simulateOcrCapture = () => {
    if (!activeTask) return;
    setOcrRunning(true);
    setTimeout(() => {
      setOcrRunning(false);
      setPhotoCaptured(true);
      const increment =
        activeTask.multiplicador !== 1 && activeTask.multiplicador > 0
          ? Math.max(1, Math.round(activeTask.consumoAnteriorFisico / activeTask.multiplicador))
          : Math.max(5, Math.round(activeTask.consumoAnteriorFisico));
      const suggested = Math.round(activeTask.lecturaAnterior + increment);
      setInputReading(String(suggested));
      setSelectedObs("VERIFICADO POR IMAGEN");
    }, 350);
  };

  const handleSaveTask = () => {
    if (!activeTask || !Number.isFinite(numericInput)) return;

    const currentIndex = filteredTasks.findIndex((t) => t.taskKey === activeTask.taskKey);
    const nextCandidate =
      currentIndex >= 0 && currentIndex + 1 < filteredTasks.length
        ? filteredTasks[currentIndex + 1]
        : filteredTasks.find((t) => t.taskKey !== activeTask.taskKey) || null;

    const nextTaskState = deriveTaskStateFromObservation(selectedObs);

    saveFieldReading({
      codigo: activeTask.codigo,
      servicio: activeTask.servicio,
      lecturaActual: numericInput,
      observacion: selectedObs,
      fotoCapturada: photoCaptured,
      taskState: nextTaskState,
      timestamp: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });

    setSaveToast(
      `Tarea ${activeTask.codigo} (${activeTask.etiquetaServicio}) evacuada como ${nextTaskState}.`
    );

    if (nextCandidate) {
      setSelectedTaskKey(nextCandidate.taskKey);
    }

    setTimeout(() => setSaveToast(null), 2600);
  };

  const totalPendingGlobal = allTasks.filter((t) => t.taskState === "PENDIENTE").length;
  const totalDoneGlobal = allTasks.length - totalPendingGlobal;

  return (
    <div className="min-h-screen bg-[#010F22] text-white flex flex-col">
      {/* BARRA SUPERIOR TERMINAL OPERATIVA DE CAMPO */}
      <header className="sticky top-0 z-30 bg-[#010F22]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border border-white/20 flex items-center justify-center p-1 shadow-xs">
            <CorabastosBrandLogo variant="isotipo" size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                CORABASTOS · COLA DE TAREAS DEL CORTE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                MODO OPERADOR
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Corte Activo: JUNIO 2025 · Solo se listan los medidores pendientes por leer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400 block">Pendientes Corte</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              {totalPendingGlobal.toLocaleString("es-CO")}
            </span>
          </div>
          <div className="text-right pl-3 border-l border-white/10">
            <span className="text-[10px] uppercase text-slate-400 block">Evacuadas Hoy</span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              {totalDoneGlobal.toLocaleString("es-CO")}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* 1. SELECTOR DE LAS 5 ZONAS OPERATIVAS DEL CORTE */}
        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              1. Selecciona tu Zona de Trabajo (Estructura Oficial Excel)
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Total Corte: {allTasks.length.toLocaleString("es-CO")} tareas
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
                  onClick={() => {
                    setSelectedZone(z.id);
                    setSelectedBodega("ALL");
                    setSelectedTaskKey("");
                  }}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/20 border-emerald-400 text-white shadow-md"
                      : "bg-slate-950/70 border-white/10 text-slate-300 hover:bg-slate-800/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                      {z.priorityBadge}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                      {stats.pending.toLocaleString("es-CO")} pend.
                    </span>
                  </div>
                  <div className="font-bold text-xs mt-1 truncate">{z.shortLabel}</div>
                </button>
              );
            })}
          </div>

          {/* 2. FILTRO DE BODEGA, SERVICIO Y BANDEJA (SOLO PENDIENTES vs COMPLETADAS) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/10">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Bodega ({zoneBodegas.length} en zona)
              </label>
              <select
                value={selectedBodega}
                onChange={(e) => {
                  setSelectedBodega(e.target.value);
                  setSelectedTaskKey("");
                }}
                className="w-full h-10 px-2.5 rounded-xl bg-slate-950 border border-white/15 font-mono text-xs text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="ALL">Todas las Bodegas de la Zona</option>
                {zoneBodegas.map(([bod, st]) => (
                  <option key={bod} value={bod}>
                    Bodega {bod} ({st.pending.toLocaleString("es-CO")} pendientes de {st.total.toLocaleString("es-CO")})
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
                  onClick={() => setServiceFilter("ALL")}
                  className={`rounded-xl font-bold text-xs cursor-pointer ${
                    serviceFilter === "ALL"
                      ? "bg-white text-slate-950"
                      : "bg-slate-950 text-slate-300 border border-white/10"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setServiceFilter("ENERGIA")}
                  className={`rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                    serviceFilter === "ENERGIA"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-950 text-slate-300 border border-white/10"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Energía
                </button>
                <button
                  type="button"
                  onClick={() => setServiceFilter("AGUA")}
                  className={`rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                    serviceFilter === "AGUA"
                      ? "bg-sky-400 text-slate-950"
                      : "bg-slate-950 text-slate-300 border border-white/10"
                  }`}
                >
                  <Droplets className="w-3.5 h-3.5" />
                  Agua
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Bandeja del Operador
              </label>
              <div className="grid grid-cols-2 gap-1 h-10">
                <button
                  type="button"
                  onClick={() => setQueueFilter("PENDIENTES")}
                  className={`rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                    queueFilter === "PENDIENTES"
                      ? "bg-emerald-500 text-slate-950 shadow"
                      : "bg-slate-950 text-slate-300 border border-white/10"
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  Pendientes
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter("COMPLETADAS")}
                  className={`rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                    queueFilter === "COMPLETADAS"
                      ? "bg-sky-500 text-slate-950 shadow"
                      : "bg-slate-950 text-slate-300 border border-white/10"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Evacuadas
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Buscar Medidor / Local
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej. 010001 o ALERO..."
                  className="w-full h-10 pl-8 pr-3 rounded-xl bg-slate-950 border border-white/15 font-mono text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* TIRA RÁPIDA DE TAREAS PENDIENTES EN LA RUTA */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-300 font-semibold">
                {queueFilter === "PENDIENTES"
                  ? `Cola de Tareas Pendientes en esta Ruta (${filteredTasks.length.toLocaleString("es-CO")})`
                  : `Tareas ya Evacuadas en esta Ruta (${filteredTasks.length.toLocaleString("es-CO")})`}
              </span>
              <span className="text-[10px] font-mono text-emerald-300">
                Al guardar, la tarea desaparece de pendientes y salta a la siguiente
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {filteredTasks.slice(0, 40).map((t) => {
                const isCurrent = activeTask?.taskKey === t.taskKey;
                const isEnergy = t.servicio === "ENERGIA" || t.servicio === "MACRO_ENERGIA";
                return (
                  <button
                    key={t.taskKey}
                    type="button"
                    onClick={() => selectTask(t)}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-emerald-400 text-slate-950 ring-2 ring-emerald-200 shadow"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    {isEnergy ? (
                      <Zap className="w-3 h-3 text-amber-500" />
                    ) : (
                      <Droplets className="w-3 h-3 text-sky-500" />
                    )}
                    <span>{t.codigo}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. TARJETA CENTRAL DE CAPTURA DE LA TAREA ACTIVA */}
        {activeTask ? (
          <OperatorTaskCaptureCard
            activeTask={activeTask}
            inputReading={inputReading}
            setInputReading={setInputReading}
            selectedObs={selectedObs}
            setSelectedObs={setSelectedObs}
            photoCaptured={photoCaptured}
            ocrRunning={ocrRunning}
            simulateOcrCapture={simulateOcrCapture}
            handleSaveTask={handleSaveTask}
            saveToast={saveToast}
          />
        ) : (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">
              ¡Cero tareas pendientes en este filtro!
            </h3>
            <p className="text-xs text-slate-400">
              Todos los medidores de esta selección ya fueron evacuados en el corte actual. Cambia de Bodega o Zona para continuar.
            </p>
          </div>
        )}

        {/* HISTORIAL CORTO DE LECTURAS ENVIADAS POR EL OPERADOR EN ESTE TURNO */}
        {recentFieldUpdates.length > 0 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Últimas Tareas Evacuadas en este Dispositivo ({recentFieldUpdates.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentFieldUpdates.slice(0, 6).map((u, idx) => (
                <div
                  key={`${u.codigo}-${u.servicio}-${idx}`}
                  className="p-2.5 rounded-xl bg-slate-950/90 border border-white/10 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-emerald-400">{u.codigo}</span>{" "}
                    <span className="text-slate-400">({u.servicio})</span>
                    <span className="block text-[10px] text-slate-400">{u.observacion}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white">{u.lecturaActual.toLocaleString("es-CO")}</span>
                    <span className="block text-[10px] text-emerald-400">{u.taskState || "COMPLETADA"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
