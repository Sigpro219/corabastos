import {
  ExecutiveViewId,
  ExecutiveViewIdSchema,
  UserRole,
  UserRoleSchema,
} from "@/contracts/domain-contracts";

export { ExecutiveViewIdSchema, UserRoleSchema };
export type { ExecutiveViewId, UserRole };
export type UtilitiesSubTabId = ExecutiveViewId;

export const EXECUTIVE_OPERATIONAL_VIEWS: ReadonlyArray<{
  id: ExecutiveViewId;
  shortLabel: string;
  title: string;
}> = [
  { id: "SABANA_360", shortLabel: "1. Sábana 5.318 Locales", title: "1. Sábana 5.318 Locales & Cuenta 360°" },
  { id: "BODEGAS_68", shortLabel: "2. Estado 68 Bodegas", title: "2. Estado de 68 Bodegas & Vacancia" },
  { id: "RECIBOS_MACROS", shortLabel: "3. Recibos & 62 Macros", title: "3. Recibos Maestros & 62 Macromedidores" },
  { id: "AUDITORIA_BI", shortLabel: "4. Inteligencia BI & Terreno", title: "4. Inteligencia BI, Terreno & Metodología" },
];

export type {
  BiBodegaIntensityBenchmark,
  BiFinancialAbsorptionItem,
  BiLongitudinalCutoffPoint,
  BiLongitudinalReport,
  BiMacrometerLeakKpiItem,
  BiMetrologicalHealthItem,
  BiParetoLocalItem,
  BiZoneSlaSummary,
} from "@/contracts/domain-contracts";
