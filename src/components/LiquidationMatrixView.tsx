"use client";

import React, { useMemo, useState } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { isRedFriosModality } from "@/contracts/domain-contracts";
import { ComputedLocalLiquidation, hasLocalServiceAlert } from "@/lib/liquidation-engine";
import { buildSabanaCsvContent } from "@/lib/accounting-export";
import { formatCop, formatDec, formatInt } from "@/lib/formatters";
import { SabanaSummaryCards } from "@/components/SabanaSummaryCards";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  FileSpreadsheet,
  Receipt,
  Search,
  X,
  Zap,
} from "lucide-react";

interface LiquidationMatrixViewProps {
  onSelectLocalCode: (codigo: string) => void;
}

function normalizePhonetic(val: string): string {
  return val
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ce/g, "se")
    .replace(/ci/g, "si")
    .replace(/z/g, "s");
}

function matchesModalitySelection(
  loc: ComputedLocalLiquidation,
  selectedModality: string
): boolean {
  if (selectedModality === "ALL") return true;
  if (selectedModality === "RED_FRIOS") {
    return (
      isRedFriosModality(loc.modalidadEnergia) ||
      isRedFriosModality(loc.modalidadAcueducto) ||
      isRedFriosModality(loc.modalidadGeneral)
    );
  }
  if (selectedModality === "BODEGA_POPULAR") {
    return (
      loc.bloqueEnergia === "BODEGA_POPULAR" ||
      loc.modalidadGeneral.toUpperCase().startsWith("BP ")
    );
  }
  return (
    loc.modalidadEnergia === selectedModality ||
    loc.modalidadAcueducto === selectedModality ||
    loc.modalidadGeneral === selectedModality
  );
}

export function matchesSabanaSegmentPill(
  loc: Pick<ComputedLocalLiquidation, "modalidadEnergia" | "modalidadAcueducto" | "energiaEstado" | "aguaEstado">,
  pill: "ALL" | "CONTADOR" | "COMUNAL" | "ALERTAS"
): boolean {
  if (pill === "ALL") return true;
  if (pill === "CONTADOR") {
    return loc.modalidadEnergia === "CONTADOR" || loc.modalidadAcueducto === "CONTADOR";
  }
  if (pill === "COMUNAL") {
    return !(loc.modalidadEnergia === "CONTADOR" || loc.modalidadAcueducto === "CONTADOR");
  }
  return hasLocalServiceAlert(loc);
}

export function LiquidationMatrixView({ onSelectLocalCode }: LiquidationMatrixViewProps) {
  const { locales, bodegasList, receipts, liveBagsSummary } = useCorabastos();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBodega, setSelectedBodega] = useState<string>("ALL");
  const [selectedModality, setSelectedModality] = useState<string>("ALL");
  const [selectedWasteCat, setSelectedWasteCat] = useState<string>("ALL");
  const [activeSegmentPill, setActiveSegmentPill] = useState<
    "ALL" | "CONTADOR" | "COMUNAL" | "ALERTAS"
  >("ALL");
  const [page, setPage] = useState<number>(1);

  const pageSize = 50;

  const filtered = useMemo(() => {
    const rawQ = searchQuery.trim();
    const terms = rawQ
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.toLowerCase());

    return locales.filter((loc) => {
      if (terms.length > 0) {
        const rawTarget = `${loc.codigo} bod${loc.bodegaId} ${loc.bodegaId} ${loc.tipoBodega} ${loc.bloqueEnergia} ${loc.modalidadGeneral} ${loc.modalidadEnergia} ${loc.modalidadAcueducto} ${loc.categoriaResiduos} ${loc.energiaObs} ${loc.aguaObs} ${loc.energiaEstado} ${loc.aguaEstado} ${loc.effectiveOccupancy} ${loc.planos.energia} ${loc.planos.agua}`;
        const normTarget = normalizePhonetic(rawTarget);

        const matchesAll = terms.every((term) => {
          if (term.startsWith("#")) {
            return loc.codigo.toLowerCase().includes(term.slice(1));
          }
          if (term.startsWith("@")) {
            const tag = term.slice(1);
            if (tag === "alerta" || tag === "revisar") {
              return hasLocalServiceAlert(loc);
            }
            if (tag === "ok" || tag === "normal") {
              return !hasLocalServiceAlert(loc);
            }
            if (tag === "vacio" || tag === "corp") {
              return loc.effectiveOccupancy !== "ACTIVO";
            }
            return normTarget.includes(normalizePhonetic(tag));
          }
          return normTarget.includes(normalizePhonetic(term));
        });

        if (!matchesAll) return false;
      }

      if (!matchesSabanaSegmentPill(loc, activeSegmentPill)) return false;

      if (selectedBodega !== "ALL" && loc.bodegaId !== selectedBodega) return false;
      if (!matchesModalitySelection(loc, selectedModality)) return false;
      if (selectedWasteCat !== "ALL" && loc.categoriaResiduos !== selectedWasteCat) return false;

      return true;
    });
  }, [
    locales,
    searchQuery,
    activeSegmentPill,
    selectedBodega,
    selectedModality,
    selectedWasteCat,
  ]);

  const totalLocalesCount = locales.length;
  const filteredLocalesCount = filtered.length;
  const countContador = useMemo(
    () =>
      locales.filter(
        (l) => l.modalidadEnergia === "CONTADOR" || l.modalidadAcueducto === "CONTADOR"
      ).length,
    [locales]
  );
  const countComunal = totalLocalesCount - countContador;
  const countAlerts = useMemo(
    () => locales.filter(hasLocalServiceAlert).length,
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
    let asumidoCorp = 0;

    for (const l of filtered) {
      if (l.effectiveOccupancy === "VACIO_SIN_CONTRATO_CORPORACION") {
        asumidoCorp += l.calcAssumedCorporationCop;
      } else {
        energia += l.calcEnergiaCop;
        acueducto += l.calcAcueductoCop;
        aseo += l.calcAseoCop;
        residuos += l.calcResiduosCop;
        vigilancia += l.calcVigilanciaCop;
        policia += l.calcPoliciaCop;
        granTotal += l.calcTotalCop;
      }
      area += l.areaM2;
    }
    return { area, energia, acueducto, aseo, residuos, vigilancia, policia, granTotal, asumidoCorp };
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
    <div className="space-y-3">
      <SabanaSummaryCards filteredCount={filtered.length} receipts={receipts} liveBagsSummary={liveBagsSummary} totals={totals} />

      {/* BARRA STICKY DE 2 FILAS (ALTURA EXACTA 92PX EN DESKTOP: 56 + 92 = 148PX) */}
      <div className="lg:sticky lg:top-14 z-30 bg-[var(--background)] lg:h-[92px] py-1.5 border-b border-[var(--outline-color)] flex flex-col justify-between gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 bg-[var(--surface-alt)] p-0.5 rounded-xl border border-[var(--outline-color)] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => {
                setActiveSegmentPill("ALL");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeSegmentPill === "ALL"
                  ? "bg-[var(--surface)] text-[var(--text-main)] shadow-2xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Todos (
              {filteredLocalesCount !== totalLocalesCount
                ? `${formatInt(filteredLocalesCount)}/${formatInt(totalLocalesCount)}`
                : formatInt(totalLocalesCount)}
              )
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSegmentPill("CONTADOR");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeSegmentPill === "CONTADOR"
                  ? "bg-amber-500 text-slate-950 shadow-2xs"
                  : "text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
              }`}
            >
              <Zap className="w-3 h-3" strokeWidth={1.75} />
              <span>Contador ({formatInt(countContador)})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSegmentPill("COMUNAL");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeSegmentPill === "COMUNAL"
                  ? "bg-[#1E3A5F] text-white shadow-2xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <Droplets className="w-3 h-3 text-sky-500" strokeWidth={1.75} />
              <span>Comunal / Prorrateo ({formatInt(countComunal)})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSegmentPill("ALERTAS");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeSegmentPill === "ALERTAS"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
              <span>Alertas ({formatInt(countAlerts)})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium hidden md:inline">
              Página <strong className="font-mono text-[var(--text-main)]">{formatInt(currentPage)}</strong> de{" "}
              <strong className="font-mono text-[var(--text-main)]">{formatInt(totalPages)}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-[var(--outline-color)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-alt)] disabled:opacity-30 cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-lg border border-[var(--outline-color)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-alt)] disabled:opacity-30 cursor-pointer"
                title="Página Siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] px-2.5 py-1 rounded-xl border border-[var(--outline-color)] flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="relative flex-1 w-full">
            <Search
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Superbuscador: código (010001, #810077), bodega, modalidad, @alerta, @vacio..."
              className="w-full h-7 pl-8 pr-7 text-xs border rounded-lg outline-none bg-[var(--surface-alt)] border-[var(--outline-color)] text-[var(--text-main)] focus:border-[#f7931b] transition-all placeholder:text-[var(--text-muted)] font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto justify-end shrink-0">
            <select
              value={selectedBodega}
              onChange={(e) => {
                setSelectedBodega(e.target.value);
                setPage(1);
              }}
              className="h-7 bg-[var(--surface-alt)] border border-[var(--outline-color)] rounded-lg px-2 text-xs font-semibold text-[var(--text-main)] outline-none"
            >
              <option value="ALL">Bodegas ({formatInt(bodegasList.length)})</option>
              {bodegasList.map((b) => (
                <option key={b} value={b}>
                  Bodega {b}
                </option>
              ))}
            </select>

            <select
              value={selectedModality}
              onChange={(e) => {
                setSelectedModality(e.target.value);
                setPage(1);
              }}
              className="h-7 bg-[var(--surface-alt)] border border-[var(--outline-color)] rounded-lg px-2 text-xs font-semibold text-[var(--text-main)] outline-none hidden sm:block"
            >
              <option value="ALL">Modalidades: Todas</option>
              <option value="CONTADOR">CONTADOR (Principal + BP)</option>
              <option value="COMUNAL">COMUNAL (Macromedidor)</option>
              <option value="PRORRATEO">PRORRATEO (Principal + BP)</option>
              <option value="RED_FRIOS">RED DE FRÍOS (Bod. 55 / 98)</option>
              <option value="BODEGA_POPULAR">BLOQUE BODEGA POPULAR</option>
            </select>

            <select
              value={selectedWasteCat}
              onChange={(e) => {
                setSelectedWasteCat(e.target.value);
                setPage(1);
              }}
              className="h-7 bg-[var(--surface-alt)] border border-[var(--outline-color)] rounded-lg px-2 text-xs font-semibold text-[var(--text-main)] outline-none hidden lg:block"
            >
              <option value="ALL">Residuos: Todos</option>
              <option value="NP">NP — No Productor (0,4)</option>
              <option value="MP">MP — Mediano Prod. (1,2)</option>
              <option value="P">P — Gran Productor</option>
              <option value="BASICOS">BÁSICOS</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              title="Exportar Sábana Contable CSV (UTF-8 con Planos ERP)"
              aria-label="Exportar CSV"
              className="h-7 px-2.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-lg transition-all inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden xl:inline">CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLA STICKY DOCKED SIN DESBORDE HORIZONTAL EN DESKTOP */}
      <div className="bg-[var(--surface)] border border-[var(--outline-color)] rounded-2xl shadow-xs max-lg:overflow-x-auto lg:overflow-visible">
        <table
          style={{ borderCollapse: "separate", borderSpacing: 0 }}
          className="w-full text-left text-[11.5px]"
        >
          <thead>
            <tr className="text-white font-mono uppercase text-[10px] tracking-wider">
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 first:rounded-tl-2xl bg-[#0B132B]">Bod</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 bg-[#0B132B]">Local</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 bg-[#0B132B]">Modalidad E / A</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-1.5 font-semibold border-b border-white/10 text-center bg-[#0B132B]">Res.</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-right bg-[#0B132B]">Área m²</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-right bg-[#0B132B]">Energía</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-right bg-[#0B132B]">Acueducto</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-right bg-[#0B132B]">Aseo</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-right bg-[#0B132B]">Residuos</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-right bg-[#0B132B]">Vigilancia</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-right bg-[#0B132B]">Policía</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-right bg-[#1E3A5F] text-emerald-300">Total Mes</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-center bg-[#0B132B]">Estado</th>
              <th className="lg:sticky lg:top-[148px] z-20 py-2.5 px-2 font-semibold border-b border-white/10 text-center last:rounded-tr-2xl bg-[#0B132B]">360°</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((loc) => {
              const hasAlert = hasLocalServiceAlert(loc);
              const isCorp = loc.effectiveOccupancy === "VACIO_SIN_CONTRATO_CORPORACION";
              const isVacCon = loc.effectiveOccupancy === "VACIO_CON_CONTRATO";
              return (
                <tr
                  key={loc.codigo}
                  onClick={() => onSelectLocalCode(loc.codigo)}
                  className="hover:bg-sky-500/10 transition-colors cursor-pointer group"
                >
                  <td className="py-2 px-2 font-mono text-[var(--text-muted)] font-semibold border-b border-[var(--outline-color)]">
                    {loc.bodegaId}
                  </td>
                  <td className="py-2 px-2 font-mono font-bold text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {loc.codigo}
                    <span className="block text-[9.5px] font-sans font-normal text-[var(--text-muted)] truncate max-w-[115px]">
                      {loc.tipoBodega}
                    </span>
                  </td>
                  <td className="py-2 px-2 border-b border-[var(--outline-color)]">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--text-main)] font-mono text-[9.5px] font-semibold block w-fit">
                      E:{loc.modalidadEnergia} · A:{loc.modalidadAcueducto}
                    </span>
                  </td>
                  <td className="py-2 px-1.5 text-center border-b border-[var(--outline-color)]">
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                        loc.categoriaResiduos === "P"
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          : loc.categoriaResiduos === "MP"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {loc.categoriaResiduos}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-mono text-right font-semibold text-[var(--text-main)] border-b border-[var(--outline-color)] tabular-nums">
                    {formatDec(loc.areaM2, 2)}
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-[var(--text-main)] border-b border-[var(--outline-color)] tabular-nums">
                    {formatCop(loc.calcEnergiaCop)}
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-[var(--text-main)] border-b border-[var(--outline-color)] tabular-nums">
                    {formatCop(loc.calcAcueductoCop)}
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-[var(--text-muted)] border-b border-[var(--outline-color)] tabular-nums">
                    {formatCop(loc.calcAseoCop)}
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-[var(--text-main)] border-b border-[var(--outline-color)] tabular-nums">
                    {formatCop(loc.calcResiduosCop)}
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-[var(--text-main)] border-b border-[var(--outline-color)] tabular-nums">
                    {formatCop(loc.calcVigilanciaCop)}
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-[var(--text-muted)] border-b border-[var(--outline-color)] tabular-nums">
                    {formatCop(loc.calcPoliciaCop)}
                  </td>
                  <td className="py-2 px-2 font-mono text-right font-bold text-[var(--text-main)] bg-[var(--surface-alt)] group-hover:bg-sky-500/15 border-b border-[var(--outline-color)] tabular-nums">
                    {formatCop(loc.calcTotalCop)}
                    {isCorp && (
                      <span className="block text-[9px] text-sky-600 dark:text-sky-400">
                        Corp: {formatCop(loc.calcAssumedCorporationCop)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center border-b border-[var(--outline-color)]">
                    {isCorp ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[9.5px] font-bold">
                        CORP
                      </span>
                    ) : isVacCon ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[9.5px] font-bold">
                        VACÍO
                      </span>
                    ) : hasAlert ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[9.5px] font-semibold">
                        <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                        REV
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9.5px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                        OK
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center border-b border-[var(--outline-color)]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLocalCode(loc.codigo);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1E3A5F] text-white text-[10px] font-semibold hover:bg-[#0B132B] cursor-pointer"
                    >
                      <Receipt className="w-3 h-3" strokeWidth={1.75} />
                      Ficha
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="px-4 py-3 bg-[var(--surface-alt)] border-t border-[var(--outline-color)] flex flex-wrap items-center justify-between text-xs text-[var(--text-muted)] rounded-b-2xl">
          <div>
            Mostrando{" "}
            <strong className="font-mono text-[var(--text-main)]">
              {filtered.length === 0 ? "0" : formatInt((currentPage - 1) * pageSize + 1)}–
              {formatInt(Math.min(currentPage * pageSize, filtered.length))}
            </strong>{" "}
            de <strong className="font-mono text-[var(--text-main)]">{formatInt(filtered.length)}</strong>{" "}
            locales comerciales
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[var(--outline-color)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-alt)] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <span className="font-mono font-semibold text-[var(--text-main)]">
              Página {formatInt(currentPage)} / {formatInt(totalPages)}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[var(--outline-color)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-alt)] disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
