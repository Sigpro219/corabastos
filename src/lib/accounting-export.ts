import { ComputedLocalLiquidation } from "@/lib/liquidation-engine";

/**
 * Headless Accounting & Sabana Export Engine (Planos PL109, PL008, PL009, PL003, PL004, PL086, PL141, AMB403)
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
    "TOTAL_LIQUIDADO_COP",
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
      l.estadoOcupacion || "ACTIVO",
      l.modalidadGeneral,
      l.categoriaResiduos,
      l.areaM2.toFixed(2),
      l.calcEnergiaCop,
      l.calcAcueductoCop,
      l.calcAseoCop,
      l.calcResiduosCop,
      l.calcVigilanciaCop,
      l.calcPoliciaCop,
      l.calcTotalCop,
      l.calcAssumedCorporationCop || 0,
      l.planos.ecsa,
      l.planos.agua,
      l.planos.energia,
      l.planos.vigilancia,
    ].join(",")
  );

  return "\uFEFF" + [headers.join(","), ...rows].join("\n");
}
