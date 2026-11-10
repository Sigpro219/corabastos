import { ComputedLocalLiquidation } from "@/lib/liquidation-engine";
import { formatDec, formatInt } from "@/lib/formatters";

/**
 * Headless Accounting & Sabana Export Engine (Planos PL109, PL008, PL009, PL003, PL004, PL007, PL141).
 * Cumple SPEC.md v3.1.0 §2.5 y §3.3:
 * - Separador ';' de Excel Colombia y formato es-CO (punto miles, coma decimal).
 * - AREA_M2 con 2 decimales exactos (formatDec(l.areaM2, 2, 2)).
 * - Exporta TOTAL_FACTURABLE_COP (calcTotalCop) y ASUMIDO_CORPORACION_COP (calcAssumedCorporationCop).
 */
export function buildSabanaCsvContent(locales: ComputedLocalLiquidation[]): string {
  const headers = [
    "BODEGA",
    "CODIGO_LOCAL",
    "TIPO_BODEGA",
    "ESTADO_OCUPACION",
    "MODALIDAD",
    "RESIDUOS_CAT",
    "AREA_M2",
    "ENERGIA_COP",
    "ACUEDUCTO_COP",
    "ASEO_COP",
    "RESIDUOS_ECSA_COP",
    "VIGILANCIA_COP",
    "POLICIA_COP",
    "TOTAL_FACTURABLE_COP",
    "ASUMIDO_CORPORACION_COP",
    "PLANO_ECSA",
    "PLANO_AGUA",
    "PLANO_ENERGIA",
    "PLANO_VIGILANCIA",
  ];

  const rows = locales.map((l) =>
    [
      l.bodegaId,
      l.codigo,
      `"${l.tipoBodega}"`,
      l.effectiveOccupancy,
      l.modalidadGeneral,
      l.categoriaResiduos,
      formatDec(l.areaM2, 2, 2),
      formatInt(l.calcEnergiaCop),
      formatInt(l.calcAcueductoCop),
      formatInt(l.calcAseoCop),
      formatInt(l.calcResiduosCop),
      formatInt(l.calcVigilanciaCop),
      formatInt(l.calcPoliciaCop),
      formatInt(l.calcTotalCop),
      formatInt(l.calcAssumedCorporationCop),
      l.planos.ecsa,
      l.planos.agua,
      l.planos.energia,
      l.planos.vigilancia,
    ].join(";")
  );

  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}
