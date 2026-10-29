"use client";

import React, { useState } from "react";
import { useCorabastos } from "@/context/CorabastosContext";
import {
  BookOpen,
  Zap,
  Droplets,
  ShieldCheck,
  Users,
  Sparkles,
  Trash2,
  GitBranch,
  Calculator,
  CheckCircle2,
  Info,
  Scale,
} from "lucide-react";

type MethodologyFilter =
  | "TODOS"
  | "ENERGIA_MATRIZ"
  | "ENERGIA_BP"
  | "ACUEDUCTO"
  | "VIGILANCIA_POLICIA_ASEO"
  | "RESIDUOS_VERDES";

function fmtCop(v: number, dec = 0): string {
  return `$${v.toLocaleString("es-CO", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })}`;
}

function fmtNum(v: number, dec = 2): string {
  return v.toLocaleString("es-CO", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function LiquidationMethodologyView() {
  const { receipts, locales, energyCommunal, waterCommunal } = useCorabastos();
  const [filter, setFilter] = useState<MethodologyFilter>("TODOS");

  const sharedEnergyLocales = locales.filter((l) => (l.energiaDivisorContador || 1) > 1).length;
  const sharedWaterLocales = locales.filter((l) => (l.aguaDivisorContador || 1) > 1).length;
  const zeroEnergyMeters = locales.filter(
    (l) => l.modalidadEnergia === "CONTADOR" && l.energiaConsumoIndivKw === 0
  ).length;

  const resCfg = receipts.expensas.residuosEcsa;
  const totalNpCop = resCfg.areaNpM2 * resCfg.tarifaEfectivaNpM2;
  const totalMpCop = resCfg.areaMpM2 * resCfg.tarifaEfectivaMpM2;
  const bolsaRestantePCop = resCfg.valorNetoProrratear - totalNpCop - totalMpCop;

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* CABECERA EJECUTIVA DE LA MEMORIA DE CÁLCULO */}
      <div className="bg-[#0B132B] text-white rounded-xl p-5 border border-white/10 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#f7931b]/15 border border-[#f7931b]/30 text-[#f7931b] text-[11px] font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} />
              Sub-Módulo 1.6 · Memoria de Cálculo & Reglas Oficiales de Liquidación
            </div>
            <h2 className="text-xl font-black tracking-tight">
              Explicación Paso a Paso de Cómo se Liquidó el Corte ({receipts.nombrePeriodo})
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-4xl">
              Documentación transparente y auditable de las reglas operativas del cliente y las fórmulas exactas del libro{" "}
              <span className="font-mono text-amber-300">06. LIQUIDACION JUNIO 2025.xlsm</span> (Directiva de Gerencia No. 033-06, Art. 42 al 47). Cero datos simulados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "TODOS", label: "Todos los Servicios (7)" },
                { id: "ENERGIA_MATRIZ", label: "1. Energía Predio Matriz" },
                { id: "ENERGIA_BP", label: "2. Energía Bodega Popular" },
                { id: "ACUEDUCTO", label: "3. Acueducto y Alcant." },
                { id: "VIGILANCIA_POLICIA_ASEO", label: "4-6. Vigilancia, Policía y Barrido" },
                { id: "RESIDUOS_VERDES", label: "7. Residuos Verdes (NP/MP/P)" },
              ] as { id: MethodologyFilter; label: string }[]
            ).map((btn) => (
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

        {/* CINTA RESUMEN DE PARÁMETROS MAESTROS DEL CORTE */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Tarifa Energía</span>
            <span className="text-base font-mono font-black text-amber-400">
              {fmtCop(receipts.energia.tarifaKwh, 2)} / kWh
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Alumbrado: {fmtCop(receipts.energia.alumbradoGeneral.tarifaPorM2, 2)}/m²
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Tarifa Acueducto</span>
            <span className="text-base font-mono font-black text-sky-400">
              {fmtCop(receipts.acueducto.tarifaM3, 2)} / m³
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Comunal Gral: $198,20/m²
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Vigilancia / m²</span>
            <span className="text-base font-mono font-black text-emerald-400">
              {fmtCop(receipts.expensas.vigilancia.tarifaPorM2, 2)} / m²
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Área: {fmtNum(receipts.expensas.vigilancia.areaTotalM2, 1)} m²
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Policía / Local</span>
            <span className="text-base font-mono font-black text-indigo-300">
              {fmtCop(receipts.expensas.policia.cuotaFijaPorLocal, 2)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Divisor: {receipts.expensas.policia.localesActivosDivisor} locales
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Barrido (Aseo) / m²</span>
            <span className="text-base font-mono font-black text-teal-300">
              {fmtCop(receipts.expensas.aseo.tarifaPorM2, 2)} / m²
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Área: {fmtNum(receipts.expensas.aseo.areaTotalM2, 1)} m²
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Residuos (NP / MP / P)</span>
            <span className="text-xs font-mono font-black text-rose-300 block mt-0.5">
              NP: {fmtCop(resCfg.tarifaEfectivaNpM2, 0)} · MP: {fmtCop(resCfg.tarifaEfectivaMpM2, 0)}
            </span>
            <span className="text-xs font-mono font-black text-amber-300 block">
              P: {fmtCop(resCfg.tarifaEfectivaPM2, 0)} / m²
            </span>
          </div>
        </div>
      </div>

      {/* BLOQUE 1: ENERGÍA PREDIO MATRIZ (ENERGIA_) */}
      {(filter === "TODOS" || filter === "ENERGIA_MATRIZ") && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-400" />
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
              Factura Total: {fmtCop(receipts.energia.principal.totalFactura)}
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            {/* 1A: CONTADORES */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                  MODALIDAD A · CONTADORES
                </span>
                <span className="font-mono text-[11px] font-bold text-amber-700">
                  Tarifa: {fmtCop(receipts.energia.tarifaKwh, 2)}/kWh
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Se toma la diferencia de lectura del contador (<strong>Lectura Actual − Lectura Anterior = Consumo kWh</strong>), se multiplica por el valor del kWh y se suma el <strong>Alumbrado Público General (20%)</strong> + <strong>20% Sobrecosto CREG</strong>.
              </p>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] space-y-1">
                <div className="text-slate-500 font-bold">Fórmula Aplicada:</div>
                <div className="text-slate-900">
                  1. Consumo kWh = (LecturaAct − LecturaAnt) ÷ N_compartidos
                </div>
                <div className="text-slate-900">
                  2. Si la bodega tiene Alero: + (Consumo_Alero ÷ Área_Bodega × Área_Local)
                </div>
                <div className="text-slate-900">
                  3. Base $ = MÁX({fmtCop(receipts.energia.principal.topeMinimaCop)}, Total_kWh × {fmtCop(receipts.energia.tarifaKwh, 2)})
                </div>
                <div className="text-emerald-700 font-bold">
                  4. Total = (Base $ + Área_m² × $929,46) × 1,20 (CREG 20%)
                </div>
              </div>
              <div className="text-[11px] text-slate-600 flex items-start gap-1.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Contadores en Cero ({zeroEnergyMeters} locales):</strong> Pagan el valor mínimo de{" "}
                  <strong>{fmtCop(receipts.energia.principal.topeMinimaCop)}</strong> más el Alumbrado Público por m² y el 20% CREG.
                </span>
              </div>
            </div>

            {/* 1B: BODEGA COMUNAL Y ALERO */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-mono text-[10px] font-bold">
                  MODALIDAD B · BODEGA COMUNAL & ALERO
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-800">
                  {energyCommunal.length} Macromedidores
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Una <strong>Bodega Comunal</strong> tiene un macromedidor general para varios locales. Primero se restan los consumos de los locales hijos que sí tienen contador individual dentro de esa bodega, y el consumo neto se divide entre el área comunal de la bodega.
              </p>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] space-y-1">
                <div className="text-slate-500 font-bold">Desacoplo Padre − Hijos (Hoja LECTURAS COMUNALES_):</div>
                <div className="text-slate-900">
                  1. kWh_Neto_Bodega = (LectAct_Macro − LectAnt_Macro) − ∑ kWh_Hijos
                </div>
                <div className="text-slate-900">
                  2. kWh_Local = (kWh_Neto_Bodega ÷ Área_Bodega) × Área_Local
                </div>
                <div className="text-slate-900">
                  3. Si tiene Alero: se suma la misma formulación (kWh_Alero ÷ Área_Bodega × Área_Local)
                </div>
                <div className="text-emerald-700 font-bold">
                  4. Total = (kWh_Total × $720,48 + Alumbrado_m²) × 1,20
                </div>
              </div>
              <div className="text-[11px] text-slate-600 flex items-start gap-1.5">
                <GitBranch className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Contadores Compartidos ({sharedEnergyLocales} locales):</strong> Cuando N puestos comparten el mismo medidor y registran idéntica lectura, el consumo se divide exactamente entre N (<code>/2, /3, /4, /6, /8</code>).
                </span>
              </div>
            </div>

            {/* 1C: PRORRATEO PREDIO MATRIZ */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px] font-bold">
                  MODALIDAD C · PRORRATEO POR ÁREA
                </span>
                <span className="font-mono text-[11px] font-bold text-indigo-800">
                  $10.548,66 / m² (+CREG)
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Se toma el valor neto del servicio de la factura matriz y se le resta todo lo facturado por <strong>Contadores Individuales</strong> y <strong>Bodegas Comunales</strong>. La diferencia resultante se divide entre el área total de los locales en Prorrateo.
              </p>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] space-y-1">
                <div className="text-slate-500 font-bold">Cálculo de la Bolsa de Prorrateo (Junio 2025):</div>
                <div className="text-slate-900">
                  • Valor Neto Servicio Matriz: {fmtCop(receipts.energia.principal.valorNetoServicio, 2)}
                </div>
                <div className="text-slate-900">
                  • (−) Total Contadores y Comunales: $318.017.402,04
                </div>
                <div className="text-slate-900">
                  • (=) Bolsa Prorrateo: <strong>{fmtCop(receipts.energia.principal.bolsaProrrateo, 2)}</strong>
                </div>
                <div className="text-slate-900">
                  • (÷) Área Total Prorrateo: <strong>{fmtNum(receipts.energia.principal.areaProrrateoM2, 3)} m²</strong>
                </div>
                <div className="text-indigo-700 font-bold">
                  • Factor Base: $10.548,66 / m² + Alumbrado ($929,46/m²) + 20% CREG
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 2: ENERGÍA BODEGA POPULAR CONTADOR MACRO (ENERGIA BP) */}
      {(filter === "TODOS" || filter === "ENERGIA_BP") && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-[#0B132B] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-[#f7931b]" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  2. Energía Bodega Popular — Contador Macro (Hoja Excel: ENERGIA BP · 1.851 Puestos)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Bodegas 40 a 82 (Minorista, Mayorista y B.P. 14). Separa locales con contador y sin contador bajo un Contador Macro de {fmtCop(receipts.energia.bodegaPopular.totalFactura)}.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#f7931b]/20 border border-[#f7931b]/40 font-mono text-xs font-bold text-[#f7931b]">
              Consumo: {fmtCop(receipts.energia.bodegaPopular.valorConsumoFactura)} + CREG: {fmtCop(receipts.energia.bodegaPopular.cregFactura)}
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                2A · LOCALES CON CONTADOR EN BODEGA POPULAR
              </span>
              <p className="text-slate-700 leading-relaxed">
                Se toma <strong>Lectura Actual − Lectura Anterior = Consumo × Valor kWh ($720,48)</strong>. Adicionalmente, todo local asume su proporción del <strong>20% de la factura de Bodega Popular como Consumo Comunal de la Bodega</strong> ({fmtCop(receipts.energia.bodegaPopular.consumoComunal20Pct)} ÷ {fmtNum(receipts.energia.bodegaPopular.areaTotalM2, 2)} m² = <strong>2,8313 kWh/m²</strong>) + el <strong>20% de la factura general como Alumbrado Público</strong> ($929,46/m²) + la sobretasa CREG del recibo BP (<strong>15,7%</strong>).
              </p>
              <div className="p-3 rounded-lg bg-white border border-slate-200 font-mono text-[11px] space-y-1">
                <div>• <strong>Misma Lectura (Contadores Compartidos):</strong> En 35 puestos que comparten medidor (ej. 810077 al 810150 con lectura 32.652 → 34.223), la fórmula divide <code>(E − D) / N</code> (entre 2, 3, 6 u 8 puestos).</div>
                <div>• <strong>Contadores en Cero:</strong> Pagan el valor mínimo de <strong>{fmtCop(receipts.energia.bodegaPopular.topeMinimaCop)}</strong> + el 20% comunal BP + el 20% alumbrado público + 15,7% CREG.</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="px-2 py-0.5 rounded bg-amber-700 text-white font-mono text-[10px] font-bold">
                2B · PRORRATEO EN BODEGA POPULAR (SIN CONTADOR)
              </span>
              <p className="text-slate-700 leading-relaxed">
                Del valor neto de consumo de la factura de Bodega Popular (<strong>{fmtCop(receipts.energia.bodegaPopular.valorFacturaNeto)}</strong> después de separar el 20% comunal) se resta la suma total pagada por los locales con contador (<strong>$33.856.075,68</strong>). El saldo restante se divide entre el área de los locales en prorrateo.
              </p>
              <div className="p-3 rounded-lg bg-white border border-slate-200 font-mono text-[11px] space-y-1">
                <div>• Factura Neta BP (80%): {fmtCop(receipts.energia.bodegaPopular.valorFacturaNeto)}</div>
                <div>• (−) Total Contadores BP: $33.856.075,68</div>
                <div>• (=) Bolsa Prorrateo BP: <strong>{fmtCop(receipts.energia.bodegaPopular.bolsaProrrateo, 2)}</strong></div>
                <div>• (÷) Área Prorrateo BP: <strong>{fmtNum(receipts.energia.bodegaPopular.areaProrrateoM2, 4)} m²</strong></div>
                <div className="text-amber-800 font-bold">
                  • Factor Prorrateo BP: $7.041,51 / m² + 20% Comunal BP ($2.039,92/m²) + Alumbrado ($929,46/m²) + 15,7% CREG
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 3: ACUEDUCTO Y ALCANTARILLADO */}
      {(filter === "TODOS" || filter === "ACUEDUCTO") && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-sky-950 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Droplets className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  3. Acueducto y Alcantarillado EAAB (Hoja Excel: ACUEDUCTO · {waterCommunal.length} Macros Comunales + 16 Baños)
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="px-2 py-0.5 rounded bg-sky-900 text-white font-mono text-[10px] font-bold">
                3A · CONTADORES Y COMUNALES DE BODEGA
              </span>
              <p className="text-slate-700">
                Cada local con medidor liquida <code>(LecturaAct − LecturaAnt) ÷ N_compartidos × $10.921,45/m³</code> (con cobro mínimo de <strong>1 m³ = $10.921,45</strong> si el consumo es cero). En las 24 bodegas con macromedidor de agua comunal (<code>AGUA COMUNAL</code>), se restan primero los contadores hijos ({sharedWaterLocales} compartidos auditados) y el neto se distribuye por m².
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="px-2 py-0.5 rounded bg-sky-900 text-white font-mono text-[10px] font-bold">
                3B · AGUA COMUNAL GENERAL (10% + BAÑOS)
              </span>
              <p className="text-slate-700">
                El 10% de la factura general ($23.412.311) menos el consumo medido en los <strong>16 Baños Públicos</strong> (1.565 m³) y asumidos corporativos conforma la bolsa de <strong>{fmtCop(receipts.acueducto.bolsaAguaComunalGeneral)}</strong>, dividida entre <strong>{fmtNum(receipts.acueducto.areaComunalGeneralM2, 2)} m²</strong> = <strong>$198,2038 / m²</strong> para todos los locales.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="px-2 py-0.5 rounded bg-sky-900 text-white font-mono text-[10px] font-bold">
                3C · PRORRATEO Y RED DE FRÍOS
              </span>
              <p className="text-slate-700">
                La bolsa restante no medida (<strong>{fmtCop(receipts.acueducto.bolsaProrrateo, 2)}</strong>) se divide entre los <strong>{fmtNum(receipts.acueducto.areaProrrateoM2, 2)} m²</strong> en modalidad Prorrateo (<strong>$1.249,44 / m²</strong>). En la Bodega 98 (Red de Fríos), su factura propia de {fmtCop(receipts.acueducto.valorFacturaRedFrios)} se divide entre {fmtNum(receipts.acueducto.areaRedFriosM2, 2)} m² (<strong>$708,30 / m²</strong>).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 4, 5 Y 6: VIGILANCIA, POLICÍA Y BARRIDO (ASEO) */}
      {(filter === "TODOS" || filter === "VIGILANCIA_POLICIA_ASEO") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 4. VIGILANCIA */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 block">
                    4. Hoja Excel: VIGILANCIA
                  </span>
                  <h3 className="text-sm font-black text-slate-900">Vigilancia y Seguridad Privada</h3>
                </div>
              </div>
              <span className="font-mono font-black text-emerald-700 text-sm">
                {fmtCop(receipts.expensas.vigilancia.tarifaPorM2, 2)} / m²
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              <strong>Regla Operativa del Cliente:</strong> Se toma el valor de la vigilancia, se resta el descuento/nota aplicable y el valor resultante se divide por el <strong>área total arrendada</strong>.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1">
              <div>• Factura Bruta Finanzas: {fmtCop(receipts.expensas.vigilancia.valorFacturaBruto)}</div>
              <div>• (−) Notas Débito / Descuento: {fmtCop(receipts.expensas.vigilancia.notasDebito)}</div>
              <div>• (=) Valor Neto a Distribuir: <strong>{fmtCop(receipts.expensas.vigilancia.valorNetoDistribuir)}</strong></div>
              <div>• (÷) Área Arrendada: <strong>{fmtNum(receipts.expensas.vigilancia.areaTotalM2, 4)} m²</strong></div>
              <div className="text-emerald-700 font-bold pt-1">
                • Fórmula Local: Área_Local_m² × $13.785,9124 / m²
              </div>
            </div>
          </div>

          {/* 5. POLICÍA */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-700 block">
                    5. Hoja Excel: POLICIA
                  </span>
                  <h3 className="text-sm font-black text-slate-900">Convenio Policía Nacional</h3>
                </div>
              </div>
              <span className="font-mono font-black text-indigo-700 text-sm">
                {fmtCop(receipts.expensas.policia.cuotaFijaPorLocal, 2)} / local
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              <strong>Regla Operativa del Cliente:</strong> Se toma el <strong>valor total de la factura</strong> y se divide en partes iguales por el <strong>número de locales arrendados</strong> (sin importar los m² del local).
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1">
              <div>• Valor Total Factura (E5312): <strong>{fmtCop(receipts.expensas.policia.valorFactura)}</strong></div>
              <div>• (÷) N° Locales Arrendados (E5314): <strong>{receipts.expensas.policia.localesActivosDivisor} locales</strong></div>
              <div className="text-indigo-700 font-bold pt-1">
                • Cuota Fija por Local: $215.384.615 ÷ 5.300 = $40.638,61
              </div>
            </div>
          </div>

          {/* 6. BARRIDO / ASEO */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-teal-700 block">
                    6. Hoja Excel: ASEO_
                  </span>
                  <h3 className="text-sm font-black text-slate-900">Barrido y Aseo Zonas Comunes</h3>
                </div>
              </div>
              <span className="font-mono font-black text-teal-700 text-sm">
                {fmtCop(receipts.expensas.aseo.tarifaPorM2, 2)} / m²
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              <strong>Regla Operativa del Cliente:</strong> Se toma el valor transferido de barrido (20% a cargo de comerciantes más ajustes de operación) y se divide por el <strong>área total arrendada</strong>.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1">
              <div>• Factura Operación Aseo: {fmtCop(receipts.expensas.aseo.valorFacturaOperacionTotal)}</div>
              <div>• (=) Valor Neto Barrido (C5313): <strong>{fmtCop(receipts.expensas.aseo.valorNetoDistribuir, 1)}</strong></div>
              <div>• (÷) Área Arrendada (B5305): <strong>{fmtNum(receipts.expensas.aseo.areaTotalM2, 4)} m²</strong></div>
              <div className="text-teal-700 font-bold pt-1">
                • Fórmula Local: Área_Local_m² × $1.631,1436 / m²
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 7: RESIDUOS VERDES (NP / MP / P) */}
      {(filter === "TODOS" || filter === "RESIDUOS_VERDES") && (
        <div className="bg-white rounded-xl border-2 border-slate-900 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-5 h-5 text-rose-400" />
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
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                  PASO 0 · DEPURACIÓN FACTURA ECSA
                </span>
                <div className="font-mono text-[11px] space-y-1">
                  <div>Factura Bruta: {fmtCop(resCfg.valorFacturaBruto, 2)}</div>
                  <div>(−) Básicos Fijos: {fmtCop(resCfg.valorBasicos, 2)}</div>
                  <div>(−) Notas Débito: {fmtCop(resCfg.notasDebito)}</div>
                  <div className="font-bold text-slate-900 border-t border-slate-200 pt-1">
                    Neto: {fmtCop(resCfg.valorNetoProrratear, 2)}
                  </div>
                  <div className="text-emerald-700 font-bold">
                    Tarifa Base 100%: {fmtCop(resCfg.tarifaBaseM2, 2)} / m²
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-mono text-[10px] font-bold">
                  1. NO PRODUCTOR (NP)
                </span>
                <p className="text-slate-700">
                  Transfiere el factor reducido (<strong>0,40 de la tarifa base 100%/m²</strong>, equivalente a ~17,86% de la factura neta) a sus <strong>{fmtNum(resCfg.areaNpM2, 2)} m²</strong>.
                </p>
                <div className="font-mono text-[11px] pt-1 font-bold text-emerald-900">
                  • Tarifa NP: {fmtCop(resCfg.tarifaEfectivaNpM2, 2)} / m²
                  <br />• Total NP: {fmtCop(totalNpCop, 0)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-700 text-white font-mono text-[10px] font-bold">
                  2. MEDIANO PRODUCTOR (MP)
                </span>
                <p className="text-slate-700">
                  Transfiere el factor intermedio (<strong>1,20 de la tarifa base 100%/m²</strong>) a sus <strong>{fmtNum(resCfg.areaMpM2, 2)} m²</strong> identificados como MP.
                </p>
                <div className="font-mono text-[11px] pt-1 font-bold text-amber-900">
                  • Tarifa MP: {fmtCop(resCfg.tarifaEfectivaMpM2, 2)} / m²
                  <br />• Total MP: {fmtCop(totalMpCop, 0)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-rose-700 text-white font-mono text-[10px] font-bold">
                  3. PRODUCTOR (P — PERECEDEROS)
                </span>
                <p className="text-slate-700">
                  <strong>Regla Cliente:</strong> Se toma el <strong>restante después de descontar NP y MP</strong> ({fmtCop(bolsaRestantePCop, 0)}) y se divide entre el área de los identificados <strong>P</strong> ({fmtNum(resCfg.areaPM2, 2)} m²).
                </p>
                <div className="font-mono text-[11px] pt-1 font-bold text-rose-900">
                  • Tarifa Efectiva P: {fmtCop(resCfg.tarifaEfectivaPM2, 2)} / m²
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
