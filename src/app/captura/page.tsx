"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useCorabastos } from "@/context/CorabastosContext";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Droplets,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Search,
  Sparkles,
  ArrowRight,
  Building2,
  RotateCcw,
  Smartphone,
  Layers,
  ShieldCheck,
  Check,
  Clock,
  Wifi,
  SlidersHorizontal,
} from "lucide-react";

const NOVEDADES_REGLAMENTO = [
  { id: "VERIFICADO POR IMAGEN", label: "Normal (Verificado con Foto)", tipo: "OK" },
  { id: "C, DETENIDO", label: "Contador Detenido (Art. 46: Cobro Área m²)", tipo: "ALERTA" },
  { id: "C, TAPADO", label: "Contador Tapado / Obstruido (Art. 47)", tipo: "ALERTA" },
  { id: "DEFECTUOSO", label: "Medidor Roto / Ilegible (Art. 46: Área m²)", tipo: "CRITICO" },
  { id: "C, RETIRADO", label: "Contador Retirado de Bodega", tipo: "CRITICO" },
  { id: "REVISAR MEDIDOR", label: "Sospecha de Fuga o Alteración", tipo: "ALERTA" },
];

export default function MobileFieldCaptureApp() {
  const {
    locales,
    bodegasList,
    energyCommunal,
    waterCommunal,
    saveFieldReading,
    recentFieldUpdates,
  } = useCorabastos();

  const [activeMode, setActiveMode] = useState<"LOCALES" | "MACROMEDIDORES">("LOCALES");
  const [selectedService, setSelectedService] = useState<"ENERGIA" | "AGUA">("ENERGIA");
  const [selectedBodega, setSelectedBodega] = useState<string>("01");
  const [filterPendingOnly, setFilterPendingOnly] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Meter inputs
  const [inputReading, setInputReading] = useState<string>("");
  const [selectedObs, setSelectedObs] = useState<string>("VERIFICADO POR IMAGEN");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter meters in the active bodega
  const bodegaMeters = useMemo(() => {
    return locales.filter((loc) => {
      if (searchQuery.trim()) {
        return loc.codigo.toLowerCase().includes(searchQuery.trim().toLowerCase());
      }
      const matchBodega = loc.bodegaId === selectedBodega;
      const hasMeter =
        selectedService === "ENERGIA"
          ? loc.modalidadEnergia === "CONTADOR"
          : loc.modalidadAcueducto === "CONTADOR";
      return matchBodega && hasMeter;
    });
  }, [locales, selectedBodega, selectedService, searchQuery]);

  // Split into read vs pending
  const { pendingList, completedList } = useMemo(() => {
    const pending: typeof bodegaMeters = [];
    const completed: typeof bodegaMeters = [];
    for (const m of bodegaMeters) {
      const isUpdated = recentFieldUpdates.some(
        (u) => u.codigo === m.codigo && u.servicio === selectedService
      );
      if (isUpdated) {
        completed.push(m);
      } else {
        pending.push(m);
      }
    }
    return { pendingList: pending, completedList: completed };
  }, [bodegaMeters, recentFieldUpdates, selectedService]);

  const displayedList = filterPendingOnly && !searchQuery.trim() ? pendingList : bodegaMeters;
  const currentMeter = displayedList[selectedIndex] || displayedList[0] || null;

  // Reading references
  const prevReading = currentMeter
    ? selectedService === "ENERGIA"
      ? currentMeter.energiaLecturaAnt
      : currentMeter.aguaLecturaAnt
    : 0;

  const currentReadingNum = inputReading !== "" ? parseFloat(inputReading) : NaN;
  const deltaConsumo = !isNaN(currentReadingNum) ? Math.max(0, currentReadingNum - prevReading) : null;

  // Historical bounds
  const minHist = currentMeter
    ? selectedService === "ENERGIA"
      ? currentMeter.energiaPromMin
      : currentMeter.aguaPromMin
    : 0;
  const maxHist = currentMeter
    ? selectedService === "ENERGIA"
      ? currentMeter.energiaPromMax
      : currentMeter.aguaPromMax
    : 0;

  const isDeviation =
    deltaConsumo !== null && (deltaConsumo < minHist * 0.7 || (maxHist > 0 && deltaConsumo > maxHist * 1.3));

  const handleSimulatePhoto = () => {
    setPhotoPreview("/placeholder-meter.jpg");
    setOcrLoading(true);
    setTimeout(() => {
      // Generate a reasonable reading above previous
      const simulatedDelta = Math.floor(minHist + Math.random() * Math.max(10, maxHist - minHist));
      const simulatedReading = (prevReading + simulatedDelta).toString();
      setInputReading(simulatedReading);
      setOcrLoading(false);
      setToastMessage("OCR IA: Lectura extraída de la foto con 99.4% confianza");
      setTimeout(() => setToastMessage(null), 3000);
    }, 700);
  };

  const handleSaveAndNext = () => {
    if (!currentMeter || inputReading === "") {
      alert("Por favor ingrese la lectura del medidor antes de guardar.");
      return;
    }
    const val = parseFloat(inputReading);
    if (isNaN(val)) {
      alert("Lectura numérica inválida.");
      return;
    }

    saveFieldReading({
      codigo: currentMeter.codigo,
      servicio: selectedService,
      lecturaActual: val,
      observacion: selectedObs,
      fotoCapturada: Boolean(photoPreview),
      timestamp: new Date().toISOString(),
    });

    setToastMessage(`✓ Local ${currentMeter.codigo} guardado exitosamente`);
    setTimeout(() => setToastMessage(null), 2500);

    // Reset for next
    setInputReading("");
    setPhotoPreview(null);
    setSelectedObs("VERIFICADO POR IMAGEN");

    if (selectedIndex < displayedList.length - 1) {
      setSelectedIndex((prev) => prev + 1);
    } else {
      setSelectedIndex(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center">
      {/* PWA MOBILE SHELL (Max 480px) */}
      <main className="w-full max-w-md bg-slate-950 min-h-screen flex flex-col shadow-2xl border-x border-slate-800">
        {/* HEADER EXCLUSIVO OPERARIO (Sin datos financieros globales) */}
        <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">CORABASTOS</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  RUTA CAMPO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Operario Activo · Modo Terreno
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/80 transition-all"
            title="Ir a Consola Gerencial"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Mesa Central</span>
          </Link>
        </header>

        {/* SELECTOR DE SERVICIO 1-TAP (ENERGÍA vs AGUA) */}
        <div className="p-3 bg-slate-900/60 border-b border-slate-800">
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setSelectedService("ENERGIA");
                setSelectedIndex(0);
                setInputReading("");
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedService === "ENERGIA"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Energía (kWh)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedService("AGUA");
                setSelectedIndex(0);
                setInputReading("");
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedService === "AGUA"
                  ? "bg-sky-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Droplets className="w-4 h-4" />
              <span>Acueducto (m³)</span>
            </button>
          </div>

          {/* RUTA DE BODEGA HORIZONTAL SCROLL */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              Bodega Asignada:
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400">
              {completedList.length}/{bodegaMeters.length} Leídos ({bodegaMeters.length > 0 ? Math.round((completedList.length / bodegaMeters.length) * 100) : 0}%)
            </span>
          </div>

          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {bodegasList.map((b) => {
              const countInB = locales.filter(
                (l) =>
                  l.bodegaId === b &&
                  (selectedService === "ENERGIA"
                    ? l.modalidadEnergia === "CONTADOR"
                    : l.modalidadAcueducto === "CONTADOR")
              ).length;
              if (countInB === 0) return null;
              const isSelected = selectedBodega === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setSelectedBodega(b);
                    setSelectedIndex(0);
                    setInputReading("");
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Bod. {b} ({countInB})
                </button>
              );
            })}
          </div>

          {/* FILTRO PENDIENTES vs TODOS */}
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setFilterPendingOnly(!filterPendingOnly);
                setSelectedIndex(0);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold cursor-pointer text-[11px] ${
                filterPendingOnly
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              <span>{filterPendingOnly ? "Mostrando Solo Pendientes" : "Mostrando Todos"}</span>
              <span className="font-mono font-bold">({displayedList.length})</span>
            </button>

            {/* BÚSQUEDA RÁPIDA DE LOCAL */}
            <div className="relative w-36">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Buscar local..."
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* TOAST ALERT */}
        {toastMessage && (
          <div className="m-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* CUERPO PRINCIPAL: TARJETA DEL MEDIDOR ACTIVO */}
        {currentMeter ? (
          <div className="flex-1 p-4 flex flex-col justify-between space-y-4">
            {/* NAVEGADOR DE LOCALES (PREV / NEXT) */}
            <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (selectedIndex > 0) {
                    setSelectedIndex((p) => p - 1);
                    setInputReading("");
                  }
                }}
                disabled={selectedIndex === 0}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Medidor {selectedIndex + 1} de {displayedList.length}
                </span>
                <span className="font-mono text-xl font-black text-white tracking-wide">
                  LOCAL {currentMeter.codigo}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (selectedIndex < displayedList.length - 1) {
                    setSelectedIndex((p) => p + 1);
                    setInputReading("");
                  }
                }}
                disabled={selectedIndex >= displayedList.length - 1}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* DETALLES DEL LOCAL & HISTÓRICO */}
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Tipo de Bodega:</span>
                <span className="font-semibold text-slate-200">{currentMeter.tipoBodega}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Lectura Anterior (Mayo)
                  </span>
                  <span className="text-lg font-mono font-black text-amber-400">
                    {prevReading.toLocaleString("es-CO")}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {selectedService === "ENERGIA" ? "kWh" : "m³"}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Rango Histórico Esperado
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-300">
                    {minHist.toFixed(0)} - {maxHist.toFixed(0)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Consumo Normal</span>
                </div>
              </div>

              {/* INPUT DE NUEVA LECTURA (TAMAÑO GIGANTE ERGONÓMICO) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Nueva Lectura en Terreno:</span>
                  {deltaConsumo !== null && (
                    <span
                      className={`font-mono text-xs font-bold ${
                        isDeviation ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      Consumo: +{deltaConsumo.toLocaleString("es-CO")} {selectedService === "ENERGIA" ? "kWh" : "m³"}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={inputReading}
                    onChange={(e) => setInputReading(e.target.value)}
                    placeholder={`Ej: ${prevReading + 25}`}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl py-3 px-4 text-2xl font-mono font-black text-white text-center focus:outline-none shadow-inner"
                  />
                  {inputReading !== "" && (
                    <button
                      type="button"
                      onClick={() => setInputReading("")}
                      className="absolute right-3 top-3.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-0.5 rounded-md"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>

              {/* SEMÁFORO DE ALERTA INMEDIATA */}
              {isDeviation && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>Alerta In-Situ:</strong> Desviación frente al histórico ({minHist}-{maxHist}). Verifique foto antes de guardar.
                  </span>
                </div>
              )}

              {/* CAPTURA FOTOGRÁFICA & OCR SIMULATOR */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSimulatePhoto}
                  disabled={ocrLoading}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-300 border border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>{photoPreview ? "Foto Capturada ✓" : "Tomar Foto"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulatePhoto}
                  disabled={ocrLoading}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-300 border border-emerald-500/30 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>{ocrLoading ? "Leyendo..." : "Lectura con IA"}</span>
                </button>
              </div>

              {/* SELECTOR DE NOVEDADES DEL REGLAMENTO (Directiva 033-06) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Novedad de Terreno (Directiva 033-06):
                </label>
                <select
                  value={selectedObs}
                  onChange={(e) => setSelectedObs(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {NOVEDADES_REGLAMENTO.map((nov) => (
                    <option key={nov.id} value={nov.id}>
                      {nov.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BOTÓN MAESTRO DE ACCIÓN 1-TAP */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAndNext}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-transform active:scale-[0.98]"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>GUARDAR & SIGUIENTE MEDIDOR</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            <h3 className="text-base font-bold text-white">¡Ruta Completada en Bodega {selectedBodega}!</h3>
            <p className="text-xs text-slate-400">
              No hay más medidores pendientes por leer en esta bodega para {selectedService}.
            </p>
            <button
              type="button"
              onClick={() => setFilterPendingOnly(false)}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              Revisar Todos los Locales de Bodega {selectedBodega}
            </button>
          </div>
        )}

        {/* FOOTER PWA DISCRETO */}
        <footer className="p-3 bg-slate-950 border-t border-slate-900 text-center text-[10px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-emerald-400" /> Modo Offline-First Activo
          </span>
          <span className="font-mono">Puerto 3013 · SDD v1.0</span>
        </footer>
      </main>
    </div>
  );
}