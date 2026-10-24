"use client";

import React, { useState, useMemo } from "react";
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
  FileCheck2,
  ArrowRight,
  Building2,
} from "lucide-react";

const OBSERVATION_OPTIONS = [
  "VERIFICADO POR IMAGEN",
  "C, DETENIDO",
  "C, TAPADO",
  "M, TAPADO",
  "C, RETIRADO",
  "REVISAR MEDIDOR",
];

export function MobileFieldCaptureView() {
  const {
    locales,
    bodegasList,
    energyCommunal,
    waterCommunal,
    saveFieldReading,
    recentFieldUpdates,
  } = useCorabastos();

  const [captureMode, setCaptureMode] = useState<"LOCALES_CONTADOR" | "MACROMEDIDORES_COMUNALES">("LOCALES_CONTADOR");
  const [selectedService, setSelectedService] = useState<"ENERGIA" | "AGUA">("ENERGIA");
  const [selectedBodega, setSelectedBodega] = useState<string>("01");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Filter locales in selected bodega that have CONTADOR (or all if searched)
  const filteredLocales = useMemo(() => {
    return locales.filter((loc) => {
      if (searchQuery.trim() !== "") {
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

  const currentLocal = filteredLocales[selectedIndex] || filteredLocales[0] || null;

  // State for active reading form
  const prevReading = currentLocal
    ? selectedService === "ENERGIA"
      ? currentLocal.energiaLecturaAnt
      : currentLocal.aguaLecturaAnt
    : 0;

  const officialCurrentReading = currentLocal
    ? selectedService === "ENERGIA"
      ? currentLocal.energiaLecturaAct
      : currentLocal.aguaLecturaAct
    : 0;

  const [inputReading, setInputReading] = useState<string>("");
  const [selectedObs, setSelectedObs] = useState<string>("VERIFICADO POR IMAGEN");
  const [photoCaptured, setPhotoCaptured] = useState<boolean>(true);
  const [ocrSimulating, setOcrSimulating] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const effectiveReading =
    inputReading.trim() !== "" ? Number(inputReading.replace(",", ".")) : officialCurrentReading;
  const consumption = Math.max(0, effectiveReading - prevReading);
  const isNegativeError = effectiveReading < prevReading;

  // Check historical anomaly
  const unitRate = selectedService === "ENERGIA" ? 720.48 : 10921.45;
  const estimatedSubtotal = consumption * unitRate;
  const promMin = currentLocal
    ? selectedService === "ENERGIA"
      ? currentLocal.energiaPromMin
      : currentLocal.aguaPromMin
    : 0;
  const promMax = currentLocal
    ? selectedService === "ENERGIA"
      ? currentLocal.energiaPromMax
      : currentLocal.aguaPromMax
    : 0;

  const isOutOfHistoricalBand =
    promMax > 0 && (estimatedSubtotal < promMin * 0.85 || estimatedSubtotal > promMax * 1.15);

  const handleSelectLocal = (idx: number) => {
    setSelectedIndex(idx);
    setInputReading("");
    setSelectedObs("VERIFICADO POR IMAGEN");
    setPhotoCaptured(true);
  };

  const handleSimulateOcrCamera = () => {
    if (!currentLocal) return;
    setOcrSimulating(true);
    setTimeout(() => {
      setInputReading(String(officialCurrentReading));
      setPhotoCaptured(true);
      setSelectedObs("VERIFICADO POR IMAGEN");
      setOcrSimulating(false);
    }, 350);
  };

  const handleSaveAndNext = () => {
    if (!currentLocal || isNegativeError) return;
    saveFieldReading({
      codigo: currentLocal.codigo,
      servicio: selectedService,
      lecturaActual: effectiveReading,
      observacion: selectedObs,
      fotoCapturada: photoCaptured,
      timestamp: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });
    setSavedToast(`Lectura de local ${currentLocal.codigo} (${effectiveReading.toLocaleString("es-CO")}) sincronizada.`);
    setTimeout(() => setSavedToast(null), 3000);

    if (selectedIndex < filteredLocales.length - 1) {
      handleSelectLocal(selectedIndex + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* COLUMNA IZQUIERDA: TERMINAL MÓVIL DEL LECTURISTA EN TERRENO */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <div className="w-full max-w-[430px] bg-[#010F22] text-white rounded-3xl border-4 border-[#1D3557] shadow-2xl overflow-hidden">
          {/* Barra Superior del Dispositivo Móvil */}
          <div className="bg-[#1D3557] px-5 py-3.5 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs font-bold tracking-wider uppercase text-slate-200">
                  TERMINAL GEMBA · LECTURISTA
                </p>
                <p className="text-[11px] text-slate-300">
                  Ruta Secuencial Offline-First · Sincronización en Vivo
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-white/10 text-white">
              JUNIO 2025
            </span>
          </div>

          {/* Selector 1-Tap: Servicio (Energía vs Agua) y Modo */}
          <div className="p-4 bg-[#08172E] border-b border-white/10 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedService("ENERGIA");
                  handleSelectLocal(0);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  selectedService === "ENERGIA"
                    ? "bg-[#E73A46] text-white shadow-lg"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <Zap className="w-4 h-4" />
                CONTADORES ENERGÍA
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedService("AGUA");
                  handleSelectLocal(0);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  selectedService === "AGUA"
                    ? "bg-sky-600 text-white shadow-lg"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <Droplets className="w-4 h-4" />
                CONTADORES AGUA
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-1/2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                  Bodega en Ruta
                </label>
                <select
                  value={selectedBodega}
                  onChange={(e) => {
                    setSelectedBodega(e.target.value);
                    setSearchQuery("");
                    handleSelectLocal(0);
                  }}
                  className="w-full bg-[#010F22] border border-white/15 rounded-lg px-2.5 py-2 text-xs font-mono text-white"
                >
                  {bodegasList.map((b) => (
                    <option key={b} value={b}>
                      Bodega {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-1/2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                  Buscar Local Exacto
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSelectLocal(0);
                    }}
                    placeholder="Ej: 010001"
                    className="w-full bg-[#010F22] border border-white/15 rounded-lg pl-8 pr-2.5 py-2 text-xs font-mono text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cuerpo de Captura del Local Actual */}
          {currentLocal ? (
            <div className="p-5 space-y-4">
              {/* Encabezado del Local */}
              <div className="flex items-center justify-between bg-white/5 rounded-2xl p-3.5 border border-white/10">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                    LOCAL COMERCIAL ({selectedIndex + 1} de {filteredLocales.length})
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-bold font-mono tracking-tight text-white">
                      {currentLocal.codigo}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                      {currentLocal.areaM2} m²
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {currentLocal.tipoBodega} · Residuos:{" "}
                    <strong className="text-white font-mono">{currentLocal.categoriaResiduos}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={selectedIndex <= 0}
                    onClick={() => handleSelectLocal(Math.max(0, selectedIndex - 1))}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                    title="Local Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={selectedIndex >= filteredLocales.length - 1}
                    onClick={() => handleSelectLocal(Math.min(filteredLocales.length - 1, selectedIndex + 1))}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                    title="Siguiente Local"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comparativo Lectura Anterior vs Actual */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] uppercase text-slate-400 block">
                    Lectura Anterior
                  </span>
                  <span className="text-lg font-mono font-bold text-slate-200 mt-1 block">
                    {prevReading.toLocaleString("es-CO")}{" "}
                    <small className="text-xs font-normal text-slate-400">
                      {selectedService === "ENERGIA" ? "kWh" : "m³"}
                    </small>
                  </span>
                </div>
                <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-500/30">
                  <span className="text-[10px] uppercase text-emerald-300 block">
                    Consumo Calculado
                  </span>
                  <span className="text-lg font-mono font-bold text-emerald-400 mt-1 block">
                    +{consumption.toLocaleString("es-CO")}{" "}
                    <small className="text-xs font-normal text-emerald-300">
                      {selectedService === "ENERGIA" ? "kWh" : "m³"}
                    </small>
                  </span>
                </div>
              </div>

              {/* Input Numérico de Alta Densidad + Botón Cámara OCR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    NUEVA LECTURA DEL MEDIDOR ({selectedService === "ENERGIA" ? "kWh" : "m³"})
                  </label>
                  <button
                    type="button"
                    onClick={handleSimulateOcrCamera}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {ocrSimulating ? "Leyendo medidor..." : "Capturar Foto + OCR IA"}
                  </button>
                </div>

                <input
                  type="number"
                  inputMode="decimal"
                  value={inputReading !== "" ? inputReading : officialCurrentReading}
                  onChange={(e) => setInputReading(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveAndNext();
                    }
                  }}
                  className="w-full bg-[#08172E] border-2 border-sky-400/60 focus:border-emerald-400 rounded-2xl px-4 py-3.5 text-2xl font-mono font-bold text-right text-white outline-none"
                />
              </div>

              {/* Alertas en Terreno (Validación In-Situ antes de irse del local) */}
              {isNegativeError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/60 flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-200">
                    <strong className="block text-red-300">Lectura Inválida (Menor a la Anterior)</strong>
                    La lectura ingresada ({effectiveReading}) es inferior a la lectura del mes pasado ({prevReading}). Verifique el medidor o marque cambio/retiro de contador.
                  </div>
                </div>
              )}

              {!isNegativeError && isOutOfHistoricalBand && (
                <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/60 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-100">
                    <strong className="block text-amber-300">Alerta en Terreno: Consumo Fuera de Banda Histórica</strong>
                    Banda esperada: <span className="font-mono">${Math.round(promMin).toLocaleString("es-CO")}</span> a{" "}
                    <span className="font-mono">${Math.round(promMax).toLocaleString("es-CO")}</span>. Exige verificación fotográfica in-situ.
                  </div>
                </div>
              )}

              {/* Selector de Observación Estándar Corabastos */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1.5">
                  Estado Físico del Medidor / Evidencia
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {OBSERVATION_OPTIONS.map((obs) => (
                    <button
                      key={obs}
                      type="button"
                      onClick={() => setSelectedObs(obs)}
                      className={`px-2.5 py-2 rounded-lg text-[11px] font-medium text-left truncate border transition-all cursor-pointer ${
                        selectedObs === obs
                          ? "bg-white text-[#010F22] border-white font-bold"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {obs}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón Principal de Confirmación y Salto al Siguiente Local */}
              <button
                type="button"
                disabled={isNegativeError}
                onClick={handleSaveAndNext}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#E73A46] hover:bg-[#d42f3b] disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                GUARDAR LECTURA Y AVANZAR AL SIGUIENTE (ENTER)
                <ArrowRight className="w-4 h-4" />
              </button>

              {savedToast && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs text-center font-medium">
                  {savedToast}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Esta bodega no tiene locales con modalidad CONTADOR directo para {selectedService}. (Se liquidan por Macromedidor Comunal o Prorrateo de Área).
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA: RUTA DE BODEGA EN TIEMPO REAL Y MACROMEDIDORES PADRE-HIJO */}
      <div className="lg:col-span-7 space-y-6">
        {/* Selector de Modo de Inspección en Campo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1D3557] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#E73A46]" />
                Planilla Digital de Ruta por Bodega & Desacoplo Padre-Hijo
              </h2>
              <p className="text-xs text-[#4C607B] mt-0.5">
                Selecciona cualquier medidor de la lista para cargarlo en el teléfono del operario o auditar el descuento automático sobre el macromedidor comunal.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCaptureMode("LOCALES_CONTADOR")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  captureMode === "LOCALES_CONTADOR"
                    ? "bg-[#1D3557] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Contadores Individuales ({filteredLocales.length})
              </button>
              <button
                type="button"
                onClick={() => setCaptureMode("MACROMEDIDORES_COMUNALES")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  captureMode === "MACROMEDIDORES_COMUNALES"
                    ? "bg-[#1D3557] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Macromedidores Comunales ({energyCommunal.length + waterCommunal.length})
              </button>
            </div>
          </div>

          {captureMode === "LOCALES_CONTADOR" ? (
            <div className="mt-4 overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 text-[#1D3557] font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Local</th>
                    <th className="py-2.5 px-3 text-right">Área m²</th>
                    <th className="py-2.5 px-3 text-right">Lect. Anterior</th>
                    <th className="py-2.5 px-3 text-right">Lect. Actual</th>
                    <th className="py-2.5 px-3 text-right">Consumo</th>
                    <th className="py-2.5 px-3 text-right">Valor Liquidado</th>
                    <th className="py-2.5 px-3">Evidencia / Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLocales.map((loc, idx) => {
                    const isSelected = currentLocal?.codigo === loc.codigo;
                    const ant = selectedService === "ENERGIA" ? loc.energiaLecturaAnt : loc.aguaLecturaAnt;
                    const act = selectedService === "ENERGIA" ? loc.energiaLecturaAct : loc.aguaLecturaAct;
                    const cons = selectedService === "ENERGIA" ? loc.energiaConsumoIndivKw : loc.aguaConsumoIndivM3;
                    const valCop = selectedService === "ENERGIA" ? loc.calcEnergiaCop : loc.calcAcueductoCop;
                    const estado = selectedService === "ENERGIA" ? loc.energiaEstado : loc.aguaEstado;
                    const obs = selectedService === "ENERGIA" ? loc.energiaObs : loc.aguaObs;

                    return (
                      <tr
                        key={loc.codigo}
                        onClick={() => handleSelectLocal(idx)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-sky-50 font-semibold" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-bold text-[#1D3557]">
                          {loc.codigo}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-slate-600">
                          {loc.areaM2.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-slate-600">
                          {ant.toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 px-3 font-mono text-right font-bold text-slate-900">
                          {act.toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-emerald-700 font-bold">
                          +{cons.toLocaleString("es-CO")} {selectedService === "ENERGIA" ? "kWh" : "m³"}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-slate-900">
                          ${valCop.toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              estado === "REVISAR"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            <FileCheck2 className="w-3 h-3" />
                            {obs || estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto">
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-[#1D3557] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#E73A46] shrink-0 mt-0.5" />
                <div>
                  <strong>Desacoplo Padre-Hijo Automatizado:</strong> En el Excel antiguo, cuando un local de una bodega comunal instalaba medidor propio, había que editar a mano la celda del macromedidor (ej.{" "}
                  <code className="font-mono bg-white px-1 rounded">=(D17-C17)-ACUEDUCTO!$F$309-$F$310...</code>). Aquí el motor detecta automáticamente todos los locales hijos con contador y descuenta su consumo antes de prorratear el saldo por área.
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 text-[#1D3557] font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5">Macromedidor</th>
                    <th className="py-2 px-2.5">Bod</th>
                    <th className="py-2 px-2.5 text-right">Lect. Ant</th>
                    <th className="py-2 px-2.5 text-right">Lect. Act</th>
                    <th className="py-2 px-2.5 text-right">Hijos Desc.</th>
                    <th className="py-2 px-2.5 text-right">Neto Comunal</th>
                    <th className="py-2 px-2.5 text-right">Área Comunal</th>
                    <th className="py-2 px-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedService === "ENERGIA" ? energyCommunal : waterCommunal).map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 font-semibold text-[#1D3557]">
                        {m.codigo}
                        <span className="block text-[10px] font-mono text-slate-400">
                          Serie: {m.contadorSerie}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 font-mono font-bold">{m.bodegaId}</td>
                      <td className="py-2 px-2.5 font-mono text-right">{m.lecturaAnterior.toLocaleString("es-CO")}</td>
                      <td className="py-2 px-2.5 font-mono text-right font-bold">{m.lecturaActual.toLocaleString("es-CO")}</td>
                      <td className="py-2 px-2.5 font-mono text-right text-amber-700">
                        {m.hijosCount > 0 ? `-${m.consumoHijosDescontado.toLocaleString("es-CO")} (${m.hijosCount} loc)` : "0"}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-right font-bold text-emerald-700">
                        {m.consumoNetoComunal.toLocaleString("es-CO")} {selectedService === "ENERGIA" ? "kWh" : "m³"}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-right">{m.areaComunalM2.toLocaleString("es-CO")} m²</td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            m.alertaDesviacion ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {m.observacion}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bitácora de Capturas Recientes en Terreno */}
        {recentFieldUpdates.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D3557] mb-2">
              Bitácora de Lecturas Sincronizadas desde Terreno ({recentFieldUpdates.length})
            </h3>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {recentFieldUpdates.map((u, i) => (
                <div
                  key={`${u.codigo}-${u.timestamp}-${i}`}
                  className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200"
                >
                  <span className="font-mono font-bold text-[#1D3557]">
                    Local {u.codigo} · {u.servicio}
                  </span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    Lectura: {u.lecturaActual.toLocaleString("es-CO")}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {u.observacion} ({u.timestamp})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
