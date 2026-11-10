/**
 * BDD-Guard Determinista Canónico — Corabastos SPEC.md v3.1.0 §7.2
 * Ejecuta las 5 Invariantes Matemáticas, Topológicas, Metrológicas y Contables
 * directamente contra el código real en src/ y el dataset oficial Junio 2025.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const requireFromRoot = createRequire(path.join(ROOT_DIR, "package.json"));
const ts = requireFromRoot("typescript");

const moduleCache = new Map();

function resolveSourceFile(specifier, parentDir) {
  let basePath;
  if (specifier.startsWith("@/")) {
    basePath = path.join(SRC_DIR, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    basePath = path.resolve(parentDir, specifier);
  } else {
    return null;
  }
  for (const candidate of [basePath, `${basePath}.ts`, `${basePath}.tsx`, `${basePath}.json`]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  throw new Error(`No se pudo resolver el módulo local: ${specifier}`);
}

function loadTsModule(absFilePath) {
  const normalizedPath = path.normalize(absFilePath);
  if (moduleCache.has(normalizedPath)) {
    return moduleCache.get(normalizedPath).exports;
  }
  if (normalizedPath.endsWith(".json")) {
    const parsed = JSON.parse(fs.readFileSync(normalizedPath, "utf8"));
    moduleCache.set(normalizedPath, { exports: parsed });
    return parsed;
  }

  const code = fs.readFileSync(normalizedPath, "utf8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: normalizedPath,
  });

  const mod = { exports: {} };
  moduleCache.set(normalizedPath, mod);

  const localDir = path.dirname(normalizedPath);
  const customRequire = (spec) => {
    const resolved = resolveSourceFile(spec, localDir);
    if (resolved) return loadTsModule(resolved);
    return requireFromRoot(spec);
  };

  const wrapper = vm.runInThisContext(
    `(function(exports, require, module, __filename, __dirname) { ${transpiled.outputText}\n})`,
    { filename: normalizedPath }
  );
  wrapper(mod.exports, customRequire, mod, normalizedPath, localDir);
  return mod.exports;
}

console.log("====================================================================");
console.log(" CORABASTOS BDD-GUARD — VERIFICACIÓN DE 5 INVARIANTES (SPEC v3.1.0)");
console.log("====================================================================");

const formatters = loadTsModule(path.join(SRC_DIR, "lib", "formatters.ts"));
const contracts = loadTsModule(path.join(SRC_DIR, "contracts", "domain-contracts.ts"));
const engine = loadTsModule(path.join(SRC_DIR, "lib", "liquidation-engine.ts"));
const tasksEngine = loadTsModule(path.join(SRC_DIR, "lib", "reading-tasks-engine.ts"));
const biEngine = loadTsModule(path.join(SRC_DIR, "lib", "bi-kpis-engine.ts"));
const csvEngine = loadTsModule(path.join(SRC_DIR, "lib", "accounting-export.ts"));
const seedData = JSON.parse(
  fs.readFileSync(path.join(SRC_DIR, "data", "corabastos-junio-2025.json"), "utf8")
);

// ---------------------------------------------------------------------------
// INVARIANTE 1: Cuadre Exacto en Frío Junio 2025 ($3.621.554.642 COP) + Mayo Oficial
// ---------------------------------------------------------------------------
const baseComputed = engine.recalculateAllLocales(
  seedData.locales,
  seedData.masterReceiptsJunio2025,
  {
    energyMacroMeters: seedData.energyCommunalMeters,
    waterMacroMeters: seedData.waterCommunalMeters,
    fieldOverridesMap: {},
    occupancyMap: {},
    seedReceipts: seedData.masterReceiptsJunio2025,
  }
);

assert.equal(baseComputed.length, 5318, "El universo debe contener exactamente 5.318 locales");

let sumEnergia = 0;
let sumAcueducto = 0;
let sumAseo = 0;
let sumResiduos = 0;
let sumVigilancia = 0;
let sumPolicia = 0;
let sumTotal = 0;
let sumArea = 0;
let exactLocalMatches = 0;
const bodegaSet = new Set();

for (let i = 0; i < baseComputed.length; i++) {
  const c = baseComputed[i];
  const raw = seedData.locales[i];
  bodegaSet.add(c.bodegaId);
  sumArea += c.areaM2;
  sumEnergia += c.calcEnergiaCop;
  sumAcueducto += c.calcAcueductoCop;
  sumAseo += c.calcAseoCop;
  sumResiduos += c.calcResiduosCop;
  sumVigilancia += c.calcVigilanciaCop;
  sumPolicia += c.calcPoliciaCop;
  sumTotal += c.calcTotalCop;

  const expectedLocal =
    raw.energiaBpCop +
    raw.energiaPrincipalCop +
    raw.acueductoCop +
    raw.aseoCop +
    raw.residuosCop +
    raw.vigilanciaCop +
    raw.policiaCop;
  assert.equal(c.calcTotalCop, expectedLocal, `Desviación en T=0 en local ${c.codigo}`);
  assert.equal(c.calcAssumedCorporationCop, 0);
  exactLocalMatches++;
}

assert.equal(bodegaSet.size, 68, "Deben existir exactamente 68 bodegas");
assert.ok(Math.abs(sumArea - 126125.15) < 0.05, `Área total esperada 126.125,15 m², recibida ${sumArea}`);
assert.equal(sumEnergia, 856_707_455, "Energía Total debe cuadrar en $856.707.455 COP");
assert.equal(sumAcueducto, 239_477_169, "Acueducto debe cuadrar en $239.477.169 COP");
assert.equal(sumAseo, 173_508_673, "Aseo debe cuadrar en $173.508.673 COP");
assert.equal(sumResiduos, 678_935_044, "Residuos ECSA debe cuadrar en $678.935.044 COP");
assert.equal(sumVigilancia, 1_457_539_601, "Vigilancia debe cuadrar en $1.457.539.601 COP");
assert.equal(sumPolicia, 215_386_700, "Policía debe cuadrar en $215.386.700 COP");
assert.equal(sumTotal, 3_621_554_642, "Gran Total Junio 2025 debe ser exactamente $3.621.554.642 COP");
assert.equal(exactLocalMatches, 5318);

const loc010001 = baseComputed.find((l) => l.codigo === "010001");
assert.equal(loc010001.totalMayoOficialCop, 3_505_879, "TotalMayoOficial de 010001 debe corregir totalAnteriorCop corrupto");
assert.notEqual(loc010001.totalMayoOficialCop, loc010001.totalAnteriorCop);

console.log("[PASS] Invariante 1: Cuadre exacto T=0 = $3.621.554.642 COP ($0 desviación en 5.318 locales) + TotalMayoOficial limpio.");

// ---------------------------------------------------------------------------
// INVARIANTE 2: Desacoplo Diferencial Padre-Hijo Saneado + Anti-NaN + 5 Bolsas
// ---------------------------------------------------------------------------
const baseMap = new Map(baseComputed.map((l) => [l.codigo, l]));
const baseEnergyMacros = engine.computeEnergyCommunalHierarchy(seedData.energyCommunalMeters, baseMap, {});
const baseWaterMacros = engine.computeWaterCommunalHierarchy(seedData.waterCommunalMeters, baseMap, {});

assert.equal(baseEnergyMacros.length, 38);
assert.equal(baseWaterMacros.length, 24);

for (const m of [...baseEnergyMacros, ...baseWaterMacros]) {
  assert.ok(Number.isFinite(m.consumoNetoComunal), `NaN/Infinity en ${m.id}`);
  assert.ok(Number.isFinite(m.factorPorM2), `factorPorM2 NaN/Infinity en ${m.id}`);
  assert.equal(m.deltaFactorPorM2, 0, `En T=0 deltaFactorPorM2 debe ser 0 en ${m.id}`);
}

const ecom27 = baseEnergyMacros.find((m) => m.id === "ECOM-27");
assert.equal(ecom27.hijosCount, 0, "ECOM-27 debe filtrar hijos arrastrados de otras bodegas");
assert.equal(ecom27.consumoNetoComunal, 7084, "ECOM-27 sin override debe preservar neto semilla 7.084 kWh");

const acom16 = baseWaterMacros.find((m) => m.id === "ACOM-16");
assert.equal(acom16.factorPorM2, 0, "ACOM-16 con areaM2 === 0 debe retornar factorPorM2 = 0 sin Infinity");

// Mutación diferencial Padre-Hijo + ACOM-16 + ECOM-27 + Hijo válido (010012 en Bodega 01)
const macroOverrides = {
  [engine.buildTaskKey("MACRO_ENERGIA", "ALERO BOD 1")]: {
    codigo: "ALERO BOD 1",
    servicio: "MACRO_ENERGIA",
    lecturaActual: 82642, // +2000 kWh sobre semilla 80642
    observacion: "VERIFICADO POR IMAGEN",
    timestamp: "2026-11-10T12:00:00.000Z",
  },
  [engine.buildTaskKey("MACRO_AGUA", "BODEGA 20 COMUNAL")]: {
    codigo: "BODEGA 20 COMUNAL",
    servicio: "MACRO_AGUA",
    lecturaActual: 25000,
    observacion: "VERIFICADO POR IMAGEN",
    timestamp: "2026-11-10T12:00:00.000Z",
  },
  [engine.buildTaskKey("AGUA", "030001")]: {
    codigo: "030001",
    servicio: "AGUA",
    lecturaActual: (seedData.locales.find((l) => l.codigo === "030001").aguaLecturaAct || 0) + 50,
    observacion: "VERIFICADO POR IMAGEN",
    timestamp: "2026-11-10T12:00:00.000Z",
  },
};

const mutatedComputed = engine.recalculateAllLocales(
  seedData.locales,
  seedData.masterReceiptsJunio2025,
  {
    energyMacroMeters: seedData.energyCommunalMeters,
    waterMacroMeters: seedData.waterCommunalMeters,
    fieldOverridesMap: macroOverrides,
    occupancyMap: {},
    seedReceipts: seedData.masterReceiptsJunio2025,
  }
);

for (const c of mutatedComputed) {
  assert.ok(Number.isFinite(c.calcTotalCop) && Number.isFinite(c.calcEnergiaCop) && Number.isFinite(c.calcAcueductoCop));
}

const mut010001 = mutatedComputed.find((l) => l.codigo === "010001");
assert.ok(mut010001.energiaConsumoAleroActualKw > loc010001.energiaConsumoAleroActualKw, "El aumento en ALERO BOD 1 debe propagar kWh a 010001");
assert.ok(mut010001.calcEnergiaCop > loc010001.calcEnergiaCop, "El aumento en ALERO BOD 1 debe incrementar calcEnergiaCop en 010001");
const baseBod03Comunal = baseComputed.find((l) => l.bodegaId === "03" && l.modalidadAcueducto === "COMUNAL");
const mutBod03Comunal = mutatedComputed.find((l) => l.codigo === baseBod03Comunal.codigo);
assert.ok(mutBod03Comunal.aguaConsumoComunalActualM3 < baseBod03Comunal.aguaConsumoComunalActualM3, "El aumento del hijo CONTADOR 030001 debe descontar agua comunal en Bodega 03");
assert.ok(mutBod03Comunal.calcAcueductoCop < baseBod03Comunal.calcAcueductoCop, "El descuento Padre-Hijo en Bodega 03 debe reducir calcAcueductoCop comunal");

// Verificar escalamiento de las 5 bolsas
const customReceipts = structuredClone(seedData.masterReceiptsJunio2025);
customReceipts.energia.principal.valorNetoServicio += 15_000_000;
customReceipts.energia.bodegaPopular.valorFacturaNeto += 10_000_000;
customReceipts.energia.redFrios.valorNetoServicio *= 1.2;
customReceipts.acueducto.valorFacturaGeneral += 8_000_000;
customReceipts.acueducto.valorFacturaRedFrios *= 1.15;

const bolsasComputed = engine.recalculateAllLocales(seedData.locales, customReceipts, {
  energyMacroMeters: seedData.energyCommunalMeters,
  waterMacroMeters: seedData.waterCommunalMeters,
  seedReceipts: seedData.masterReceiptsJunio2025,
});
assert.ok(bolsasComputed.find((l) => l.codigo === "170020").calcEnergiaCop > baseMap.get("170020").calcEnergiaCop);
assert.ok(bolsasComputed.find((l) => l.codigo === "810826").calcEnergiaCop > baseMap.get("810826").calcEnergiaCop);
assert.ok(bolsasComputed.find((l) => l.codigo === "550000").calcEnergiaCop > baseMap.get("550000").calcEnergiaCop);
assert.ok(bolsasComputed.find((l) => l.codigo === "050001").calcAcueductoCop > baseMap.get("050001").calcAcueductoCop);
assert.ok(bolsasComputed.find((l) => l.codigo === "980001").calcAcueductoCop > baseMap.get("980001").calcAcueductoCop);

// Verificar normalizeMasterReceipts y computeLiveLiquidationBags (incluyendo - deltaCostoBase*)
customReceipts.expensas.vigilancia.valorNetoDistribuir *= 1.1;
customReceipts.expensas.residuosEcsa.factorNP = 3.0;
const normCustom = engine.normalizeMasterReceipts(customReceipts);
assert.ok(Math.abs(normCustom.expensas.vigilancia.tarifaPorM2 - customReceipts.expensas.vigilancia.valorNetoDistribuir / customReceipts.expensas.vigilancia.areaTotalM2) < 1e-6);
assert.ok(Math.abs(normCustom.expensas.residuosEcsa.tarifaEfectivaNpM2 - normCustom.expensas.residuosEcsa.tarifaBaseM2 * 3.0) < 1e-6);
const liveBagsMutated = engine.computeLiveLiquidationBags(mutatedComputed, seedData.masterReceiptsJunio2025, seedData.masterReceiptsJunio2025);
assert.ok(liveBagsMutated.deltaCostoBaseMedidoYComunalPrincipal !== 0, "computeLiveLiquidationBags debe reflejar -deltaCostoBaseMedidoYComunalPrincipal");
assert.ok(Math.abs(liveBagsMutated.bolsaProrrateoPrincipalCop - (seedData.masterReceiptsJunio2025.energia.principal.bolsaProrrateo - liveBagsMutated.deltaCostoBaseMedidoYComunalPrincipal)) < 1e-4);

console.log("[PASS] Invariante 2: Desacoplo diferencial Padre-Hijo saneado (ECOM-27, ACOM-16 anti-NaN) y 5 bolsas activas.");

// ---------------------------------------------------------------------------
// INVARIANTE 3: 1.688 Tareas Físicas Únicas sobre 1.835 Registros + Sincronización /N + Zod
// ---------------------------------------------------------------------------
const tasks = tasksEngine.buildCutoffReadingTasks(
  baseComputed,
  baseEnergyMacros,
  baseWaterMacros,
  seedData.publicBathroomMeters,
  {},
  {}
);

const z1Count = tasks.filter((t) => t.zonaId === "ZONA_1_MACROMEDIDORES").length;
const z2Count = tasks.filter((t) => t.zonaId === "ZONA_2_BANOS_PUBLICOS").length;
const eTasksCount = tasks.filter((t) => t.servicio === "ENERGIA").length;
const wTasksCount = tasks.filter((t) => t.servicio === "AGUA").length;
const totalCoveredRecords = tasks.reduce((acc, t) => acc + t.sharedCodigos.length, 0);

assert.equal(z1Count, 62, "Zona 1 debe tener 62 macromedidores");
assert.equal(z2Count, 16, "Zona 2 debe tener 16 baños públicos");
assert.equal(eTasksCount, 1084, "Energía debe tener exactamente 1.084 tareas físicas únicas");
assert.equal(wTasksCount, 526, "Acueducto debe tener exactamente 526 tareas físicas únicas");
assert.equal(tasks.length, 1688, "El total de tareas físicas únicas debe ser exactamente 1.688");
assert.equal(totalCoveredRecords, 1835, "Las 1.688 tareas deben cubrir exactamente los 1.835 registros con medidor");

// Sincronización atómica /N
const sharedTask = tasks.find((t) => t.servicio === "ENERGIA" && t.sharedCodigos.length > 1);
assert.ok(sharedTask && sharedTask.sharedCodigos.length >= 2);
const siblingsMap = tasksEngine.buildSharedMeterSiblingsMap(seedData.locales);
const newReading = sharedTask.lecturaAnterior + 300;
const { nextOverrides, nextCompleted } = tasksEngine.applyAtomicFieldReadingOverride(
  {},
  { [engine.buildTaskKey("ENERGIA", sharedTask.sharedCodigos[1])]: "COMPLETADA" },
  {
    codigo: sharedTask.sharedCodigos[1],
    servicio: "ENERGIA",
    lecturaActual: newReading,
    observacion: "VERIFICADO POR IMAGEN",
    timestamp: "2026-11-10T12:00:00.000Z",
  },
  undefined,
  siblingsMap
);

assert.equal(
  Object.keys(nextCompleted).length,
  1,
  "completedTaskIds solo debe registrar la llave canónica de la tarea física única (<= 1.688)"
);
assert.equal(nextCompleted[engine.buildTaskKey("ENERGIA", sharedTask.codigo)], "COMPLETADA");

for (const siblingCode of sharedTask.sharedCodigos) {
  assert.equal(
    nextOverrides[engine.buildTaskKey("ENERGIA", siblingCode)]?.lecturaActual,
    newReading,
    `Hermano compartido ${siblingCode} no fue sincronizado atómicamente`
  );
}
const syncedLocales = engine.recalculateAllLocales(seedData.locales, seedData.masterReceiptsJunio2025, {
  energyMacroMeters: seedData.energyCommunalMeters,
  waterMacroMeters: seedData.waterCommunalMeters,
  fieldOverridesMap: nextOverrides,
});
const expectedDiv = Math.round(1 / sharedTask.multiplicador);
for (const siblingCode of sharedTask.sharedCodigos) {
  const sl = syncedLocales.find((l) => l.codigo === siblingCode);
  assert.ok(Math.abs(sl.energiaConsumoIndivActualKw - 300 / expectedDiv) < 1e-6);
}

// Verificar recálculo dinámico de energiaEstado / aguaEstado ante override y predicados de alertas
const detLocales = engine.recalculateAllLocales(seedData.locales, seedData.masterReceiptsJunio2025, {
  fieldOverridesMap: {
    "ENERGIA::010001": {
      codigo: "010001", servicio: "ENERGIA", lecturaActual: loc010001.energiaLecturaAnt,
      observacion: "C, DETENIDO", hasPhotoEvidence: true, timestamp: "2026-11-10T12:00:00.000Z",
    },
    "ENERGIA::010002": {
      codigo: "010002", servicio: "ENERGIA", lecturaActual: baseMap.get("010002").energiaLecturaAnt + 50000,
      observacion: "VERIFICADO POR IMAGEN", timestamp: "2026-11-10T12:00:00.000Z",
    },
    "ENERGIA::010006": {
      codigo: "010006", servicio: "ENERGIA", lecturaActual: baseMap.get("010006").energiaLecturaAnt + 50000,
      observacion: "VERIFICADO POR IMAGEN", timestamp: "2026-11-10T12:00:00.000Z",
    },
  },
});
const loc010001Post = detLocales.find((l) => l.codigo === "010001");
const loc010002Post = detLocales.find((l) => l.codigo === "010002");
const loc010006Post = detLocales.find((l) => l.codigo === "010006");
assert.equal(loc010001Post.energiaEstado, "C, DETENIDO");
assert.equal(loc010002Post.energiaEstado, "PROMEDIO >");
assert.equal(loc010006Post.energiaEstado, "PROMEDIO >");
assert.equal(engine.hasLocalServiceAlert(loc010001Post), true, "010001 con C, DETENIDO debe ser capturado por hasLocalServiceAlert");
assert.equal(engine.hasLocalServiceAlert(loc010006Post), true, "010006 con PROMEDIO > debe ser capturado por hasLocalServiceAlert");

// Verificar propagación de cambio de tarifas/topes sin overrides en deltaCostoBase*
const liveBagsT0 = engine.computeLiveLiquidationBags(baseComputed, seedData.masterReceiptsJunio2025, seedData.masterReceiptsJunio2025);
const modifiedReceipts = JSON.parse(JSON.stringify(seedData.masterReceiptsJunio2025));
modifiedReceipts.energia.tarifaKwh = 900;
modifiedReceipts.acueducto.tarifaM3 = 13000;
const liveBagsWithHigherTariffs = engine.computeLiveLiquidationBags(baseComputed, modifiedReceipts, seedData.masterReceiptsJunio2025);
assert.ok(liveBagsWithHigherTariffs.deltaCostoBaseMedidoYComunalPrincipal > 0, "deltaCostoBaseMedidoYComunalPrincipal debe acumular al subir tarifaKwh");
assert.ok(liveBagsWithHigherTariffs.deltaCostoBaseContadorBP > 0, "deltaCostoBaseContadorBP debe acumular al subir tarifaKwh");
assert.ok(liveBagsWithHigherTariffs.deltaCostoBaseMedidoYComunalAgua > 0, "deltaCostoBaseMedidoYComunalAgua debe acumular al subir tarifaM3");
assert.ok(liveBagsWithHigherTariffs.bolsaProrrateoPrincipalCop < liveBagsT0.bolsaProrrateoPrincipalCop, "bolsaProrrateoPrincipalCop debe reducirse ante aumento en tarifas de consumo medido");

// Peaje anti-negativos, foto obligatoria y bloqueo Base64 en Zod
assert.equal(tasksEngine.canSubmitFieldReading(500, 450, "VERIFICADO POR IMAGEN", true), false);
assert.equal(tasksEngine.canSubmitFieldReading(500, 450, "C, DETENIDO", false), false);
assert.equal(tasksEngine.canSubmitFieldReading(500, 450, "C, DETENIDO", true), true);
assert.equal(tasksEngine.canSubmitFieldReading(500, 500, "L, CERRADO", false), false);
assert.equal(tasksEngine.canSubmitFieldReading(500, 500, "L, CERRADO", true), true);
assert.equal(
  contracts.FieldReadingUpdateSchema.safeParse({
    codigo: "010001",
    servicio: "ENERGIA",
    lecturaActual: 75900,
    observacion: "VERIFICADO POR IMAGEN",
    photoLocalKey: "data:image/jpeg;base64,/9j/4AAQSk",
    timestamp: "2026-11-10T12:00:00.000Z",
  }).success,
  false,
  "Zod debe rechazar cadenas Base64 data:image/"
);

console.log("[PASS] Invariante 3: 1.688 tareas físicas únicas (62+16+1.084+526) cubriendo 1.835 registros, sync /N y peajes Zod.");

// ---------------------------------------------------------------------------
// INVARIANTE 4: Vacancia Reversible e Identidad Contable Exacta
// ---------------------------------------------------------------------------
const vacConContrato = engine.recalculateAllLocales(seedData.locales, seedData.masterReceiptsJunio2025, {
  energyMacroMeters: seedData.energyCommunalMeters,
  waterMacroMeters: seedData.waterCommunalMeters,
  occupancyMap: { "010001": "VACIO_CON_CONTRATO" },
});
const vcc010001 = vacConContrato.find((l) => l.codigo === "010001");
assert.equal(vcc010001.energiaConsumoIndivActualKw, 0);
assert.equal(vcc010001.aguaConsumoIndivActualM3, 0);
assert.ok(vcc010001.calcTotalCop > 0 && vcc010001.calcTotalCop < loc010001.calcTotalCop);
assert.equal(vcc010001.calcAssumedCorporationCop, 0);
assert.equal(vacConContrato.find((l) => l.codigo === "010002").calcPoliciaCop, baseMap.get("010002").calcPoliciaCop);

const vacSinContrato = engine.recalculateAllLocales(seedData.locales, seedData.masterReceiptsJunio2025, {
  energyMacroMeters: seedData.energyCommunalMeters,
  waterMacroMeters: seedData.waterCommunalMeters,
  occupancyMap: { "010001": "VACIO_SIN_CONTRATO_CORPORACION" },
});
const vsc010001 = vacSinContrato.find((l) => l.codigo === "010001");
const sum6Rubros =
  vsc010001.calcEnergiaCop +
  vsc010001.calcAcueductoCop +
  vsc010001.calcAseoCop +
  vsc010001.calcResiduosCop +
  vsc010001.calcVigilanciaCop +
  vsc010001.calcPoliciaCop;

assert.equal(vsc010001.calcTotalCop, 0, "En VACIO_SIN_CONTRATO_CORPORACION calcTotalCop debe ser 0");
assert.equal(vsc010001.calcAssumedCorporationCop, sum6Rubros, "Identidad contable estricta violada");
assert.equal(vsc010001.calcAssumedCorporationCop, loc010001.calcTotalCop);

const biVacReport = biEngine.computeBiLongitudinalReport(
  vacSinContrato,
  baseEnergyMacros,
  baseWaterMacros,
  seedData.publicBathroomMeters,
  seedData.masterReceiptsJunio2025,
  {}
);
const totalKpi2VacancyAbsorbed = biVacReport.kpi2ServiciosAbsorcion.reduce(
  (acc, item) => acc + item.asumidoVacanciaSinContratoCop,
  0
);
assert.equal(totalKpi2VacancyAbsorbed, vsc010001.calcAssumedCorporationCop, "KPI 2 debe cuadrar al peso con calcAssumedCorporationCop");

const restoredActivo = engine.recalculateAllLocales(seedData.locales, seedData.masterReceiptsJunio2025, {
  energyMacroMeters: seedData.energyCommunalMeters,
  waterMacroMeters: seedData.waterCommunalMeters,
  occupancyMap: {},
});
const restoredSum = restoredActivo.reduce((acc, l) => acc + l.calcTotalCop, 0);
assert.equal(restoredSum, 3_621_554_642, "La reversión a ACTIVO debe restaurar exactamente $3.621.554.642 COP");

console.log("[PASS] Invariante 4: Vacancia 100% reversible (calcTotalCop = 0, identidad contable exacta y KPI 2 al peso).");

// ---------------------------------------------------------------------------
// INVARIANTE 5: Precisión es-CO, CSV Contable y Guardas Arquitectónicas (<600 líneas)
// ---------------------------------------------------------------------------
assert.equal(formatters.formatCop(3621554642), "$3.621.554.642");
assert.equal(formatters.formatCop(720.48, 2), "$720,48");
assert.equal(formatters.formatCop(10921.4494, 2), "$10.921,45");
assert.equal(formatters.formatInt(5318), "5.318");
assert.equal(formatters.formatDec(165.68, 2, 2), "165,68");
assert.equal(formatters.formatDec(0.5411, 4), "0,5411");
assert.equal(formatters.formatPct(15.7, 1), "15,7%");

const csvOut = csvEngine.buildSabanaCsvContent(vacSinContrato);
const csvLines = csvOut.replace(/^\uFEFF/, "").split("\n");
assert.equal(csvLines.length, 5319);
assert.ok(csvLines[0].includes("TOTAL_FACTURABLE_COP;ASUMIDO_CORPORACION_COP"));
const row010001 = csvLines.find((line) => line.includes(";010001;")).split(";");
assert.equal(row010001[3], "VACIO_SIN_CONTRATO_CORPORACION");
assert.equal(row010001[6], "165,68");
assert.equal(row010001[13], "0");
assert.equal(row010001[14], "3.547.316");

function collectSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(abs));
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      results.push(abs);
    }
  }
  return results;
}

assert.ok(
  !fs.existsSync(path.join(SRC_DIR, "components", "ErpRoadmapExpansionView.tsx")),
  "ErpRoadmapExpansionView.tsx debe estar físicamente eliminado (/spacex)"
);

const allSourceFiles = collectSourceFiles(SRC_DIR);
const forbiddenTokens = ["MJM", "Anillo", "Cables Pelados", "frufresco", "ingyemel", "simulateOcrCapture"];
// Detect surrogate-pair / astral-plane pictographic emojis while allowing standard math/punctuation symbols (®, Δ, ∑, −, ×, ÷, →, —, •)
const astralEmojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

for (const full of allSourceFiles) {
  const rel = path.relative(SRC_DIR, full).replace(/\\/g, "/");
  const content = fs.readFileSync(full, "utf8");
  const lineCount = content.split(/\r?\n/).length;
  assert.ok(lineCount <= 590, `Archivo src/${rel} excede 590 líneas (${lineCount})`);
  assert.ok(!content.includes("@ts-ignore"), `Prohibido @ts-ignore en src/${rel}`);
  assert.ok(!content.includes("@ts-expect-error"), `Prohibido @ts-expect-error en src/${rel}`);
  assert.ok(!content.includes("eslint-disable"), `Prohibido eslint-disable en src/${rel}`);
  assert.ok(!/type\s*=\s*["']number["']/.test(content), `Prohibido <input type="number"> en src/${rel}`);

  for (const token of forbiddenTokens) {
    assert.ok(
      !new RegExp(token, "i").test(content),
      `Rastro prohibido "${token}" detectado en src/${rel}`
    );
  }

  if (rel !== "lib/formatters.ts") {
    assert.ok(!content.includes(".toFixed("), `Prohibido .toFixed() fuera de formatters.ts (src/${rel})`);
    assert.ok(!content.includes(".toLocaleString("), `Prohibido .toLocaleString() fuera de formatters.ts (src/${rel})`);
  }

  if (rel.endsWith(".ts") || rel.endsWith(".tsx")) {
    const sf = ts.createSourceFile(
      full,
      content,
      ts.ScriptTarget.Latest,
      true,
      rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const forbiddenReceiptMathRegex =
      /\b(receipts|resCfg|bolsaProrrateo|valorNetoServicio|valorFacturaNeto|valorFacturaGeneral|valorFacturaRedFrios|valorNetoDistribuir|valorNetoProrratear|valorFactura|areaTotalProrrateoM2|areaNpM2|areaMpM2|areaPM2|localesActivosDivisor|factorNP|factorMP|tasaCregPct)\b/;

    const visitAst = (node) => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        assert.fail(`Prohibido tipo 'any' en src/${rel}:${lc.line + 1}`);
      }
      if (ts.isAsExpression(node)) {
        const typeText = node.type.getText(sf).trim();
        if (typeText !== "const") {
          const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          assert.fail(`Prohibido cast forzado 'as ${typeText}' en src/${rel}:${lc.line + 1}`);
        }
      }
      if (ts.isTypeAssertionExpression(node)) {
        const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        assert.fail(`Prohibido type assertion '<T>' en src/${rel}:${lc.line + 1}`);
      }
      if (rel.endsWith(".tsx") && ts.isBinaryExpression(node)) {
        const op = node.operatorToken.kind;
        if (
          op === ts.SyntaxKind.AsteriskToken ||
          op === ts.SyntaxKind.SlashToken ||
          op === ts.SyntaxKind.PlusToken ||
          op === ts.SyntaxKind.MinusToken
        ) {
          const exprText = node.getText(sf);
          assert.ok(
            !forbiddenReceiptMathRegex.test(exprText),
            `Prohibida aritmética inline de bolsas/tarifas en vista .tsx (src/${rel}): ${exprText}`
          );
        }
      }
      ts.forEachChild(node, visitAst);
    };
    visitAst(sf);
  }

  if (rel.endsWith(".tsx")) {
    assert.ok(!astralEmojiRegex.test(content), `Prohibido emoji Unicode en UI (src/${rel})`);
    assert.ok(!content.includes(".estadoOcupacion"), `Usar effectiveOccupancy en lugar de estadoOcupacion crudo en src/${rel}`);
    assert.ok(!content.includes(".totalAnteriorCop"), `Prohibido leer totalAnteriorCop crudo en vistas UI (src/${rel})`);
    assert.ok(!content.includes(".totalJunioCop"), `Prohibido leer totalJunioCop crudo en vistas UI (src/${rel})`);

    const lucideImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/);
    if (lucideImportMatch) {
      const importedIcons = lucideImportMatch[1]
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const aliasParts = part.split(/\s+as\s+/);
          return (aliasParts[1] || aliasParts[0]).trim();
        })
        .filter((name) => /^[A-Z]/.test(name) && !name.startsWith("type "));

      for (const iconName of importedIcons) {
        const jsxTagRegex = new RegExp(`<${iconName}\\s+([^>]*?)\\/?>`, "g");
        let match;
        while ((match = jsxTagRegex.exec(content)) !== null) {
          assert.ok(
            match[1].includes("strokeWidth={1.75}"),
            `Ícono <${iconName}> sin strokeWidth={1.75} en src/${rel}`
          );
        }
        assert.ok(
          !new RegExp(`<${iconName}\\s*\\/?>`).test(content),
          `Ícono <${iconName} /> sin props (falta strokeWidth={1.75}) en src/${rel}`
        );
      }
    }
  }
}

const sabanaModule = loadTsModule(path.join(SRC_DIR, "components", "LiquidationMatrixView.tsx"));
const sabanaContador = baseComputed.filter((l) => sabanaModule.matchesSabanaSegmentPill(l, "CONTADOR"));
const sabanaComunal = baseComputed.filter((l) => sabanaModule.matchesSabanaSegmentPill(l, "COMUNAL"));
const contadorCodeSet = new Set(sabanaContador.map((l) => l.codigo));
const overlapCount = sabanaComunal.filter((l) => contadorCodeSet.has(l.codigo)).length;

assert.equal(sabanaContador.length, 1295, "Partición Sábana CONTADOR debe ser exactamente 1.295 locales");
assert.equal(sabanaComunal.length, 4023, "Partición Sábana COMUNAL debe ser exactamente 4.023 locales");
assert.equal(sabanaContador.length + sabanaComunal.length, 5318, "CONTADOR (1.295) + COMUNAL (4.023) debe sumar 5.318");
assert.equal(overlapCount, 0, "Cero intersección entre segmentos CONTADOR y COMUNAL (Ley de De Morgan)");

const sim2xReceipts = structuredClone(seedData.masterReceiptsJunio2025);
sim2xReceipts.expensas.vigilancia.valorNetoDistribuir *= 2;
sim2xReceipts.expensas.aseo.valorNetoDistribuir *= 2;
sim2xReceipts.expensas.policia.valorFactura *= 2;
sim2xReceipts.expensas.residuosEcsa.valorNetoProrratear *= 2;
const norm2x = engine.normalizeMasterReceipts(sim2xReceipts);
const sim2xComputed = engine.recalculateAllLocales(seedData.locales, norm2x, {
  energyMacroMeters: seedData.energyCommunalMeters,
  waterMacroMeters: seedData.waterCommunalMeters,
  seedReceipts: seedData.masterReceiptsJunio2025,
});
const liveBags2x = engine.computeLiveLiquidationBags(sim2xComputed, norm2x, seedData.masterReceiptsJunio2025);
const sim010001 = sim2xComputed.find((l) => l.codigo === "010001");
assert.ok(Math.abs(sim010001.calcVigilanciaCop - Math.round(sim010001.areaM2 * liveBags2x.tarifaVigilanciaM2)) <= 1);
assert.ok(Math.abs(sim010001.calcAseoCop - Math.round(sim010001.areaM2 * liveBags2x.tarifaAseoM2)) <= 1);
assert.ok(Math.abs(sim010001.calcPoliciaCop - Math.round(liveBags2x.cuotaPoliciaPorLocal)) <= 1);

console.log(`[PASS] Invariante 5: Formato es-CO, partición De Morgan (1.295+4.023=5.318), cero fórmulas/casts/any en ${allSourceFiles.length} archivos src/ (<=590 líneas).`);
console.log("====================================================================");
console.log(" TODAS LAS 5 INVARIANTES APROBADAS AL 100% — EXIT 0");
console.log("====================================================================");
