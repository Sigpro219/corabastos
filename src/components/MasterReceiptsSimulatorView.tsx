"use client";

import React from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { CommunalMacrometersAuditTable } from "@/components/CommunalMacrometersAuditTable";
import { PrecisionDecimalInput } from "@/components/PrecisionDecimalInput";
import { formatCop, formatDec, formatInt } from "@/lib/formatters";
import {
  Droplets,
  RotateCcw,
  Ruler,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";

export function MasterReceiptsSimulatorView() {
  const { receipts, liveBagsSummary, updateReceipts, resetToOfficialJune2025 } = useCorabastos();
  const resCfg = receipts.expensas.residuosEcsa;

  const inputClass =
    "w-full bg-[var(--surface)] border border-[var(--outline-color)] focus:border-[#f7931b] outline-none rounded-lg px-2.5 py-1.5 font-mono font-bold text-right text-[var(--text-main)]";

  return (
    <div className="space-y-5">
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Edita tarifas unitarias (<strong className="text-[var(--text-main)]">$/kWh, $/m³</strong>), montos netos de las{" "}
          <strong className="text-[var(--text-main)]">5 Bolsas de Servicios</strong> o las{" "}
          <strong className="text-[var(--text-main)]">4 Expensas Comunes</strong> para recalcular en vivo los 5.318 locales.
        </p>

        <button
          type="button"
          onClick={resetToOfficialJune2025}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-alt)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--text-main)] border border-[var(--outline-color)] text-xs font-bold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
          Restaurar Cifras Oficiales Junio 2025
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ENERGÍA: TARIFA + 3 BOLSAS NETAS EDITABLES */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--outline-color)] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--outline-color)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Zap className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">
                  1. Recibos Maestros de Energía Eléctrica (3 Bolsas)
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Predio Matriz Principal · Bodega Popular · Red de Fríos
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-[var(--text-muted)] block">Tarifa Activa</span>
              <span className="text-base font-mono font-bold text-[var(--text-main)]">
                {formatCop(receipts.energia.tarifaKwh, 2)} / kWh
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)]">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
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
                className={inputClass}
              />
              <span className="text-[10px] text-[var(--text-muted)] block text-right mt-1 font-mono">
                Tope Mín: {formatCop(receipts.energia.principal.topeMinimaCop)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)]">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                Bolsa 1 · Neto Servicio Matriz ($)
              </label>
              <PrecisionDecimalInput
                ariaLabel="Valor Neto Servicio Energia Principal"
                value={receipts.energia.principal.valorNetoServicio}
                minDecimals={0}
                maxDecimals={2}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    energia: {
                      ...receipts.energia,
                      principal: { ...receipts.energia.principal, valorNetoServicio: val },
                    },
                  })
                }
                className={inputClass}
              />
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block text-right mt-1 font-mono">
                Prorrateo: {formatCop(liveBagsSummary.bolsaProrrateoPrincipalCop)} ({formatCop(liveBagsSummary.tarifaProrrateoPrincipalM2, 1)}/m²)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)]">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                Bolsa 2 · Factura Neta Bodega Popular ($)
              </label>
              <PrecisionDecimalInput
                ariaLabel="Valor Factura Neto Bodega Popular"
                value={receipts.energia.bodegaPopular.valorFacturaNeto}
                minDecimals={0}
                maxDecimals={2}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    energia: {
                      ...receipts.energia,
                      bodegaPopular: {
                        ...receipts.energia.bodegaPopular,
                        valorFacturaNeto: val,
                      },
                    },
                  })
                }
                className={inputClass}
              />
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block text-right mt-1 font-mono">
                Prorrateo BP: {formatCop(liveBagsSummary.bolsaProrrateoBpCop)} ({formatCop(liveBagsSummary.tarifaProrrateoBpM2, 1)}/m²)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)]">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                Bolsa 3 · Neto Energía Red de Fríos ($)
              </label>
              <PrecisionDecimalInput
                ariaLabel="Valor Neto Energia Red de Frios"
                value={receipts.energia.redFrios.valorNetoServicio}
                minDecimals={0}
                maxDecimals={2}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    energia: {
                      ...receipts.energia,
                      redFrios: { ...receipts.energia.redFrios, valorNetoServicio: val },
                    },
                  })
                }
                className={inputClass}
              />
              <span className="text-[10px] text-[var(--text-muted)] block text-right mt-1 font-mono">
                Alumbrado Gral: {formatCop(liveBagsSummary.tarifaAlumbradoGeneralM2, 2)}/m²
              </span>
            </div>
          </div>
        </div>

        {/* ACUEDUCTO: TARIFA + 2 BOLSAS EDITABLES */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--outline-color)] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--outline-color)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                <Droplets className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">
                  2. Recibos Maestros de Acueducto y Alcantarillado (2 Bolsas)
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Factura General ({formatInt(receipts.acueducto.consumoTotalM3)} m³) · Red de Fríos · 16 Baños Públicos
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-[var(--text-muted)] block">Tarifa m³ Activa</span>
              <span className="text-base font-mono font-bold text-[var(--text-main)]">
                {formatCop(receipts.acueducto.tarifaM3, 2)} / m³
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)]">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                Tarifa Unitaria ($ / m³ = Mín. 1 m³)
              </label>
              <PrecisionDecimalInput
                ariaLabel="Tarifa Unitaria Acueducto m3"
                value={receipts.acueducto.tarifaM3}
                minDecimals={2}
                maxDecimals={2}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    acueducto: {
                      ...receipts.acueducto,
                      tarifaM3: val,
                      topeMinimaCop: val,
                    },
                  })
                }
                className={inputClass}
              />
              <span className="text-[10px] text-[var(--text-muted)] block text-right mt-1 font-mono">
                Tope Mínimo 1 m³ sincronizado
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)]">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                Bolsa 4 · Factura General EAAB ($)
              </label>
              <PrecisionDecimalInput
                ariaLabel="Factura General Acueducto"
                value={receipts.acueducto.valorFacturaGeneral}
                minDecimals={0}
                maxDecimals={2}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    acueducto: { ...receipts.acueducto, valorFacturaGeneral: val },
                  })
                }
                className={inputClass}
              />
              <span className="text-[10px] text-sky-600 dark:text-sky-400 block text-right mt-1 font-mono">
                Prorrateo Agua: {formatCop(liveBagsSummary.bolsaProrrateoAguaCop)} ({formatCop(liveBagsSummary.tarifaProrrateoAguaM2, 1)}/m²)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)]">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                Bolsa 5 · Factura Agua Red de Fríos ($)
              </label>
              <PrecisionDecimalInput
                ariaLabel="Factura Acueducto Red de Frios"
                value={receipts.acueducto.valorFacturaRedFrios}
                minDecimals={0}
                maxDecimals={2}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    acueducto: { ...receipts.acueducto, valorFacturaRedFrios: val },
                  })
                }
                className={inputClass}
              />
              <span className="text-[10px] text-sky-600 dark:text-sky-400 block text-right mt-1 font-mono">
                Factor: {formatCop(liveBagsSummary.tarifaRedFriosAguaM2, 2)}/m²
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] flex flex-col justify-between">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                Cargo Agua Comunal General (10%)
              </label>
              <div className="font-mono font-bold text-right text-sm text-[var(--text-main)] py-1">
                {formatCop(receipts.acueducto.bolsaAguaComunalGeneral)}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] block text-right font-mono">
                Área: {formatDec(receipts.acueducto.areaComunalGeneralM2, 1)} m² ({formatCop(liveBagsSummary.tarifaAguaComunalGeneralM2, 2)}/m²)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 EXPENSAS REGLAMENTARIAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--outline-color)] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-[var(--outline-color)] pb-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              <Users className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 block">
                PARTES IGUALES (SOLIDARIO)
              </span>
              <h3 className="text-sm font-bold text-[var(--text-main)]">3. Convenio Policía Nacional</h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
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
                      policia: { ...receipts.expensas.policia, valorFactura: val },
                    },
                  })
                }
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--outline-color)]">
              <span className="text-[var(--text-muted)]">Divisor Locales Arrendados:</span>
              <span className="font-mono font-bold text-[var(--text-main)]">
                {formatInt(receipts.expensas.policia.localesActivosDivisor)} locales
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
              <span className="font-semibold text-[var(--text-main)]">Cuota Fija por Local:</span>
              <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300">
                {formatCop(liveBagsSummary.cuotaPoliciaPorLocal, 2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--outline-color)] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-[var(--outline-color)] pb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Ruler className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                100% PROPORCIONAL AL ÁREA (M²)
              </span>
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                4. Vigilancia Privada & Barrido Aseo
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-[var(--text-main)] flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
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
                  className="w-40 bg-[var(--surface)] border border-[var(--outline-color)] rounded px-2 py-1 font-mono font-bold text-right text-[var(--text-main)]"
                />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                <span>Área: {formatDec(receipts.expensas.vigilancia.areaTotalM2, 2)} m²</span>
                <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCop(liveBagsSummary.tarifaVigilanciaM2, 2)} / m²
                </strong>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-[var(--text-main)] flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" strokeWidth={1.75} />
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
                        aseo: { ...receipts.expensas.aseo, valorNetoDistribuir: val },
                      },
                    })
                  }
                  className="w-40 bg-[var(--surface)] border border-[var(--outline-color)] rounded px-2 py-1 font-mono font-bold text-right text-[var(--text-main)]"
                />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                <span>Área: {formatDec(receipts.expensas.aseo.areaTotalM2, 2)} m²</span>
                <strong className="font-mono text-sky-600 dark:text-sky-400">
                  {formatCop(liveBagsSummary.tarifaAseoM2, 2)} / m²
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border-2 border-[#1E3A5F] dark:border-[#f7931b]/60 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-[var(--outline-color)] pb-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              <Trash2 className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block">
                VOLUMEN PGIRS + ÁREA (ART. 42)
              </span>
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                5. Residuos Sólidos ECSA (NP / MP / P)
              </h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-muted)] font-medium shrink-0">Neto ECSA ($):</span>
              <PrecisionDecimalInput
                ariaLabel="Valor Neto Prorratear ECSA"
                value={resCfg.valorNetoProrratear}
                minDecimals={0}
                maxDecimals={2}
                onChange={(val) =>
                  updateReceipts({
                    ...receipts,
                    expensas: {
                      ...receipts.expensas,
                      residuosEcsa: { ...resCfg, valorNetoProrratear: val },
                    },
                  })
                }
                className="w-44 bg-[var(--surface-alt)] border border-[var(--outline-color)] rounded px-2 py-1 font-mono font-bold text-right text-[var(--text-main)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-[var(--surface-alt)] border border-[var(--outline-color)]">
                <label className="text-[10px] font-bold text-[var(--text-muted)] block">Factor NP</label>
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
                        residuosEcsa: { ...resCfg, factorNP: val },
                      },
                    })
                  }
                  className="w-full mt-1 bg-[var(--surface)] border border-[var(--outline-color)] rounded px-2 py-1 font-mono font-bold text-right text-[var(--text-main)]"
                />
                <span className="text-[10px] font-mono text-[var(--text-muted)] block text-right mt-0.5">
                  {formatCop(liveBagsSummary.tarifaEfectivaNpM2, 2)}/m²
                </span>
              </div>

              <div className="p-2 rounded-lg bg-[var(--surface-alt)] border border-[var(--outline-color)]">
                <label className="text-[10px] font-bold text-[var(--text-muted)] block">Factor MP</label>
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
                        residuosEcsa: { ...resCfg, factorMP: val },
                      },
                    })
                  }
                  className="w-full mt-1 bg-[var(--surface)] border border-[var(--outline-color)] rounded px-2 py-1 font-mono font-bold text-right text-[var(--text-main)]"
                />
                <span className="text-[10px] font-mono text-[var(--text-muted)] block text-right mt-0.5">
                  {formatCop(liveBagsSummary.tarifaEfectivaMpM2, 2)}/m²
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--text-main)] flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.75} />
                  Categoría P (Saldo):
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Bolsa P: {formatCop(liveBagsSummary.bolsaRestantePCop)}
                </span>
              </div>
              <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                {formatCop(liveBagsSummary.tarifaEfectivaPM2, 2)} / m²
              </span>
            </div>
          </div>
        </div>
      </div>

      <CommunalMacrometersAuditTable />
    </div>
  );
}
