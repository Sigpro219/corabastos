"use client";

import React, { useState, useMemo } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { ComputedLocalLiquidation } from "@/lib/liquidation-engine";
import { buildSabanaCsvContent } from "@/lib/accounting-export";
import { formatCop, formatDec, formatInt } from "@/lib/formatters";
import { LocalAccountModal } from "@/components/LocalAccountModal";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Receipt,
  Zap,
  Droplets,
} from "lucide-react";

export function LiquidationMatrixView() {
  const { locales, bodegasList, receipts } = useCorabastos();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBodega, setSelectedBodega] = useState<string>("ALL");
  const [selectedModality, setSelectedModality] = useState<string>("ALL");
  const [selectedWasteCat, setSelectedWasteCat] = useState<string>("ALL");
  const [activeSegmentPill, setActiveSegmentPill] = useState<"ALL" | "CONTADOR" | "COMUNAL" | "ALERTAS">("ALL");
  const [page, setPage] = useState<number>(1);
  const [inspectedLocal, setInspectedLocal] = useState<ComputedLocalLiquidation | null>(null);

  const pageSize = 50;

  // Superbuscador Omnibox Universal Multi-Criterio (AND espaciado, #ID, @tag)
  const filtered = useMemo(() => {
    const rawQ = searchQuery.trim().toLowerCase();
    const terms = rawQ.split(/\s+/).filter(Boolean);

    return locales.filter((loc) => {
      // 1. Omnibox search
      if (terms.length > 0) {
        const searchableText = `${loc.codigo} ${loc.bodegaId} ${loc.tipoBodega} ${loc.modalidadGeneral} ${loc.categoriaResiduos} ${loc.energiaEstado} ${loc.aguaEstado} ${loc.planos.energia} ${loc.planos.agua}`.toLowerCase();

        const matchesAll = terms.every((term) => {
          if (term.startsWith("#")) {
            const cleanId = term.slice(1);
            return loc.codigo.toLowerCase().includes(cleanId);
          }
          if (term.startsWith("@")) {
            const tag = term.slice(1);
            if (tag === "alerta" || tag === "revisar") {
              return loc.energiaEstado === "REVISAR" || loc.aguaEstado === "REVISAR";
            }
            if (tag === "ok" || tag === "normal") {
              return loc.energiaEstado === "OK" && loc.aguaEstado === "OK";
            }
            return (
              loc.modalidadGeneral.toLowerCase().includes(tag) ||
              loc.categoriaResiduos.toLowerCase().includes(tag)
            );
          }
          return searchableText.includes(term);
        });

        if (!matchesAll) return false;
      }

      // 2. Píldoras de Segmentación Telemétrica
      if (activeSegmentPill === "CONTADOR" && loc.modalidadEnergia !== "CONTADOR" && loc.modalidadAcueducto !== "CONTADOR") {
        return false;
      }
      if (activeSegmentPill === "COMUNAL" && loc.modalidadEnergia === "CONTADOR" && loc.modalidadAcueducto === "CONTADOR") {
        return false;
      }
      if (activeSegmentPill === "ALERTAS" && loc.energiaEstado !== "REVISAR" && loc.aguaEstado !== "REVISAR") {
        return false;
      }

      // 3. Dropdowns
      if (selectedBodega !== "ALL" && loc.bodegaId !== selectedBodega) return false;
      if (selectedModality !== "ALL" && loc.modalidadGeneral !== selectedModality) return false;
      if (selectedWasteCat !== "ALL" && loc.categoriaResiduos !== selectedWasteCat) return false;

      return true;
    });
  }, [locales, searchQuery, activeSegmentPill, selectedBodega, selectedModality, selectedWasteCat]);

  // Telemetría en tiempo real
  const totalLocalesCount = locales.length;
  const filteredLocalesCount = filtered.length;
  const countContador = useMemo(
    () => locales.filter((l) => l.modalidadEnergia === "CONTADOR" || l.modalidadAcueducto === "CONTADOR").length,
    [locales]
  );
  const countComunal = totalLocalesCount - countContador;
  const countAlerts = useMemo(
    () => locales.filter((l) => l.energiaEstado === "REVISAR" || l.aguaEstado === "REVISAR").length,
    [locales]
  );

  const totals = useMemo(() => {
    let area = 0;
    let energia = 0;
    let acueducto = 0;
    let aseo = 0;
    let residuos = 0;
    let vigilancia = 0;
    let policia = 0;
    let granTotal = 0;

    for (const l of filtered) {
      area += l.areaM2;
      energia += l.calcEnergiaCop;
      acueducto += l.calcAcueductoCop;
      aseo += l.calcAseoCop;
      residuos += l.calcResiduosCop;
      vigilancia += l.calcVigilanciaCop;
      policia += l.calcPoliciaCop;
      granTotal += l.calcTotalCop;
    }
    return { area, energia, acueducto, aseo, residuos, vigilancia, policia, granTotal };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCsv = () => {
    const csvContent = buildSabanaCsvContent(filtered);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SABANA_LIQUIDACION_CORABASTOS_${receipts.periodo}_${filtered.length}_LOCALES.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* TARJETAS DE CONCILIACIÓN V/FINANZAS VS V/LIQUIDADO */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-amber-700 block">
            Energía (PL007/PL086)
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-[#1D3557] mt-0.5 block">
            ${totals.energia.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {totals.energia > 0 ? "Codensa Liquidado" : "$0"}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-sky-700 block">
            Acueducto (PL008/PL009)
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-[#1D3557] mt-0.5 block">
            ${totals.acueducto.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Acueducto Bogotá
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-rose-700 block">
            Residuos (PL109/PL253)
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-[#1D3557] mt-0.5 block">
            ${totals.residuos.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            ECSA (NP/MP/P)
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-teal-700 block">
            Aseo (PL003)
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-[#1D3557] mt-0.5 block">
            ${totals.aseo.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            $1.631/m² Área
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">
            Vigilancia (PL004)
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-[#1D3557] mt-0.5 block">
            ${totals.vigilancia.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            $13.785/m² Área
          </span>
        </div>

        <div className="bg-[#1D3557] text-white rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-sky-200 block">
            Gran Total 6 Servicios ({filtered.length})
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-emerald-400 mt-0.5 block">
            ${totals.granTotal.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-amber-300 font-mono" title="En el Excel original col R se suma dos veces Acueducto (+$239,47M)">
            Auditado (Sin dup. Acue +$239,4M)
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CAPA 1 Y 2: PROTOCOLO STICKY DOCKED DE 3 NIVELES (SWISS INDUSTRIAL UI)  */}
      {/* Anclado con tolerancia cero justo debajo del header de 56px (top-14)    */}
      {/* ========================================================================= */}
      <div className="sticky top-14 z-30 bg-[#F8F9FA]/95 backdrop-blur-md pt-2 pb-2 space-y-2 -mx-4 lg:-mx-8 px-4 lg:px-8 border-b border-slate-200/90 shadow-2xs">
        {/* LÍNEA 1: PÍLDORAS DE SEGMENTACIÓN CON TELEMETRÍA DINÁMICA */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-0.5 rounded-xl text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setActiveSegmentPill("ALL");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeSegmentPill === "ALL"
                  ? "bg-white text-[#1D3557] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({filteredLocalesCount !== totalLocalesCount ? `${formatInt(filteredLocalesCount)}/${formatInt(totalLocalesCount)}` : formatInt(totalLocalesCount)})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSegmentPill("CONTADOR");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSegmentPill === "CONTADOR"
                  ? "bg-amber-500 text-slate-950 shadow-xs font-extrabold"
                  : "text-amber-800 hover:bg-amber-500/10"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Con Contador ({countContador.toLocaleString("es-CO")})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSegmentPill("COMUNAL");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSegmentPill === "COMUNAL"
                  ? "bg-[#1D3557] text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-300/60"
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>Comunal / Prorrateo ({countComunal.toLocaleString("es-CO")})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSegmentPill("ALERTAS");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSegmentPill === "ALERTAS"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-rose-700 hover:bg-rose-500/10"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Novedades / Alertas ({countAlerts})</span>
            </button>
          </div>

          {/* TELEMETRÍA DE FILTRADO Y PAGINACIÓN COMPACTA EN TOOLBAR */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium hidden sm:inline">
              Página <strong className="font-mono text-[#1D3557]">{currentPage}</strong> de{" "}
              <strong className="font-mono text-[#1D3557]">{totalPages}</strong> ({filteredLocalesCount} locales)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Página Siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* LÍNEA 2: SUPERBUSCADOR OMNIBOX UNIVERSAL + DROPDOWNS + BOTÓN SOLO-ÍCONO EXCEL */}
        <div className="bg-white/95 p-1.5 px-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-2.5">
          {/* SUPERBUSCADOR OMNIBOX */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Superbuscador universal: código (010001, #840003), bodega, tipo, modalidad, @alerta, @ok..."
              className="w-full pl-9 pr-8 py-1.5 text-xs border rounded-lg outline-none bg-slate-50 border-slate-200 text-[#1D3557] focus:border-[#1D3557] focus:bg-white transition-all placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* TOOLBAR COMPACTA: FILTROS DROPDOWN & BOTÓN SOLO-ÍCONO */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
            {/* Bodega Dropdown */}
            <select
              value={selectedBodega}
              onChange={(e) => {
                setSelectedBodega(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1D3557] outline-none"
            >
              <option value="ALL">Todas las Bodegas ({bodegasList.length})</option>
              {bodegasList.map((b) => (
                <option key={b} value={b}>
                  Bodega {b}
                </option>
              ))}
            </select>

            {/* Modalidad Dropdown */}
            <select
              value={selectedModality}
              onChange={(e) => {
                setSelectedModality(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1D3557] outline-none hidden sm:block"
            >
              <option value="ALL">Modalidades: Todas</option>
              <option value="CONTADOR">CONTADOR (Individual)</option>
              <option value="COMUNAL">COMUNAL (Macromedidor)</option>
              <option value="PRORRATEO">PRORRATEO (Por m²)</option>
              <option value="RED FRIOS">RED DE FRÍOS</option>
            </select>

            {/* Residuos Dropdown */}
            <select
              value={selectedWasteCat}
              onChange={(e) => {
                setSelectedWasteCat(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1D3557] outline-none hidden md:block"
            >
              <option value="ALL">Residuos: Todos</option>
              <option value="NP">NP — No Productor (0.4)</option>
              <option value="MP">MP — Mediano Productor (1.2)</option>
              <option value="P">P — Gran Productor (Saldo)</option>
              <option value="BASICOS">BÁSICOS</option>
            </select>

            {/* BOTÓN SOLO-ÍCONO EXPORTAR EXCEL (ESMERALDA SUISSO PRECISION) */}
            <button
              type="button"
              onClick={handleExportCsv}
              title="Descargar Sábana Oficial a Excel (.csv UTF-8 con Planos ERP)"
              aria-label="Descargar a Excel"
              className="p-2 bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-lg transition-all flex items-center justify-center shadow-2xs cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CAPA 3: TABLA DE ALTA DENSIDAD CON SCROLL NATURAL Y THEAD STICKY SÓLIDO  */}
      {/* Zero clipping box (overflow: visible), thead th sticky con fondo 100%    */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-visible">
        <table className="w-full text-left border-separate border-spacing-0 text-xs">
          <thead className="sticky top-[148px] z-20">
            <tr className="bg-[#010F22] text-white font-mono uppercase text-[10px] tracking-wider shadow-xs">
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 first:rounded-tl-2xl bg-[#010F22]">
                Bod
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 bg-[#010F22]">
                Código Local
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 bg-[#010F22]">
                Modalidad
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-center bg-[#010F22]">
                Res.
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-right bg-[#010F22]">
                Área m²
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-right bg-[#010F22]">
                Energía ($)
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-right bg-[#010F22]">
                Acueducto ($)
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-right bg-[#010F22]">
                Aseo ($)
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-right bg-[#010F22]">
                Residuos ($)
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-right bg-[#010F22]">
                Vigilancia ($)
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-right bg-[#010F22]">
                Policía ($)
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-right bg-[#1D3557] text-emerald-300">
                Total Mes ($)
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-center bg-[#010F22]">
                Estado
              </th>
              <th className="sticky top-[148px] z-20 py-2.5 px-3 font-semibold border-b border-white/10 text-center last:rounded-tr-2xl bg-[#010F22]">
                Ficha PDF
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageItems.map((loc) => {
              const hasAlert = loc.energiaEstado === "REVISAR" || loc.aguaEstado === "REVISAR";
              return (
                <tr
                  key={loc.codigo}
                  onClick={() => setInspectedLocal(loc)}
                  className="hover:bg-sky-50/70 transition-colors cursor-pointer group"
                >
                  <td className="py-2 px-3 font-mono text-slate-500 font-semibold border-b border-slate-100">
                    {loc.bodegaId}
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-[#1D3557] border-b border-slate-100">
                    {loc.codigo}
                    <span className="block text-[10px] font-sans font-normal text-slate-400 truncate max-w-[130px]">
                      {loc.tipoBodega}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-b border-slate-100">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                      {loc.modalidadGeneral}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center border-b border-slate-100">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        loc.categoriaResiduos === "P"
                          ? "bg-red-100 text-red-800"
                          : loc.categoriaResiduos === "MP"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {loc.categoriaResiduos}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-right font-semibold text-slate-700 border-b border-slate-100 tabular-nums">
                    {formatDec(loc.areaM2, 2)}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-800 border-b border-slate-100 tabular-nums">
                    {formatCop(loc.calcEnergiaCop)}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-800 border-b border-slate-100 tabular-nums">
                    {formatCop(loc.calcAcueductoCop)}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-700 border-b border-slate-100 tabular-nums">
                    {formatCop(loc.calcAseoCop)}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-800 font-medium border-b border-slate-100 tabular-nums">
                    {formatCop(loc.calcResiduosCop)}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-800 border-b border-slate-100 tabular-nums">
                    {formatCop(loc.calcVigilanciaCop)}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-600 border-b border-slate-100 tabular-nums">
                    {formatCop(loc.calcPoliciaCop)}
                  </td>
                  <td className="py-2 px-3 font-mono text-right font-bold text-[#1D3557] bg-slate-50/80 group-hover:bg-sky-100/70 border-b border-slate-100 tabular-nums">
                    {formatCop(loc.calcTotalCop)}
                  </td>
                  <td className="py-2 px-3 text-center border-b border-slate-100">
                    {hasAlert ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        REVISAR
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center border-b border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedLocal(loc);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1D3557] text-white text-[10px] font-semibold hover:bg-[#010F22] cursor-pointer shadow-2xs"
                    >
                      <Receipt className="w-3 h-3" />
                      Ficha
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* FOOTER DE TABLA: RESUMEN DE PÁGINA & PAGINADOR */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 rounded-b-2xl">
          <div>
            Mostrando{" "}
            <strong className="font-mono text-[#1D3557]">
              {formatInt((currentPage - 1) * pageSize + 1)}–{formatInt(Math.min(currentPage * pageSize, filtered.length))}
            </strong>{" "}
            de <strong className="font-mono text-[#1D3557]">{formatInt(filtered.length)}</strong> locales comerciales
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-semibold text-[#1D3557]">
              Página {formatInt(currentPage)} / {formatInt(totalPages)}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* EXPEDIENTE MODAL: CUENTA INDIVIDUAL 360° Y RENDICIÓN DE CUENTAS POR LOCAL */}
      <LocalAccountModal
        local={inspectedLocal}
        onClose={() => setInspectedLocal(null)}
      />
    </div>
  );
}
