import { ErpModuleExpansionRing } from "@/contracts/domain-contracts";
import { ERP_EXPANSION_RINGS } from "@/lib/liquidation-engine";

export type ErpMacroModuleId =
  | "MOD_1_SERVICIOS_EXPENSAS"
  | "MOD_2_FACTURACION_CARTERA"
  | "MOD_3_CATASTRO_CONTRATOS"
  | "MOD_4_MANTENIMIENTO_CMMS"
  | "MOD_5_AMBIENTAL_PGIRS_SAC";

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
