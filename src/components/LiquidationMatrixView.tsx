"use client";

import React, { useState, useMemo } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { ComputedLocalLiquidation } from "@/lib/liquidation-engine";
import {
  Search,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Building,
  Receipt,
} from "lucide-react";

export function LiquidationMatrixView() {
  const { locales, bodegasList, receipts } = useCorabastos();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBodega, setSelectedBodega] = useState<string>("ALL");
  const [selectedModality, setSelectedModality] = useState<string>("ALL");
  const [selectedWasteCat, setSelectedWasteCat] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [inspectedLocal, setInspectedLocal] = useState<ComputedLocalLiquidation | null>(null);

  const pageSize = 50;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return locales.filter((loc) => {
      if (q && !loc.codigo.toLowerCase().includes(q) && !loc.tipoBodega.toLowerCase().includes(q)) {
        return false;
      }
      if (selectedBodega !== "ALL" && loc.bodegaId !== selectedBodega) return false;
      if (selectedModality !== "ALL" && loc.modalidadGeneral !== selectedModality) return false;
      if (selectedWasteCat !== "ALL" && loc.categoriaResiduos !== selectedWasteCat) return false;
      return true;
    });
  }, [locales, searchQuery, selectedBodega, selectedModality, selectedWasteCat]);

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
    const headers = [
      "BODEGA",
      "CODIGO_LOCAL",
      "TIPO_BODEGA",
      "MODALIDAD",
      "RESIDUOS_CAT",
      "AREA_M2",
      "ENERGIA_COP",
      "ACUEDUCTO_COP",
      "ASEO_COP",
      "RESIDUOS_ECSA_COP",
      "VIGILANCIA_COP",
      "POLICIA_COP",
      "TOTAL_LIQUIDADO_COP",
      "PLANO_ECSA",
      "PLANO_AGUA",
      "PLANO_ENERGIA",
      "PLANO_VIGILANCIA",
    ];
    const rows = filtered.map((l) =>
      [
        l.bodegaId,
        l.codigo,
        `"${l.tipoBodega}"`,
        l.modalidadGeneral,
        l.categoriaResiduos,
        l.areaM2.toFixed(2),
        l.calcEnergiaCop,
        l.calcAcueductoCop,
        l.calcAseoCop,
        l.calcResiduosCop,
        l.calcVigilanciaCop,
        l.calcPoliciaCop,
        l.calcTotalCop,
        l.planos.ecsa,
        l.planos.agua,
        l.planos.energia,
        l.planos.vigilancia,
      ].join(",")
    );
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SABANA_LIQUIDACION_CORABASTOS_${receipts.periodo}_${filtered.length}_LOCALES.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* TARJETAS DE CONCILIACIÓN V/FINANZAS VS V/LIQUIDADO */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-amber-700 block">
            Energía (Principal + BP)
          </span>
          <span className="text-base font-mono font-bold text-[#1D3557] mt-1 block">
            ${totals.energia.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Plano: PL007 / PL086
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-sky-700 block">
            Acueducto y Alcant.
          </span>
          <span className="text-base font-mono font-bold text-[#1D3557] mt-1 block">
            ${totals.acueducto.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Plano: PL008 / PL009
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-red-700 block">
            Residuos ECSA (NP/MP/P)
          </span>
          <span className="text-base font-mono font-bold text-[#1D3557] mt-1 block">
            ${totals.residuos.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Plano: PL109 / PL253
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-teal-700 block">
            Aseo Comerciantes
          </span>
          <span className="text-base font-mono font-bold text-[#1D3557] mt-1 block">
            ${totals.aseo.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Plano: PL003 ($1.631/m²)
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">
            Vigilancia Privada
          </span>
          <span className="text-base font-mono font-bold text-[#1D3557] mt-1 block">
            ${totals.vigilancia.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Plano: PL004 ($13.785/m²)
          </span>
        </div>

        <div className="bg-[#1D3557] text-white rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-sky-200 block">
            Gran Total Liquidado ({filtered.length})
          </span>
          <span className="text-base font-mono font-bold text-white mt-1 block">
            ${totals.granTotal.toLocaleString("es-CO")}
          </span>
          <span className="text-[10px] text-slate-300 font-mono">
            Área: {totals.area.toLocaleString("es-CO", { maximumFractionDigits: 1 })} m²
          </span>
        </div>
      </div>

      {/* BARRA STICKY OMNIBOX Y PÍLDORAS DE FILTRO */}
      <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar entre los 5.318 locales por código (ej: 010001, 030002, 840003) o tipo de bodega..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-[#1D3557] rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-[#1D3557] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBodega}
              onChange={(e) => {
                setSelectedBodega(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-[#1D3557]"
            >
              <option value="ALL">Todas las Bodegas ({bodegasList.length})</option>
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
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-[#1D3557]"
            >
              <option value="ALL">Todas las Modalidades</option>
              <option value="CONTADOR">CONTADOR (Medidor Individual)</option>
              <option value="COMUNAL">COMUNAL (Macromedidor Bodega)</option>
              <option value="PRORRATEO">PRORRATEO (Por Área m²)</option>
              <option value="RED FRIOS">RED DE FRÍOS</option>
            </select>

            <select
              value={selectedWasteCat}
              onChange={(e) => {
                setSelectedWasteCat(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-[#1D3557]"
            >
              <option value="ALL">Residuos: Todos (NP/MP/P)</option>
              <option value="NP">NP — No Productor (Factor 0.4)</option>
              <option value="MP">MP — Mediano Productor (Factor 1.2)</option>
              <option value="P">P — Gran Productor Perecederos (Saldo)</option>
              <option value="BASICOS">BÁSICOS</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Sábana CSV / Excel
            </button>
          </div>
        </div>
      </div>

      {/* TABLA MAESTRA DE ALTA DENSIDAD (HOMOLOGADA CON 'RESUMEN TOTAL') */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-[#1D3557] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Bod</th>
                <th className="py-3 px-3">Código Local</th>
                <th className="py-3 px-3">Modalidad</th>
                <th className="py-3 px-3 text-center">Res.</th>
                <th className="py-3 px-3 text-right">Área m²</th>
                <th className="py-3 px-3 text-right">Energía ($)</th>
                <th className="py-3 px-3 text-right">Acueducto ($)</th>
                <th className="py-3 px-3 text-right">Aseo ($)</th>
                <th className="py-3 px-3 text-right">Residuos ECSA ($)</th>
                <th className="py-3 px-3 text-right">Vigilancia ($)</th>
                <th className="py-3 px-3 text-right">Policía ($)</th>
                <th className="py-3 px-3 text-right bg-[#010F22]">Total Mes ($)</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Ficha PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((loc) => {
                const hasAlert = loc.energiaEstado === "REVISAR" || loc.aguaEstado === "REVISAR";
                return (
                  <tr
                    key={loc.codigo}
                    onClick={() => setInspectedLocal(loc)}
                    className="hover:bg-sky-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-2 px-3 font-mono text-slate-500 font-semibold">
                      {loc.bodegaId}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-[#1D3557]">
                      {loc.codigo}
                      <span className="block text-[10px] font-sans font-normal text-slate-400 truncate max-w-[130px]">
                        {loc.tipoBodega}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                        {loc.modalidadGeneral}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
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
                    <td className="py-2 px-3 font-mono text-right font-semibold text-slate-700">
                      {loc.areaM2.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-slate-800">
                      ${loc.calcEnergiaCop.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-slate-800">
                      ${loc.calcAcueductoCop.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-slate-700">
                      ${loc.calcAseoCop.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-slate-800 font-medium">
                      ${loc.calcResiduosCop.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-slate-800">
                      ${loc.calcVigilanciaCop.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-slate-600">
                      ${loc.calcPoliciaCop.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 px-3 font-mono text-right font-bold text-[#1D3557] bg-slate-50">
                      ${loc.calcTotalCop.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 px-3 text-center">
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
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedLocal(loc);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1D3557] text-white text-[10px] font-semibold hover:bg-[#010F22] cursor-pointer"
                      >
                        <Receipt className="w-3 h-3" />
                        Ver Recibo
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación de Sábana */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Mostrando{" "}
            <strong className="font-mono text-[#1D3557]">
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)}
            </strong>{" "}
            de <strong className="font-mono text-[#1D3557]">{filtered.length.toLocaleString("es-CO")}</strong> locales comerciales
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
              Página {currentPage} / {totalPages}
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

      {/* MODAL GOLDEN PRINT: ESTADO DE CUENTA DETALLADO POR LOCAL */}
      {inspectedLocal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden">
            {/* Encabezado Membreteado */}
            <div className="bg-[#010F22] text-white px-6 py-5 flex items-center justify-between border-b-4 border-[#E73A46]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/10">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-sky-300 block">
                    CORPORACIÓN DE ABASTOS DE BOGOTÁ S.A. · CORABASTOS
                  </span>
                  <h3 className="text-lg font-bold">
                    Estado de Cuenta Oficial de Servicios Públicos y Expensas · Local {inspectedLocal.codigo}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E73A46] hover:bg-[#d42f3b] text-white text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir PDF
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedLocal(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Metadatos de Catastro del Local */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Código Local / Bodega</span>
                  <strong className="font-mono text-base text-[#1D3557]">
                    {inspectedLocal.codigo} (Bod. {inspectedLocal.bodegaId})
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Área Comercial</span>
                  <strong className="font-mono text-base text-[#1D3557]">
                    {inspectedLocal.areaM2.toFixed(2)} m²
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Modalidad Medición</span>
                  <strong className="font-mono text-sm text-[#1D3557]">
                    {inspectedLocal.modalidadGeneral}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Clasificación Residuos</span>
                  <strong className="font-mono text-sm text-[#E73A46]">
                    Categoría {inspectedLocal.categoriaResiduos}
                  </strong>
                </div>
              </div>

              {/* Desglose Matemático por Concepto */}
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-[#1D3557] uppercase text-[10px] font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Concepto / Servicio Público</th>
                    <th className="py-2.5 px-3">Plano ERP</th>
                    <th className="py-2.5 px-3">Fórmula / Base de Liquidación Aplicada</th>
                    <th className="py-2.5 px-3 text-right">Valor Liquidado (COP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D3557]">
                      1. Energía Eléctrica ({inspectedLocal.bloqueEnergia})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{inspectedLocal.planos.energia}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {inspectedLocal.modalidadEnergia === "CONTADOR"
                        ? `Lectura: ${inspectedLocal.energiaLecturaAnt} → ${inspectedLocal.energiaLecturaAct} (${inspectedLocal.energiaConsumoIndivKw} kWh) + Alero (${inspectedLocal.energiaConsumoAleroKw.toFixed(1)} kWh) + Alumbrado + 20% CREG`
                        : `Modalidad ${inspectedLocal.modalidadEnergia} sobre ${inspectedLocal.areaM2} m² + Alero (${inspectedLocal.energiaConsumoAleroKw.toFixed(1)} kWh) + Alumbrado + CREG`}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                      ${inspectedLocal.calcEnergiaCop.toLocaleString("es-CO")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D3557]">
                      2. Acueducto y Alcantarillado
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {inspectedLocal.planos.agua} / {inspectedLocal.planos.alcan}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {inspectedLocal.modalidadAcueducto === "CONTADOR"
                        ? `Lectura: ${inspectedLocal.aguaLecturaAnt} → ${inspectedLocal.aguaLecturaAct} (${inspectedLocal.aguaConsumoIndivM3} m³ × $10.921,45) + Agua Comunal ($198,20/m²)`
                        : `Modalidad ${inspectedLocal.modalidadAcueducto}: Comunal (${inspectedLocal.aguaConsumoComunalM3.toFixed(2)} m³) + Agua Comunal General (${inspectedLocal.areaM2} m²)`}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                      ${inspectedLocal.calcAcueductoCop.toLocaleString("es-CO")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D3557]">
                      3. Aseo Áreas Comunes
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{inspectedLocal.planos.aseo}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      Factor por Área: {inspectedLocal.areaM2} m² × $1.631,14 / m²
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                      ${inspectedLocal.calcAseoCop.toLocaleString("es-CO")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D3557]">
                      4. Recolección Residuos Sólidos (ECSA)
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{inspectedLocal.planos.ecsa}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      Categoría {inspectedLocal.categoriaResiduos} sobre {inspectedLocal.areaM2} m² (
                      {inspectedLocal.categoriaResiduos === "NP"
                        ? "Factor 0.4 = $2.519,55/m²"
                        : inspectedLocal.categoriaResiduos === "MP"
                        ? "Factor 1.2 = $7.558,66/m²"
                        : "Factor P = $9.987,32/m²"}
                      )
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                      ${inspectedLocal.calcResiduosCop.toLocaleString("es-CO")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D3557]">
                      5. Vigilancia y Seguridad Privada
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{inspectedLocal.planos.vigilancia}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      Factor por Área: {inspectedLocal.areaM2} m² × $13.785,91 / m²
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                      ${inspectedLocal.calcVigilanciaCop.toLocaleString("es-CO")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1D3557]">
                      6. Convenio Policía Nacional
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{inspectedLocal.planos.policia}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      Partes Iguales Equitativo ($215.384.615 / 5.300 locales)
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                      ${inspectedLocal.calcPoliciaCop.toLocaleString("es-CO")}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-[#010F22] text-white font-bold">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 text-right uppercase text-xs">
                      TOTAL LIQUIDADO MES JUNIO 2025 (COP):
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-base text-emerald-400">
                      ${inspectedLocal.calcTotalCop.toLocaleString("es-CO")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
