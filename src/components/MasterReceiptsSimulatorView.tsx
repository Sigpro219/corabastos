"use client";

import React from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { CommunalMacrometersAuditTable } from "@/components/CommunalMacrometersAuditTable";
import { PrecisionDecimalInput } from "@/components/PrecisionDecimalInput";
import { formatCop, formatDec, formatInt } from "@/lib/formatters";
import {
  Zap,
  Droplets,
  ShieldCheck,
  Trash2,
  Sparkles,
  Scale,
  RotateCcw,
  Users,
  Ruler,
} from "lucide-react";

export function MasterReceiptsSimulatorView() {
  const { receipts, updateReceipts, resetToOfficialJune2025 } = useCorabastos();

  const resCfg = receipts.expensas.residuosEcsa;
  const tarifaBaseResM2 =
    resCfg.areaTotalProrrateoM2 > 0
      ? resCfg.valorNetoProrratear / resCfg.areaTotalProrrateoM2
      : resCfg.tarifaBaseM2;
  const tarifaNp = tarifaBaseResM2 * resCfg.factorNP;
  const tarifaMp = tarifaBaseResM2 * resCfg.factorMP;
  const bolsaP = Math.max(
    0,
    resCfg.valorNetoProrratear - resCfg.areaNpM2 * tarifaNp - resCfg.areaMpM2 * tarifaMp
  );
  const tarifaP = resCfg.areaPM2 > 0 ? bolsaP / resCfg.areaPM2 : resCfg.tarifaEfectivaPM2;

  const cuotaPolicia =
    receipts.expensas.policia.localesActivosDivisor > 0
      ? receipts.expensas.policia.valorFactura / receipts.expensas.policia.localesActivosDivisor
      : receipts.expensas.policia.cuotaFijaPorLocal;

  const tarifaVigilancia =
    receipts.expensas.vigilancia.areaTotalM2 > 0
      ? receipts.expensas.vigilancia.valorNetoDistribuir / receipts.expensas.vigilancia.areaTotalM2
      : receipts.expensas.vigilancia.tarifaPorM2;

  const tarifaAseo =
    receipts.expensas.aseo.areaTotalM2 > 0
      ? receipts.expensas.aseo.valorNetoDistribuir / receipts.expensas.aseo.areaTotalM2
      : receipts.expensas.aseo.tarifaPorM2;

  return (
    <div className="space-y-6">
      {/* Cabecera de Control */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#E73A46] block">
            MOTOR PARAMÉTRICO DE FACTURAS GLOBALES (JUNIO 2025)
          </span>
          <h2 className="text-xl font-bold text-[#1D3557]">
            Ingesta de Recibos Maestros (3 Energía · 3 Acueducto · 4 Expensas y Factores)
          </h2>
          <p className="text-xs text-[#4C607B] mt-0.5">
            Cualquier ajuste en tarifas unitarias ($/kWh, $/m³), montos de facturas o factores (0,4 NP / 1,2 MP / Partes Iguales) recalcula en tiempo real los 5.318 locales.
          </p>
        </div>

        <button
          type="button"
          onClick={resetToOfficialJune2025}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1D3557] text-xs font-bold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar Cifras Oficiales Junio 2025
        </button>
      </div>

      {/* FILA 1: 3 RECIBOS DE ENERGÍA + 3 BLOQUES DE ACUEDUCTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TARJETA 1: LOS 3 RECIBOS DE ENERGÍA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1D3557]">
                  1. Los 3 Recibos Maestros de Energía Eléctrica
                </h3>
                <p className="text-[11px] text-[#4C607B]">
                  Corabastos Principal (`ENERGIA_`) · Bodega Popular (`ENERGIA BP`) · Red de Fríos
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">Tarifa kWh Activa</span>
              <span className="text-base font-mono font-bold text-[#1D3557]">
                ${formatDec(receipts.energia.tarifaKwh, 2)} / kWh
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Tarifa Unitaria ($ / kWh)
              </label>
              <PrecisionDecimalInput
                ariaLabel="Tarifa Unitaria kWh"
                value={receipts.energia.tarifaKwh}
                minDecimals={2}
                maxDecimals={2}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    energia: { ...receipts.energia, tarifaKwh: val },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-right text-[#1D3557]"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Recibo 1: Consumo Principal ($)
              </label>
              <div className="font-mono font-bold text-right text-sm text-[#1D3557] py-1">
                {formatCop(receipts.energia.principal.valorConsumoFactura)}
              </div>
              <span className="text-[10px] text-slate-500 block text-right">
                +20% CREG/Alumbrado · Tope Mín: {formatCop(receipts.energia.principal.topeMinimaCop)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Recibo 2: Bodega Popular ($)
              </label>
              <div className="font-mono font-bold text-right text-sm text-[#1D3557]">
                {formatCop(receipts.energia.bodegaPopular.totalFactura)}
              </div>
              <span className="text-[10px] text-slate-500 block text-right">
                Consumo: {formatCop(receipts.energia.bodegaPopular.valorConsumoFactura)} · CREG: 15,7%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Recibo 3: Red de Fríos + Alumbrado Gral
              </label>
              <div className="font-mono font-bold text-right text-sm text-[#1D3557]">
                {formatCop(receipts.energia.redFrios.valorFacturaTotal)}
              </div>
              <span className="text-[10px] text-slate-500 block text-right">
                Alumbrado Gral: ${formatDec(receipts.energia.alumbradoGeneral.tarifaPorM2, 2)} / m²
              </span>
            </div>
          </div>
        </div>

        {/* TARJETA 2: LOS 3 BLOQUES DE ACUEDUCTO Y ALCANTARILLADO */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1D3557]">
                  2. Los 3 Recibos / Bloques de Acueducto y Alcantarillado
                </h3>
                <p className="text-[11px] text-[#4C607B]">
                  Factura General (21.437 m³) · Factura Red de Fríos · 16 Medidores de Baños Públicos
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">Tarifa m³ Activa</span>
              <span className="text-base font-mono font-bold text-[#1D3557]">
                ${formatDec(receipts.acueducto.tarifaM3, 2)} / m³
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Tarifa Unitaria ($ / m³ = Mínima 1 m³)
              </label>
              <PrecisionDecimalInput
                ariaLabel="Tarifa Unitaria Acueducto m3"
                value={receipts.acueducto.tarifaM3}
                minDecimals={2}
                maxDecimals={2}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    acueducto: { ...receipts.acueducto, tarifaM3: val },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-right text-[#1D3557]"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Recibo 1: Factura General Acueducto
              </label>
              <div className="font-mono font-bold text-right text-sm text-[#1D3557] py-1">
                {formatCop(receipts.acueducto.valorFacturaGeneral)}
              </div>
              <span className="text-[10px] text-slate-500 block text-right">
                Prorrateo: ${formatDec(receipts.acueducto.bolsaProrrateo / receipts.acueducto.areaProrrateoM2, 2)} / m²
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Recibo 2: Acueducto Red de Fríos
              </label>
              <div className="font-mono font-bold text-right text-sm text-[#1D3557]">
                {formatCop(receipts.acueducto.valorFacturaRedFrios)}
              </div>
              <span className="text-[10px] text-slate-500 block text-right">
                Área Red Fríos: {formatDec(receipts.acueducto.areaRedFriosM2, 1)} m² ($708,3/m²)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Cargo Agua Comunal General (10%)
              </label>
              <div className="font-mono font-bold text-right text-sm text-[#1D3557]">
                {formatCop(receipts.acueducto.bolsaAguaComunalGeneral)}
              </div>
              <span className="text-[10px] text-slate-500 block text-right">
                Factor Área: $198,2 / m² · Baños: 1.565 m³
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILA 2: LOS FACTORES DE DISTRIBUCIÓN DE EXPENSAS (POLICÍA, VIGILANCIA, ASEO, RESIDUOS NP/MP/P) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* POLICÍA: PARTES IGUALES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                REGLA: PARTES IGUALES (EQUITATIVO)
              </span>
              <h3 className="text-sm font-bold text-[#1D3557]">3. Policía (`POLICIA`)</h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Valor Total Factura Policía ($)
              </label>
              <PrecisionDecimalInput
                ariaLabel="Valor Total Factura Policia"
                value={receipts.expensas.policia.valorFactura}
                minDecimals={0}
                maxDecimals={0}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    expensas: {
                      ...receipts.expensas,
                      policia: {
                        ...receipts.expensas.policia,
                        valorFactura: val,
                      },
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-right text-[#1D3557]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-slate-600">Divisor Locales Activos:</span>
              <span className="font-mono font-bold text-[#1D3557]">
                {formatInt(receipts.expensas.policia.localesActivosDivisor)} locales
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
              <span className="font-semibold text-[#1D3557]">Cuota Fija por Local:</span>
              <span className="font-mono font-bold text-sm text-indigo-900">
                ${formatDec(cuotaPolicia, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* VIGILANCIA Y ASEO: 100% FACTOR POR ÁREA (M2) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                REGLA: 100% PROPORCIONAL AL ÁREA (M²)
              </span>
              <h3 className="text-sm font-bold text-[#1D3557]">
                4. Vigilancia & Aseo (`VIGILANCIA` / `ASEO_`)
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#1D3557] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Vigilancia Neta:
                </span>
                <PrecisionDecimalInput
                  ariaLabel="Vigilancia Neta"
                  value={receipts.expensas.vigilancia.valorNetoDistribuir}
                  minDecimals={0}
                  maxDecimals={0}
                  onChange={(val) =>
                    updateReceipts({
                      ...receipts,
                      expensas: {
                        ...receipts.expensas,
                        vigilancia: {
                          ...receipts.expensas.vigilancia,
                          valorNetoDistribuir: val,
                        },
                      },
                    })
                  }
                  className="w-40 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-right text-[#1D3557]"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Área: {formatDec(receipts.expensas.vigilancia.areaTotalM2, 2)} m²</span>
                <strong className="font-mono text-emerald-700">
                  Factor: ${formatDec(tarifaVigilancia, 2)} / m²
                </strong>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#1D3557] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  Aseo Neto (20%):
                </span>
                <PrecisionDecimalInput
                  ariaLabel="Aseo Neto"
                  value={receipts.expensas.aseo.valorNetoDistribuir}
                  minDecimals={0}
                  maxDecimals={0}
                  onChange={(val) =>
                    updateReceipts({
                      ...receipts,
                      expensas: {
                        ...receipts.expensas,
                        aseo: {
                          ...receipts.expensas.aseo,
                          valorNetoDistribuir: val,
                        },
                      },
                    })
                  }
                  className="w-40 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-right text-[#1D3557]"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Área: {formatDec(receipts.expensas.aseo.areaTotalM2, 2)} m²</span>
                <strong className="font-mono text-sky-700">
                  Factor: ${formatDec(tarifaAseo, 2)} / m²
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* RESIDUOS SÓLIDOS ECSA: FACTORES PONDERADOS NP (0.4), MP (1.2), P (SALDO) */}
        <div className="bg-white rounded-2xl border-2 border-[#1D3557] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-[#E73A46] border border-red-200">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#E73A46] block">
                FACTOR PONDERADO POR VOLUMEN + ÁREA
              </span>
              <h3 className="text-sm font-bold text-[#1D3557]">
                5. Residuos Sólidos ECSA (`NP / MP / P`)
              </h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Neto a Prorratear ECSA:</span>
              <span className="font-mono font-bold text-[#1D3557]">
                {formatCop(resCfg.valorNetoProrratear)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Tarifa Base 100% por m²:</span>
              <span className="font-mono font-semibold">${formatDec(tarifaBaseResM2, 2)} / m²</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-600 block">
                  Factor NP (No Productor)
                </label>
                <PrecisionDecimalInput
                  ariaLabel="Factor NP"
                  value={resCfg.factorNP}
                  minDecimals={1}
                  maxDecimals={2}
                  onChange={(val) =>
                    updateReceipts({
                      ...receipts,
                      expensas: {
                        ...receipts.expensas,
                        residuosEcsa: {
                          ...resCfg,
                          factorNP: val,
                        },
                      },
                    })
                  }
                  className="w-full mt-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-right text-[#1D3557]"
                />
                <span className="text-[10px] font-mono text-slate-500 block text-right mt-0.5">
                  ${formatDec(tarifaNp, 2)} / m²
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-600 block">
                  Factor MP (Mediano Prod.)
                </label>
                <PrecisionDecimalInput
                  ariaLabel="Factor MP"
                  value={resCfg.factorMP}
                  minDecimals={1}
                  maxDecimals={2}
                  onChange={(val) =>
                    updateReceipts({
                      ...receipts,
                      expensas: {
                        ...receipts.expensas,
                        residuosEcsa: {
                          ...resCfg,
                          factorMP: val,
                        },
                      },
                    })
                  }
                  className="w-full mt-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-right text-[#1D3557]"
                />
                <span className="text-[10px] font-mono text-slate-500 block text-right mt-0.5">
                  ${formatDec(tarifaMp, 2)} / m²
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1D3557] block flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-[#E73A46]" />
                  Categoría P (Perecederos):
                </span>
                <span className="text-[10px] text-slate-600">
                  Absorbe bolsa restante ({formatCop(Math.round(bolsaP))})
                </span>
              </div>
              <span className="font-mono font-bold text-sm text-[#E73A46]">
                ${formatDec(tarifaP, 2)} / m²
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AUDITORÍA DE LOS 38 MACROMEDIDORES DE ENERGÍA, 24 DE AGUA COMUNAL Y 16 BAÑOS PÚBLICOS */}
      <CommunalMacrometersAuditTable />
    </div>
  );
}
