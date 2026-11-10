"use client";

import React, { useMemo, useState } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { ComputedLocalLiquidation, hasLocalServiceAlert } from "@/lib/liquidation-engine";
import { OccupancyStatusSchema } from "@/contracts/domain-contracts";
import { buildCutoffReadingTasks } from "@/lib/reading-tasks-engine";
import { formatCop, formatDec, formatInt } from "@/lib/formatters";
import {
  CheckCircle2,
  Eye,
  Layers,
  ListChecks,
  Search,
  ShieldAlert,
  X,
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

interface BodegasStatusViewProps {
  onSelectLocalCode: (codigo: string) => void;
}

export function BodegasStatusView({ onSelectLocalCode }: BodegasStatusViewProps) {
  const {
    locales,
    energyCommunal,
    waterCommunal,
    bathroomMeters,
    completedTaskIds,
    fieldOverridesMap,
    receipts,
    updateBodegaOccupancy,
  } = useCorabastos();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterOccupancy, setFilterOccupancy] = useState<
    "ALL" | "CON_VACANCIA" | "CON_ALERTAS"
  >("ALL");
  const [selectedBodegaId, setSelectedBodegaId] = useState<string | null>(null);

  const allTasks = useMemo(
    () =>
      buildCutoffReadingTasks(
        locales,
        energyCommunal,
        waterCommunal,
        bathroomMeters,
        completedTaskIds,
        fieldOverridesMap
      ),
    [
      locales,
      energyCommunal,
      waterCommunal,
      bathroomMeters,
      completedTaskIds,
      fieldOverridesMap,
    ]
  );

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

      const occ = loc.effectiveOccupancy;
      if (occ === "VACIO_CON_CONTRATO") {
        row.vaciosConContratoCount += 1;
        row.totalLiquidadoComerciantesCop += loc.calcTotalCop;
      } else if (occ === "VACIO_SIN_CONTRATO_CORPORACION") {
        row.vaciosSinContratoCount += 1;
        row.totalAsumidoCorporacionCop += loc.calcAssumedCorporationCop;
      } else {
        row.activosCount += 1;
        row.totalLiquidadoComerciantesCop += loc.calcTotalCop;
      }

      if (hasLocalServiceAlert(loc)) {
        row.alertasTecnicasCount += 1;
      }
    }

    for (const task of allTasks) {
      const row = map.get(task.bodegaId);
      if (!row) continue;
      row.totalMetersInCutoff += 1;
      if (task.taskState === "PENDIENTE") row.pendingMetersInCutoff += 1;
      else row.completedMetersInCutoff += 1;
    }

    return Array.from(map.values()).sort((a, b) => a.bodegaId.localeCompare(b.bodegaId));
  }, [locales, allTasks]);

  const filteredBodegas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bodegasRows.filter((b) => {
      if (q) {
        const matchesHeader =
          b.bodegaId.toLowerCase().includes(q) || b.tipoBodega.toLowerCase().includes(q);
        const matchesAnyLocal = b.localesList.some(
          (loc) =>
            loc.codigo.toLowerCase().includes(q) ||
            loc.energiaObs.toLowerCase().includes(q) ||
            loc.aguaObs.toLowerCase().includes(q)
        );
        if (!matchesHeader && !matchesAnyLocal) return false;
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

  const totalVaciosConContrato = bodegasRows.reduce(
    (acc, b) => acc + b.vaciosConContratoCount,
    0
  );
  const totalVaciosSinContrato = bodegasRows.reduce(
    (acc, b) => acc + b.vaciosSinContratoCount,
    0
  );
  const totalAreaComercial = bodegasRows.reduce((acc, b) => acc + b.areaTotalM2, 0);
  const totalAsumidoVacancia = bodegasRows.reduce(
    (acc, b) => acc + b.totalAsumidoCorporacionCop,
    0
  );

  const selectedBodegaObj = useMemo(
    () => bodegasRows.find((b) => b.bodegaId === selectedBodegaId) || null,
    [bodegasRows, selectedBodegaId]
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#0B132B] text-white border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            Total Bodegas Catastradas
          </span>
          <span className="text-lg font-mono font-black text-white mt-0.5 block">
            {formatInt(bodegasRows.length)} Bodegas · {formatInt(locales.length)} Locales
          </span>
          <span className="text-[11px] text-slate-300 block mt-0.5">
            Área comercial: {formatDec(totalAreaComercial, 2)} m²
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-emerald-500/40 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-400 font-bold block">
            1. Locales Activos en Operación
          </span>
          <span className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
            {formatInt(locales.length - totalVaciosConContrato - totalVaciosSinContrato)} locales
          </span>
          <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
            Liquidan consumo + comunales + expensas Art. 46
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-amber-500/40 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-amber-700 dark:text-amber-400 font-bold block">
            2. Vacíos / Cerrados CON Contrato
          </span>
          <span className="text-lg font-mono font-black text-amber-700 dark:text-amber-400 mt-0.5 block">
            {formatInt(totalVaciosConContrato)} locales
          </span>
          <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
            Consumo 0 → Pagan Mínima ({formatCop(receipts.energia.principal.topeMinimaCop)}) + Expensas
          </span>
        </div>

        <div className="bg-[var(--surface)] border border-sky-500/40 rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-sky-700 dark:text-sky-400 font-bold block">
            3. Vacíos SIN Contrato (Asumido Corp.)
          </span>
          <span className="text-lg font-mono font-black text-sky-700 dark:text-sky-400 mt-0.5 block tabular-nums">
            {formatInt(totalVaciosSinContrato)} unid. · {formatCop(totalAsumidoVacancia)}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
            No inflan $/m² a vecinos → Bolsa Valor Asumido Corp.
          </span>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en las 68 bodegas y 5.318 locales (ej. Bodega 01, local 810077)..."
            className="w-full h-10 pl-10 pr-8 rounded-lg border border-[var(--outline-color)] bg-[var(--surface-alt)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[#f7931b]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-3 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterOccupancy("ALL")}
            className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              filterOccupancy === "ALL"
                ? "bg-[#0B132B] text-white dark:bg-[#f7931b] dark:text-slate-950"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Todas ({formatInt(bodegasRows.length)})
          </button>
          <button
            type="button"
            onClick={() => setFilterOccupancy("CON_VACANCIA")}
            className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              filterOccupancy === "CON_VACANCIA"
                ? "bg-amber-500 text-slate-950"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Con Vacancia
          </button>
          <button
            type="button"
            onClick={() => setFilterOccupancy("CON_ALERTAS")}
            className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              filterOccupancy === "CON_ALERTAS"
                ? "bg-rose-600 text-white"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Con Novedad de Medidor
          </button>
        </div>
      </div>

      {selectedBodegaObj && (
        <div className="bg-[var(--surface)] rounded-2xl border-2 border-emerald-500 shadow-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
              <span>
                Locales de Bodega {selectedBodegaObj.bodegaId} ({selectedBodegaObj.tipoBodega}) — Clic en cualquier local para abrir Cuenta 360°
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setSelectedBodegaId(null)}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface-alt)] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-[var(--text-main)] cursor-pointer"
            >
              Cerrar Bodega {selectedBodegaObj.bodegaId}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {selectedBodegaObj.localesList.map((loc) => {
              const occ = loc.effectiveOccupancy;
              return (
                <button
                  key={loc.codigo}
                  type="button"
                  onClick={() => onSelectLocalCode(loc.codigo)}
                  className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                    occ === "VACIO_SIN_CONTRATO_CORPORACION"
                      ? "bg-sky-500/10 border-sky-400/50 text-sky-900 dark:text-sky-200"
                      : occ === "VACIO_CON_CONTRATO"
                      ? "bg-amber-500/10 border-amber-400/50 text-amber-900 dark:text-amber-200"
                      : "bg-[var(--surface-alt)] border-[var(--outline-color)] hover:border-emerald-500 text-[var(--text-main)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs">{loc.codigo}</span>
                    {hasLocalServiceAlert(loc) ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.75} />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {formatDec(loc.areaM2, 2)} m²
                  </div>
                  <div className="text-[11px] font-bold mt-1 tabular-nums">
                    {occ === "VACIO_SIN_CONTRATO_CORPORACION"
                      ? `Corp: ${formatCop(loc.calcAssumedCorporationCop)}`
                      : formatCop(loc.calcTotalCop)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--outline-color)] shadow-xs overflow-x-auto">
        <table
          style={{ borderCollapse: "separate", borderSpacing: 0 }}
          className="w-full text-left text-xs"
        >
          <thead>
            <tr className="bg-[#0B132B] text-white font-mono text-[10.5px] uppercase">
              <th className="py-3 px-3">Bodega</th>
              <th className="py-3 px-3">Tipo / Zona</th>
              <th className="py-3 px-3 text-right">Locales</th>
              <th className="py-3 px-3 text-right">Área Total</th>
              <th className="py-3 px-3 text-center">Odómetros Físicos</th>
              <th className="py-3 px-3 text-center">Ocupación (Act / Vac.Contr / Corp)</th>
              <th className="py-3 px-3 text-right">Liquidado Comerciantes</th>
              <th className="py-3 px-3 text-center">Simular Vacancia</th>
              <th className="py-3 px-3 text-center">Inspección</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {filteredBodegas.map((b) => {
              const isSelected = selectedBodegaId === b.bodegaId;
              return (
                <tr
                  key={b.bodegaId}
                  className={`hover:bg-sky-500/10 transition-colors ${
                    isSelected ? "bg-emerald-500/10" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 font-black border-b border-[var(--outline-color)]">
                    <span className="px-2 py-1 rounded bg-[#0B132B] text-white">
                      BOD {b.bodegaId}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[var(--text-main)] border-b border-[var(--outline-color)]">
                    {b.tipoBodega}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums border-b border-[var(--outline-color)]">
                    {formatInt(b.totalLocales)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums border-b border-[var(--outline-color)]">
                    {formatDec(b.areaTotalM2, 2)} m²
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-[var(--outline-color)]">
                    {b.totalMetersInCutoff > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                        <ListChecks className="w-3 h-3" strokeWidth={1.75} />
                        {formatInt(b.pendingMetersInCutoff)} pend / {formatInt(b.totalMetersInCutoff)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--text-muted)]">100% Área / Comunal</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-[var(--outline-color)]">
                    <div className="inline-flex items-center gap-1.5 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold">
                        {formatInt(b.activosCount)} Act
                      </span>
                      {b.vaciosConContratoCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold">
                          {formatInt(b.vaciosConContratoCount)} Vac.Contr
                        </span>
                      )}
                      {b.vaciosSinContratoCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-800 dark:text-sky-300 font-bold">
                          {formatInt(b.vaciosSinContratoCount)} Corp
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-[var(--text-main)] tabular-nums border-b border-[var(--outline-color)]">
                    {formatCop(b.totalLiquidadoComerciantesCop)}
                    {b.totalAsumidoCorporacionCop > 0 && (
                      <span className="block text-[10px] text-sky-600 dark:text-sky-400">
                        Asumido Corp: {formatCop(b.totalAsumidoCorporacionCop)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-[var(--outline-color)]">
                    <select
                      aria-label={`Estado ocupación Bodega ${b.bodegaId}`}
                      value=""
                      onChange={(e) => {
                        const parsed = OccupancyStatusSchema.safeParse(e.target.value);
                        if (parsed.success) {
                          updateBodegaOccupancy(b.bodegaId, parsed.data);
                        }
                      }}
                      className="h-8 px-2 rounded border border-[var(--outline-color)] bg-[var(--surface-alt)] text-[11px] font-mono text-[var(--text-main)]"
                    >
                      <option value="" disabled>
                        Cambiar Bodega...
                      </option>
                      <option value="ACTIVO">100% Activa</option>
                      <option value="VACIO_CON_CONTRATO">Vacía CON Contrato</option>
                      <option value="VACIO_SIN_CONTRATO_CORPORACION">
                        Vacía SIN Contrato (Corp)
                      </option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-[var(--outline-color)]">
                    <button
                      type="button"
                      onClick={() => setSelectedBodegaId(isSelected ? null : b.bodegaId)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0B132B] hover:bg-[#1E3A5F] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
                      <span>{isSelected ? "Ocultar" : "Locales"}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
