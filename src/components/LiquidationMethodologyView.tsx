"use client";

import React, { useState } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import { formatCop as fmtCop, formatDec as fmtNum, formatInt } from "@/lib/formatters";
import {
  BookOpen,
  Zap,
  Droplets,
  ShieldCheck,
  Users,
  Sparkles,
  Trash2,
  GitBranch,
  Info,
} from "lucide-react";

type MethodologyFilter =
  | "TODOS"
  | "ENERGIA_MATRIZ"
  | "ENERGIA_BP"
  | "ACUEDUCTO"
  | "VIGILANCIA_POLICIA_ASEO"
  | "RESIDUOS_VERDES";

const METHODOLOGY_TABS: { id: MethodologyFilter; label: string }[] = [
  { id: "TODOS", label: "Todos los Servicios (7)" },
  { id: "ENERGIA_MATRIZ", label: "1. Energía Predio Matriz" },
  { id: "ENERGIA_BP", label: "2. Energía Bodega Popular" },
  { id: "ACUEDUCTO", label: "3. Acueducto y Alcant." },
  { id: "VIGILANCIA_POLICIA_ASEO", label: "4-6. Vigilancia, Policía y Barrido" },
  { id: "RESIDUOS_VERDES", label: "7. Residuos Verdes (NP/MP/P)" },
];

export function LiquidationMethodologyView() {
  const { receipts, liveBagsSummary, locales, energyCommunal, waterCommunal } = useCorabastos();
  const [filter, setFilter] = useState<MethodologyFilter>("TODOS");

  const liveTotalLiquidadoCop = locales.reduce((acc, l) => acc + l.calcTotalCop, 0);
  const sharedEnergyLocales = locales.filter((l) => (l.energiaDivisorContador || 1) > 1).length;
  const sharedWaterLocales = locales.filter((l) => (l.aguaDivisorContador || 1) > 1).length;
  const zeroEnergyMeters = locales.filter(
    (l) => l.modalidadEnergia === "CONTADOR" && l.energiaConsumoIndivActualKw === 0
  ).length;

  const resCfg = receipts.expensas.residuosEcsa;

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* BARRA DE FILTRO DE REGLAS Y NOTA DE CONCILIACIÓN HISTÓRICA */}
      <div className="bg-[#0B132B] text-white rounded-xl p-4 border border-white/10 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#f7931b]" strokeWidth={1.75} />
              <span>Memoria de Cálculo y Reglas de Liquidación ({receipts.nombrePeriodo} · Directiva 033-06, Art. 42–47)</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {METHODOLOGY_TABS.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === btn.id
                    ? "bg-[#f7931b] text-slate-950 shadow-sm"
                    : "bg-white/10 text-slate-300 hover:bg-white/20"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2 font-mono">
          <span>
            <strong>Nota de Conciliación Forense:</strong> El total certificado T=0 de los 6 servicios en Junio 2025 es{" "}
            <strong className="text-emerald-400">$3.621.554.642 COP</strong> (Liquidación viva actual:{" "}
            <strong className="text-white">{fmtCop(liveTotalLiquidadoCop)} COP</strong>).
          </span>
          <span className="text-amber-300">
            En la hoja RESUMEN TOTAL del Excel original (Col. R) figura $3.861.030.410 porque sumó dos veces Acueducto (+$239.475.768).
          </span>
        </div>
      </div>

      {/* BLOQUE 1: ENERGÍA PREDIO MATRIZ (ENERGIA_) */}
      {(filter === "TODOS" || filter === "ENERGIA_MATRIZ") && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-400" strokeWidth={1.75} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  1. Energía Eléctrica — Predio Matriz (Hoja Excel: ENERGIA_ · 3.463 Locales)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Identifica 3 grupos operativos: Contadores Individuales, Bodegas/Contadores Comunales (con o sin Alero) y Prorrateo por Área.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/30 font-mono text-xs font-bold text-amber-300">
              Neto Servicio: {fmtCop(receipts.energia.principal.valorNetoServicio)}
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                  MODALIDAD A · CONTADORES
                </span>
                <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  Tarifa: {fmtCop(receipts.energia.tarifaKwh, 2)}/kWh
                </span>
              </div>
              <p className="text-[var(--text-main)] leading-relaxed">
                Se toma la diferencia de lectura del contador (<strong>Lectura Actual − Lectura Anterior = Consumo kWh</strong>), se multiplica por el valor del kWh y se suma el <strong>Alumbrado Público General (20%)</strong> + <strong>20% Sobrecosto CREG</strong>.
              </p>
              <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--outline-color)] font-mono text-[11px] space-y-1 text-[var(--text-main)]">
                <div className="text-[var(--text-muted)] font-bold">Fórmula Aplicada:</div>
                <div>1. Consumo kWh = (LecturaAct − LecturaAnt) ÷ N_compartidos</div>
                <div>2. Si la bodega tiene Alero: + (Consumo_Alero ÷ Área_Bodega × Área_Local)</div>
                <div>3. Base $ = MÁX({fmtCop(receipts.energia.principal.topeMinimaCop)}, Total_kWh × {fmtCop(receipts.energia.tarifaKwh, 2)})</div>
                <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                  4. Total = (Base $ + Área_m² × {fmtCop(liveBagsSummary.tarifaAlumbradoGeneralM2, 1)}) × 1,2 (CREG 20%)
                </div>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] flex items-start gap-1.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>
                  <strong className="text-[var(--text-main)]">Contadores en Cero ({formatInt(zeroEnergyMeters)} locales):</strong> Pagan el valor mínimo de{" "}
                  <strong>{fmtCop(receipts.energia.principal.topeMinimaCop)}</strong> más el Alumbrado Público por m² y el 20% CREG.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-mono text-[10px] font-bold">
                  MODALIDAD B · BODEGA COMUNAL & ALERO
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
                  {formatInt(energyCommunal.length)} Macromedidores
                </span>
              </div>
              <p className="text-[var(--text-main)] leading-relaxed">
                Una <strong>Bodega Comunal</strong> tiene un macromedidor general para varios locales. Primero se restan los consumos de los locales hijos que sí tienen contador individual dentro de esa bodega, y el consumo neto se divide entre el área comunal de la bodega.
              </p>
              <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--outline-color)] font-mono text-[11px] space-y-1 text-[var(--text-main)]">
                <div className="text-[var(--text-muted)] font-bold">Desacoplo Padre − Hijos (Hoja LECTURAS COMUNALES_):</div>
                <div>1. kWh_Neto_Bodega = (LectAct_Macro − LectAnt_Macro) − ∑ kWh_Hijos</div>
                <div>2. kWh_Local = (kWh_Neto_Bodega ÷ Área_Bodega) × Área_Local</div>
                <div>3. Si tiene Alero: se suma la misma formulación (kWh_Alero ÷ Área_Bodega × Área_Local)</div>
                <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                  4. Total = (kWh_Total × {fmtCop(receipts.energia.tarifaKwh, 2)} + Alumbrado_m²) × 1,2
                </div>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] flex items-start gap-1.5">
                <GitBranch className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>
                  <strong className="text-[var(--text-main)]">Contadores Compartidos ({formatInt(sharedEnergyLocales)} locales):</strong> Cuando N puestos comparten el mismo medidor y registran idéntica lectura, el consumo se divide exactamente entre N (<code>/2, /3, /4, /6, /8</code>).
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px] font-bold">
                  MODALIDAD C · PRORRATEO POR ÁREA
                </span>
                <span className="font-mono text-[11px] font-bold text-indigo-800 dark:text-indigo-400">
                  {fmtCop(liveBagsSummary.tarifaProrrateoPrincipalM2, 1)} / m² (+CREG)
                </span>
              </div>
              <p className="text-[var(--text-main)] leading-relaxed">
                Se toma el valor neto del servicio de la factura matriz y se le resta todo lo facturado por <strong>Contadores Individuales</strong> y <strong>Bodegas Comunales</strong>. La diferencia resultante se divide entre el área total de los locales en Prorrateo.
              </p>
              <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--outline-color)] font-mono text-[11px] space-y-1 text-[var(--text-main)]">
                <div className="text-[var(--text-muted)] font-bold">Cálculo Vivo de la Bolsa de Prorrateo:</div>
                <div>• Valor Neto Servicio Matriz: {fmtCop(receipts.energia.principal.valorNetoServicio, 1)}</div>
                <div>• (=) Bolsa Prorrateo Activa: <strong>{fmtCop(liveBagsSummary.bolsaProrrateoPrincipalCop, 1)}</strong></div>
                <div>• (÷) Área Total Prorrateo: <strong>{fmtNum(receipts.energia.principal.areaProrrateoM2, 1)} m²</strong></div>
                <div className="text-indigo-700 dark:text-indigo-400 font-bold">
                  • Factor Base: {fmtCop(liveBagsSummary.tarifaProrrateoPrincipalM2, 1)} / m² + Alumbrado ({fmtCop(liveBagsSummary.tarifaAlumbradoGeneralM2, 1)}/m²) + 20% CREG
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 2: ENERGÍA BODEGA POPULAR CONTADOR MACRO (ENERGIA BP) */}
      {(filter === "TODOS" || filter === "ENERGIA_BP") && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm overflow-hidden">
          <div className="bg-[#0B132B] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-[#f7931b]" strokeWidth={1.75} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  2. Energía Bodega Popular — Contador Macro (Hoja Excel: ENERGIA BP · 1.849 Puestos BP)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Bodegas 40 a 82 (Minorista y Mayorista). Separa locales con contador y sin contador bajo un Contador Macro de {fmtCop(receipts.energia.bodegaPopular.totalFactura)}.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#f7931b]/20 border border-[#f7931b]/40 font-mono text-xs font-bold text-[#f7931b]">
              Factura Neta BP: {fmtCop(receipts.energia.bodegaPopular.valorFacturaNeto)}
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] space-y-2.5">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                2A · LOCALES CON CONTADOR EN BODEGA POPULAR
              </span>
              <p className="text-[var(--text-main)] leading-relaxed">
                Se toma <strong>Lectura Actual − Lectura Anterior = Consumo × Valor kWh ({fmtCop(receipts.energia.tarifaKwh, 2)})</strong>. Adicionalmente, todo local asume su proporción del <strong>20% de la factura de Bodega Popular como Consumo Comunal de la Bodega</strong> ({fmtCop(receipts.energia.bodegaPopular.consumoComunal20Pct)} ÷ {fmtNum(receipts.energia.bodegaPopular.areaTotalM2, 1)} m² = <strong>{fmtCop(liveBagsSummary.tarifaComunalBpM2, 1)}/m²</strong>) + el <strong>20% de la factura general como Alumbrado Público</strong> ({fmtCop(liveBagsSummary.tarifaAlumbradoGeneralM2, 1)}/m²) + la sobretasa CREG del recibo BP (<strong>15,7%</strong>).
              </p>
              <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--outline-color)] font-mono text-[11px] space-y-1 text-[var(--text-main)]">
                <div>• <strong>Misma Lectura (Contadores Compartidos):</strong> En 35 puestos que comparten medidor (ej. 810077 al 810150 con lectura 32.652 → 34.223), la fórmula divide <code>(E − D) / N</code> (entre 2, 3, 6 u 8 puestos).</div>
                <div>• <strong>Contadores en Cero:</strong> Pagan el valor mínimo de <strong>{fmtCop(receipts.energia.bodegaPopular.topeMinimaCop)}</strong> + el 20% comunal BP + el 20% alumbrado público + 15,7% CREG.</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] space-y-2.5">
              <span className="px-2 py-0.5 rounded bg-amber-700 text-white font-mono text-[10px] font-bold">
                2B · PRORRATEO EN BODEGA POPULAR (SIN CONTADOR)
              </span>
              <p className="text-[var(--text-main)] leading-relaxed">
                Del valor neto de consumo de la factura de Bodega Popular (<strong>{fmtCop(receipts.energia.bodegaPopular.valorFacturaNeto)}</strong> después de separar el 20% comunal) se resta la suma total pagada por los locales con contador. El saldo restante se divide entre el área de los locales en prorrateo.
              </p>
              <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--outline-color)] font-mono text-[11px] space-y-1 text-[var(--text-main)]">
                <div>• Factura Neta BP (80%): {fmtCop(receipts.energia.bodegaPopular.valorFacturaNeto)}</div>
                <div>• (=) Bolsa Prorrateo BP Activa: <strong>{fmtCop(liveBagsSummary.bolsaProrrateoBpCop, 1)}</strong></div>
                <div>• (÷) Área Prorrateo BP: <strong>{fmtNum(receipts.energia.bodegaPopular.areaProrrateoM2, 1)} m²</strong></div>
                <div className="text-amber-800 dark:text-amber-400 font-bold">
                  • Factor Prorrateo BP: {fmtCop(liveBagsSummary.tarifaProrrateoBpM2, 1)} / m² + Comunal BP ({fmtCop(liveBagsSummary.tarifaComunalBpM2, 1)}/m²) + Alumbrado ({fmtCop(liveBagsSummary.tarifaAlumbradoGeneralM2, 1)}/m²) + 15,7% CREG
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 3: ACUEDUCTO Y ALCANTARILLADO */}
      {(filter === "TODOS" || filter === "ACUEDUCTO") && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm overflow-hidden">
          <div className="bg-sky-950 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Droplets className="w-5 h-5 text-sky-400" strokeWidth={1.75} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  3. Acueducto y Alcantarillado EAAB (Hoja Excel: ACUEDUCTO · {formatInt(waterCommunal.length)} Macros Comunales + 16 Baños)
                </h3>
                <p className="text-[11px] text-sky-200">
                  Integra la Factura General ({fmtCop(receipts.acueducto.valorFacturaGeneral)}), la Factura de Red de Fríos ({fmtCop(receipts.acueducto.valorFacturaRedFrios)}) y los 16 medidores de baterías sanitarias.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-sky-500/20 border border-sky-400/30 font-mono text-xs font-bold text-sky-300">
              Tarifa Unitaria: {fmtCop(receipts.acueducto.tarifaM3, 2)} / m³
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] space-y-2">
              <span className="px-2 py-0.5 rounded bg-sky-900 text-white font-mono text-[10px] font-bold">
                3A · CONTADORES Y COMUNALES DE BODEGA
              </span>
              <p className="text-[var(--text-main)] leading-relaxed">
                Cada local con medidor liquida <code>(LecturaAct − LecturaAnt) ÷ N_compartidos × {fmtCop(receipts.acueducto.tarifaM3, 2)}/m³</code> (con cobro mínimo de <strong>1 m³ = {fmtCop(receipts.acueducto.topeMinimaCop, 1)}</strong> si el consumo es cero). En las 24 bodegas con macromedidor de agua comunal (<code>AGUA COMUNAL</code>), se restan primero los contadores hijos ({formatInt(sharedWaterLocales)} compartidos auditados) y el neto se distribuye por m².
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] space-y-2">
              <span className="px-2 py-0.5 rounded bg-sky-900 text-white font-mono text-[10px] font-bold">
                3B · AGUA COMUNAL GENERAL (10% + BAÑOS)
              </span>
              <p className="text-[var(--text-main)] leading-relaxed">
                El 10% de la factura general menos el consumo medido en los <strong>16 Baños Públicos</strong> (1.565 m³) y asumidos corporativos conforma la bolsa de <strong>{fmtCop(receipts.acueducto.bolsaAguaComunalGeneral)}</strong>, dividida entre <strong>{fmtNum(receipts.acueducto.areaComunalGeneralM2, 1)} m²</strong> = <strong>{fmtCop(liveBagsSummary.tarifaAguaComunalGeneralM2, 2)} / m²</strong> para todos los locales.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] space-y-2">
              <span className="px-2 py-0.5 rounded bg-sky-900 text-white font-mono text-[10px] font-bold">
                3C · PRORRATEO Y RED DE FRÍOS
              </span>
              <p className="text-[var(--text-main)] leading-relaxed">
                La bolsa restante no medida (<strong>{fmtCop(liveBagsSummary.bolsaProrrateoAguaCop, 1)}</strong>) se divide entre los <strong>{fmtNum(receipts.acueducto.areaProrrateoM2, 1)} m²</strong> en modalidad Prorrateo (<strong>{fmtCop(liveBagsSummary.tarifaProrrateoAguaM2, 2)} / m²</strong>). En la Bodega 98 (Red de Fríos), su factura propia de {fmtCop(receipts.acueducto.valorFacturaRedFrios)} se divide entre {fmtNum(receipts.acueducto.areaRedFriosM2, 1)} m² (<strong>{fmtCop(liveBagsSummary.tarifaRedFriosAguaM2, 2)} / m²</strong>).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 4, 5 Y 6: VIGILANCIA, POLICÍA Y BARRIDO (ASEO) */}
      {(filter === "TODOS" || filter === "VIGILANCIA_POLICIA_ASEO") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--outline-color)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 block">
                    4. Hoja Excel: VIGILANCIA
                  </span>
                  <h3 className="text-sm font-black text-[var(--text-main)]">Vigilancia y Seguridad Privada</h3>
                </div>
              </div>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                {fmtCop(liveBagsSummary.tarifaVigilanciaM2, 2)} / m²
              </span>
            </div>
            <p className="text-[var(--text-main)] leading-relaxed">
              <strong>Regla Operativa del Cliente:</strong> Se toma el valor de la vigilancia, se resta el descuento/nota aplicable y el valor resultante se divide por el <strong>área total arrendada</strong>.
            </p>
            <div className="p-3 rounded-lg bg-[var(--surface-alt)] border border-[var(--outline-color)] font-mono text-[11px] space-y-1 text-[var(--text-main)]">
              <div>• Factura Bruta Finanzas: {fmtCop(receipts.expensas.vigilancia.valorFacturaBruto)}</div>
              <div>• (−) Notas Débito / Descuento: {fmtCop(receipts.expensas.vigilancia.notasDebito)}</div>
              <div>• (=) Valor Neto a Distribuir: <strong>{fmtCop(receipts.expensas.vigilancia.valorNetoDistribuir)}</strong></div>
              <div>• (÷) Área Arrendada: <strong>{fmtNum(receipts.expensas.vigilancia.areaTotalM2, 4)} m²</strong></div>
              <div className="text-emerald-700 dark:text-emerald-400 font-bold pt-1">
                • Fórmula Local: Área_Local_m² × {fmtCop(liveBagsSummary.tarifaVigilanciaM2, 2)} / m²
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--outline-color)] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-700 dark:text-indigo-400 block">
                    5. Hoja Excel: POLICIA
                  </span>
                  <h3 className="text-sm font-black text-[var(--text-main)]">Convenio Policía Nacional</h3>
                </div>
              </div>
              <span className="font-mono font-black text-indigo-700 dark:text-indigo-400 text-sm">
                {fmtCop(liveBagsSummary.cuotaPoliciaPorLocal, 2)} / local
              </span>
            </div>
            <p className="text-[var(--text-main)] leading-relaxed">
              <strong>Regla Operativa del Cliente:</strong> Se toma el <strong>valor total de la factura</strong> y se divide en partes iguales por el <strong>número de locales arrendados</strong> (sin importar los m² del local).
            </p>
            <div className="p-3 rounded-lg bg-[var(--surface-alt)] border border-[var(--outline-color)] font-mono text-[11px] space-y-1 text-[var(--text-main)]">
              <div>• Valor Total Factura (E5312): <strong>{fmtCop(receipts.expensas.policia.valorFactura)}</strong></div>
              <div>• (÷) N° Locales Arrendados (E5314): <strong>{formatInt(receipts.expensas.policia.localesActivosDivisor)} locales</strong></div>
              <div className="text-indigo-700 dark:text-indigo-400 font-bold pt-1">
                • Cuota Fija por Local: {fmtCop(receipts.expensas.policia.valorFactura)} ÷ {formatInt(receipts.expensas.policia.localesActivosDivisor)} = {fmtCop(liveBagsSummary.cuotaPoliciaPorLocal, 2)}
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline-color)] shadow-sm p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--outline-color)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" strokeWidth={1.75} />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-teal-700 dark:text-teal-400 block">
                    6. Hoja Excel: ASEO_
                  </span>
                  <h3 className="text-sm font-black text-[var(--text-main)]">Barrido y Aseo Zonas Comunes</h3>
                </div>
              </div>
              <span className="font-mono font-black text-teal-700 dark:text-teal-400 text-sm">
                {fmtCop(liveBagsSummary.tarifaAseoM2, 2)} / m²
              </span>
            </div>
            <p className="text-[var(--text-main)] leading-relaxed">
              <strong>Regla Operativa del Cliente:</strong> Se toma el valor transferido de barrido (20% a cargo de comerciantes más ajustes de operación) y se divide por el <strong>área total arrendada</strong>.
            </p>
            <div className="p-3 rounded-lg bg-[var(--surface-alt)] border border-[var(--outline-color)] font-mono text-[11px] space-y-1 text-[var(--text-main)]">
              <div>• Factura Operación Aseo: {fmtCop(receipts.expensas.aseo.valorFacturaOperacionTotal)}</div>
              <div>• (=) Valor Neto Barrido (C5313): <strong>{fmtCop(receipts.expensas.aseo.valorNetoDistribuir, 1)}</strong></div>
              <div>• (÷) Área Arrendada (B5305): <strong>{fmtNum(receipts.expensas.aseo.areaTotalM2, 4)} m²</strong></div>
              <div className="text-teal-700 dark:text-teal-400 font-bold pt-1">
                • Fórmula Local: Área_Local_m² × {fmtCop(liveBagsSummary.tarifaAseoM2, 2)} / m²
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 7: RESIDUOS VERDES (NP / MP / P) */}
      {(filter === "TODOS" || filter === "RESIDUOS_VERDES") && (
        <div className="bg-[var(--surface)] rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-5 h-5 text-rose-400" strokeWidth={1.75} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  7. Residuos Verdes y Orgánicos ECSA — Tres Tipos de Transferencia (Hoja Excel: RESIDUOS)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Caracterización ambiental PGIRS (Art. 42 y 43) en No Productor (NP), Mediano Productor (MP) y Gran Productor (P).
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-rose-500/20 border border-rose-400/30 font-mono text-xs font-bold text-rose-300">
              Neto a Prorratear: {fmtCop(resCfg.valorNetoProrratear, 2)}
            </span>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--outline-color)] space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block">
                  PASO 0 · DEPURACIÓN FACTURA ECSA
                </span>
                <div className="font-mono text-[11px] space-y-1 text-[var(--text-main)]">
                  <div>Factura Bruta: {fmtCop(resCfg.valorFacturaBruto, 2)}</div>
                  <div>(−) Básicos Fijos: {fmtCop(resCfg.valorBasicos, 2)}</div>
                  <div>(−) Notas Débito: {fmtCop(resCfg.notasDebito)}</div>
                  <div className="font-bold border-t border-[var(--outline-color)] pt-1">
                    Neto: {fmtCop(resCfg.valorNetoProrratear, 2)}
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                    Tarifa Base 100%: {fmtCop(liveBagsSummary.tarifaBaseResiduosM2, 2)} / m²
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-mono text-[10px] font-bold">
                  1. NO PRODUCTOR (NP)
                </span>
                <p className="text-[var(--text-main)]">
                  Transfiere el factor reducido (<strong>{fmtNum(resCfg.factorNP, 2)} de la tarifa base 100%/m²</strong>) a sus <strong>{fmtNum(resCfg.areaNpM2, 1)} m²</strong>.
                </p>
                <div className="font-mono text-[11px] pt-1 font-bold text-emerald-900 dark:text-emerald-300">
                  • Tarifa NP: {fmtCop(liveBagsSummary.tarifaEfectivaNpM2, 1)} / m²
                  <br />• Total NP: {fmtCop(liveBagsSummary.bolsaNpCop, 0)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-700 text-white font-mono text-[10px] font-bold">
                  2. MEDIANO PRODUCTOR (MP)
                </span>
                <p className="text-[var(--text-main)]">
                  Transfiere el factor intermedio (<strong>{fmtNum(resCfg.factorMP, 2)} de la tarifa base 100%/m²</strong>) a sus <strong>{fmtNum(resCfg.areaMpM2, 1)} m²</strong> identificados como MP.
                </p>
                <div className="font-mono text-[11px] pt-1 font-bold text-amber-900 dark:text-amber-300">
                  • Tarifa MP: {fmtCop(liveBagsSummary.tarifaEfectivaMpM2, 1)} / m²
                  <br />• Total MP: {fmtCop(liveBagsSummary.bolsaMpCop, 0)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-rose-700 text-white font-mono text-[10px] font-bold">
                  3. PRODUCTOR (P — PERECEDEROS)
                </span>
                <p className="text-[var(--text-main)]">
                  <strong>Regla Cliente:</strong> Se toma el <strong>restante después de descontar NP y MP</strong> ({fmtCop(liveBagsSummary.bolsaRestantePCop, 0)}) y se divide entre el área de los identificados <strong>P</strong> ({fmtNum(resCfg.areaPM2, 1)} m²).
                </p>
                <div className="font-mono text-[11px] pt-1 font-bold text-rose-900 dark:text-rose-300">
                  • Tarifa Efectiva P: {fmtCop(liveBagsSummary.tarifaEfectivaPM2, 1)} / m²
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
