"use client";

import React, { useState, useMemo } from "react";
import { useCorabastos, buildTaskKey } from "@/context/CorabastosContext";
import { ComputedLocalLiquidation } from "@/lib/liquidation-engine";
import { OccupancyStatus } from "@/contracts/domain-contracts";
import { LocalAccountModal } from "@/components/LocalAccountModal";
import { formatCop, formatDec, formatInt } from "@/lib/formatters";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Eye,
  ShieldAlert,
  Layers,
  ListChecks,
} from "lucide-react";

interface BodegaAggregatedRow {
  bodegaId: string;
  tipoBodega: string;
  totalLocales: number;
  areaTotalM2: number;
  activosCount: number;
  vaciosConContratoCount: number;
  vaciosSinContratoCount: number;
  totalMetersInCutoff: number;
  completedMetersInCutoff: number;
  pendingMetersInCutoff: number;
  alertasTecnicasCount: number;
  totalLiquidadoComerciantesCop: number;
  totalAsumidoCorporacionCop: number;
  localesList: ComputedLocalLiquidation[];
}

export function BodegasStatusView() {
  const {
    locales,
    completedTaskIds,
    receipts,
    updateBodegaOccupancy,
  } = useCorabastos();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterOccupancy, setFilterOccupancy] = useState<"ALL" | "CON_VACANCIA" | "CON_ALERTAS">("ALL");
  const [selectedBodegaId, setSelectedBodegaId] = useState<string | null>(null);
  const [inspectingLocal, setInspectingLocal] = useState<ComputedLocalLiquidation | null>(null);

  const bodegasRows = useMemo<BodegaAggregatedRow[]>(() => {
    const map = new Map<string, BodegaAggregatedRow>();

    for (const loc of locales) {
      let row = map.get(loc.bodegaId);
      if (!row) {
        row = {
          bodegaId: loc.bodegaId,
          tipoBodega: loc.tipoBodega,
          totalLocales: 0,
          areaTotalM2: 0,
          activosCount: 0,
          vaciosConContratoCount: 0,
          vaciosSinContratoCount: 0,
          totalMetersInCutoff: 0,
          completedMetersInCutoff: 0,
          pendingMetersInCutoff: 0,
          alertasTecnicasCount: 0,
          totalLiquidadoComerciantesCop: 0,
          totalAsumidoCorporacionCop: 0,
          localesList: [],
        };
        map.set(loc.bodegaId, row);
      }

      row.totalLocales += 1;
      row.areaTotalM2 += loc.areaM2;
      row.localesList.push(loc);

      const occ = loc.estadoOcupacion || "ACTIVO";
      if (occ === "VACIO_CON_CONTRATO") {
        row.vaciosConContratoCount += 1;
        row.totalLiquidadoComerciantesCop += loc.calcTotalCop;
      } else if (occ === "VACIO_SIN_CONTRATO_CORPORACION") {
        row.vaciosSinContratoCount += 1;
        row.totalAsumidoCorporacionCop += loc.calcAssumedCorporationCop || loc.calcTotalCop;
      } else {
        row.activosCount += 1;
        row.totalLiquidadoComerciantesCop += loc.calcTotalCop;
      }

      // Contabilizar medidores físicos del corte en esta bodega
      const isRedFrios = loc.bodegaId === "98" || loc.tipoBodega.includes("FRIOS");
      if (loc.modalidadEnergia === "CONTADOR" || isRedFrios) {
        row.totalMetersInCutoff += 1;
        const key = buildTaskKey("ENERGIA", loc.codigo);
        const st = completedTaskIds[key] || loc.energiaTareaEstado || "PENDIENTE";
        if (st === "PENDIENTE") {
          row.pendingMetersInCutoff += 1;
        } else {
          row.completedMetersInCutoff += 1;
        }
      }

      if (loc.modalidadAcueducto === "CONTADOR") {
        row.totalMetersInCutoff += 1;
        const key = buildTaskKey("AGUA", loc.codigo);
        const st = completedTaskIds[key] || loc.aguaTareaEstado || "PENDIENTE";
        if (st === "PENDIENTE") {
          row.pendingMetersInCutoff += 1;
        } else {
          row.completedMetersInCutoff += 1;
        }
      }

      if (loc.energiaEstado === "REVISAR" || loc.aguaEstado === "REVISAR") {
        row.alertasTecnicasCount += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.bodegaId.localeCompare(b.bodegaId));
  }, [locales, completedTaskIds]);

  const filteredBodegas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bodegasRows.filter((b) => {
      if (q) {
        const matchesBodegaHeader =
          b.bodegaId.toLowerCase().includes(q) ||
          b.tipoBodega.toLowerCase().includes(q);
        const matchesAnyLocalIn5318 = b.localesList.some(
          (loc) =>
            loc.codigo.toLowerCase().includes(q) ||
            loc.energiaObs.toLowerCase().includes(q) ||
            loc.aguaObs.toLowerCase().includes(q)
        );
        if (!matchesBodegaHeader && !matchesAnyLocalIn5318) {
          return false;
        }
      }
      if (
        filterOccupancy === "CON_VACANCIA" &&
        b.vaciosConContratoCount === 0 &&
        b.vaciosSinContratoCount === 0
      ) {
        return false;
      }
      if (filterOccupancy === "CON_ALERTAS" && b.alertasTecnicasCount === 0) {
        return false;
      }
      return true;
    });
  }, [bodegasRows, searchQuery, filterOccupancy]);

  const totalVaciosConContrato = bodegasRows.reduce((acc, b) => acc + b.vaciosConContratoCount, 0);
  const totalVaciosSinContrato = bodegasRows.reduce((acc, b) => acc + b.vaciosSinContratoCount, 0);
  const totalAsumidoDinamico =
    receipts.energia.principal.asumidoCorporacion +
    receipts.acueducto.asumidoCorporacion +
    bodegasRows.reduce((acc, b) => acc + b.totalAsumidoCorporacionCop, 0);

  const selectedBodegaObj = useMemo(
    () => bodegasRows.find((b) => b.bodegaId === selectedBodegaId) || null,
    [bodegasRows, selectedBodegaId]
  );

  // Mantener sincronizado el local inspeccionado si cambia su estado
  const liveInspectingLocal = useMemo(() => {
    if (!inspectingLocal) return null;
    return locales.find((l) => l.codigo === inspectingLocal.codigo) || inspectingLocal;
  }, [locales, inspectingLocal]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      {/* CINTA EJECUTIVA DE ESTADO DE LAS 68 BODEGAS Y VACANCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#0B132B] text-white border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            Total Bodegas Catastradas
          </span>
          <span className="text-lg font-mono font-black text-white mt-0.5 block">
            {bodegasRows.length} Bodegas · {formatInt(locales.length)} Locales
          </span>
          <span className="text-[11px] text-slate-300 block mt-0.5">
            Área comercial: 126.125,2 m²
          </span>
        </div>

        <div className="bg-white border border-emerald-500/40 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-emerald-700 font-bold block">
            1. Locales Activos en Operación
          </span>
          <span className="text-lg font-mono font-black text-emerald-700 mt-0.5 block">
            {formatInt(locales.length - totalVaciosConContrato - totalVaciosSinContrato)} locales
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Liquidan consumo + comunales + expensas Art. 46
          </span>
        </div>

        <div className="bg-white border border-amber-500/40 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">
            2. Vacíos / Cerrados CON Contrato
          </span>
          <span className="text-lg font-mono font-black text-amber-700 mt-0.5 block">
            {formatInt(totalVaciosConContrato)} locales
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Consumo 0 → Pagan Mínima ($20.498) + Comunales + Expensas
          </span>
        </div>

        <div className="bg-white border border-sky-500/40 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-sky-700 font-bold block">
            3. Vacíos SIN Contrato (Asumido Corp.)
          </span>
          <span className="text-lg font-mono font-black text-sky-700 mt-0.5 block tabular-nums">
            {formatInt(totalVaciosSinContrato)} unid. · {formatCop(totalAsumidoDinamico)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            No inflan $/m² a vecinos → Bolsa Valor Asumido Corp.
          </span>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRO DE BODEGAS */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en las 68 bodegas y 5.318 locales (ej. Bodega 01, local 810077, serie medidor)..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterOccupancy("ALL")}
            className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              filterOccupancy === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Todas las Bodegas ({bodegasRows.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterOccupancy("CON_VACANCIA")}
            className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              filterOccupancy === "CON_VACANCIA"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Con Locales Vacíos / Cerrados
          </button>
          <button
            type="button"
            onClick={() => setFilterOccupancy("CON_ALERTAS")}
            className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              filterOccupancy === "CON_ALERTAS"
                ? "bg-rose-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Con Novedad de Medidor
          </button>
        </div>
      </div>

      {/* TABLA / MATRIZ DE LAS 68 BODEGAS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#010F22] text-white font-mono text-[11px] uppercase">
                <th className="py-3 px-3.5">Bodega</th>
                <th className="py-3 px-3.5">Tipo / Zona</th>
                <th className="py-3 px-3.5 text-right">Locales</th>
                <th className="py-3 px-3.5 text-right">Área Total</th>
                <th className="py-3 px-3.5 text-center">Tareas Corte (Pend / Total)</th>
                <th className="py-3 px-3.5 text-center">Estado Ocupación (Act / Vacío Contr / Corp)</th>
                <th className="py-3 px-3.5 text-right">Liquidado Comerciantes</th>
                <th className="py-3 px-3.5 text-center">Simular Vacancia Bodega</th>
                <th className="py-3 px-3.5 text-center">Inspeccionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredBodegas.map((b) => {
                const isSelected = selectedBodegaId === b.bodegaId;
                return (
                  <tr
                    key={b.bodegaId}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? "bg-emerald-50/70" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-black text-slate-900">
                      <span className="px-2 py-1 rounded bg-slate-900 text-white">
                        BOD {b.bodegaId}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-700">{b.tipoBodega}</td>
                    <td className="py-2.5 px-3.5 text-right font-bold tabular-nums">
                      {b.totalLocales}
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular-nums">
                      {formatDec(b.areaTotalM2, 1)} m²
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      {b.totalMetersInCutoff > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-bold">
                          <ListChecks className="w-3 h-3 text-amber-600" />
                          {b.pendingMetersInCutoff} pend / {b.totalMetersInCutoff}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">100% Área / Comunal</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                          {b.activosCount} Act
                        </span>
                        {b.vaciosConContratoCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                            {b.vaciosConContratoCount} Vac.Contr
                          </span>
                        )}
                        {b.vaciosSinContratoCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 font-bold">
                            {b.vaciosSinContratoCount} Corp
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 tabular-nums">
                      ${b.totalLiquidadoComerciantesCop.toLocaleString("es-CO")}
                      {b.totalAsumidoCorporacionCop > 0 && (
                        <span className="block text-[10px] text-sky-700">
                          Asumido Corp: ${b.totalAsumidoCorporacionCop.toLocaleString("es-CO")}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <select
                        aria-label={`Estado ocupación Bodega ${b.bodegaId}`}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          updateBodegaOccupancy(b.bodegaId, e.target.value as OccupancyStatus);
                        }}
                        defaultValue=""
                        className="h-8 px-2 rounded border border-slate-300 bg-white text-[11px] font-mono text-slate-800"
                      >
                        <option value="" disabled>
                          Cambiar Bodega...
                        </option>
                        <option value="ACTIVO">100% Activa</option>
                        <option value="VACIO_CON_CONTRATO">Vacía CON Contrato (Mínima)</option>
                        <option value="VACIO_SIN_CONTRATO_CORPORACION">
                          Vacía SIN Contrato (Asume Corp)
                        </option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBodegaId(isSelected ? null : b.bodegaId)
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ver Locales</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DESGLOSE DE LOCALES DE LA BODEGA SELECCIONADA */}
      {selectedBodegaObj && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>
                  Locales de la Bodega {selectedBodegaObj.bodegaId} ({selectedBodegaObj.tipoBodega}) — Haz clic en un local para abrir su Cuenta Individual 360°
                </span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBodegaId(null)}
              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cerrar Bodega {selectedBodegaObj.bodegaId}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {selectedBodegaObj.localesList.map((loc) => {
              const occ = loc.estadoOcupacion || "ACTIVO";
              return (
                <button
                  key={loc.codigo}
                  type="button"
                  onClick={() => setInspectingLocal(loc)}
                  className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                    occ === "VACIO_SIN_CONTRATO_CORPORACION"
                      ? "bg-sky-50 border-sky-300 text-sky-950"
                      : occ === "VACIO_CON_CONTRATO"
                      ? "bg-amber-50 border-amber-300 text-amber-950"
                      : "bg-slate-50 border-slate-200 hover:border-emerald-500 text-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs">{loc.codigo}</span>
                    {loc.energiaEstado === "REVISAR" || loc.aguaEstado === "REVISAR" ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{formatDec(loc.areaM2, 2)} m²</div>
                  <div className="text-[11px] font-bold text-slate-900 mt-1 tabular-nums">
                    {formatCop(loc.calcTotalCop)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL CUENTA INDIVIDUAL 360° */}
      <LocalAccountModal
        local={liveInspectingLocal}
        onClose={() => setInspectingLocal(null)}
      />
    </div>
  );
}
