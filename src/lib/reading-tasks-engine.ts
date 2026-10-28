import {
  PublicBathroomMeter,
  ReadingTaskState,
  ReadingZoneId,
} from "@/contracts/domain-contracts";
import {
  CommunalHierarchyBreakdown,
  ComputedLocalLiquidation,
} from "@/lib/liquidation-engine";
import { buildTaskKey, FieldServiceType } from "@/context/CorabastosContext";

export const OBSERVATION_OPTIONS = [
  "VERIFICADO POR IMAGEN",
  "SIN NOVEDAD",
  "C, DETENIDO",
  "M, DETENIDO",
  "C, TAPADO",
  "M, TAPADO",
  "L, CERRADO",
  "L, VACIO",
  "NO PERMITIO INGRESO",
  "C, RETIRADO",
  "REVISAR MEDIDOR",
];

export interface UnifiedReadingTask {
  taskKey: string;
  codigo: string;
  bodegaId: string;
  zonaId: ReadingZoneId;
  servicio: FieldServiceType;
  etiquetaServicio: string;
  unidad: "kWh" | "m³";
  serieMedidor: string;
  areaM2: number;
  multiplicador: number;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoAnteriorFisico: number;
  observacionActual: string;
  taskState: ReadingTaskState;
}

export const ZONE_META: {
  id: ReadingZoneId;
  shortLabel: string;
  title: string;
  priorityBadge: string;
}[] = [
  {
    id: "ZONA_1_MACROMEDIDORES",
    shortLabel: "Z1 · Macromedidores",
    title: "Zona 1: Macromedidores Comunales (Aleros, Bodegas y Agua Comunal)",
    priorityBadge: "PRIORIDAD CRÍTICA",
  },
  {
    id: "ZONA_2_BANOS_PUBLICOS",
    shortLabel: "Z2 · Baños Públicos",
    title: "Zona 2: Baterías Sanitarias y Baños Públicos (16 Medidores)",
    priorityBadge: "PRIORIDAD ALTA",
  },
  {
    id: "ZONA_3_COMERCIANTES_PRINCIPAL",
    shortLabel: "Z3 · Comerciantes",
    title: "Zona 3: Bodegas Comerciantes Principal (Contadores Individuales)",
    priorityBadge: "RUTA BODEGAS",
  },
  {
    id: "ZONA_4_BODEGA_POPULAR",
    shortLabel: "Z4 · Bodega Popular (8x)",
    title: "Zona 4: Bodega Popular Minorista/Mayorista (Factor 8x)",
    priorityBadge: "FACTOR 8X",
  },
  {
    id: "ZONA_5_RED_FRIOS",
    shortLabel: "Z5 · Red de Fríos",
    title: "Zona 5: Puestos Red de Fríos (Bodega 98)",
    priorityBadge: "CADENA FRÍO",
  },
];

export function buildCutoffReadingTasks(
  locales: ComputedLocalLiquidation[],
  energyCommunal: CommunalHierarchyBreakdown[],
  waterCommunal: CommunalHierarchyBreakdown[],
  bathroomMeters: PublicBathroomMeter[],
  completedTaskIds: Record<string, ReadingTaskState>
): UnifiedReadingTask[] {
  const list: UnifiedReadingTask[] = [];

  for (const m of energyCommunal) {
    const key = buildTaskKey("MACRO_ENERGIA", m.codigo);
    const state = completedTaskIds[key] || "PENDIENTE";
    list.push({
      taskKey: key,
      codigo: m.codigo,
      bodegaId: m.bodegaId,
      zonaId: "ZONA_1_MACROMEDIDORES",
      servicio: "MACRO_ENERGIA",
      etiquetaServicio: `MACRO ENERGÍA (${m.tipo})`,
      unidad: "kWh",
      serieMedidor: m.contadorSerie || `ME-${m.bodegaId}`,
      areaM2: m.areaComunalM2,
      multiplicador: 1,
      lecturaAnterior: m.lecturaAnterior,
      lecturaActual: m.lecturaActual,
      consumoAnteriorFisico: m.consumoAnterior > 0 ? m.consumoAnterior : m.consumoBruto,
      observacionActual: m.observacion,
      taskState: state,
    });
  }

  for (const w of waterCommunal) {
    const key = buildTaskKey("MACRO_AGUA", w.codigo);
    const state = completedTaskIds[key] || "PENDIENTE";
    list.push({
      taskKey: key,
      codigo: w.codigo,
      bodegaId: w.bodegaId,
      zonaId: "ZONA_1_MACROMEDIDORES",
      servicio: "MACRO_AGUA",
      etiquetaServicio: "MACRO AGUA COMUNAL",
      unidad: "m³",
      serieMedidor: w.contadorSerie || `MA-${w.bodegaId}`,
      areaM2: w.areaComunalM2,
      multiplicador: 1,
      lecturaAnterior: w.lecturaAnterior,
      lecturaActual: w.lecturaActual,
      consumoAnteriorFisico: w.consumoAnterior > 0 ? w.consumoAnterior : w.consumoBruto,
      observacionActual: w.observacion,
      taskState: state,
    });
  }

  for (const b of bathroomMeters) {
    const key = buildTaskKey("BANO_PUBLICO", b.codigo);
    const state = completedTaskIds[key] || "PENDIENTE";
    list.push({
      taskKey: key,
      codigo: b.codigo,
      bodegaId: "BAÑOS",
      zonaId: "ZONA_2_BANOS_PUBLICOS",
      servicio: "BANO_PUBLICO",
      etiquetaServicio: "ACUEDUCTO BAÑO PÚBLICO",
      unidad: "m³",
      serieMedidor: b.contadorSerie,
      areaM2: 0,
      multiplicador: 1,
      lecturaAnterior: b.lecturaAnterior,
      lecturaActual: b.lecturaActual,
      consumoAnteriorFisico: b.consumoM3,
      observacionActual: "VERIFICADO POR IMAGEN",
      taskState: state,
    });
  }

  for (const loc of locales) {
    const isRedFrios = loc.bodegaId === "98" || loc.tipoBodega.includes("FRIOS");
    const isBP = loc.bloqueEnergia === "BODEGA_POPULAR";
    const zonaId: ReadingZoneId = isRedFrios
      ? "ZONA_5_RED_FRIOS"
      : isBP
      ? "ZONA_4_BODEGA_POPULAR"
      : "ZONA_3_COMERCIANTES_PRINCIPAL";

    if (loc.modalidadEnergia === "CONTADOR" || isRedFrios) {
      const key = buildTaskKey("ENERGIA", loc.codigo);
      const state = completedTaskIds[key] || loc.energiaTareaEstado || "PENDIENTE";
      const mult = isBP ? 8 : 1;
      const antFisico =
        loc.energiaConsumoAntKw && loc.energiaConsumoAntKw > 0
          ? loc.energiaConsumoAntKw
          : loc.energiaConsumoIndivKw;
      list.push({
        taskKey: key,
        codigo: loc.codigo,
        bodegaId: loc.bodegaId,
        zonaId,
        servicio: "ENERGIA",
        etiquetaServicio: isBP ? "ENERGÍA BP (FACTOR 8X)" : "ENERGÍA INDIVIDUAL",
        unidad: "kWh",
        serieMedidor: `EN-${loc.codigo}`,
        areaM2: loc.areaM2,
        multiplicador: mult,
        lecturaAnterior: loc.energiaLecturaAnt,
        lecturaActual: loc.energiaLecturaAct,
        consumoAnteriorFisico: antFisico,
        observacionActual: loc.energiaObs || "VERIFICADO POR IMAGEN",
        taskState: state,
      });
    }

    if (loc.modalidadAcueducto === "CONTADOR") {
      const key = buildTaskKey("AGUA", loc.codigo);
      const state = completedTaskIds[key] || loc.aguaTareaEstado || "PENDIENTE";
      const antFisico =
        loc.aguaConsumoAntM3 && loc.aguaConsumoAntM3 > 0
          ? loc.aguaConsumoAntM3
          : loc.aguaConsumoIndivM3;
      list.push({
        taskKey: key,
        codigo: loc.codigo,
        bodegaId: loc.bodegaId,
        zonaId,
        servicio: "AGUA",
        etiquetaServicio: "ACUEDUCTO INDIVIDUAL",
        unidad: "m³",
        serieMedidor: `AQ-${loc.codigo}`,
        areaM2: loc.areaM2,
        multiplicador: 1,
        lecturaAnterior: loc.aguaLecturaAnt,
        lecturaActual: loc.aguaLecturaAct,
        consumoAnteriorFisico: antFisico,
        observacionActual: loc.aguaObs || "VERIFICADO POR IMAGEN",
        taskState: state,
      });
    }
  }

  return list;
}
