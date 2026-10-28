"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCorabastos } from "@/context/CorabastosContext";
import {
  CORABASTOS_ERP_MODULES,
  ErpMacroModuleId,
  UtilitiesSubTabId,
} from "@/contracts/erp-bridges";
import { UtilitiesErpModuleView } from "@/components/UtilitiesErpModuleView";
import { ErpRoadmapExpansionView } from "@/components/ErpRoadmapExpansionView";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileSpreadsheet,
  Leaf,
  Menu,
  Moon,
  Plug,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  TableProperties,
  Wrench,
  X,
} from "lucide-react";

interface SidebarNavItem {
  id: string;
  label: string;
  moduleId: ErpMacroModuleId;
  subTabId?: UtilitiesSubTabId;
  icon: React.ReactNode;
  isStarFeature?: boolean;
  badgeText?: string;
}

interface SidebarNavSection {
  title: string;
  items: SidebarNavItem[];
}

const SUBTAB_BREADCRUMB_LABELS: Record<UtilitiesSubTabId, string> = {
  SABANA_360: "1.1 Sábana 5.318 Locales & Cuenta Individual 360°",
  BODEGAS_68: "1.2 Estado de las 68 Bodegas & Motor de Vacancia",
  RECIBOS_MACROS: "1.3 Recibos Maestros (10) & Macromedidores Padre-Hijo (62)",
  MONITOR_CAMPO: "1.4 Monitor de Corte & Auditoría en Terreno",
  BI_KPIS: "1.5 Inteligencia BI & 6 KPIs Longitudinales",
};

export default function CorabastosErpShellPage() {
  const {
    locales,
    energyCommunal,
    waterCommunal,
    receipts,
    completedTaskIds,
    resetToOfficialJune2025,
  } = useCorabastos();

  const [activeErpModule, setActiveErpModule] = useState<ErpMacroModuleId>(
    "MOD_1_SERVICIOS_EXPENSAS"
  );
  const [activeSubTab, setActiveSubTab] = useState<UtilitiesSubTabId>("SABANA_360");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const savedSidebar = localStorage.getItem("corabastos_desktop_sidebar");
    if (savedSidebar !== null) {
      setIsDesktopSidebarOpen(savedSidebar === "true");
    }
    const savedTheme = localStorage.getItem("corabastos_dark_mode");
    if (savedTheme === "true") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsDesktopSidebarOpen((prev) => {
        const next = !prev;
        localStorage.setItem("corabastos_desktop_sidebar", String(next));
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 310);
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
      localStorage.setItem("corabastos_dark_mode", String(next));
      return next;
    });
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

    const tareasLeidas = Object.keys(completedTaskIds).length;

    return { medidoresAnomalos, macrosFuga, tareasLeidas };
  }, [locales, energyCommunal, waterCommunal, completedTaskIds]);

  const navSections: SidebarNavSection[] = useMemo(
    () => [
      {
        title: "Liquidación & Auditoría (Mód. 01)",
        items: [
          {
            id: "SUB_SABANA",
            label: "Sábana 5.318 Locales & 360°",
            moduleId: "MOD_1_SERVICIOS_EXPENSAS",
            subTabId: "SABANA_360",
            icon: <TableProperties size={16} />,
          },
          {
            id: "SUB_BODEGAS",
            label: "Estado 68 Bodegas & Vacancia",
            moduleId: "MOD_1_SERVICIOS_EXPENSAS",
            subTabId: "BODEGAS_68",
            icon: <Building2 size={16} />,
          },
          {
            id: "SUB_RECIBOS",
            label: "Recibos (10) & Macros (62)",
            moduleId: "MOD_1_SERVICIOS_EXPENSAS",
            subTabId: "RECIBOS_MACROS",
            icon: <SlidersHorizontal size={16} />,
          },
        ],
      },
      {
        title: "Terreno & Analítica BI (Mód. 01)",
        items: [
          {
            id: "SUB_CAMPO",
            label: "Monitor de Corte Terreno",
            moduleId: "MOD_1_SERVICIOS_EXPENSAS",
            subTabId: "MONITOR_CAMPO",
            icon: <CheckCircle2 size={16} />,
          },
          {
            id: "SUB_BI",
            label: "Inteligencia BI & 6 KPIs",
            moduleId: "MOD_1_SERVICIOS_EXPENSAS",
            subTabId: "BI_KPIS",
            icon: <BarChart3 size={16} />,
            isStarFeature: true,
            badgeText: "6 KPIs",
          },
        ],
      },
      {
        title: "Suite ERP Corabastos (Anillos 2-5)",
        items: [
          {
            id: "MOD_2",
            label: "Facturación DIAN & Cartera",
            moduleId: "MOD_2_FACTURACION_CARTERA",
            icon: <FileSpreadsheet size={16} />,
            badgeText: "A2",
          },
          {
            id: "MOD_3",
            label: "Catastro & Contratos",
            moduleId: "MOD_3_CATASTRO_CONTRATOS",
            icon: <Building2 size={16} />,
            badgeText: "A3",
          },
          {
            id: "MOD_4",
            label: "Mantenimiento CMMS & Fríos",
            moduleId: "MOD_4_MANTENIMIENTO_CMMS",
            icon: <Wrench size={16} />,
            badgeText: "A4",
          },
          {
            id: "MOD_5",
            label: "Ambiental PGIRS & SAC",
            moduleId: "MOD_5_AMBIENTAL_PGIRS_SAC",
            icon: <Leaf size={16} />,
            badgeText: "A5",
          },
        ],
      },
    ],
    []
  );

  const isNavItemActive = (item: SidebarNavItem) => {
    if (item.moduleId !== activeErpModule) return false;
    if (item.moduleId === "MOD_1_SERVICIOS_EXPENSAS" && item.subTabId) {
      return activeSubTab === item.subTabId;
    }
    return true;
  };

  const handleSelectNavItem = (item: SidebarNavItem) => {
    setActiveErpModule(item.moduleId);
    if (item.subTabId) {
      setActiveSubTab(item.subTabId);
    }
    setIsMobileSidebarOpen(false);
  };

  const activeModuleMeta =
    CORABASTOS_ERP_MODULES.find((m) => m.id === activeErpModule) ?? CORABASTOS_ERP_MODULES[0];

  const renderSidebarContent = () => (
    <div className="w-64 flex flex-col h-full shrink-0 select-none">
      {/* BRANDING DEL TENANT ESTILO PORTAL DE OPERACIONES MJM */}
      <div className="p-4 mb-1 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-white/10 shadow-xs shrink-0">
            <Building2 className="w-5 h-5 text-[#0B132B]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-[11px] tracking-tight uppercase leading-none truncate">
              Corabastos OS · ERP
            </h1>
            <p className="text-[7.5px] text-[#f7931b] font-mono font-medium uppercase tracking-widest mt-1 truncate">
              Directiva 033-06 · 68 Bodegas
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden text-white/60 hover:text-white p-1 rounded-md hover:bg-white/5"
        >
          <X size={16} />
        </button>
      </div>

      {/* SECCIONES DE NAVEGACIÓN JERÁRQUICA MJM */}
      <nav className="flex-1 px-2.5 space-y-3 mt-1 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <p className="px-3 pt-1 pb-1 text-[8.5px] font-mono font-bold tracking-widest text-slate-400/60 uppercase">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active = isNavItemActive(item);
              const isStar = Boolean(item.isStarFeature) && !active;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNavItem(item)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150 group text-[11.5px] cursor-pointer text-left ${
                    active
                      ? "bg-white/10 text-white font-semibold border-l-2 border-[#f7931b] shadow-xs"
                      : isStar
                        ? "border border-[#f7931b]/60 bg-[#f7931b]/15 text-white font-semibold shadow-[0_0_12px_rgba(247,147,27,0.2)]"
                        : "text-slate-300 hover:bg-white/5 hover:text-white font-medium"
                  }`}
                >
                  <span
                    className={`transition-transform duration-150 shrink-0 ${
                      active || isStar ? "text-[#f7931b]" : "text-slate-400 group-hover:text-white"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="tracking-tight truncate">{item.label}</span>
                  {item.isStarFeature ? (
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-[#f7931b] text-zinc-950 text-[8px] font-black tracking-wider uppercase flex items-center gap-0.5 shadow-xs shrink-0">
                      <Sparkles size={8} /> {item.badgeText}
                    </span>
                  ) : active ? (
                    <ChevronRight size={11} className="ml-auto text-[#f7931b] shrink-0" />
                  ) : item.badgeText ? (
                    <span className="ml-auto px-1.5 py-0.2 rounded bg-white/5 text-slate-400 text-[8px] font-mono">
                      {item.badgeText}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}

        {/* ACCESO DIRECTO TERMINAL DE CAMPO */}
        <div className="space-y-0.5 pt-1">
          <p className="px-3 pt-1 pb-1 text-[8.5px] font-mono font-bold tracking-widest text-slate-400/60 uppercase">
            Operación en Terreno
          </p>
          <Link
            href="/captura"
            target="_blank"
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11.5px] text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 font-semibold transition-all"
          >
            <Smartphone size={16} className="text-emerald-400 shrink-0" />
            <span className="truncate">Cola Móvil Operador (/captura)</span>
            <ExternalLink size={11} className="ml-auto text-emerald-400 shrink-0" />
          </Link>
        </div>
      </nav>

      {/* FOOTER BRANDING MJM */}
      <div className="mt-auto pb-4 px-3 flex flex-col items-center border-t border-white/5 pt-2">
        <button
          type="button"
          onClick={resetToOfficialJune2025}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-300 hover:text-[#f7931b] active:scale-95 transition-all group cursor-pointer rounded-lg hover:bg-white/5"
        >
          <RotateCcw size={13} className="opacity-70 group-hover:opacity-100 transition-all" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            Restaurar Corte Base
          </span>
        </button>

        <div className="flex flex-col items-center text-center mt-2 w-full px-1">
          <p className="text-[8.5px] text-white/40 font-mono tracking-wider font-semibold">
            Powered by <span className="text-white/75 font-bold">Delta CoreTech</span>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[8px] text-[#f7931b]/90 font-mono tracking-tight mt-1 bg-white/5 px-2 py-0.5 rounded border border-white/5 w-full truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span className="truncate">Corte: {receipts.nombrePeriodo} · SDD v1.5</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--background)] text-[var(--text-main)] selection:bg-[#f7931b]/20">
      {/* DRAWER MÓVIL */}
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

      {/* SIDEBAR DESKTOP COLAPSABLE (STICKY FULL-HEIGHT) */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen bg-[var(--sidebar-bg)] text-white shrink-0 z-40 transition-all duration-300 ease-in-out overflow-hidden ${
          isDesktopSidebarOpen
            ? "w-64 border-r border-white/10 opacity-100"
            : "w-0 border-r-0 opacity-0 pointer-events-none"
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* COLUMNA PRINCIPAL DE CONTENIDO */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR EJECUTIVO MJM (STICKY TOP-0, H-14 PARA SINCRONÍA CON TABLAS STICKY) */}
        <header className="sticky top-0 z-40 h-14 bg-[var(--surface)] border-b border-[var(--outline-color)] flex items-center justify-between px-4 sm:px-6 transition-colors duration-300 shrink-0">
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            {/* BOTÓN HAMBURGUESA PARA OCULTAR / MOSTRAR EL SIDEBAR */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 text-[var(--text-main)] hover:bg-[var(--surface-alt)] hover:text-[#f7931b] rounded-lg transition-all border border-[var(--outline-color)] shadow-2xs flex items-center justify-center group cursor-pointer shrink-0"
              title={isDesktopSidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
            >
              <Menu size={16} className="group-hover:scale-105 transition-transform" />
            </button>

            {/* BREADCRUMB DINÁMICO ESTILO MJM */}
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10.5px] font-medium uppercase tracking-wider truncate">
              <span className="hidden sm:inline">{activeModuleMeta.label}</span>
              <ChevronRight size={10} className="opacity-40 shrink-0 hidden sm:inline" />
              <span className="text-[#1E3A5F] dark:text-[#f7931b] font-bold truncate">
                {activeErpModule === "MOD_1_SERVICIOS_EXPENSAS"
                  ? SUBTAB_BREADCRUMB_LABELS[activeSubTab]
                  : `${activeModuleMeta.code} · Arquitectura Cables Pelados`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* PÍLDORA DE FACTURACIÓN DEL CORTE ACTIVO */}
            <div className="hidden xl:flex items-center gap-2 bg-[var(--background)] px-3 py-1 rounded-lg border border-[var(--outline-color)] text-[11px]">
              <span className="text-[9.5px] font-mono uppercase text-[var(--text-muted)]">
                Corte {receipts.nombrePeriodo}:
              </span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                ${totalLiquidadoMes.toLocaleString("es-CO")} COP
              </span>
            </div>

            {/* BADGE DE ESTADO CORPORATIVO MJM */}
            <div className="hidden sm:flex shrink-0">
              <span className="px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                5.318 Locales Activos
              </span>
            </div>

            {/* CONTROLES DE TEMA Y NOTIFICACIONES MJM */}
            <div className="flex items-center gap-1 bg-[var(--background)] p-0.5 rounded-lg border border-[var(--outline-color)] relative">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="p-1.5 rounded-md transition-all hover:bg-[var(--surface-alt)] text-[var(--text-main)] cursor-pointer"
                title="Alternar Modo Día / Noche (MJM Obsidian Titanium)"
              >
                {isDarkMode ? <Sun size={14} className="text-[#f7931b]" /> : <Moon size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="p-1.5 rounded-md transition-all hover:bg-[var(--surface-alt)] text-[var(--text-main)] relative cursor-pointer"
                title="Alertas Críticas del Corte"
              >
                <Bell size={14} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              </button>

              {/* POPOVER GLASSMORPHISM EN AZUL PROFUNDO (DISEÑO MJM) */}
              {showNotifications && (
                <div className="absolute top-11 right-0 w-80 z-50">
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="relative z-50 rounded-2xl p-4 text-white backdrop-blur-2xl border border-sky-400/30 shadow-[0_20px_50px_rgba(10,25,47,0.85),0_0_30px_rgba(56,189,248,0.2)] overflow-hidden bg-gradient-to-b from-[#14284b]/95 via-[#0d1d36]/95 to-[#091528]/95">
                    <div className="flex justify-between items-center mb-3 border-b border-sky-400/20 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
                          <AlertCircle size={15} />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                            Alertas Críticas del Corte
                          </h4>
                          <p className="text-[9px] text-sky-300/80">
                             Vigilancia Metrológica y Macromedidores
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                        <span className="text-slate-200">Medidores Detenidos / Tapados</span>
                        <span className="px-2 py-0.5 rounded bg-red-500/25 text-red-300 border border-red-500/40 font-mono font-bold">
                          {alertStats.medidoresAnomalos}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                        <span className="text-slate-200">Macromedidores Desviación &gt;20%</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40 font-mono font-bold">
                          {alertStats.macrosFuga}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                        <span className="text-slate-200">Lecturas Verificadas en Turno</span>
                        <span className="px-2 py-0.5 rounded bg-sky-500/25 text-sky-300 border border-sky-500/40 font-mono font-bold">
                          {alertStats.tareasLeidas}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveErpModule("MOD_1_SERVICIOS_EXPENSAS");
                        setActiveSubTab("BI_KPIS");
                        setShowNotifications(false);
                      }}
                      className="mt-3 pt-2.5 border-t border-sky-400/20 w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      <span>Abrir Radar BI & 6 KPIs</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PERFIL CORPORATIVO ESTILO MJM */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-[var(--outline-color)]">
              <div className="hidden md:flex flex-col items-end">
                <p className="text-[11px] font-semibold tracking-tight leading-none">
                  Dirección Financiera
                </p>
                <p className="text-[8.5px] font-mono font-medium uppercase tracking-wider text-[#f7931b] mt-1">
                  Corabastos S.A.
                </p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-[#0B132B] text-white dark:bg-[#f7931b] dark:text-slate-950 flex items-center justify-center font-bold text-[10px] shadow-xs shrink-0">
                CO
              </div>
            </div>
          </div>
        </header>

        {/* ÁREA DE TRABAJO PRINCIPAL */}
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-3.5 sm:px-5 lg:px-6 py-4">
          {activeErpModule === "MOD_1_SERVICIOS_EXPENSAS" ? (
            <UtilitiesErpModuleView
              activeSubTab={activeSubTab}
              onSelectSubTab={(tab) => setActiveSubTab(tab)}
            />
          ) : (
            <ErpRoadmapExpansionView />
          )}
        </main>
      </div>
    </div>
  );
}
