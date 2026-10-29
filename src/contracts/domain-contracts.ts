import { z } from "zod";

export const BillingModalitySchema = z.enum(["CONTADOR", "COMUNAL", "PRORRATEO", "RED DE FRIOS", "RED FRIOS", "BASICOS"]);
export type BillingModality = z.infer<typeof BillingModalitySchema>;

export const WasteVolumeCategorySchema = z.enum(["NP", "MP", "P", "BASICOS"]);
export type WasteVolumeCategory = z.infer<typeof WasteVolumeCategorySchema>;

export const MeterObservationCodeSchema = z.enum([
  "VERIFICADO POR IMAGEN", "C, DETENIDO", "M, DETENIDO", "C, TAPADO", "M, TAPADO",
  "C, RETIRADO", "M, RETIRADO", "C, SUSPENDIDO", "M, SUSPENDIDO", "L, VACIO",
  "L, CERRADO", "NO PERMITIO INGRESO", "ALMACENAMIENTO DE PRODUCTOS", "REVISAR MEDIDOR", "NUEVO", "SIN NOVEDAD",
]);
export type MeterObservationCode = z.infer<typeof MeterObservationCodeSchema>;

export const OccupancyStatusSchema = z.enum(["ACTIVO", "VACIO_CON_CONTRATO", "VACIO_SIN_CONTRATO_CORPORACION"]);
export type OccupancyStatus = z.infer<typeof OccupancyStatusSchema>;

export type ReadingZoneId = "ZONA_1_MACROMEDIDORES" | "ZONA_2_BANOS_PUBLICOS" | "ZONA_3_COMERCIANTES_PRINCIPAL" | "ZONA_4_BODEGA_POPULAR" | "ZONA_5_RED_FRIOS";
export type ReadingTaskState = "PENDIENTE" | "COMPLETADA" | "NOVEDAD_TECNICA" | "CERRADO_SIN_ACCESO";

export interface CommunalEnergyMeter {
  id: string;
  codigo: string;
  bodegaId: string;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoNetoKw: number;
  consumoAnteriorKw: number;
  variacionPct: number;
  tipo: "ALERO" | "BODEGA" | string;
  areaM2: number;
  contadorSerie: string;
  observacion: string;
  hijosContadorCodigos: string[];
}

export interface CommunalWaterMeter {
  id: string;
  codigo: string;
  bodegaId: string;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoNetoM3: number;
  consumoAnteriorM3: number;
  variacionPct: number;
  tipo: string;
  areaM2: number;
  contadorSerie: string;
  observacion: string;
  hijosContadorCodigos: string[];
}

export interface PublicBathroomMeter {
  id: string;
  codigo: string;
  contadorSerie: string;
  lecturaActual: number;
  lecturaAnterior: number;
  consumoM3: number;
}

export interface LocalUnitRecord {
  codigo: string;
  bodegaId: string;
  tipoBodega: string;
  modalidadGeneral: string;
  areaM2: number;
  bloqueEnergia: "PRINCIPAL" | "BODEGA_POPULAR" | string;
  modalidadEnergia: string;
  modalidadAcueducto: string;
  categoriaResiduos: string;
  energiaLecturaAnt: number;
  energiaLecturaAct: number;
  energiaConsumoIndivKw: number;
  energiaConsumoAntKw?: number;
  energiaDivisorContador?: number;
  energiaConsumoComunalKw: number;
  energiaConsumoAleroKw: number;
  energiaEstado: string;
  energiaObs: string;
  energiaPromMin: number;
  energiaPromMax: number;
  energiaTareaEstado?: ReadingTaskState;
  aguaLecturaAnt: number;
  aguaLecturaAct: number;
  aguaConsumoIndivM3: number;
  aguaConsumoAntM3?: number;
  aguaDivisorContador?: number;
  aguaConsumoComunalM3: number;
  aguaEstado: string;
  aguaObs: string;
  aguaPromMin: number;
  aguaPromMax: number;
  aguaTareaEstado?: ReadingTaskState;
  estadoOcupacion?: OccupancyStatus | string;
  energiaBpCop: number;
  energiaPrincipalCop: number;
  energiaAnteriorCop?: number;
  acueductoCop: number;
  acueductoAnteriorCop?: number;
  aseoCop: number;
  aseoAnteriorCop?: number;
  residuosCop: number;
  residuosAnteriorCop?: number;
  vigilanciaCop: number;
  vigilanciaAnteriorCop?: number;
  policiaCop: number;
  policiaAnteriorCop?: number;
  totalJunioCop: number;
  totalAnteriorCop: number;
  planos: {
    ecsa: string;
    agua: string;
    alcan: string;
    aseo: string;
    energia: string;
    vigilancia: string;
    policia: string;
  };
}

export interface MasterReceiptsConfig {
  periodo: string;
  nombrePeriodo: string;
  energia: {
    tarifaKwh: number;
    principal: {
      valorConsumoFactura: number;
      alumbradoFactura20Pct: number;
      cregFactura20Pct: number;
      totalFactura: number;
      asumidoCorporacion: number;
      asumidoCovial: number;
      valorNetoServicio: number;
      bolsaProrrateo: number;
      areaProrrateoM2: number;
      topeMinimaCop: number;
    };
    redFrios: {
      valorFacturaTotal: number;
      valorNetoServicio: number;
      creg20Pct: number;
    };
    bodegaPopular: {
      valorConsumoFactura: number;
      consumoComunal20Pct: number;
      valorFacturaNeto: number;
      cregFactura: number;
      tasaCregPct: number;
      totalFactura: number;
      areaTotalM2: number;
      areaProrrateoM2: number;
      bolsaProrrateo: number;
      topeMinimaCop: number;
    };
    alumbradoGeneral: {
      bolsaTotal: number;
      areaTotalM2: number;
      tarifaPorM2: number;
    };
  };
  acueducto: {
    tarifaM3: number;
    consumoTotalM3: number;
    valorFacturaGeneral: number;
    valorFacturaRedFrios: number;
    areaRedFriosM2: number;
    asumidoCorporacion: number;
    asumidoCovial: number;
    notasCredito: number;
    bolsaProrrateo: number;
    areaProrrateoM2: number;
    bolsaAguaComunalGeneral: number;
    areaComunalGeneralM2: number;
    topeMinimaCop: number;
  };
  expensas: {
    policia: {
      valorFactura: number;
      localesActivosDivisor: number;
      cuotaFijaPorLocal: number;
      regla: string;
    };
    vigilancia: {
      valorFacturaBruto: number;
      notasDebito: number;
      valorNetoDistribuir: number;
      areaTotalM2: number;
      tarifaPorM2: number;
      regla: string;
    };
    aseo: {
      valorFacturaOperacionTotal: number;
      porcentajeComerciantes: number;
      valorNetoDistribuir: number;
      areaTotalM2: number;
      tarifaPorM2: number;
      regla: string;
    };
    residuosEcsa: {
      valorFacturaBruto: number;
      valorBasicos: number;
      notasDebito: number;
      valorNetoProrratear: number;
      areaTotalProrrateoM2: number;
      areaNpM2: number;
      areaMpM2: number;
      areaPM2: number;
      factorNP: number;
      factorMP: number;
      tarifaBaseM2: number;
      tarifaEfectivaNpM2: number;
      tarifaEfectivaMpM2: number;
      tarifaEfectivaPM2: number;
      regla: string;
    };
  };
  conciliacionFinanzas: {
    energiaFinanzas: number;
    energiaLiquidado: number;
    acueductoFinanzas: number;
    acueductoLiquidado: number;
    aseoResiduosFinanzas: number;
    aseoResiduosLiquidado: number;
    vigilanciaFinanzas: number;
    vigilanciaLiquidado: number;
    policiaFinanzas: number;
    policiaLiquidado: number;
    granTotalLiquidado: number;
  };
}

// ============================================================================
// CABLES PELADOS (CLEAN BOUNDARY HARNESS) PARA EXPANSIÓN ERP CORABASTOS
// ============================================================================
export interface ErpModuleExpansionRing {
  anillo: number;
  id: string;
  titulo: string;
  subtitulo: string;
  estado: "ACTIVO_MVP" | "CABLE_PELADO_LISTO" | "PROXIMA_FASE";
  origenArsenal: string;
  dolorQueResuelve: string;
  entregablesClave: string[];
  impactoFinancieroEstimado: string;
  payloadPuenteEjemplo: Record<string, string | number>;
}
