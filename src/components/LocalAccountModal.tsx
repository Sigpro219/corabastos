"use client";

import React from "react";
import { ComputedLocalLiquidation } from "@/lib/liquidation-engine";
import { useCorabastos } from "@/context/CorabastosContext";
import { isRedFriosModality, OccupancyStatus, OccupancyStatusSchema } from "@/contracts/domain-contracts";
import { CorabastosBrandLogo } from "@/components/CorabastosBrandLogo";
import { formatCop, formatDec, formatInt, formatPct } from "@/lib/formatters";
import {
  Building2,
  CheckCircle2,
  Droplets,
  GitBranch,
  Printer,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";

interface LocalAccountModalProps {
  local: ComputedLocalLiquidation | null;
  onClose: () => void;
}

export function LocalAccountModal({ local, onClose }: LocalAccountModalProps) {
  const { receipts, liveBagsSummary, energyCommunal, waterCommunal, updateLocalOccupancy } = useCorabastos();

  if (!local) return null;

  const parentEnergyMacros = energyCommunal.filter((m) => m.bodegaId === local.bodegaId);
  const parentWaterMacros = waterCommunal.filter((m) => m.bodegaId === local.bodegaId);

  const occupancyStatus: OccupancyStatus = local.effectiveOccupancy;
  const isAssumedCorp = occupancyStatus === "VACIO_SIN_CONTRATO_CORPORACION";
  const isBP = local.bloqueEnergia === "BODEGA_POPULAR";
  const divisorEnergia = Math.max(1, local.energiaDivisorContador || 1);
  const divisorAgua = Math.max(1, local.aguaDivisorContador || 1);
  const cregDisplay = isBP ? "15,7%" : "20,0%";

  const totalKwhActual =
    local.energiaConsumoIndivActualKw +
    local.energiaConsumoComunalActualKw +
    local.energiaConsumoAleroActualKw;
  const totalM3Actual =
    local.aguaConsumoIndivActualM3 + local.aguaConsumoComunalActualM3;
  const costoTecnico6ServiciosCop =
    local.calcTotalCop + local.calcAssumedCorporationCop;

  const energiaWithinProm =
    local.energiaPromMax === 0 ||
    (local.calcEnergiaCop >= local.energiaPromMin && local.calcEnergiaCop <= local.energiaPromMax);

  const aguaWithinProm =
    local.aguaPromMax === 0 ||
    (local.calcAcueductoCop >= local.aguaPromMin && local.calcAcueductoCop <= local.aguaPromMax);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:static print:block print:bg-white print:p-0 print:overflow-visible">
      <div
        id="golden-print-certificate"
        className="bg-[var(--surface)] text-[var(--text-main)] rounded-2xl border border-[var(--outline-color)] shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden print:bg-white print:text-slate-950 print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-0"
      >
        <div className="bg-[#0B132B] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 print:rounded-xl print:px-4 print:py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-white/20 flex items-center justify-center p-1 shadow-xs">
              <CorabastosBrandLogo variant="isotipo" size={32} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-emerald-300">
                  CERTIFICADO DE CUENTA INDIVIDUAL 360° · DIRECTIVA 033-06 ART. 46
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-[10px] font-bold">
                  CORTE {receipts.nombrePeriodo}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-mono font-black tracking-tight">
                LOCAL {local.codigo} · BODEGA {local.bodegaId} ({local.tipoBodega})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Printer className="w-4 h-4" strokeWidth={1.75} />
              <span>Imprimir Certificado (PDF Carta)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              title="Cerrar expediente"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 print:overflow-visible print:p-0 print:pt-3 print:space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 print:grid-cols-3">
            <div className="lg:col-span-2 bg-[var(--surface-alt)] print:bg-slate-50 rounded-xl p-3.5 border border-[var(--outline-color)] print:border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] print:text-slate-500 block">
                  Código Catastral
                </span>
                <span className="font-mono text-base font-black">{local.codigo}</span>
                <span className="text-[11px] text-[var(--text-muted)] print:text-slate-600 block">
                  Bodega {local.bodegaId}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] print:text-slate-500 block">
                  Área Ocupada
                </span>
                <span className="font-mono text-base font-black tabular-nums">
                  {formatDec(local.areaM2, 2)} m²
                </span>
                <span className="text-[11px] text-[var(--text-muted)] print:text-slate-600 block">
                  {local.bloqueEnergia}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] print:text-slate-500 block">
                  Modalidad Servicios
                </span>
                <span className="font-mono text-xs font-bold block">
                  E: {local.modalidadEnergia}
                </span>
                <span className="font-mono text-xs font-bold block">
                  A: {local.modalidadAcueducto}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] print:text-slate-500 block">
                  Categoría PGIRS (Art. 42)
                </span>
                <span className="inline-flex px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-xs font-bold mt-0.5">
                  {local.categoriaResiduos}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] print:text-slate-600 block mt-0.5">
                  Factor:{" "}
                  {local.categoriaResiduos === "NP"
                    ? `${formatDec(receipts.expensas.residuosEcsa.factorNP, 1)}x`
                    : local.categoriaResiduos === "MP"
                    ? `${formatDec(receipts.expensas.residuosEcsa.factorMP, 1)}x`
                    : local.categoriaResiduos === "P"
                    ? "Gran Productor"
                    : "Básico"}
                </span>
              </div>
            </div>

            <div className="bg-[#0B132B] text-white rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Estado de Ocupación
                </span>
                <span className="text-[10px] font-mono text-slate-300">{occupancyStatus}</span>
              </div>
              <select
                value={occupancyStatus}
                onChange={(e) => {
                  const parsed = OccupancyStatusSchema.safeParse(e.target.value);
                  if (parsed.success) {
                    updateLocalOccupancy(local.codigo, parsed.data);
                  }
                }}
                className="no-print mt-2 w-full h-9 px-2.5 rounded-lg bg-slate-950 border border-white/20 font-mono text-xs text-white"
              >
                <option value="ACTIVO">ACTIVO (En Operación Comercial)</option>
                <option value="VACIO_CON_CONTRATO">
                  VACÍO / CERRADO CON CONTRATO (Mínima + Expensas)
                </option>
                <option value="VACIO_SIN_CONTRATO_CORPORACION">
                  VACÍO SIN CONTRATO (Asumido por Corporación)
                </option>
              </select>
              <p className="text-[10px] text-slate-300 mt-2 leading-snug">
                {occupancyStatus === "ACTIVO" &&
                  "Liquida consumo medido/comunal + 4 expensas a cargo del comerciante."}
                {occupancyStatus === "VACIO_CON_CONTRATO" &&
                  "Consumo individual 0: cobra tarifa mínima + comunales m² + expensas."}
                {occupancyStatus === "VACIO_SIN_CONTRATO_CORPORACION" &&
                  "Restituido a Corabastos: conserva m² en denominador e imputa el costo a Asumido Corporación."}
              </p>
            </div>
          </div>

          <div className="bg-[var(--surface-alt)] print:bg-slate-50 rounded-xl p-3.5 border border-[var(--outline-color)] print:border-slate-300 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
              Trazabilidad Padre → Hijo: Macromedidores Comunales Bodega {local.bodegaId}
            </h3>
            {parentEnergyMacros.length === 0 && parentWaterMacros.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] print:text-slate-600 font-mono">
                La Bodega {local.bodegaId} se liquida por bolsa general de prorrateo / medición directa sin macromedidor comunal exclusivo.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 print:grid-cols-2">
                {parentEnergyMacros.map((pm) => (
                  <div
                    key={pm.id}
                    className="bg-[var(--surface)] print:bg-white p-2.5 rounded-lg border border-[var(--outline-color)] print:border-slate-300 text-xs font-mono space-y-0.5"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{pm.codigo} (Energía {pm.tipo})</span>
                      <span className="text-amber-600">Serie: {pm.contadorSerie}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] print:text-slate-700">
                      Bruto: <strong>{formatDec(pm.consumoBruto, 2)} kWh</strong> − Hijos ({formatInt(pm.hijosCount)}):{" "}
                      <strong>{formatDec(pm.consumoHijosDescontado, 2)} kWh</strong> = Neto:{" "}
                      <strong className="text-emerald-600">{formatDec(pm.consumoNetoComunal, 2)} kWh</strong>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] print:text-slate-600">
                      Área: {formatDec(pm.areaComunalM2, 2)} m² · Factor: {formatDec(pm.factorPorM2, 4)} kWh/m²
                    </div>
                  </div>
                ))}
                {parentWaterMacros.map((wm) => (
                  <div
                    key={wm.id}
                    className="bg-[var(--surface)] print:bg-white p-2.5 rounded-lg border border-[var(--outline-color)] print:border-slate-300 text-xs font-mono space-y-0.5"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{wm.codigo} (Agua Comunal)</span>
                      <span className="text-sky-600">Serie: {wm.contadorSerie}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] print:text-slate-700">
                      Bruto: <strong>{formatDec(wm.consumoBruto, 2)} m³</strong> − Hijos ({formatInt(wm.hijosCount)}):{" "}
                      <strong>{formatDec(wm.consumoHijosDescontado, 2)} m³</strong> = Neto:{" "}
                      <strong className="text-emerald-600">{formatDec(wm.consumoNetoComunal, 2)} m³</strong>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] print:text-slate-600">
                      Área: {formatDec(wm.areaComunalM2, 2)} m² · Factor: {formatDec(wm.factorPorM2, 4)} m³/m²
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Desglose Reglamentario de los 6 Servicios Públicos y Expensas (Art. 42–47)
            </h3>
            <div className="overflow-x-auto print:overflow-visible border border-[var(--outline-color)] print:border-slate-300 rounded-xl">
              <table
                style={{ borderCollapse: "separate", borderSpacing: 0 }}
                className="w-full text-left text-xs"
              >
                <thead>
                  <tr className="bg-[#0B132B] text-white font-mono text-[10.5px] uppercase">
                    <th className="py-2 px-3">Servicio / Plano</th>
                    <th className="py-2 px-3">Lecturas y Consumo Actual</th>
                    <th className="py-2 px-3">Fórmula Aplicada</th>
                    <th className="py-2 px-3">Referencia Mayo / Obs</th>
                    <th className="py-2 px-3 text-right">Valor Causado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-color)] print:divide-slate-200 font-mono">
                  <tr>
                    <td className="py-2.5 px-3 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
                        <span>1. Energía Eléctrica</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] print:text-slate-500 block">
                        Plano: {local.planos.energia || "PL109"} · {local.bloqueEnergia}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <div>
                        Ant: <strong>{formatInt(local.energiaLecturaAnt)}</strong> → Act:{" "}
                        <strong>{formatInt(local.energiaLecturaAct)}</strong>{" "}
                        {divisorEnergia > 1 ? `(/${formatInt(divisorEnergia)})` : ""}
                      </div>
                      <div>
                        Indiv: <strong>{formatDec(local.energiaConsumoIndivActualKw, 2)} kWh</strong>
                      </div>
                      <div className="text-[var(--text-muted)] print:text-slate-600">
                        Comunal: {formatDec(local.energiaConsumoComunalActualKw, 2)} · Alero:{" "}
                        {formatDec(local.energiaConsumoAleroActualKw, 2)} kWh
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <div>
                        {local.modalidadEnergia === "PRORRATEO"
                          ? `${formatDec(local.areaM2, 2)} m² × ${formatCop(isBP ? liveBagsSummary.tarifaProrrateoBpM2 : liveBagsSummary.tarifaProrrateoPrincipalM2, 2)}/m²`
                          : isRedFriosModality(local.modalidadEnergia)
                          ? `Bolsa Red de Fríos (${formatCop(receipts.energia.redFrios.valorNetoServicio)})`
                          : `${formatDec(totalKwhActual, 2)} kWh × ${formatCop(receipts.energia.tarifaKwh, 2)}`}
                      </div>
                      <div className="text-[var(--text-muted)] print:text-slate-600">
                        + Alumbrado ({formatCop(liveBagsSummary.tarifaAlumbradoGeneralM2, 2)}/m²) +{" "}
                        {cregDisplay} CREG
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {local.energiaPromMax > 0 ? (
                        <div className={energiaWithinProm ? "text-emerald-600" : "text-amber-600 font-bold"}>
                          {formatCop(local.energiaPromMin)} – {formatCop(local.energiaPromMax)}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">Mayo: {formatCop(local.energiaAnteriorCop ?? 0)}</span>
                      )}
                      <span className="block text-[10px] text-[var(--text-muted)] print:text-slate-500">
                        Obs: {local.energiaObs || "SIN NOVEDAD"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-sm tabular-nums">
                      {formatCop(local.calcEnergiaCop)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-sky-500" strokeWidth={1.75} />
                        <span>2. Acueducto y Alcant.</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] print:text-slate-500 block">
                        Plano: {local.planos.agua || "PL008"} / {local.planos.alcan || "PL009"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <div>
                        Ant: <strong>{formatInt(local.aguaLecturaAnt)}</strong> → Act:{" "}
                        <strong>{formatInt(local.aguaLecturaAct)}</strong>{" "}
                        {divisorAgua > 1 ? `(/${formatInt(divisorAgua)})` : ""}
                      </div>
                      <div>
                        Indiv: <strong>{formatDec(local.aguaConsumoIndivActualM3, 2)} m³</strong> · Comunal:{" "}
                        <strong>{formatDec(local.aguaConsumoComunalActualM3, 2)} m³</strong>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <div>
                        {local.modalidadAcueducto === "PRORRATEO"
                          ? `${formatDec(local.areaM2, 2)} m² × ${formatCop(liveBagsSummary.tarifaProrrateoAguaM2, 2)}/m²`
                          : isRedFriosModality(local.modalidadAcueducto)
                          ? `${formatDec(local.areaM2, 2)} m² × ${formatCop(liveBagsSummary.tarifaRedFriosAguaM2, 2)}/m²`
                          : `${formatDec(totalM3Actual, 2)} m³ × ${formatCop(receipts.acueducto.tarifaM3, 2)}`}
                      </div>
                      <div className="text-[var(--text-muted)] print:text-slate-600">
                        + Agua Comunal Gral ({formatCop(liveBagsSummary.tarifaAguaComunalGeneralM2, 2)}/m²)
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {local.aguaPromMax > 0 ? (
                        <div className={aguaWithinProm ? "text-emerald-600" : "text-amber-600 font-bold"}>
                          {formatCop(local.aguaPromMin)} – {formatCop(local.aguaPromMax)}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">Mayo: {formatCop(local.acueductoAnteriorCop ?? 0)}</span>
                      )}
                      <span className="block text-[10px] text-[var(--text-muted)] print:text-slate-500">
                        Obs: {local.aguaObs || "SIN NOVEDAD"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-sm tabular-nums">
                      {formatCop(local.calcAcueductoCop)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                        <span>3. Barrido / Aseo Comunal</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] print:text-slate-500 block">
                        Plano: {local.planos.aseo || "PL003"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">Base: {formatDec(local.areaM2, 2)} m²</td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {formatDec(local.areaM2, 2)} m² × {formatCop(liveBagsSummary.tarifaAseoM2, 2)}/m²
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[var(--text-muted)] print:text-slate-600">
                      Mayo: {formatCop(local.aseoAnteriorCop ?? 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-sm tabular-nums">
                      {formatCop(local.calcAseoCop)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-teal-600" strokeWidth={1.75} />
                        <span>4. Residuos Sólidos ECSA</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] print:text-slate-500 block">
                        Plano: {local.planos.ecsa || "AMB403"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      Cat: <strong>{local.categoriaResiduos}</strong> ({formatDec(local.areaM2, 2)} m²)
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {local.categoriaResiduos === "NP"
                        ? `${formatDec(local.areaM2, 2)} m² × ${formatCop(liveBagsSummary.tarifaEfectivaNpM2, 2)}/m² (NP)`
                        : local.categoriaResiduos === "MP"
                        ? `${formatDec(local.areaM2, 2)} m² × ${formatCop(liveBagsSummary.tarifaEfectivaMpM2, 2)}/m² (MP)`
                        : local.categoriaResiduos === "P"
                        ? `${formatDec(local.areaM2, 2)} m² × ${formatCop(liveBagsSummary.tarifaEfectivaPM2, 2)}/m² (P)`
                        : `Básicos Fijos (${formatCop(receipts.expensas.residuosEcsa.valorBasicos)})`}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[var(--text-muted)] print:text-slate-600">
                      Mayo: {formatCop(local.residuosAnteriorCop ?? 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-sm tabular-nums">
                      {formatCop(local.calcResiduosCop)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-bold">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.75} />
                        <span>5. Vigilancia Privada</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] print:text-slate-500 block">
                        Plano: {local.planos.vigilancia || "PL086"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">Base: {formatDec(local.areaM2, 2)} m²</td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {formatDec(local.areaM2, 2)} m² × {formatCop(liveBagsSummary.tarifaVigilanciaM2, 2)}/m²
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[var(--text-muted)] print:text-slate-600">
                      Mayo: {formatCop(local.vigilanciaAnteriorCop ?? 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-sm tabular-nums">
                      {formatCop(local.calcVigilanciaCop)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.75} />
                        <span>6. Convenio Policía</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] print:text-slate-500 block">
                        Plano: {local.planos.policia || "PL141"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      Divisor: {formatInt(receipts.expensas.policia.localesActivosDivisor)} locales
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {formatCop(receipts.expensas.policia.valorFactura)} ÷{" "}
                      {formatInt(receipts.expensas.policia.localesActivosDivisor)} ={" "}
                      {formatCop(liveBagsSummary.cuotaPoliciaPorLocal, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[var(--text-muted)] print:text-slate-600">
                      Mayo: {formatCop(local.policiaAnteriorCop ?? 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-sm tabular-nums">
                      {formatCop(local.calcPoliciaCop)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#0B132B] text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono">
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                <span>
                  COSTO TÉCNICO 6 SERVICIOS: {formatCop(costoTecnico6ServiciosCop)} COP
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                Total Mayo Oficial Certificado: <strong>{formatCop(local.totalMayoOficialCop)} COP</strong>{" "}
                (Variación: {formatPct(local.variacionTotalPct * 100, 1, true)})
              </p>
              {isAssumedCorp && (
                <p className="text-[11px] text-sky-300 font-mono">
                  Asumido Corporación (Vacancia sin Contrato):{" "}
                  <strong>{formatCop(local.calcAssumedCorporationCop)} COP</strong>
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-slate-300 block">
                Total Facturable Comerciante
              </span>
              <span className="text-2xl font-mono font-black text-emerald-400 tabular-nums">
                {formatCop(local.calcTotalCop)} COP
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
