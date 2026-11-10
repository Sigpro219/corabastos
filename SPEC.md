# 🛡️ CORABASTOS — Sistema de Liquidación de Servicios Públicos, Expensas Comunes & Captura de Medidores (SPEC.md)

> **Documento Canónico de Especificación (Spec-Anchored — SDD)**  
> **Versión:** 3.1.0 (Poda Radical `/spacex` + Blindaje Forense Doble Ronda `/goldfish`: Eliminación de Módulos Fantasma, Cuadre Exacto `$3.621.554.642 COP`, Desacoplo Diferencial Padre-Hijo Anti-`NaN`/Anti-Hijos Cruzados, Deduplicación `/N` de `1.688` Medidores Físicos, Evidencia en Storage/IndexedDB sin Base64 en Firestore, Persistencia Bidireccional `F5 + onSnapshot` y Seguridad RBAC Zero-Trust)  
> **Fecha de Actualización:** 10 de Noviembre de 2026  
> **Estado:** 🟢 VIGENTE & CONTRATO CANÓNICO DE EJECUCIÓN  
> **Ubicación Física en Disco:** `c:\Projects\corabastos`  
> **Puerto Dev Oficial:** `3013` (`next dev --turbopack -p 3013`)  
> **Backend Cloud Oficial:** Firebase Project `mjm-sistema-2026-aee19` (`Auth` + `Firestore` + `Storage`)  
> **Atlas Topológico Estructural:** Anexo pericial en [`PROJECT_ATLAS.md`](./PROJECT_ATLAS.md) *(Cláusula de Prelación: en caso de cualquier discrepancia durante la migración, prevalece taxativamente este `SPEC.md` v3.1.0 y el Atlas se regenera obligatoriamente al cierre conforme al §7).*  
> **Principio Rector:** *«El código no contiene promesas comerciales falsas ni mocks cosméticos; solo implementa el alcance operativo real verificado contra el corte oficial de Corabastos S.A.»*

---

## 1. Identidad, Alcance Puro (`/spacex`) y Fuente de Datos Física

### 1.1 Misión Operativa Única
El sistema resuelve de punta a punta la liquidación mensual de transferencia de servicios públicos y expensas comunes de la **Corporación de Abastos de Bogotá S.A. (Corabastos)** sobre sus **5.318 locales comerciales** (`126.125,15 m²` en **68 bodegas**):
1. **Captura en Terreno (`/captura`):** Lectura móvil de los **1.688 medidores físicos únicos** (que gobiernan los **1.835 registros con medidor**: `62` macromedidores comunales, `16` baños públicos, `1.084` tareas físicas de energía cubriendo `1.219` registros `CONTADOR`, y `526` tareas físicas de acueducto cubriendo `538` registros `CONTADOR`), con fotografía probatoria HTML5 real y bloqueo de anomalías.
2. **Desacoplo Automático Padre-Hijo Saneado:** Descuento diferencial automático de los contadores individuales hijos válidos de la misma bodega sobre los **38 macromedidores de energía** (`26` Aleros + `12` Bodegas) y **24 macromedidores de agua comunal**, propagando en tiempo real la variación de consumo neto por $m^2$ a los locales de cada bodega.
3. **Motor Matemático Determinista:** Cálculo exacto de los **6 cobros reglamentarios** (`Energía Eléctrica`, `Acueducto y Alcantarillado`, `Barrido / Aseo`, `Residuos Sólidos ECSA NP/MP/P`, `Vigilancia Privada` y `Policía Nacional`) conforme al Reglamento Interno (Directiva de Gerencia No. 033-06, Arts. 42–47).
4. **Auditoría Ejecutiva, Certificados 360° y Exportación Contable (`/`):** Sábana maestra con búsqueda omnisciente sobre los 5.318 puestos, gestión reversible de vacancia, simulador interactivo de recibos maestros, KPIs longitudinales reales (`Mayo 2025` vs `Junio 2025`), plano contable CSV e impresión de certificado individual en formato Carta (`Golden Print`).

### 1.2 Exclusiones Explícitas (Cero Módulos Fantasma y Cero Mocks)
- **Eliminación de Anillos Comerciales Inoperativos:** Quedan excluidos de la interfaz, del Sidebar y del código cualquier pestaña o pantalla promocional de módulos futuros no construidos (`ErpRoadmapExpansionView.tsx`, facturación DIAN, contratos inmobiliarios, CMMS o PQRS) así como cualquier referencia textual a otros proyectos o clientes externos.
- **Trazabilidad Física de Insumos en Disco:**
  - El dataset canónico verificado en el repositorio es **`src/data/corabastos-junio-2025.json`** (`9.062.684 bytes`), pre-compilado a partir del corte oficial Junio 2025 y de las reglas del Título VII del Reglamento Interno (Directiva 033-06). No se requiere ni asume la presencia de archivos binarios `.xlsm` o `.pdf` externos dentro del árbol Git.
- **Cero OCR Ficticio:** Queda prohibido simular reconocimiento óptico con temporizadores o inventar lecturas sintéticas. La evidencia fotográfica utiliza captura real de cámara/archivo (`<input type="file" accept="image/*" capture="environment">`) comprimida en cliente (`<canvas>` JPEG `<= 800px`).

---

## 2. Leyes Marciales de Arquitectura e Ingeniería

1. **Contratos Tipados & Validación Zod en Runtime (`src/contracts/domain-contracts.ts`):**
   - Todo payload mutable que ingrese al estado o persistencia (`FieldReadingUpdate`, `MasterReceiptsConfig`, `OccupancyStatus`, `UserRole`) se valida en ejecución mediante `.safeParse()` de **Zod**.
   - Normalización explícita de cadenas históricas del censo (`isRedFriosModality` unifica `'RED FRIOS'`, `'RED DE FRIOS'` y `'RED_FRIOS'`; las observaciones aceptan todas las variantes reales del corte Junio 2025).
2. **Headless Core + Thin UI (`<= 600` líneas por archivo en `src/`):**
   - Cero fórmulas de liquidación en componentes `.tsx`. Toda la aritmética reside en `src/lib/liquidation-engine.ts`, `src/lib/reading-tasks-engine.ts`, `src/lib/bi-kpis-engine.ts` y `src/lib/accounting-export.ts`.
   - Ningún archivo de código fuente en `src/` (excluyendo el JSON semilla en `src/data/`) puede superar las **600 líneas**.
3. **Navegación Única de 4 Vistas Operativas en Consola Ejecutiva (`src/app/page.tsx`):**
   - El Sidebar izquierdo expone exclusivamente las **4 vistas operativas reales** sin barras de pestañas duplicadas y sin módulos en habilitación:
     1. **`SABANA_360` (`1. Sábana 5.318 Locales & Cuenta 360°`)**
     2. **`BODEGAS_68` (`2. Estado de 68 Bodegas & Vacancia`)**
     3. **`RECIBOS_MACROS` (`3. Recibos Maestros & 62 Macromedidores`)**
     4. **`AUDITORIA_BI` (`4. Inteligencia BI, Terreno & Metodología`)** — integra mediante selector limpio los `6 KPIs Longitudinales`, el `Monitor de Avance de Terreno` y la `Memoria de Cálculo Oficial`.
4. **Frontera de Rol RBAC, Guardas de Mutación & Aislamiento Financiero (`/` vs `/captura`):**
   - Roles tipados: `'AUDITOR_ADMIN'` y `'LECTURISTA'`.
   - **Cuando la sesión activa es `'LECTURISTA'`:**
     - El acceso a `/` redirige automáticamente a `/captura`.
     - La ruta `/captura` consume únicamente datos técnicos físicos (`codigo`, `bodegaId`, `lecturaAnterior`, `lecturaActual`, `consumoAnteriorFisico`, `unidad`, `observacion`, `sharedCodigos`) y oculta el 100% de valores monetarios COP, recibos maestros, planos contables y enlaces de retorno a `/`.
     - En `CorabastosContext`, las funciones administrativas (`updateReceipts`, `updateLocalOccupancy`, `updateBodegaOccupancy`, `resetToOfficialJune2025`) bloquean su ejecución si `role === 'LECTURISTA'`.
   - **Ascenso a `'AUDITOR_ADMIN'`:** Exige validación de PIN administrativo contra `process.env.NEXT_PUBLIC_CORABASTOS_ADMIN_PIN || 'CORABASTOS2025'` (o sesión autenticada por correo administrativo en Firebase Auth).
   - **Seguridad Firebase (`firestore.rules`, `storage.rules` y `firebase.json`):**
     - Prohibido `allow read, write: if true;`. `firebase.json` declara proveedores `emailPassword: true` y `anonymous: true`.
     - El cliente intenta autenticar sesión en Firebase Auth (`signInAnonymously` si no hay sesión activa) antes de operar sobre `/corabastos_corte_2025_06/{docId}` o `/tenants/corabastos/evidencias/{periodo}/{fileName}`; si el proveedor Cloud rechaza sesión anónima o no hay red, degrada limpiamente a operación local (`localStorage` + `IndexedDB`) sin bloquear la aplicación.
5. **Estándar de Formato Numérico Colombiano (`es-CO`) con Firmas Compatibles (`src/lib/formatters.ts`):**
   - Prohibido invocar `.toFixed()` o `.toLocaleString()` directamente en componentes `.tsx` o exportadores fuera de `src/lib/formatters.ts`.
   - Firmas canónicas obligatorias:
     - `formatCop(val: number, decimals = 0)`: Montos COP con punto de miles y signo `$` (`0` decimales por defecto para totales como `$3.621.554.642`; `2` decimales cuando se formatea una tarifa unitaria monetaria como `$720,48` o `$10.921,45`).
     - `formatInt(val: number)`: Conteos y lecturas enteras con punto de miles (`5.318`).
     - `formatDec(val: number, minDecimals = 1, maxDecimals = minDecimals)`: Respeta estrictamente el rango de decimales solicitado con coma decimal `,` (`1` decimal por defecto en UI general `165,7 m²`; `2` decimales en exportación contable CSV `AREA_M2` (`165,68`) y `PrecisionDecimalInput`; `4` decimales en factores técnicos por $m^2$ como `0,5411 kWh/m²` para jamás truncar aleros a `0,0`).
     - `formatPct(val: number, decimals = 1)`: Porcentajes con coma decimal (`15,7%`).
   - Prohibido `<input type="number">`; todo campo editable usa `<input type="text" inputMode="decimal">` (`PrecisionDecimalInput`).
6. **Iconografía Vectorial Exclusiva `lucide-react`:**
   - Cero emojis Unicode en componentes `.tsx` o reportes impresos. Todos los íconos provienen de `lucide-react` con `strokeWidth={1.75}`.

---

## 3. Reglas Matemáticas Exactas e Invariantes del Motor (`src/lib/liquidation-engine.ts`)

### 3.1 Invariante 1 — Línea Base Cero-Desviación (`Junio 2025 = $3.621.554.642 COP`) y Prohibición de Columnas Agregadas Corruptas
1. **Cuadre Exacto en $T=0$:** Con `fieldOverridesMap` vacío, `occupancyMap` vacío y `receipts` en sus valores semilla de Junio 2025, `recalculateAllLocales` reproduce con **`$0 COP` de diferencia** la suma exacta de los 5.318 locales:
   - **Energía Total (`Principal + Bodega Popular`):** `$856.707.455 COP` (`$676.050.057 + $180.657.398`)
   - **Acueducto y Alcantarillado:** `$239.477.169 COP`
   - **Barrido / Aseo:** `$173.508.673 COP`
   - **Residuos Sólidos ECSA:** `$678.935.044 COP`
   - **Vigilancia Privada:** `$1.457.539.601 COP`
   - **Policía Nacional:** `$215.386.700 COP`
   - **Suma Total Exacta (6 Servicios):** **`$3.621.554.642 COP`**.
2. **Prohibición de Usar `loc.totalJunioCop` y `loc.totalAnteriorCop` Crudos:**
   - En la hoja `RESUMEN TOTAL` del Excel original, `totalJunioCop` duplicaba Alcantarillado y `totalAnteriorCop` (Mayo 2025) omitía Vigilancia y otros rubros en múltiples locales.
   - Queda **prohibido** leer `loc.totalJunioCop` o `loc.totalAnteriorCop` para cálculos de variaciones `%`, tarjetas, modales o KPIs BI. En todo el sistema, el total oficial del mes anterior (`Mayo 2025`) de cada local $i$ se define canónicamente como la suma exacta de sus 6 rubros anteriores certificados:
     $$\text{TotalMayoOficial}_i = (\text{energiaAnteriorCop}_i ?? 0) + (\text{acueductoAnteriorCop}_i ?? 0) + (\text{aseoAnteriorCop}_i ?? 0) + (\text{residuosAnteriorCop}_i ?? 0) + (\text{vigilanciaAnteriorCop}_i ?? 0) + (\text{policiaAnteriorCop}_i ?? 0)$$
3. **Regla de No-Alteración de Registros Intactos en $T=0$:**
   - **Vacancia gobernada exclusivamente por `occupancyMap`:** El estado dinámico de ocupación es `effectiveOccupancy = occupancyMap[loc.codigo] ?? 'ACTIVO'`. Cuando `occupancyMap` no tiene entrada para un local, se ignora el string histórico `loc.estadoOcupacion` pre-grabado en el JSON semilla (ej. `860006`, `860010`, `860011`), preservando intacta su liquidación oficial de Junio 2025.
   - **Contingencia por medidor defectuoso condicionada a `override`:** Las reglas de conmutación a prorrateo por medidor defectuoso (`DETENIDO`, `TAPADO`, `RETIRADO`, `REVISAR`) solo aplican cuando ese medidor posee un `override` registrado en el corte activo (`fieldOverridesMap[taskKey] !== undefined`). Sin `override`, los locales conservan su base Junio 2025 escalada proporcionalmente si cambia la tarifa maestra.
   - **Proporcionalidad Catastral en Residuos ECSA:** Igual que en **Aseo** y **Vigilancia**, cada local preserva su razón catastral base frente a la tarifa semilla de su categoría (`NP`, `MP`, `P`), garantizando `$0 COP` de desviación en los `34` locales con aforo especial en $T=0$ y escalamiento proporcional exacto al simular nuevas facturas.

### 3.2 Invariante 2 — Cadena Causal Diferencial Padre-Hijo (Saneada contra Datos Sucios) y Bolsas de Prorrateo
El pipeline se ejecuta en estricto orden topológico:

1. **Paso 1 — Consumo Individual y Sincronización `/N`:**
   - Si el medidor físico de un local `CONTADOR` tiene `override` activo, su consumo individual actual es $\frac{\max(0,\; \text{LecturaAct} - \text{LecturaAnt})}{N_{\text{compartido}}}$; si no tiene `override`, conserva su consumo semilla (`energiaConsumoIndivKw` / `aguaConsumoIndivM3`).
2. **Paso 2 — Desacoplo Diferencial Padre-Hijo en los 62 Macromedidores (`38` Energía + `24` Agua):**
   - **Saneamiento de Hijos Válidos:** Para eliminar arrastres de filas de otras bodegas y códigos repetidos del Excel (ej. `ECOM-27..38`), los hijos válidos de un macromedidor $m$ se filtran y deduplican exigiendo pertenencia a la misma bodega:
     $$\text{HijosVálidos}(m) = \text{uniq}(m.\text{hijosContadorCodigos}).\text{filter}(c \Rightarrow \text{local}(c)?.bodegaId === m.bodegaId)$$
   - **Cálculo Diferencial Anclado al Neto Semilla Oficial (`consumoNetoKw` / `consumoNetoM3`):**
     - Si el macromedidor padre $m$ tiene `override` activo en terreno: $\text{BrutoEfectivo}_m = \max(0, \text{LectAct}_m - \text{LectAnt}_m)$ y $\Delta\text{Padre}_m = \text{BrutoEfectivo}_m - \max(0, \text{LectActSemilla}_m - \text{LectAntSemilla}_m)$. Si $m$ **no** tiene `override`, $\Delta\text{Padre}_m = 0$ (protegiendo macromedidores retirados/ajustados con `lecturaAnterior < 0` en el semilla, como `ECOM-27`, `ECOM-34`, `ECOM-35`, `ECOM-37`, `ACOM-14`).
     - Variación de hijos válidos: $\Delta\text{Hijos}_m = \sum_{h \in \text{HijosVálidos}(m)} (\text{ConsumoIndivActual}_h - \text{ConsumoIndivSemilla}_h)$.
     - Consumo Neto Comunal Actual:
       $$\text{ConsumoNetoActual}_m = \max\left(0,\; \text{ConsumoNetoSemilla}_m + \Delta\text{Padre}_m - \Delta\text{Hijos}_m\right)$$
   - **Guarda Anti-División por Cero en Área Comunal (`areaM2 === 0`, ej. `ACOM-16` Bodega 20):**
     - Sea $\text{ÁreaEfectiva}_m = m.\text{areaM2} > 0 \;?\; m.\text{areaM2} : \sum_{k \in \text{Comunales}(m.bodegaId)} \text{areaM2}_k$.
     - Si $\text{ÁreaEfectiva}_m > 0$, $\text{FactorActual}_m = \frac{\text{ConsumoNetoActual}_m}{\text{ÁreaEfectiva}_m}$ y $\Delta\text{Factor}_m = \frac{\text{ConsumoNetoActual}_m - \text{ConsumoNetoSemilla}_m}{\text{ÁreaEfectiva}_m}$; de lo contrario, $\text{FactorActual}_m = 0$ y $\Delta\text{Factor}_m = 0$ (jamás `Infinity` ni `NaN`).
3. **Paso 3 — Propagación Diferencial a Locales de la Bodega:**
   - Si $|\Delta\text{Factor}_m| > 10^{-7}$ en un macromedidor de `ALERO`, `BODEGA` (Energía) o `BODEGA` (Agua), a cada local aplicable $i$ de esa `bodegaId` se le actualiza su consumo comunal ($\max(0,\; \text{ConsumoComunalSemilla}_i + \text{areaM2}_i \times \Delta\text{Factor}_m)$), disparando el recálculo inmediato de `calcEnergiaCop` o `calcAcueductoCop`.
4. **Paso 4 — Ecuaciones Exactas de las 5 Bolsas de Prorrateo y Red de Fríos:**
   - **Energía Predio Matriz (`PRORRATEO`):** $\text{BolsaProrrateoAct} = \max\left(0,\; \text{bolsaProrrateoSemilla} + (\text{valorNetoServicioAct} - \text{valorNetoServicioSemilla}) - \Delta\text{CostoBaseMedidoYComunalPrincipal}\right)$. Los locales `PRORRATEO` de bloque `PRINCIPAL` escalan por la razón $\frac{\text{BolsaProrrateoAct}}{\text{bolsaProrrateoSemilla}}$ (ajustada por tarifa/CREG si cambió).
   - **Energía Bodega Popular (`PRORRATEO`):** $\text{BolsaProrrateoBpAct} = \max\left(0,\; \text{bolsaProrrateoBpSemilla} + (\text{valorFacturaNetoBpAct} - \text{valorFacturaNetoBpSemilla}) - \Delta\text{CostoBaseContadorBP}\right)$, escalando proporcionalmente los locales `PRORRATEO` de bloque `BODEGA_POPULAR`.
   - **Energía Red de Fríos (`RED FRIOS` en Bodega 55):** Escala proporcionalmente por la razón $\frac{\text{redFrios.valorNetoServicioAct}}{\text{redFrios.valorNetoServicioSemilla}}$.
   - **Acueducto General (`PRORRATEO`):** $\text{BolsaProrrateoAguaAct} = \max\left(0,\; \text{bolsaProrrateoAguaSemilla} + (\text{valorFacturaGeneralAct} - \text{valorFacturaGeneralSemilla}) - \Delta\text{CostoBaseMedidoYComunalAgua}\right)$, escalando proporcionalmente los locales `PRORRATEO` de acueducto.
   - **Acueducto Red de Fríos (`RED DE FRIOS` en Bodegas 55 y 98):** Escala proporcionalmente por la razón $\frac{\text{valorFacturaRedFriosAct}}{\text{valorFacturaRedFriosSemilla}}$.

### 3.3 Invariante 3 — Contabilidad e Identidad Exacta de Vacancia Reversible (`occupancyMap`)
El diccionario `occupancyMap: Record<string, OccupancyStatus>` opera sin mutar lecturas ni observaciones semilla, y mantiene **fijo** el divisor solidario de Policía (`localesActivosDivisor = 5.300` salvo edición explícita en Recibos Maestros) para no recargar a los vecinos activos:
1. **`ACTIVO`:** Liquidación normal del corte (`calcTotalCop = rawTotalCop`, `calcAssumedCorporationCop = 0`).
2. **`VACIO_CON_CONTRATO`:** Consumo individual `0 kWh` y `0 m³`; liquida Tope Mínimo de Energía + comunales/alero/alumbrado + CREG, Tope Mínimo de Acueducto (`1 m³`) + agua comunal, y las 4 expensas reglamentarias (`calcTotalCop = rawTotalCop`, `calcAssumedCorporationCop = 0`).
3. **`VACIO_SIN_CONTRATO_CORPORACION` (Local restituido a Corabastos):**
   - Los 6 campos individuales de rubro (`calcEnergiaCop`, `calcAcueductoCop`, `calcAseoCop`, `calcResiduosCop`, `calcVigilanciaCop`, `calcPoliciaCop`) conservan el **costo técnico causado por el inmueble** (alimentando con exactitud al peso el desglose por servicio del **KPI 2 de Absorción Corporativa**, sin re-estimaciones aproximadas).
   - Se cumple la identidad contable estricta en Sábana, Certificado 360° y CSV Contable:
     $$\sum_{s=1}^{6} \text{Rubro}_s = \underbrace{\text{calcTotalCop}}_{0\text{ (Facturable Comerciante)}} + \underbrace{\text{calcAssumedCorporationCop}}_{\text{rawTotalCop (Asumido Corporación)}}$$

---

## 4. Cola Deduplicada de `1.688` Medidores Físicos y Terminal Móvil (`/captura`)

### 4.1 Algoritmo Determinista de Deduplicación `/N` (`1.688` Tareas sobre `1.835` Registros)
1. **Zona 1 (`ZONA_1_MACROMEDIDORES`):** `62` tareas (`38` macromedidores de energía + `24` de agua).
2. **Zona 2 (`ZONA_2_BANOS_PUBLICOS`):** `16` tareas (`16` medidores de baños públicos).
3. **Zonas 3, 4 y 5 (`Comerciantes Principal`, `Bodega Popular`, `Red de Fríos Bodega 98`):**
   - Solo generan tarea de lectura de odómetro los locales cuya modalidad del respectivo servicio (`modalidadEnergia` o `modalidadAcueducto`) sea estrictamente **`'CONTADOR'`** (`1.219` registros en Energía y `538` registros en Acueducto). Los `51` locales de Bodega `55` con modalidad `'RED FRIOS'` / `'RED DE FRIOS'` sin contador individual **no** entran en la cola de odómetros, pero son localizables en el buscador global de `/captura` con su ficha catastral explicativa.
   - **Regla para `divisor <= 1`:** Prohibido agrupar. Cada par `(servicio, loc.codigo)` genera `1` tarea física independiente con `sharedCodigos = [loc.codigo]` (`1.021` individuales en Energía + `514` individuales en Acueducto).
   - **Regla para `divisor > 1`:** Los registros `'CONTADOR'` ordenados por `codigo` se agrupan por la clave `servicio | bodegaId | lecturaSemillaAnt | lecturaSemillaAct | divisor` y se particionan en bloques consecutivos de tamaño máximo `divisor`, produciendo exactamente `63` medidores compartidos de Energía (`198` locales) y `12` medidores compartidos de Acueducto (`24` locales).
   - **Total Invariante:** `62 + 16 + (1.021 + 63) + (514 + 12) = 1.688` tareas físicas únicas cubriendo los `1.835` registros con medidor.

### 4.2 Peaje de Validación y Evidencia Fotográfica Sin Desborde de Cuota
- **Validación Anti-Negativos Estricta:** Si `lecturaActual < lecturaAnterior`, el botón Guardar se bloquea incondicionalmente salvo que `observacion` pertenezca al conjunto explícito `{'C, DETENIDO', 'M, DETENIDO', 'C, RETIRADO', 'REVISAR MEDIDOR'}` (el valor por defecto `'VERIFICADO POR IMAGEN'` **jamás** autoriza lecturas regresivas).
- **Peaje Fotográfico Obligatorio en Novedades y Cierres:** Para cualquier observación de novedad técnica (`DETENIDO`, `TAPADO`, `RETIRADO`, `SUSPENDIDO`, `REVISAR`) o acceso impedido (`L, CERRADO`, `L, VACIO`, `NO PERMITIO INGRESO`), se exige `hasPhotoEvidence === true` antes de habilitar Guardar.
- **Almacenamiento Binario Fuera de Firestore/`localStorage` (Protección Límite `1 MiB`):**
  - **Prohibido guardar cadenas Base64 (`photoDataUrl`) dentro de `localStorage` o documentos de Firestore.**
  - La foto comprimida en `<canvas>` (`JPEG <= 800px`) se guarda localmente en **`IndexedDB`** (`corabastos_photos_db`, clave `taskKey`) para previsualización offline inmediata y, cuando existe sesión Firebase Auth activa, se sube a **Firebase Storage** (`/tenants/corabastos/evidencias/2025-06/{sanitizedTaskKey}.jpg`).
  - El registro `FieldReadingUpdate` en `localStorage` y Firestore solo almacena metadatos livianos (`hasPhotoEvidence: boolean`, `photoLocalKey?: string`, `photoStorageUrl?: string`, `photoCapturedAt?: string`).
- **Sincronización Atómica `/N`:** Guardar una tarea con `sharedCodigos.length > 1` escribe atómicamente los `N` códigos hermanos en `fieldOverridesMap`.

---

## 5. Persistencia Híbrida Bidireccional (`localStorage` + `Firestore onSnapshot`)

1. **Hidratación Completa en `F5` (`localStorage`):**
   - Se persiste el diccionario completo `fieldOverridesMap: Record<string, FieldReadingUpdate>` (sin `.slice(0, 100)`), `occupancyMap` y `receipts`.
   - Al montar o recargar (`F5`), `CorabastosContext` deriva el estado aplicando `fieldOverridesMap` directamente sobre `locales`, `energyCommunalMeters`, `waterCommunalMeters` y `publicBathroomMeters`, preservando el 100% de los cálculos.
2. **Sincronización Cloud en Tiempo Real (`Firestore onSnapshot`):**
   - Con sesión autenticada en Firebase Auth, `CorabastosContext` mantiene listeners `onSnapshot` sobre `field_overrides`, `occupancy_state` y `master_receipts` en `/corabastos_corte_2025_06`, sincronizando en vivo `/captura` $\leftrightarrow$ `/`.
   - `resetToOfficialJune2025()` (solo rol `'AUDITOR_ADMIN'`) limpia `localStorage`, `IndexedDB` de fotos del corte y actualiza en vacío los tres documentos de `/corabastos_corte_2025_06`.

---

## 6. Estándares de Interfaz, Modo Oscuro y Certificado Golden Print PDF

1. **Sábana Sticky sin Fugas ni Truncamientos (`src/components/LiquidationMatrixView.tsx`):**
   - Tabla con `borderCollapse: 'separate', borderSpacing: 0` sin desborde horizontal.
   - El filtro de Modalidad evalúa `modalidadEnergia`, `modalidadAcueducto` y `modalidadGeneral`, incluyendo los locales de Bodega Popular.
   - `LocalAccountModal` recibe el registro vivo desde `localesByCode.get(selectedCode)` (nunca una copia congelada en `useState`), e incluye la línea contable explícita de `Asumido Corporación` cuando el local está restituido.
2. **Modo Día / Modo Noche Real (`.dark`):**
   - Variables CSS semánticas en `src/app/globals.css` y soporte en vistas/tablas para alto contraste en ambos modos.
3. **Certificado Individual Golden Print PDF (`@media print`):**
   - Al abrir e imprimir el Certificado 360° (`window.print()`), el contenedor de fondo de la consola lleva `.app-print-hide` (`display: none !important` en `@media print`), dejando únicamente `#golden-print-certificate` visible en formato Carta vertical (`@page { size: letter portrait; }`) sin arrastrar tablas de fondo ni páginas en blanco.

---

## 7. Verificación Determinista (`BDD-Guard`), Build y Regeneración del Atlas

Todo entregable debe aprobar con `EXIT 0`:
1. `npx.cmd tsc --noEmit` (TypeScript estricto, cero `any`, cero `@ts-ignore`).
2. `node scripts/verify-corabastos-invariants.mjs`:
   - Invariante 1: Suma base Junio 2025 en `5.318` locales = `$3.621.554.642 COP` (`$0` desviación en los 6 servicios) y cálculo limpio de `TotalMayoOficial` sin el bug de `totalAnteriorCop`.
   - Invariante 2: Mutación diferencial Padre-Hijo (incluyendo macromedidores con `areaM2 === 0` como `ACOM-16`, lecturas anteriores negativas como `ECOM-27` e hijos saneados por `bodegaId`) propagando variación real en COP sin `NaN`/`Infinity`.
   - Invariante 3: Conteo exacto de `1.688` tareas físicas únicas (`62 + 16 + 1.084 + 526`) cubriendo `1.835` registros y sincronización atómica `/N`.
   - Invariante 4: Vacancia reversible (`ACTIVO -> VACIO_CON_CONTRATO -> VACIO_SIN_CONTRATO_CORPORACION -> ACTIVO`) verificando `calcTotalCop === 0`, `calcAssumedCorporationCop === rawTotalCop` y restauración exacta al volver a `ACTIVO`.
   - Invariante 5: Precisión `es-CO` en CSV (`AREA_M2` con 2 decimales), tarifas con `formatCop(val, 2)` y factores con `formatDec(val, 4)`.
3. `cmd.exe /c "npm run build"` (Build de producción Next.js 16 en verde).
4. **Actualización Obligatoria del Anexo Pericial [`PROJECT_ATLAS.md`](./PROJECT_ATLAS.md):** Regeneración completa reflejando la topología v3.1.0 podada, conteos reales de líneas y `0` Estrellas Rojas abiertas.
