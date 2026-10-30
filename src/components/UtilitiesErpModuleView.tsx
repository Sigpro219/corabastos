"use client";

import React, { useState } from "react";
import { LiquidationMatrixView } from "@/components/LiquidationMatrixView";
import { BodegasStatusView } from "@/components/BodegasStatusView";
import { MasterReceiptsSimulatorView } from "@/components/MasterReceiptsSimulatorView";
import { MobileFieldCaptureView } from "@/components/MobileFieldCaptureView";
import { BiLongitudinalKpisView } from "@/components/BiLongitudinalKpisView";
import { LiquidationMethodologyView } from "@/components/LiquidationMethodologyView";
import { LocalAccountModal } from "@/components/LocalAccountModal";
import { UtilitiesSubTabId } from "@/contracts/erp-bridges";
import { useCorabastos } from "@/context/CorabastosContext";

interface UtilitiesErpModuleViewProps {
  activeSubTab?: UtilitiesSubTabId;
  onSelectSubTab?: (tab: UtilitiesSubTabId) => void;
}

export function UtilitiesErpModuleView({
  activeSubTab,
}: UtilitiesErpModuleViewProps) {
  const { locales } = useCorabastos();
  const [inspectedLocalCode, setInspectedLocalCode] = useState<string | null>(null);

  const subTab = activeSubTab ?? "SABANA_360";

  const inspectedLocal = inspectedLocalCode
    ? locales.find((l) => l.codigo === inspectedLocalCode) ?? null
    : null;

  return (
    <div className="space-y-4">
      {subTab === "SABANA_360" && <LiquidationMatrixView />}
      {subTab === "BODEGAS_68" && <BodegasStatusView />}
      {subTab === "RECIBOS_MACROS" && <MasterReceiptsSimulatorView />}
      {subTab === "MONITOR_CAMPO" && <MobileFieldCaptureView />}
      {subTab === "BI_KPIS" && (
        <BiLongitudinalKpisView onSelectLocalCode={(code) => setInspectedLocalCode(code)} />
      )}
      {subTab === "MEMORIA_CALCULO" && <LiquidationMethodologyView />}

      <LocalAccountModal
        local={inspectedLocal}
        onClose={() => setInspectedLocalCode(null)}
      />
    </div>
  );
}
