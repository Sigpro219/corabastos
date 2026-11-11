import { z } from "zod";

export const BillingModalitySchema = z.enum([
  "CONTADOR", "COMUNAL", "PRORRATEO", "RED DE FRIOS", "RED FRIOS", "RED_FRIOS", "BASICOS",
]);
export type BillingModality = z.infer<typeof BillingModalitySchema>;

export const WasteVolumeCategorySchema = z.enum(["NP", "MP", "P", "BASICOS"]);
export type WasteVolumeCategory = z.infer<typeof WasteVolumeCategorySchema>;

export const MeterObservationCodeSchema = z.enum([
  "VERIFICADO POR IMAGEN", "C, DETENIDO", "M, DETENIDO", "C, TAPADO", "M, TAPADO",
  "C, RETIRADO", "M, RETIRADO", "C, SUSPENDIDO", "M, SUSPENDIDO", "L, VACIO",
  "L, CERRADO", "NO PERMITIO INGRESO", "ALMACENAMIENTO DE PRODUCTOS", "REVISAR MEDIDOR",
  "NUEVO", "SIN NOVEDAD",
]);
export type MeterObservationCode = z.infer<typeof MeterObservationCodeSchema>;

export const ExecutiveViewIdSchema = z.enum([
  "SABANA_360",
  "BODEGAS_68",
  "RECIBOS_MACROS",
  "AUDITORIA_BI",
]);
export type ExecutiveViewId = z.infer<typeof ExecutiveViewIdSchema>;

export const UserRoleSchema = z.enum(["AUDITOR_ADMIN", "LECTURISTA"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const OccupancyStatusSchema = z.enum([
  "ACTIVO",
  "VACIO_CON_CONTRATO",
  "VACIO_SIN_CONTRATO_CORPORACION",
]);
export type OccupancyStatus = z.infer<typeof OccupancyStatusSchema>;

export const FieldServiceTypeSchema = z.enum([
  "ENERGIA",
  "AGUA",
  "MACRO_ENERGIA",
  "MACRO_AGUA",
  "BANO_PUBLICO",
]);
export type FieldServiceType = z.infer<typeof FieldServiceTypeSchema>;

export const ReadingTaskStateSchema = z.enum([
  "PENDIENTE",
  "COMPLETADA",
  "NOVEDAD_TECNICA",
  "CERRADO_SIN_ACCESO",
]);
export type ReadingTaskState = z.infer<typeof ReadingTaskStateSchema>;

export type ReadingZoneId =
  | "ZONA_1_MACROMEDIDORES"
  | "ZONA_2_BANOS_PUBLICOS"
  | "ZONA_3_COMERCIANTES_PRINCIPAL"
  | "ZONA_4_BODEGA_POPULAR"
  | "ZONA_5_RED_FRIOS";

const noBase64Guard = (val: string): boolean => !val.toLowerCase().includes("data:image/");

export const FieldReadingUpdateSchema = z
  .object({
    codigo: z.string().min(1).max(40).refine(noBase64Guard, "Base64 prohibido"),
    servicio: FieldServiceTypeSchema,
    lecturaActual: z.number().finite().min(0).max(100_000_000),
    observacion: z.string().max(500).refine(noBase64Guard, "Base64 prohibido en observacion"),
    hasPhotoEvidence: z.boolean().optional(),
    fotoCapturada: z.boolean().optional(),
    photoLocalKey: z
      .string()
      .min(1)
      .max(200)
      .refine(noBase64Guard, "Base64 prohibido en photoLocalKey")
      .optional(),
    photoStorageUrl: z
      .string()
      .url()
      .max(1024)
      .refine(noBase64Guard, "Base64 prohibido en photoStorageUrl")
      .optional(),
    photoCapturedAt: z.string().min(10).max(40).optional(),
    taskState: ReadingTaskStateSchema.optional(),
    timestamp: z.string().min(1).max(64).refine(noBase64Guard, "Base64 prohibido"),
  })
  .strict();

export type FieldReadingUpdate = z.infer<typeof FieldReadingUpdateSchema>;

export const MeterRouteSurveyItemSchema = z
  .object({
    taskKey: z.string().min(1).max(80).refine(noBase64Guard, "Base64 prohibido"),
    codigo: z.string().min(1).max(40).refine(noBase64Guard, "Base64 prohibido"),
    bodegaId: z.string().min(1).max(20),
    servicio: FieldServiceTypeSchema,
    ordenBodega: z.number().int().min(1).max(10000),
    ordenGlobal: z.number().int().min(1).max(10000),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
    accuracyMeters: z.number().finite().min(0).max(50000).optional(),
    hasPositionPhoto: z.boolean().optional(),
    referenciaPasillo: z.string().max(200).refine(noBase64Guard, "Base64 prohibido").optional(),
    positionPhotoLocalKey: z.string().min(1).max(200).refine(noBase64Guard, "Base64 prohibido").optional(),
    positionPhotoStorageUrl: z.string().url().max(1024).refine(noBase64Guard, "Base64 prohibido").optional(),
    hasPositionPhotoWater: z.boolean().optional(),
    positionPhotoWaterLocalKey: z.string().min(1).max(200).refine(noBase64Guard, "Base64 prohibido").optional(),
    positionPhotoWaterStorageUrl: z.string().url().max(1024).refine(noBase64Guard, "Base64 prohibido").optional(),
    tiempoLlegadaMs: z.number().int().min(0).optional(),
    tiempoSalidaMs: z.number().int().min(0).optional(),
    duracionServicioSegundos: z.number().finite().min(0).max(86400).optional(),
    deltaTrasladoSegundos: z.number().finite().min(0).max(86400).optional(),
    ciclosObservadosCount: z.number().int().min(1).max(1000).optional(),
    emaDuracionServicioSegundos: z.number().finite().min(0).max(86400).optional(),
    emaDeltaTrasladoSegundos: z.number().finite().min(0).max(86400).optional(),
    surveyedAt: z.string().min(1).max(64).refine(noBase64Guard, "Base64 prohibido"),
  })
  .strict();

export type MeterRouteSurveyItem = z.infer<typeof MeterRouteSurveyItemSchema>;

export interface CompositePhysicalStop {
  stopKey: string;
  bodegaId: string;
  codigo: string;
  zonaId: ReadingZoneId;
  hasEnergyMeter: boolean;
  hasWaterMeter: boolean;
  energyTaskKey?: string;
  waterTaskKey?: string;
  sharedCodigos: string[];
  estimatedStopSeconds: number;
}

export const WorkforceShiftDayBucketSchema = z
  .object({
    diaIndice: z.number().int().min(1).max(31),
    diaSemanaLabel: z.enum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"]),
    fechaAnclaIso: z.string().min(10).max(40),
    fechaProximoCiclo30dIso: z.string().min(10).max(40),
    bodegasAsignadas: z.array(z.string().min(1).max(20)),
    paradasFisicasCount: z.number().int().min(0),
    tareasAtomicasCount: z.number().int().min(0),
    minutosEstimadosJornada: z.number().finite().min(0),
    utilizacionJornada8hPct: z.number().finite().min(0).max(200),
  })
  .strict();

export type WorkforceShiftDayBucket = z.infer<typeof WorkforceShiftDayBucketSchema>;

export const WorkforceCapacityPlanSchema = z
  .object({
    jornadaBrutaMinutos: z.literal(480),
    jornadaEfectivaMinutos: z.number().int().min(60).max(480),
    soloEntreSemanaLunesViernes: z.literal(true),
    diasHabilesBaseMes: z.literal(22),
    gapCicloLecturaDias: z.literal(30),
    operadoresAsignados: z.number().int().min(1).max(20),
    tiempoTotalRutaMinutos: z.number().finite().min(0),
    diasRequeridosAlMes: z.number().int().min(1).max(31),
    diasAhorradosVsMesCompleto: z.number().int().min(0).max(30),
    cronogramaDiario: z.array(WorkforceShiftDayBucketSchema),
  })
  .strict();

export type WorkforceCapacityPlan = z.infer<typeof WorkforceCapacityPlanSchema>;

export const TransferCutoffConfigSchema = z
  .object({
    periodo: z.string().min(4).max(30),
    nombrePeriodo: z.string().min(1).max(100),
    fechaCorteEnergiaIso: z.string().min(10).max(40),
    fechaCorteAcueductoIso: z.string().min(10).max(40),
    fechaExpedicionFichaIso: z.string().min(10).max(40),
    updatedAt: z.string().min(10).max(40),
    updatedBy: z.string().min(1).max(128),
  })
  .strict();
export type TransferCutoffConfig = z.infer<typeof TransferCutoffConfigSchema>;

export const PuestoInventoryAuditEntrySchema = z
  .object({
    auditId: z.string().min(1).max(80),
    codigoLocal: z.string().min(1).max(40),
    bodegaId: z.string().min(1).max(20),
    campoModificado: z.enum(["areaM2", "modalidadEnergia", "modalidadAcueducto", "categoriaResiduos", "estadoOcupacion", "digitosContadorEnergia"]),
    valorAnterior: z.string().max(120),
    valorNuevo: z.string().max(120),
    motivoJustificacion: z.string().min(5).max(300).refine(noBase64Guard, "Base64 prohibido"),
    confirmadoDoblePaso: z.literal(true),
    actorUid: z.string().min(1).max(128),
    timestampIso: z.string().min(10).max(40),
  })
  .strict();
export type PuestoInventoryAuditEntry = z.infer<typeof PuestoInventoryAuditEntrySchema>;

const finiteNum = z.number().finite();
const nonNegNum = z.number().finite().min(0);

export const MasterReceiptsConfigSchema = z
  .object({
    periodo: z.string().min(1).max(30),
    nombrePeriodo: z.string().min(1).max(100),
    energia: z.object({
      tarifaKwh: nonNegNum,
      principal: z.object({
        valorConsumoFactura: nonNegNum, alumbradoFactura20Pct: nonNegNum, cregFactura20Pct: nonNegNum,
        totalFactura: nonNegNum, asumidoCorporacion: nonNegNum, asumidoCovial: nonNegNum,
        valorNetoServicio: nonNegNum, bolsaProrrateo: nonNegNum, areaProrrateoM2: nonNegNum, topeMinimaCop: nonNegNum,
      }),
      redFrios: z.object({ valorFacturaTotal: nonNegNum, valorNetoServicio: nonNegNum, creg20Pct: nonNegNum }),
      bodegaPopular: z.object({
        valorConsumoFactura: nonNegNum, consumoComunal20Pct: nonNegNum, valorFacturaNeto: nonNegNum,
        cregFactura: nonNegNum, tasaCregPct: nonNegNum, totalFactura: nonNegNum,
        areaTotalM2: nonNegNum, areaProrrateoM2: nonNegNum, bolsaProrrateo: nonNegNum, topeMinimaCop: nonNegNum,
      }),
      alumbradoGeneral: z.object({ bolsaTotal: nonNegNum, areaTotalM2: nonNegNum, tarifaPorM2: nonNegNum }),
    }),
    acueducto: z.object({
      tarifaM3: nonNegNum, consumoTotalM3: nonNegNum, valorFacturaGeneral: nonNegNum,
      valorFacturaRedFrios: nonNegNum, areaRedFriosM2: nonNegNum, asumidoCorporacion: nonNegNum,
      asumidoCovial: nonNegNum, notasCredito: finiteNum, bolsaProrrateo: nonNegNum,
      areaProrrateoM2: nonNegNum, bolsaAguaComunalGeneral: nonNegNum, areaComunalGeneralM2: nonNegNum, topeMinimaCop: nonNegNum,
    }),
    expensas: z.object({
      policia: z.object({ valorFactura: nonNegNum, localesActivosDivisor: nonNegNum, cuotaFijaPorLocal: nonNegNum, regla: z.string().min(1) }),
      vigilancia: z.object({
        valorFacturaBruto: nonNegNum, notasDebito: finiteNum, valorNetoDistribuir: nonNegNum,
        areaTotalM2: nonNegNum, tarifaPorM2: nonNegNum, regla: z.string().min(1),
      }),
      aseo: z.object({
        valorFacturaOperacionTotal: nonNegNum, porcentajeComerciantes: nonNegNum,
        valorNetoDistribuir: nonNegNum, areaTotalM2: nonNegNum, tarifaPorM2: nonNegNum, regla: z.string().min(1),
      }),
      residuosEcsa: z.object({
        valorFacturaBruto: nonNegNum, valorBasicos: nonNegNum, notasDebito: finiteNum, valorNetoProrratear: nonNegNum,
        areaTotalProrrateoM2: nonNegNum, areaNpM2: nonNegNum, areaMpM2: nonNegNum, areaPM2: nonNegNum,
        factorNP: nonNegNum, factorMP: nonNegNum, tarifaBaseM2: nonNegNum,
        tarifaEfectivaNpM2: nonNegNum, tarifaEfectivaMpM2: nonNegNum, tarifaEfectivaPM2: nonNegNum, regla: z.string().min(1),
      }),
    }),
    conciliacionFinanzas: z.object({
      energiaFinanzas: nonNegNum, energiaLiquidado: nonNegNum, acueductoFinanzas: nonNegNum, acueductoLiquidado: nonNegNum,
      aseoResiduosFinanzas: nonNegNum, aseoResiduosLiquidado: nonNegNum, vigilanciaFinanzas: nonNegNum, vigilanciaLiquidado: nonNegNum,
      policiaFinanzas: nonNegNum, policiaLiquidado: nonNegNum, granTotalLiquidado: nonNegNum,
    }),
  })
  .strict();

export type MasterReceiptsConfig = z.infer<typeof MasterReceiptsConfigSchema>;

export interface CommunalEnergyMeter {
  id: string; codigo: string; bodegaId: string; lecturaAnterior: number; lecturaActual: number;
  consumoNetoKw: number; consumoAnteriorKw: number; variacionPct: number; tipo: "ALERO" | "BODEGA" | string;
  areaM2: number; contadorSerie: string; observacion: string; hijosContadorCodigos: string[];
}

export interface CommunalWaterMeter {
  id: string; codigo: string; bodegaId: string; lecturaAnterior: number; lecturaActual: number;
  consumoNetoM3: number; consumoAnteriorM3: number; variacionPct: number; tipo: string;
  areaM2: number; contadorSerie: string; observacion: string; hijosContadorCodigos: string[];
}

export interface PublicBathroomMeter {
  id: string; codigo: string; contadorSerie: string; lecturaActual: number; lecturaAnterior: number; consumoM3: number;
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

/**
 * Unifica todas las variantes históricas de modalidad Red de Fríos en el censo Junio 2025:
 * 'RED FRIOS', 'RED DE FRIOS', 'RED_FRIOS', 'RED DE FRÍOS'.
 */
export function isRedFriosModality(val?: string): boolean {
  if (!val) return false;
  const norm = val
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  return norm === "RED FRIOS" || norm === "RED DE FRIOS";
}

/**
 * Total oficial certificado de Mayo 2025 por local (SPEC.md §3.1.2).
 * Prohibido leer loc.totalAnteriorCop crudo.
 */
export function computeOfficialMayTotalCop(
  loc: Pick<
    LocalUnitRecord,
    | "energiaAnteriorCop"
    | "acueductoAnteriorCop"
    | "aseoAnteriorCop"
    | "residuosAnteriorCop"
    | "vigilanciaAnteriorCop"
    | "policiaAnteriorCop"
  >
): number {
  return (
    (loc.energiaAnteriorCop ?? 0) +
    (loc.acueductoAnteriorCop ?? 0) +
    (loc.aseoAnteriorCop ?? 0) +
    (loc.residuosAnteriorCop ?? 0) +
    (loc.vigilanciaAnteriorCop ?? 0) +
    (loc.policiaAnteriorCop ?? 0)
  );
}

export const JUNE_2025_REFERENCE_RECEIPTS: MasterReceiptsConfig = {
  periodo: "2025-06",
  nombrePeriodo: "JUNIO 2025",
  energia: {
    tarifaKwh: 720.48,
    principal: {
      valorConsumoFactura: 587263333, alumbradoFactura20Pct: 117452666.6, cregFactura20Pct: 117452666.6,
      totalFactura: 704715999.6, asumidoCorporacion: 12795333, asumidoCovial: 2011504,
      valorNetoServicio: 459939441.73, bolsaProrrateo: 141922039.69, areaProrrateoM2: 13454.029, topeMinimaCop: 20498,
    },
    redFrios: { valorFacturaTotal: 1514224, valorNetoServicio: 1455033, creg20Pct: 291006.6 },
    bodegaPopular: {
      valorConsumoFactura: 142655060, consumoComunal20Pct: 28531012, valorFacturaNeto: 114124048,
      cregFactura: 22397270, tasaCregPct: 0.157, totalFactura: 165052330,
      areaTotalM2: 13991.2249, areaProrrateoM2: 11399.2633, bolsaProrrateo: 80267972.32, topeMinimaCop: 20489,
    },
    alumbradoGeneral: { bolsaTotal: 116439893.43, areaTotalM2: 125276.3364, tarifaPorM2: 929.4644 },
  },
  acueducto: {
    tarifaM3: 10921.4494, consumoTotalM3: 21437, valorFacturaGeneral: 234123110, valorFacturaRedFrios: 7489970,
    areaRedFriosM2: 10574.625, asumidoCorporacion: 4484842, asumidoCovial: 522807, notasCredito: -14031650,
    bolsaProrrateo: 51378880.56, areaProrrateoM2: 41121.4089, bolsaAguaComunalGeneral: 22691941,
    areaComunalGeneralM2: 114487.5914, topeMinimaCop: 10921.45,
  },
  expensas: {
    policia: { valorFactura: 215384615, localesActivosDivisor: 5300, cuotaFijaPorLocal: 40638.6066, regla: "PARTES_IGUALES" },
    vigilancia: {
      valorFacturaBruto: 1457589006, notasDebito: 11488020, valorNetoDistribuir: 1446100986,
      areaTotalM2: 104897.0094, tarifaPorM2: 13785.9124, regla: "FACTOR_AREA_M2",
    },
    aseo: {
      valorFacturaOperacionTotal: 704322962, porcentajeComerciantes: 0.2, valorNetoDistribuir: 171562768.5,
      areaTotalM2: 105179.4364, tarifaPorM2: 1631.1436, regla: "FACTOR_AREA_M2",
    },
    residuosEcsa: {
      valorFacturaBruto: 680905800.76, valorBasicos: 10393187.35, notasDebito: 8830910, valorNetoProrratear: 661681703.41,
      areaTotalProrrateoM2: 105047.4204, areaNpM2: 46929.53, areaMpM2: 15235.5545, areaPM2: 42882.3359,
      factorNP: 0.4, factorMP: 1.2, tarifaBaseM2: 6298.8858, tarifaEfectivaNpM2: 2519.5543,
      tarifaEfectivaMpM2: 7558.663, tarifaEfectivaPM2: 9987.324, regla: "PONDERADO_VOLUMEN_NP_MP_P",
    },
  },
  conciliacionFinanzas: {
    energiaFinanzas: 907096455, energiaLiquidado: 856707533.92, acueductoFinanzas: 241541501, acueductoLiquidado: 239477572.8,
    aseoResiduosFinanzas: 852443714, aseoResiduosLiquidado: 852443678.2, vigilanciaFinanzas: 1457589006, vigilanciaLiquidado: 1457539436.92,
    policiaFinanzas: 215384615, policiaLiquidado: 215384615, granTotalLiquidado: 3861030409.65,
  },
};

// ============================================================================
// CONTRATOS DE INTELIGENCIA BI & 6 KPIS LONGITUDINALES (AUDITORIA_BI)
// ============================================================================

export interface BiMacrometerLeakKpiItem {
  id: string; servicio: "ENERGIA" | "ACUEDUCTO"; bodegaId: string; nombre: string; medidorSerie: string;
  consumoBruto: number; descuentoHijos: number; consumoNetoComunal: number; consumoAnteriorComunal: number;
  porcentajeComunalSobreBruto: number; variacionIntermensualPct: number; alertaFugaActiva: boolean; unidad: "kWh" | "m³";
}

export interface BiFinancialAbsorptionItem {
  servicio: string; vFinanzasCop: number; vLiquidadoComerciantesCop: number; asumidoCorporacionFijoCop: number;
  asumidoVacanciaSinContratoCop: number; brechaNetaCop: number; porcentajeRecuperacionPct: number;
}

export interface BiMetrologicalHealthItem {
  causal: string; categoria: "OPERATIVO" | "DETENIDO" | "TAPADO" | "RETIRADO_REVISAR" | "CERRADO_VACIO";
  cantidadEnergia: number; cantidadAcueducto: number; totalMedidores: number; areaAfectadaM2: number; facturacionMigradaProrrateoCop: number;
}

export interface BiBodegaIntensityBenchmark {
  bodegaId: string; tipoPrincipal: string; totalLocales: number; areaTotalM2: number; kwhPorM2: number; m3PorM2: number;
  copPorM2Actual: number; copPorM2Anterior: number; variacionCopPct: number; totalActualCop: number; totalAnteriorCop: number;
}

export interface BiParetoLocalItem {
  codigoLocal: string; bodegaId: string; tipoLocal: string; areaM2: number; kwhActual: number; kwhAnterior: number;
  m3Actual: number; m3Anterior: number; totalActualCop: number; totalAnteriorCop: number; promedioMaxCop: number;
  saltoMensualCop: number; saltoMensualPct: number; excedeBandaPromedioMax: boolean;
}

export interface BiLongitudinalCutoffPoint {
  corteId: string; etiqueta: string; totalFacturadoRealCop: number; energiaTotalCop: number; acueductoTotalCop: number;
  expensasTotalCop: number; vigilanciaTotalCop: number; residuosTotalCop: number; aseoTotalCop: number; policiaTotalCop: number;
  consumoFisicoEnergiaKwh: number; consumoFisicoAguaM3: number; tarifaKwhPrincipalCop: number; tarifaM3AguaCop: number;
  tarifaM2VigilanciaCop: number; tarifaM2ResiduosP: number; indicePerdidaComunalPct: number; saludMetrologicaPct: number;
}

export interface BiZoneSlaSummary {
  zonaId: string; etiqueta: string; totalTareas: number; completadas: number;
  pendientes: number; novedadesTecnicas: number; cerradosSinAcceso: number; avancePct: number;
}

export type BodegaHeatmapLens = "AVANCE_RUTA" | "CONSUMO_FUGAS" | "TIEMPO_OPERACION";
export type BodegaThermalSeverity = "VERDE_OPTIMO" | "AMBAR_EN_CURSO" | "AZUL_PROGRAMADA" | "ROJO_CRITICO";

export interface BodegaHeatmapCell {
  bodegaId: string; diaIndiceAsignado: number; diaSemanaLabel: WorkforceShiftDayBucket["diaSemanaLabel"];
  paradasFisicasTotales: number; paradasEvacuadas: number; avanceLecturaPct: number;
  novedadesCount: number; variacionConsumoPct: number; segundosPromedioPorParada: number; severidadActiva: BodegaThermalSeverity;
}

export type AnomalyAlertSeverity = "DENTRO_DE_BANDA" | "SOBRECONSUMO_CRITICO" | "SUBCONSUMO_ATIPICO";
export type AnomalyResolutionDecision =
  | "PENDIENTE_REVISION"
  | "EN_REVERIFICACION_CAMPO"
  | "VERIFICADO_EN_CAMPO"
  | "APROBADO_ALIMENTA_BANDA"
  | "APROBADO_EVENTO_AISLADO_SIN_BANDA"
  | "LIQUIDADO_PROMEDIO_HISTORICO";

export interface HistoricalConsumptionBandProfile {
  codigoLocal: string;
  bodegaId: string;
  servicio: "ENERGIA" | "AGUA";
  mediaAprendidaEma: number;
  desviacionEstandar: number;
  bandaMinFisica: number;
  bandaMaxFisica: number;
  cortesValidosCount: number;
  ventanaHistorica: { periodo: string; consumoFisico: number; alimentaBanda: boolean }[];
  ultimoReanclajeIso?: string;
  reancladoPorUid?: string;
}

export const FieldReverificationTaskSchema = z
  .object({
    reverifyId: z.string().min(1).max(80),
    taskKey: z.string().min(1).max(80).refine(noBase64Guard, "Base64 prohibido"),
    codigoLocal: z.string().min(1).max(40),
    bodegaId: z.string().min(1).max(20),
    servicio: FieldServiceTypeSchema,
    motivoInspeccion: z.enum(["REVALIDAR_DIGITOS_FOTO", "INSPECCIONAR_POSIBLE_FUGA", "VERIFICAR_MEDIDOR_DETENIDO_MANIPULADO"]),
    lecturaCiegaOculta: z.literal(true),
    lecturaPrimeraTomaInterna: nonNegNum,
    lecturaSegundaToma: nonNegNum.optional(),
    fotoSegundaTomaLocalKey: z.string().min(1).max(200).refine(noBase64Guard, "Base64 prohibido").optional(),
    fotoSegundaTomaStorageUrl: z.string().url().max(1024).refine(noBase64Guard, "Base64 prohibido").optional(),
    observacionSegundaToma: z.string().max(400).refine(noBase64Guard, "Base64 prohibido").optional(),
    estado: z.enum(["PENDIENTE_CAMPO", "VERIFICADO_CAMPO"]),
    prioridadCero: z.literal(true),
    operadorPrimeraTomaUid: z.string().min(1).max(128).optional(),
    operadorSegundaTomaUid: z.string().min(1).max(128).optional(),
    solicitadoPorUid: z.string().min(1).max(128),
    solicitadoAtIso: z.string().min(10).max(40),
    resueltoAtIso: z.string().min(10).max(40).optional(),
  })
  .strict();
export type FieldReverificationTask = z.infer<typeof FieldReverificationTaskSchema>;

export interface ConsumptionAnomalyReportItem {
  anomalyId: string;
  periodo: string;
  codigoLocal: string;
  bodegaId: string;
  servicio: "ENERGIA" | "AGUA";
  unidad: "kWh" | "m³";
  consumoActualFisico: number;
  bandaMinHistorica: number;
  bandaMaxHistorica: number;
  mediaHistoricaEma: number;
  desviacionBandaPct: number;
  impactoDesviacionCop: number;
  severidad: AnomalyAlertSeverity;
  decisionEstado: AnomalyResolutionDecision;
  reverificacionCampo?: FieldReverificationTask;
}

export interface BiLongitudinalReport {
  corteActivo: string;
  kpi1TotalBrutoEnergiaKw: number;
  kpi1TotalHijosEnergiaKw: number;
  kpi1RemanenteComunalEnergiaKw: number;
  kpi1IndiceComunalEnergiaPct: number;
  kpi1TotalBrutoAguaM3: number;
  kpi1TotalHijosAguaM3: number;
  kpi1RemanenteComunalAguaM3: number;
  kpi1IndiceComunalAguaPct: number;
  kpi1AlertasFugaCount: number;
  kpi1TopMacromedidoresRiesgo: BiMacrometerLeakKpiItem[];
  kpi2TotalFinanzasCop: number;
  kpi2TotalLiquidadoComerciantesCop: number;
  kpi2TotalAsumidoCorporacionCop: number;
  kpi2TasaRecuperacionGlobalPct: number;
  kpi2ServiciosAbsorcion: BiFinancialAbsorptionItem[];
  kpi3TotalMedidoresFisicos: number;
  kpi3MedidoresOperativosOk: number;
  kpi3MedidoresAnomalos: number;
  kpi3SaludMetrologicaPct: number;
  kpi3AreaForzadaProrrateoM2: number;
  kpi3CopForzadoProrrateo: number;
  kpi3DesgloseSalud: BiMetrologicalHealthItem[];
  kpi4PromedioKwhM2Global: number;
  kpi4PromedioM3M2Global: number;
  kpi4PromedioCopM2Global: number;
  kpi4TopBodegasIntensidad: BiBodegaIntensityBenchmark[];
  kpi4TopParetoLocales: BiParetoLocalItem[];
  kpi5SerieLongitudinal: BiLongitudinalCutoffPoint[];
  kpi5VariacionMayoJunioPct: number;
  kpi6TotalTareasCorte: number;
  kpi6TareasEvacuadas: number;
  kpi6SlaTerrenoPct: number;
  kpi6TasaCerradosPct: number;
  kpi6ZonasSla: BiZoneSlaSummary[];
}
