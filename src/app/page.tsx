"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCorabastos } from "@/context/CorabastosContext";
import {
  EXECUTIVE_OPERATIONAL_VIEWS,
  ExecutiveViewId,
} from "@/contracts/erp-bridges";
import { UtilitiesErpModuleView } from "@/components/UtilitiesErpModuleView";
import { LocalAccountModal } from "@/components/LocalAccountModal";
import { CorabastosBrandLogo } from "@/components/CorabastosBrandLogo";
import { buildCutoffReadingTasks } from "@/lib/reading-tasks-engine";
import { formatCop, formatInt } from "@/lib/formatters";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ChevronRight,
  Cloud,
  CloudOff,
  Flame,
  KeyRound,
  Lock,
  Menu,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sun,
  TableProperties,
  X,
} from "lucide-react";

const VIEW_ICONS: Record<ExecutiveViewId, React.ReactNode> = {
  TRANSFERENCIAS: <Flame size={16} strokeWidth={1.75} />,
  SABANA_360: <TableProperties size={16} strokeWidth={1.75} />,
  BODEGAS_68: <Building2 size={16} strokeWidth={1.75} />,
  RECIBOS_MACROS: <SlidersHorizontal size={16} strokeWidth={1.75} />,
  AUDITORIA_BI: <BarChart3 size={16} strokeWidth={1.75} />,
};

export default function CorabastosExecutiveShellPage() {
  const router = useRouter();
  const {
    role,
    authenticateAuditorAdmin,
    switchToLecturista,
    isCloudConnected,
    locales,
    localesByCode,
    energyCommunal,
    waterCommunal,
    bathroomMeters,
    receipts,
    activePeriodId,
    setActivePeriodId,
    completedTaskIds,
    fieldOverridesMap,
    resetToOfficialJune2025,
  } = useCorabastos();

  const [activeView, setActiveView] = useState<ExecutiveViewId>("SABANA_360");
  const [selectedLocalCode, setSelectedLocalCode] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedSidebar = localStorage.getItem("corabastos_desktop_sidebar");
      if (savedSidebar !== null) {
        setIsDesktopSidebarOpen(savedSidebar === "true");
      }
      const savedTheme = localStorage.getItem("corabastos_dark_mode");
      if (savedTheme === "true") {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      /* Fallback local */
    }
  }, []);

  useEffect(() => {
    if (role === "LECTURISTA") {
      router.replace("/captura");
    }
  }, [role, router]);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsDesktopSidebarOpen((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("corabastos_desktop_sidebar", String(next));
        } catch {
          /* noop */
        }
        return next;
      });
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        localStorage.setItem("corabastos_dark_mode", String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  };

  const handleEnterFieldMode = () => {
    switchToLecturista();
    router.push("/captura");
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authenticateAuditorAdmin(pinInput)) {
      setPinInput("");
      setPinError(null);
    } else {
      setPinError("PIN administrativo inválido.");
    }
  };

  const totalLiquidadoMes = useMemo(
    () => locales.reduce((acc, l) => acc + l.calcTotalCop, 0),
    [locales]
  );

  const alertStats = useMemo(() => {
    const medidoresAnomalos = locales.filter((l) => {
      const obsE = (l.energiaObs || "").toUpperCase();
      const obsA = (l.aguaObs || "").toUpperCase();
      return (
        obsE.includes("DETENIDO") ||
        obsE.includes("TAPADO") ||
        obsA.includes("DETENIDO") ||
        obsA.includes("TAPADO")
      );
    }).length;

    const macrosFuga =
      energyCommunal.filter((m) => m.alertaDesviacion).length +
      waterCommunal.filter((w) => w.alertaDesviacion).length;

    const physicalTasks = buildCutoffReadingTasks(
      locales,
      energyCommunal,
      waterCommunal,
      bathroomMeters,
      completedTaskIds,
      fieldOverridesMap
    );
    const tareasLeidas = physicalTasks.filter((t) => t.taskState !== "PENDIENTE").length;
    const totalTareasFisicas = physicalTasks.length;

    return { medidoresAnomalos, macrosFuga, tareasLeidas, totalTareasFisicas };
  }, [locales, energyCommunal, waterCommunal, bathroomMeters, completedTaskIds, fieldOverridesMap]);

  const activeViewMeta =
    EXECUTIVE_OPERATIONAL_VIEWS.find((v) => v.id === activeView) ??
    EXECUTIVE_OPERATIONAL_VIEWS[0];

  const selectedLocal = selectedLocalCode
    ? localesByCode.get(selectedLocalCode) ?? null
    : null;

  if (role === "LECTURISTA") {
    return (
      <div className="min-h-screen bg-[#010F22] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
              <CorabastosBrandLogo variant="isotipo" size={30} />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                <Lock className="w-3 h-3" strokeWidth={1.75} />
                COMPUERTA RBAC ACTIVA
              </span>
              <h1 className="text-base font-bold mt-1">Sesión en Modo Lecturista de Terreno</h1>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Redirigiendo automáticamente a la cola física de odómetros (<strong>/captura</strong>). Para ingresar a la Consola Ejecutiva Financiera, autentica el PIN de Auditoría.
          </p>
          <form onSubmit={handlePinSubmit} className="space-y-2.5">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(null);
              }}
              placeholder="PIN Administrativo"
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-white/15 font-mono text-xs text-white focus:outline-none focus:border-emerald-400"
            />
            {pinError && <p className="text-xs text-rose-400 font-semibold">{pinError}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Desbloquear Auditor</span>
              </button>
              <button
                type="button"
                onClick={() => router.replace("/captura")}
                className="flex-1 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Ir a /captura</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const renderSidebarContent = () => (
    <div className="w-64 flex flex-col h-full shrink-0 select-none">
      <div className="p-4 mb-1 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-white/15 shadow-xs shrink-0 p-1">
            <CorabastosBrandLogo variant="isotipo" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-[11px] tracking-tight uppercase leading-none truncate">
              Corabastos S.A.
            </h1>
            <p className="text-[8px] text-[#f7931b] font-mono font-medium uppercase tracking-widest mt-1 truncate">
              NIT 860.028.093-7 · 68 Bodegas
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden text-white/60 hover:text-white p-1 rounded-md hover:bg-white/5"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      <nav className="flex-1 px-2.5 space-y-4 mt-2 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 pt-1 pb-1 text-[8.5px] font-mono font-bold tracking-widest text-slate-400/70 uppercase">
            Vistas Operativas del Corte
          </p>
          {EXECUTIVE_OPERATIONAL_VIEWS.map((view) => {
            const active = activeView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => {
                  setActiveView(view.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group text-xs cursor-pointer text-left ${
                  active
                    ? "bg-white/10 text-white font-semibold border-l-2 border-[#f7931b] shadow-xs"
                    : "text-slate-300 hover:bg-white/5 hover:text-white font-medium"
                }`}
              >
                <span
                  className={`shrink-0 ${
                    active ? "text-[#f7931b]" : "text-slate-400 group-hover:text-white"
                  }`}
                >
                  {VIEW_ICONS[view.id]}
                </span>
                <span className="tracking-tight truncate">{view.shortLabel}</span>
                {active && (
                  <ChevronRight
                    size={12}
                    strokeWidth={1.75}
                    className="ml-auto text-[#f7931b] shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-1 pt-2 border-t border-white/10">
          <p className="px-3 pt-1 pb-1 text-[8.5px] font-mono font-bold tracking-widest text-slate-400/70 uppercase">
            Operación de Campo (RBAC)
          </p>
          <button
            type="button"
            onClick={handleEnterFieldMode}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 font-semibold transition-all cursor-pointer text-left"
          >
            <Smartphone size={16} strokeWidth={1.75} className="text-emerald-400 shrink-0" />
            <span className="truncate">Pasar a Modo Lecturista</span>
          </button>
        </div>
      </nav>

      <div className="mt-auto pb-4 px-3 flex flex-col items-center border-t border-white/10 pt-3 gap-2">
        <button
          type="button"
          onClick={resetToOfficialJune2025}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-300 hover:text-[#f7931b] active:scale-95 transition-all group cursor-pointer rounded-lg hover:bg-white/5 border border-white/10"
        >
          <RotateCcw size={13} strokeWidth={1.75} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            Restaurar Corte Oficial
          </span>
        </button>

        <div className="flex flex-col items-center text-center w-full px-1">
          <p className="text-[8.5px] text-white/45 font-mono tracking-wider font-semibold">
            Powered by <span className="text-white/80 font-bold">Delta CoreTech</span>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[8.5px] text-[#f7931b] font-mono mt-1 bg-white/5 px-2 py-0.5 rounded border border-white/10 w-full truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">Corte: {receipts.nombrePeriodo}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="app-print-hide min-h-screen flex bg-[var(--background)] text-[var(--text-main)] selection:bg-[#f7931b]/20">
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <aside className="relative flex flex-col w-64 h-full bg-[var(--sidebar-bg)] text-white shadow-2xl z-50">
              {renderSidebarContent()}
            </aside>
          </div>
        )}

        <aside
          className={`hidden lg:flex flex-col sticky top-0 h-screen bg-[var(--sidebar-bg)] text-white shrink-0 z-40 transition-all duration-300 ease-in-out overflow-hidden ${
            isDesktopSidebarOpen
              ? "w-64 border-r border-white/10 opacity-100"
              : "w-0 border-r-0 opacity-0 pointer-events-none"
          }`}
        >
          {renderSidebarContent()}
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-14 bg-[var(--surface)] border-b border-[var(--outline-color)] flex items-center justify-between px-4 sm:px-6 shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 text-[var(--text-main)] hover:bg-[var(--surface-alt)] hover:text-[#f7931b] rounded-lg transition-all border border-[var(--outline-color)] flex items-center justify-center cursor-pointer shrink-0"
                title={isDesktopSidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
              >
                <Menu size={16} strokeWidth={1.75} />
              </button>

              <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] font-medium uppercase tracking-wider truncate">
                <span className="hidden md:inline">Servicios Públicos & Expensas</span>
                <ChevronRight
                  size={11}
                  strokeWidth={1.75}
                  className="opacity-50 shrink-0 hidden md:inline"
                />
                <span className="text-[#1E3A5F] dark:text-[#f7931b] font-bold truncate">
                  {activeViewMeta.title}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Selector Global de Periodo de Corte */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 pl-1.5 flex items-center gap-1">
                  <Calendar size={12} strokeWidth={1.75} className="text-emerald-500" />
                  Corte:
                </span>
                <select
                  value={activePeriodId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "2026-11" || val === "2025-06" || val === "2025-05") {
                      setActivePeriodId(val);
                    }
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-slate-900 dark:text-emerald-400 focus:outline-none cursor-pointer"
                >
                  <option value="2026-11">27 Nov 2026 (En Ejecución: 34 Bodegas)</option>
                  <option value="2025-06">Junio 2025 (Corte Oficial 100%)</option>
                  <option value="2025-05">Mayo 2025 (Periodo Previo)</option>
                </select>
                <span className="hidden sm:inline font-mono font-black text-emerald-700 dark:text-emerald-400 tabular-nums border-l border-slate-300 dark:border-slate-700 pl-2 pr-1.5">
                  {formatCop(totalLiquidadoMes)} COP
                </span>
              </div>

              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${
                  isCloudConnected
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                }`}
                title={
                  isCloudConnected
                    ? "Sincronización bidireccional activa con Firebase Cloud"
                    : "Operando con persistencia local (localStorage + IndexedDB)"
                }
              >
                {isCloudConnected ? (
                  <Cloud size={13} strokeWidth={1.75} />
                ) : (
                  <CloudOff size={13} strokeWidth={1.75} />
                )}
                <span>{isCloudConnected ? "Cloud Sync" : "Modo Local"}</span>
              </span>

              <button
                type="button"
                onClick={handleEnterFieldMode}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                title="Cambiar sesión a Modo Lecturista e ir a /captura"
              >
                <Smartphone size={13} strokeWidth={1.75} />
                <span>Modo Lecturista</span>
              </button>

              <button
                type="button"
                onClick={resetToOfficialJune2025}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--surface-alt)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--text-main)] border border-[var(--outline-color)] text-[11px] font-semibold transition-colors cursor-pointer"
                title="Restaurar cifras oficiales certificadas de Junio 2025"
              >
                <RotateCcw size={13} strokeWidth={1.75} />
                <span>Reset Corte</span>
              </button>

              <div className="flex items-center gap-1 bg-[var(--surface-alt)] p-0.5 rounded-lg border border-[var(--outline-color)] relative">
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-md transition-all hover:bg-[var(--surface)] text-[var(--text-main)] cursor-pointer"
                  title="Alternar Modo Día / Modo Noche"
                >
                  {isDarkMode ? (
                    <Sun size={14} strokeWidth={1.75} className="text-[#f7931b]" />
                  ) : (
                    <Moon size={14} strokeWidth={1.75} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="p-1.5 rounded-md transition-all hover:bg-[var(--surface)] text-[var(--text-main)] relative cursor-pointer"
                  title="Alertas Críticas del Corte"
                >
                  <Bell size={14} strokeWidth={1.75} />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>

                {showNotifications && (
                  <div className="absolute top-11 right-0 w-80 z-50">
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="relative z-50 rounded-2xl p-4 text-white border border-sky-400/30 shadow-2xl bg-[#0B132B]">
                      <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
                            <AlertCircle size={15} strokeWidth={1.75} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                              Alertas del Corte
                            </h4>
                            <p className="text-[9px] text-sky-300/80">
                              Vigilancia Metrológica y Macromedidores
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowNotifications(false)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                        >
                          <X size={14} strokeWidth={1.75} />
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-slate-200">Medidores Detenidos / Tapados</span>
                          <span className="px-2 py-0.5 rounded bg-red-500/25 text-red-300 border border-red-500/40 font-mono font-bold">
                            {formatInt(alertStats.medidoresAnomalos)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-slate-200">Macromedidores Desviación &gt;25%</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40 font-mono font-bold">
                            {formatInt(alertStats.macrosFuga)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-slate-200">Lecturas Verificadas en Turno</span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/25 text-sky-300 border border-sky-500/40 font-mono font-bold">
                            {formatInt(alertStats.tareasLeidas)} / {formatInt(alertStats.totalTareasFisicas)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView("AUDITORIA_BI");
                          setShowNotifications(false);
                        }}
                        className="mt-3 pt-2.5 border-t border-white/10 w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        <span>Abrir Inteligencia BI & Terreno</span>
                        <ChevronRight size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-[1600px] w-full mx-auto px-3.5 sm:px-5 lg:px-6 py-4">
            <UtilitiesErpModuleView
              activeView={activeView}
              onSelectLocalCode={(code) => setSelectedLocalCode(code)}
            />
          </main>
        </div>
      </div>

      <LocalAccountModal
        local={selectedLocal}
        onClose={() => setSelectedLocalCode(null)}
      />
    </>
  );
}
