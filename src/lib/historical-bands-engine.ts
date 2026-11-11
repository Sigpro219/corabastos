import {
  AnomalyAlertSeverity,
  ConsumptionAnomalyReportItem,
  FieldReverificationTask,
  FieldServiceType,
  HistoricalConsumptionBandProfile,
  OccupancyStatus,
} from "../contracts/domain-contracts";

export const HISTORICAL_BAND_EMA_BETA = 0.25;
export const HISTORICAL_WINDOW_MAX_PERIODS = 12;
export const DEFAULT_BAND_TOLERANCE_PCT = 0.30;
export const MIN_BAND_TOLERANCE_PCT = 0.20;
export const MAX_BAND_TOLERANCE_PCT = 0.35;

/** Umbrales mínimos físicos (Deadband Floor) para descartar ruido metrológico */
export const MIN_DEADBAND_FLOOR_KWH = 15;
export const MIN_DEADBAND_FLOOR_M3 = 3;

/**
 * Determina si una observación metrológica o estado de ocupación bloquea
 * la alimentación de la banda histórica (Válvula de Higiene Estadística).
 */
export function isObservationEligibleForBandFeeding(
  observacion: string,
  estadoOcupacion?: OccupancyStatus | string,
  forzarAprobacionCambioOperativo?: boolean
): boolean {
  if (forzarAprobacionCambioOperativo) return true;
  if (
    estadoOcupacion === "VACIO_SIN_CONTRATO_CORPORACION" ||
    estadoOcupacion === "VACIO_CON_CONTRATO"
  ) {
    return false;
  }
  const norm = (observacion || "").toUpperCase().trim();
  const blockedTokens = [
    "DETENIDO",
    "TAPADO",
    "RETIRADO",
    "SUSPENDIDO",
    "VACIO",
    "CERRADO",
    "NO PERMITIO",
    "REVISAR",
  ];
  return !blockedTokens.some((token) => norm.includes(token));
}

/**
 * Evalúa en caliente (App Móvil /captura o Informe de Anomalías en Transferencias)
 * si el consumo físico calculado se sale de la banda histórica [bandaMinFisica, bandaMaxFisica].
 * Aplica normalización a base 30 días y colchón mínimo físico (Deadband Floor).
 */
export function evaluateConsumptionAgainstBand(params: {
  consumoFisicoActual: number;
  bandaMinFisica: number;
  bandaMaxFisica: number;
  mediaHistoricaEma: number;
  tarifaUnitariaCop: number;
  servicio?: "ENERGIA" | "AGUA";
  diasEfectivosCiclo?: number;
}): {
  severidad: AnomalyAlertSeverity;
  desviacionBandaPct: number;
  impactoDesviacionCop: number;
  requiereDobleValidacionMovil: boolean;
  consumoNormalizado30d: number;
} {
  const {
    consumoFisicoActual,
    bandaMinFisica,
    bandaMaxFisica,
    mediaHistoricaEma,
    tarifaUnitariaCop,
    servicio = "ENERGIA",
    diasEfectivosCiclo = 30,
  } = params;

  const rawConsumo = Math.max(0, consumoFisicoActual);
  const safeDays = Math.max(15, Math.min(45, diasEfectivosCiclo));
  const factor30d = 30 / safeDays;
  const consumoNormalizado30d = Math.round(rawConsumo * factor30d * 100) / 100;

  const deadbandFloor = servicio === "AGUA" ? MIN_DEADBAND_FLOOR_M3 : MIN_DEADBAND_FLOOR_KWH;
  const safeMin = Math.max(0, bandaMinFisica);
  const safeMax = Math.max(safeMin, bandaMaxFisica);
  const safeMedia = Math.max(0, mediaHistoricaEma > 0 ? mediaHistoricaEma : (safeMin + safeMax) / 2);

  // Regla Deadband Floor: si tanto el consumo como la banda están dentro del piso mínimo, no hay anomalía
  if (consumoNormalizado30d <= deadbandFloor && safeMax <= deadbandFloor) {
    return {
      severidad: "DENTRO_DE_BANDA",
      desviacionBandaPct: 0,
      impactoDesviacionCop: 0,
      requiereDobleValidacionMovil: false,
      consumoNormalizado30d,
    };
  }

  if (safeMax > 0 && consumoNormalizado30d > safeMax) {
    const excesoUnidadesNorm = consumoNormalizado30d - safeMax;
    const desviacionBandaPct = Math.round((excesoUnidadesNorm / safeMax) * 1000) / 10;
    const impactoDesviacionCop = Math.round((rawConsumo - safeMax / factor30d) * Math.max(0, tarifaUnitariaCop));
    return {
      severidad: "SOBRECONSUMO_CRITICO",
      desviacionBandaPct,
      impactoDesviacionCop: Math.max(0, impactoDesviacionCop),
      requiereDobleValidacionMovil: true,
      consumoNormalizado30d,
    };
  }

  if (safeMin > 0 && consumoNormalizado30d < safeMin) {
    const defectoUnidadesNorm = safeMin - consumoNormalizado30d;
    const desviacionBandaPct = -Math.round((defectoUnidadesNorm / safeMin) * 1000) / 10;
    const impactoDesviacionCop = -Math.round((safeMin / factor30d - rawConsumo) * Math.max(0, tarifaUnitariaCop));
    return {
      severidad: "SUBCONSUMO_ATIPICO",
      desviacionBandaPct,
      impactoDesviacionCop,
      requiereDobleValidacionMovil: true,
      consumoNormalizado30d,
    };
  }

  return {
    severidad: "DENTRO_DE_BANDA",
    desviacionBandaPct: 0,
    impactoDesviacionCop: 0,
    requiereDobleValidacionMovil: false,
    consumoNormalizado30d,
  };
}

/**
 * Alimenta de manera permanente la Banda Histórica del puesto al cerrar un corte mensual,
 * aplicando Media Móvil Exponencial (EMA beta = 0.25), normalización a 30 días,
 * válvula de higiene estadística y regla de auto-adaptación de 2 cortes verificados en campo.
 */
export function updateSelfFeedingHistoricalBand(params: {
  perfilPrevio: HistoricalConsumptionBandProfile;
  periodoCerrado: string;
  consumoFisicoCorte: number;
  observacionCorte: string;
  estadoOcupacion?: OccupancyStatus | string;
  decisionAdminAlimentaBanda?: boolean;
  diasEfectivosCiclo?: number;
  verificadoEnCampoConsecutivo?: boolean;
}): HistoricalConsumptionBandProfile {
  const {
    perfilPrevio,
    periodoCerrado,
    consumoFisicoCorte,
    observacionCorte,
    estadoOcupacion,
    decisionAdminAlimentaBanda,
    diasEfectivosCiclo = 30,
    verificadoEnCampoConsecutivo = false,
  } = params;

  const rawConsumo = Math.max(0, consumoFisicoCorte);
  const safeDays = Math.max(15, Math.min(45, diasEfectivosCiclo));
  const factor30d = 30 / safeDays;
  const consumoNorm30d = Math.round(rawConsumo * factor30d * 100) / 100;

  // Criterio de elegibilidad de higiene con apertura por 2 cortes verificados seguidos
  const elegibleHigiene =
    decisionAdminAlimentaBanda !== undefined
      ? decisionAdminAlimentaBanda
      : verificadoEnCampoConsecutivo
      ? true
      : isObservationEligibleForBandFeeding(observacionCorte, estadoOcupacion, false) &&
        consumoNorm30d >= perfilPrevio.bandaMinFisica * 0.5 &&
        (perfilPrevio.bandaMaxFisica <= 0 || consumoNorm30d <= perfilPrevio.bandaMaxFisica * 1.5);

  const nuevaVentana = [
    ...perfilPrevio.ventanaHistorica.filter((item) => item.periodo !== periodoCerrado),
    { periodo: periodoCerrado, consumoFisico: consumoNorm30d, alimentaBanda: elegibleHigiene },
  ].slice(-HISTORICAL_WINDOW_MAX_PERIODS);

  if (!elegibleHigiene) {
    return {
      ...perfilPrevio,
      ventanaHistorica: nuevaVentana,
    };
  }

  const prevMedia = perfilPrevio.mediaAprendidaEma > 0 ? perfilPrevio.mediaAprendidaEma : consumoNorm30d;
  const nuevaMediaEma =
    perfilPrevio.cortesValidosCount === 0
      ? consumoNorm30d
      : Math.round(((1 - HISTORICAL_BAND_EMA_BETA) * prevMedia + HISTORICAL_BAND_EMA_BETA * consumoNorm30d) * 100) / 100;

  const consumosValidos = nuevaVentana.filter((x) => x.alimentaBanda).map((x) => x.consumoFisico);
  const nValidos = consumosValidos.length;

  let stdDev = 0;
  if (nValidos >= 3) {
    const meanWindow = consumosValidos.reduce((acc, v) => acc + v, 0) / nValidos;
    const variance = consumosValidos.reduce((acc, v) => acc + Math.pow(v - meanWindow, 2), 0) / nValidos;
    stdDev = Math.round(Math.sqrt(variance) * 100) / 100;
  }

  const rawTolPct =
    nValidos >= 3 && nuevaMediaEma > 0
      ? Math.min(MAX_BAND_TOLERANCE_PCT, Math.max(MIN_BAND_TOLERANCE_PCT, (1.5 * stdDev) / nuevaMediaEma))
      : DEFAULT_BAND_TOLERANCE_PCT;

  const bandaMinFisica = Math.max(0, Math.round(nuevaMediaEma * (1 - rawTolPct) * 100) / 100);
  const bandaMaxFisica = Math.max(bandaMinFisica, Math.round(nuevaMediaEma * (1 + rawTolPct) * 100) / 100);

  return {
    ...perfilPrevio,
    mediaAprendidaEma: nuevaMediaEma,
    desviacionEstandar: stdDev,
    bandaMinFisica,
    bandaMaxFisica,
    cortesValidosCount: perfilPrevio.cortesValidosCount + 1,
    ventanaHistorica: nuevaVentana,
  };
}

/**
 * Re-ancla la línea base histórica de un puesto cuando cambia de giro comercial o inquilino.
 */
export function reanchorHistoricalBandBaseline(params: {
  codigoLocal: string;
  bodegaId: string;
  servicio: "ENERGIA" | "AGUA";
  nuevoConsumoBaseFisico: number;
  periodoAncla: string;
  actorUid: string;
  timestampIso: string;
}): HistoricalConsumptionBandProfile {
  const base = Math.max(0, params.nuevoConsumoBaseFisico);
  return {
    codigoLocal: params.codigoLocal,
    bodegaId: params.bodegaId,
    servicio: params.servicio,
    mediaAprendidaEma: base,
    desviacionEstandar: 0,
    bandaMinFisica: Math.round(base * (1 - DEFAULT_BAND_TOLERANCE_PCT) * 100) / 100,
    bandaMaxFisica: Math.round(base * (1 + DEFAULT_BAND_TOLERANCE_PCT) * 100) / 100,
    cortesValidosCount: 1,
    ventanaHistorica: [{ periodo: params.periodoAncla, consumoFisico: base, alimentaBanda: true }],
    ultimoReanclajeIso: params.timestampIso,
    reancladoPorUid: params.actorUid,
  };
}

/**
 * Crea una orden prioritaria de Re-Verificación a Ciegas Total para la app móvil (/captura)
 * desde el Informe de Anomalías en Transferencias.
 */
export function createBlindFieldReverificationTask(params: {
  anomalia: ConsumptionAnomalyReportItem;
  lecturaPrimeraToma: number;
  motivoInspeccion: FieldReverificationTask["motivoInspeccion"];
  solicitadoPorUid: string;
  solicitadoAtIso: string;
  operadorPrimeraTomaUid?: string;
}): FieldReverificationTask {
  const servicioTask: FieldServiceType = params.anomalia.servicio === "ENERGIA" ? "ENERGIA" : "AGUA";
  const taskKey = `${servicioTask}::${params.anomalia.codigoLocal}`;
  return {
    reverifyId: `REV-${params.anomalia.periodo}-${params.anomalia.servicio}-${params.anomalia.codigoLocal}`,
    taskKey,
    codigoLocal: params.anomalia.codigoLocal,
    bodegaId: params.anomalia.bodegaId,
    servicio: servicioTask,
    motivoInspeccion: params.motivoInspeccion,
    lecturaCiegaOculta: true,
    prioridadCero: true,
    operadorPrimeraTomaUid: params.operadorPrimeraTomaUid,
    lecturaPrimeraTomaInterna: Math.max(0, params.lecturaPrimeraToma),
    estado: "PENDIENTE_CAMPO",
    solicitadoPorUid: params.solicitadoPorUid,
    solicitadoAtIso: params.solicitadoAtIso,
  };
}
