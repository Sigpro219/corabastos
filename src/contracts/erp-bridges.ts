import { ErpModuleExpansionRing } from "@/contracts/domain-contracts";
import { ERP_EXPANSION_RINGS } from "@/lib/liquidation-engine";

export type ErpMacroModuleId =
  | "MOD_1_SERVICIOS_EXPENSAS"
  | "MOD_2_FACTURACION_CARTERA"
  | "MOD_3_CATASTRO_CONTRATOS"
  | "MOD_4_MANTENIMIENTO_CMMS"
  | "MOD_5_AMBIENTAL_PGIRS_SAC";

export type UtilitiesSubTabId =
  | "SABANA_360"
  | "BODEGAS_68"
  | "RECIBOS_MACROS"
  | "MONITOR_CAMPO"
  | "BI_KPIS";

export interface ErpMacroModuleDefinition {
  id: ErpMacroModuleId;
  code: string;
  label: string;
  shortLabel: string;
  anillo: number;
  isLive: boolean;
  description: string;
}

export const CORABASTOS_ERP_MODULES: ErpMacroModuleDefinition[] = [
  {
    id: "MOD_1_SERVICIOS_EXPENSAS",
    code: "MÓDULO 01",
    label: "Servicios Públicos & Expensas",
    shortLabel: "1. Servicios & Expensas",
    anillo: 1,
    isLive: true,
    description:
      "Motor de liquidación de los 5.318 locales, estado de 68 bodegas, desacoplo de macromedidores, vacancia y cola de lectura por corte.",
  },
  {
    id: "MOD_2_FACTURACION_CARTERA",
    code: "MÓDULO 02",
    label: "Facturación DIAN, Cartera & Recaudo",
    shortLabel: "2. Facturación & Cartera",
    anillo: 2,
    isLive: false,
    description:
      "Emisión electrónica DIAN, recaudo PSE/WhatsApp, estados de cuenta masivos y cartera por edades de comerciantes.",
  },
  {
    id: "MOD_3_CATASTRO_CONTRATOS",
    code: "MÓDULO 03",
    label: "Catastro Inmobiliario & Contratos",
    shortLabel: "3. Catastro & Contratos",
    anillo: 3,
    isLive: false,
    description:
      "Gobierno de tenencia, contratos de concesión/arrendamiento, áreas m² y cumplimiento SAGRILAFT de las 68 bodegas.",
  },
  {
    id: "MOD_4_MANTENIMIENTO_CMMS",
    code: "MÓDULO 04",
    label: "Mantenimiento CMMS & Red de Fríos",
    shortLabel: "4. Mantenimiento CMMS",
    anillo: 4,
    isLive: false,
    description:
      "Órdenes de trabajo automáticas ante medidores detenidos/tapados, subestaciones, aleros y cadena de frío.",
  },
  {
    id: "MOD_5_AMBIENTAL_PGIRS_SAC",
    code: "MÓDULO 05",
    label: "Gestión Ambiental PGIRS & SAC",
    shortLabel: "5. Ambiental PGIRS & SAC",
    anillo: 5,
    isLive: false,
    description:
      "Aforos de residuos sólidos (NP/MP/P), básculas de acopio ECSA y atención de reclamaciones Art. 47 con visita técnica.",
  },
];

export function getExpansionRingByNumber(anillo: number): ErpModuleExpansionRing | undefined {
  return ERP_EXPANSION_RINGS.find((r) => r.anillo === anillo);
}

// ============================================================================
// CONTRATOS DEL SUB-MÓDULO 1.5: INTELIGENCIA BI & 6 KPIS LONGITUDINALES
// ============================================================================

export interface BiMacrometerLeakKpiItem {
  id: string;
  servicio: "ENERGIA" | "ACUEDUCTO";
  bodegaId: string;
  nombre: string;
  medidorSerie: string;
  consumoBruto: number;
  descuentoHijos: number;
  consumoNetoComunal: number;
  consumoAnteriorComunal: number;
  porcentajeComunalSobreBruto: number;
  variacionIntermensualPct: number;
  alertaFugaActiva: boolean;
  unidad: "kWh" | "m³";
}

export interface BiFinancialAbsorptionItem {
  servicio: string;
  vFinanzasCop: number;
  vLiquidadoComerciantesCop: number;
  asumidoCorporacionFijoCop: number;
  asumidoVacanciaSinContratoCop: number;
  brechaNetaCop: number;
  porcentajeRecuperacionPct: number;
}

export interface BiMetrologicalHealthItem {
  causal: string;
  categoria: "OPERATIVO" | "DETENIDO" | "TAPADO" | "RETIRADO_REVISAR" | "CERRADO_VACIO";
  cantidadEnergia: number;
  cantidadAcueducto: number;
  totalMedidores: number;
  areaAfectadaM2: number;
  facturacionMigradaProrrateoCop: number;
}

export interface BiBodegaIntensityBenchmark {
  bodegaId: string;
  tipoPrincipal: string;
  totalLocales: number;
  areaTotalM2: number;
  kwhPorM2: number;
  m3PorM2: number;
  copPorM2Actual: number;
  copPorM2Anterior: number;
  variacionCopPct: number;
  totalActualCop: number;
  totalAnteriorCop: number;
}

export interface BiParetoLocalItem {
  codigoLocal: string;
  bodegaId: string;
  tipoLocal: string;
  areaM2: number;
  kwhActual: number;
  kwhAnterior: number;
  m3Actual: number;
  m3Anterior: number;
  totalActualCop: number;
  totalAnteriorCop: number;
  promedioMaxCop: number;
  saltoMensualCop: number;
  saltoMensualPct: number;
  excedeBandaPromedioMax: boolean;
}

export interface BiLongitudinalCutoffPoint {
  corteId: string;
  etiqueta: string;
  totalFacturadoRealCop: number;
  energiaTotalCop: number;
  acueductoTotalCop: number;
  expensasTotalCop: number;
  tarifaKwhPrincipalCop: number;
  tarifaM3AguaCop: number;
  tarifaM2VigilanciaCop: number;
  tarifaM2ResiduosP: number;
  indicePerdidaComunalPct: number;
  saludMetrologicaPct: number;
}

export interface BiZoneSlaSummary {
  zonaId: string;
  etiqueta: string;
  totalTareas: number;
  completadas: number;
  pendientes: number;
  novedadesTecnicas: number;
  cerradosSinAcceso: number;
  avancePct: number;
}

export interface BiLongitudinalReport {
  corteActivo: string;
  // KPI 1: Pérdidas y Remanente Comunal Padre-Hijo
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
  // KPI 2: Brecha de Absorción Financiera Corporativa
  kpi2TotalFinanzasCop: number;
  kpi2TotalLiquidadoComerciantesCop: number;
  kpi2TotalAsumidoCorporacionCop: number;
  kpi2TasaRecuperacionGlobalPct: number;
  kpi2ServiciosAbsorcion: BiFinancialAbsorptionItem[];
  // KPI 3: Salud del Parque Metrológico (1.835 medidores)
  kpi3TotalMedidoresFisicos: number;
  kpi3MedidoresOperativosOk: number;
  kpi3MedidoresAnomalos: number;
  kpi3SaludMetrologicaPct: number;
  kpi3AreaForzadaProrrateoM2: number;
  kpi3CopForzadoProrrateo: number;
  kpi3DesgloseSalud: BiMetrologicalHealthItem[];
  // KPI 4: Intensidad por m² y Ranking Pareto
  kpi4PromedioKwhM2Global: number;
  kpi4PromedioM3M2Global: number;
  kpi4PromedioCopM2Global: number;
  kpi4TopBodegasIntensidad: BiBodegaIntensityBenchmark[];
  kpi4TopParetoLocales: BiParetoLocalItem[];
  // KPI 5: Serie Longitudinal Multicorte (Ene 2025 - Jun 2025)
  kpi5SerieLongitudinal: BiLongitudinalCutoffPoint[];
  kpi5VariacionMayoJunioPct: number;
  // KPI 6: Eficiencia Operativa del Corte (SLA Terreno)
  kpi6TotalTareasCorte: number;
  kpi6TareasEvacuadas: number;
  kpi6SlaTerrenoPct: number;
  kpi6TasaCerradosPct: number;
  kpi6ZonasSla: BiZoneSlaSummary[];
}
