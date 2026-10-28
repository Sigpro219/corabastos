"use client";

import React from "react";
import { ComputedLocalLiquidation } from "@/lib/liquidation-engine";
import { useCorabastos } from "@/context/CorabastosContext";
import { OccupancyStatus } from "@/contracts/domain-contracts";
import {
  X,
  Printer,
  Building2,
  Zap,
  Droplets,
  ShieldCheck,
  Trash2,
  Sparkles,
  Scale,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  FileCheck2,
} from "lucide-react";

interface LocalAccountModalProps {
  local: ComputedLocalLiquidation | null;
  onClose: () => void;
}

export function LocalAccountModal({ local, onClose }: LocalAccountModalProps) {
  const { receipts, energyCommunal, waterCommunal, updateLocalOccupancy } = useCorabastos();

  if (!local) return null;

  // Buscar macromedidores padre de la bodega del local
  const parentEnergyMacros = energyCommunal.filter((m) => m.bodegaId === local.bodegaId);
  const parentWaterMacros = waterCommunal.filter((m) => m.bodegaId === local.bodegaId);

  const occupancyStatus: OccupancyStatus =
    local.estadoOcupacion === "VACIO_CON_CONTRATO" ||
    local.estadoOcupacion === "VACIO_SIN_CONTRATO_CORPORACION"
      ? local.estadoOcupacion
      : "ACTIVO";
  const isBP = local.bloqueEnergia === "BODEGA_POPULAR";
  const factorEnergia = isBP ? 8 : 1;
  const cregPct = isBP ? 15.7 : 20.0;

  const energiaWithinProm =
    local.energiaPromMax === 0 ||
    (local.calcEnergiaCop >= local.energiaPromMin && local.calcEnergiaCop <= local.energiaPromMax);

  const aguaWithinProm =
    local.aguaPromMax === 0 ||
    (local.calcAcueductoCop >= local.aguaPromMin && local.calcAcueductoCop <= local.aguaPromMax);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* ENCABEZADO EXPEDIENTE INDIVIDUAL 360° */}
        <div className="bg-[#010F22] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300">
                  CUENTA INDIVIDUAL & RENDICIÓN DE CUENTAS · ART. 46 DIRECTIVA 033-06
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-[10px] font-bold">
                  CORTE {receipts.nombrePeriodo}
                </span>
              </div>
              <h2 className="text-xl font-mono font-black tracking-tight">
                LOCAL {local.codigo} · BODEGA {local.bodegaId} ({local.tipoBodega})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Certificado (PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              title="Cerrar expediente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CUERPO DEL EXPEDIENTE */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. FICHA TÉCNICA CATASTRAL Y ESTADO DE OCUPACIÓN / VACANCIA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Código Catastral
                </span>
                <span className="font-mono text-base font-black text-slate-900">{local.codigo}</span>
                <span className="text-[11px] text-slate-500 block">Bodega {local.bodegaId}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Área Ocupada
                </span>
                <span className="font-mono text-base font-black text-slate-900 tabular-nums">
                  {local.areaM2.toFixed(2)} m²
                </span>
                <span className="text-[11px] text-slate-500 block">{local.bloqueEnergia}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Modalidad Servicios
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 block">
                  E: {local.modalidadEnergia}
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 block">
                  A: {local.modalidadAcueducto}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Categoría PGIRS (Art. 42)
                </span>
                <span className="inline-flex px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-xs font-bold mt-0.5">
                  {local.categoriaResiduos}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Factor:{" "}
                  {local.categoriaResiduos === "NP"
                    ? "0.4x"
                    : local.categoriaResiduos === "MP"
                    ? "1.2x"
                    : local.categoriaResiduos === "P"
                    ? "Gran Productor"
                    : "Básico"}
                </span>
              </div>
            </div>

            {/* CONTROL DE ESTADO DE OCUPACIÓN / VACANCIA */}
            <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Estado Jurídico de Ocupación
                </span>
                <span className="text-[10px] font-mono text-slate-400">Simulador en Vivo</span>
              </div>
              <select
                value={occupancyStatus}
                onChange={(e) =>
                  updateLocalOccupancy(local.codigo, e.target.value as OccupancyStatus)
                }
                className="mt-2 w-full h-9 px-2.5 rounded-lg bg-slate-950 border border-white/20 font-mono text-xs text-white"
              >
                <option value="ACTIVO">ACTIVO (En Operación Comercial)</option>
                <option value="VACIO_CON_CONTRATO">
                  VACÍO / CERRADO CON CONTRATO (Paga Mínima + Expensas)
                </option>
                <option value="VACIO_SIN_CONTRATO_CORPORACION">
                  VACÍO SIN CONTRATO (Asumido por Corporación)
                </option>
              </select>
              <p className="text-[10px] text-slate-300 mt-2 leading-snug">
                {occupancyStatus === "ACTIVO" &&
                  "Liquida consumo medido/comunal + expensas completas a cargo del comerciante."}
                {occupancyStatus === "VACIO_CON_CONTRATO" &&
                  "Local cerrado con contrato vigente: consumo individual 0, cobra tarifa mínima + comunales m² + expensas."}
                {occupancyStatus === "VACIO_SIN_CONTRATO_CORPORACION" &&
                  "Local restituido a Corabastos: mantiene sus m² en el denominador (sin inflar tarifa a vecinos) y se imputa a VALOR ASUMIDO CORPORACIÓN."}
              </p>
            </div>
          </div>

          {/* 2. TRAZABILIDAD PADRE-HIJO DE MACROMEDIDORES DE LA BODEGA */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-emerald-600" />
              Trazabilidad Padre → Hijo: Macromedidores Comunales de la Bodega {local.bodegaId}
            </h3>
            {parentEnergyMacros.length === 0 && parentWaterMacros.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono">
                La Bodega {local.bodegaId} se liquida por bolsa general de prorrateo / medición directa sin macromedidor comunal exclusivo.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parentEnergyMacros.map((pm) => (
                  <div
                    key={pm.id}
                    className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{pm.codigo} (Energía {pm.tipo})</span>
                      <span className="text-amber-600">Serie: {pm.contadorSerie}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Bruto Bodega: <strong>{pm.consumoBruto} kWh</strong> − Hijos con Contador ({pm.hijosCount}):{" "}
                      <strong>{pm.consumoHijosDescontado} kWh</strong> = Neto Comunal:{" "}
                      <strong className="text-emerald-700">{pm.consumoNetoComunal} kWh</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Área Bodega: {pm.areaComunalM2} m² · Factor: {pm.factorPorM2.toFixed(4)} kWh/m²
                    </div>
                  </div>
                ))}
                {parentWaterMacros.map((wm) => (
                  <div
                    key={wm.id}
                    className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{wm.codigo} (Agua Comunal)</span>
                      <span className="text-sky-600">Serie: {wm.contadorSerie}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Bruto Bodega: <strong>{wm.consumoBruto} m³</strong> − Hijos con Contador ({wm.hijosCount}):{" "}
                      <strong>{wm.consumoHijosDescontado} m³</strong> = Neto Comunal:{" "}
                      <strong className="text-emerald-700">{wm.consumoNetoComunal} m³</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Área Comunal: {wm.areaComunalM2} m² · Factor: {wm.factorPorM2.toFixed(4)} m³/m²
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. DESGLOSE MATEMÁTICO DE LOS 6 SERVICIOS PÚBLICOS Y EXPENSAS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Desglose Forense por Servicio (Liquidación y Transferencia — Art. 46 Reglamento Interno)
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-mono text-[11px] uppercase">
                    <th className="py-2.5 px-3">Servicio / Plano</th>
                    <th className="py-2.5 px-3">Lecturas y Consumo Físico</th>
                    <th className="py-2.5 px-3">Fórmula Legal Aplicada (Art. 46)</th>
                    <th className="py-2.5 px-3">Banda Histórica (COP) / Obs</th>
                    <th className="py-2.5 px-3 text-right">Valor Liquidado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {/* 1. ENERGÍA */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>1. Energía Eléctrica</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Plano: {local.planos.energia || "PL109"} · {local.bloqueEnergia}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      <div>
                        Ant: <strong>{local.energiaLecturaAnt}</strong> → Act:{" "}
                        <strong>{local.energiaLecturaAct}</strong> ({factorEnergia}x)
                      </div>
                      <div>
                        Indiv: <strong>{local.energiaConsumoIndivKw.toFixed(1)} kWh</strong> (Mes ant:{" "}
                        {(local.energiaConsumoAntKw || 0).toFixed(1)} kWh)
                      </div>
                      <div className="text-slate-500">
                        Comunal: {local.energiaConsumoComunalKw.toFixed(1)} kWh · Alero:{" "}
                        {local.energiaConsumoAleroKw.toFixed(1)} kWh
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-700">
                      <div>Tarifa: ${receipts.energia.tarifaKwh.toFixed(2)}/kWh + Alumbrado m²</div>
                      <div>Sobretasa CREG: {cregPct}% · Mínima: $20.498</div>
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      {local.energiaPromMax > 0 ? (
                        <div className={energiaWithinProm ? "text-emerald-700" : "text-amber-700 font-bold"}>
                          ${local.energiaPromMin.toLocaleString("es-CO")} – $
                          {local.energiaPromMax.toLocaleString("es-CO")}
                        </div>
                      ) : (
                        <span className="text-slate-400">Sin banda histórica</span>
                      )}
                      <span className="block text-[10px] text-slate-500">
                        Obs: {local.energiaObs || "SIN NOVEDAD"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm tabular-nums">
                      ${local.calcEnergiaCop.toLocaleString("es-CO")}
                    </td>
                  </tr>

                  {/* 2. ACUEDUCTO Y ALCANTARILLADO */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-sky-500" />
                        <span>2. Acueducto y Alcant.</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Plano: {local.planos.agua || "PL008"} / {local.planos.alcan || "PL009"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      <div>
                        Ant: <strong>{local.aguaLecturaAnt}</strong> → Act:{" "}
                        <strong>{local.aguaLecturaAct}</strong>
                      </div>
                      <div>
                        Indiv: <strong>{local.aguaConsumoIndivM3.toFixed(1)} m³</strong> (Mes ant:{" "}
                        {(local.aguaConsumoAntM3 || 0).toFixed(1)} m³)
                      </div>
                      <div className="text-slate-500">
                        Comunal Bodega: {local.aguaConsumoComunalM3.toFixed(2)} m³
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-700">
                      <div>Tarifa: ${receipts.acueducto.tarifaM3.toFixed(2)}/m³ (Mín 1 m³)</div>
                      <div>+ Cuota Agua Comunal ($198,20/m²)</div>
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      {local.aguaPromMax > 0 ? (
                        <div className={aguaWithinProm ? "text-emerald-700" : "text-amber-700 font-bold"}>
                          ${local.aguaPromMin.toLocaleString("es-CO")} – $
                          {local.aguaPromMax.toLocaleString("es-CO")}
                        </div>
                      ) : (
                        <span className="text-slate-400">Prorrateo / Área</span>
                      )}
                      <span className="block text-[10px] text-slate-500">
                        Obs: {local.aguaObs || "SIN NOVEDAD"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm tabular-nums">
                      ${local.calcAcueductoCop.toLocaleString("es-CO")}
                    </td>
                  </tr>

                  {/* 3. ASEO */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>3. Aseo Zonas Comunes</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Plano: {local.planos.aseo || "PL003"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px]">Base: {local.areaM2.toFixed(2)} m²</td>
                    <td className="py-3 px-3 text-[11px] text-slate-700">
                      Factor Área: ${receipts.expensas.aseo.tarifaPorM2.toFixed(2)} / m²
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-500">20% Operación Comerciantes</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm tabular-nums">
                      ${local.calcAseoCop.toLocaleString("es-CO")}
                    </td>
                  </tr>

                  {/* 4. RESIDUOS PGIRS */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4 text-teal-600" />
                        <span>4. Residuos Sólidos (PGIRS)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Plano: {local.planos.ecsa || "AMB403"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      Categoría Generador: <strong>{local.categoriaResiduos}</strong>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-700">
                      Ponderado Área × Volumen (NP=0.4, MP=1.2, P=Saldo)
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-500">Art. 42 y 43 Reglamento</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm tabular-nums">
                      ${local.calcResiduosCop.toLocaleString("es-CO")}
                    </td>
                  </tr>

                  {/* 5. VIGILANCIA */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>5. Vigilancia Privada</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Plano: {local.planos.vigilancia || "PL086"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px]">Base: {local.areaM2.toFixed(2)} m²</td>
                    <td className="py-3 px-3 text-[11px] text-slate-700">
                      Factor Área: ${receipts.expensas.vigilancia.tarifaPorM2.toFixed(2)} / m²
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-500">Prorrateo Solidario m²</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm tabular-nums">
                      ${local.calcVigilanciaCop.toLocaleString("es-CO")}
                    </td>
                  </tr>

                  {/* 6. POLICÍA */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-blue-600" />
                        <span>6. Convenio Policía</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Plano: {local.planos.policia || "PL141"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px]">Divisor: 5.300 unidades</td>
                    <td className="py-3 px-3 text-[11px] text-slate-700">
                      Cuota Equitativa Partes Iguales ($40.638,61)
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-500">Cuota Fija Solidaria</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm tabular-nums">
                      ${local.calcPoliciaCop.toLocaleString("es-CO")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. RESUMEN DE CIERRE Y AUDITORÍA FORENSE DEL LOCAL */}
          <div className="bg-[#010F22] text-white rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  TOTAL LIQUIDACIÓN REAL (6 SERVICIOS SIN DUPLICIDAD): $
                  {local.calcTotalCop.toLocaleString("es-CO")} COP
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Mes Anterior: ${local.totalAnteriorCop.toLocaleString("es-CO")} COP (Variación:{" "}
                {(local.variacionTotalPct * 100).toFixed(1)}%)
              </p>
              {local.totalJunioCop > local.calcTotalCop && (
                <p className="text-[11px] text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Nota Forense: La col. R del Excel original muestra $
                    {local.totalJunioCop.toLocaleString("es-CO")} porque suma dos veces Acueducto ($
                    {local.acueductoCop.toLocaleString("es-CO")}).
                  </span>
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                {occupancyStatus === "VACIO_SIN_CONTRATO_CORPORACION"
                  ? "Imputado a Valor Asumido Corporación"
                  : "Total a Pagar Comerciante"}
              </span>
              <span className="text-2xl font-mono font-black text-emerald-400 tabular-nums">
                ${local.calcTotalCop.toLocaleString("es-CO")} COP
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
