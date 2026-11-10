"use client";

import React from "react";
import { MasterReceiptsConfig } from "@/contracts/domain-contracts";
import { LiveLiquidationBagsSummary } from "@/lib/liquidation-engine";
import { formatCop, formatDec, formatInt } from "@/lib/formatters";

interface SabanaSummaryCardsProps {
  filteredCount: number;
  receipts: MasterReceiptsConfig;
  liveBagsSummary: LiveLiquidationBagsSummary;
  totals: {
    area: number;
    energia: number;
    acueducto: number;
    aseo: number;
    residuos: number;
    vigilancia: number;
    policia: number;
    granTotal: number;
    asumidoCorp: number;
  };
}

export function SabanaSummaryCards({ filteredCount, receipts, liveBagsSummary, totals }: SabanaSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] p-2.5 shadow-2xs">
        <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block">1. Energía (PL109)</span>
        <span className="text-sm font-mono font-bold text-[var(--text-main)] mt-0.5 block tabular-nums">{formatCop(totals.energia)}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">{formatCop(receipts.energia.tarifaKwh, 2)}/kWh</span>
      </div>
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] p-2.5 shadow-2xs">
        <span className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 block">2. Acueducto (PL008)</span>
        <span className="text-sm font-mono font-bold text-[var(--text-main)] mt-0.5 block tabular-nums">{formatCop(totals.acueducto)}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">{formatCop(receipts.acueducto.tarifaM3, 2)}/m³</span>
      </div>
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] p-2.5 shadow-2xs">
        <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">3. Vigilancia (PL086)</span>
        <span className="text-sm font-mono font-bold text-[var(--text-main)] mt-0.5 block tabular-nums">{formatCop(totals.vigilancia)}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">{formatCop(liveBagsSummary.tarifaVigilanciaM2, 1)}/m²</span>
      </div>
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] p-2.5 shadow-2xs">
        <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block">4. Residuos (AMB403)</span>
        <span className="text-sm font-mono font-bold text-[var(--text-main)] mt-0.5 block tabular-nums">{formatCop(totals.residuos)}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">P: {formatCop(liveBagsSummary.tarifaEfectivaPM2, 1)}/m²</span>
      </div>
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] p-2.5 shadow-2xs">
        <span className="text-[10px] font-bold uppercase text-teal-600 dark:text-teal-400 block">5. Barrido/Aseo (PL003)</span>
        <span className="text-sm font-mono font-bold text-[var(--text-main)] mt-0.5 block tabular-nums">{formatCop(totals.aseo)}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">{formatCop(liveBagsSummary.tarifaAseoM2, 1)}/m²</span>
      </div>
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] p-2.5 shadow-2xs">
        <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 block">6. Policía (PL141)</span>
        <span className="text-sm font-mono font-bold text-[var(--text-main)] mt-0.5 block tabular-nums">{formatCop(totals.policia)}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">{formatCop(liveBagsSummary.cuotaPoliciaPorLocal, 1)}/local</span>
      </div>
      <div className="bg-[#0B132B] text-white rounded-xl p-2.5 shadow-2xs col-span-2 sm:col-span-2 lg:col-span-1">
        <span className="text-[10px] font-bold uppercase text-[#f7931b] block">Facturable ({formatInt(filteredCount)})</span>
        <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block tabular-nums">{formatCop(totals.granTotal)}</span>
        <span className="text-[10px] text-slate-300 font-mono truncate block">
          {totals.asumidoCorp > 0 ? `Asumido Corp: ${formatCop(totals.asumidoCorp)}` : `Área: ${formatDec(totals.area, 1)} m²`}
        </span>
      </div>
    </div>
  );
}
