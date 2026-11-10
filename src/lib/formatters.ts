/**
 * Utilidades Canónicas de Formato Numérico Colombiano (es-CO).
 * Contrato SPEC.md v3.1.0 §2.5:
 * - Separador de miles: punto (.) -> ej. 3.621.554.642
 * - Separador de decimales: coma (,) -> ej. 165,68 / 0,5411 / $720,48
 * - Prohibido invocar .toFixed() o .toLocaleString() fuera de este módulo.
 */

export function formatCop(val: number, decimals = 0): string {
  const safe = Number.isFinite(val) ? val : 0;
  const d = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const normalized = d === 0 ? Math.round(safe) || 0 : safe || 0;
  const formatted = normalized.toLocaleString("es-CO", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  return `$${formatted}`;
}

export function formatInt(val: number): string {
  const safe = Number.isFinite(val) ? Math.round(val) || 0 : 0;
  return safe.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatDec(
  val: number,
  minDecimals = 1,
  maxDecimals = minDecimals
): string {
  const safe = Number.isFinite(val) ? val || 0 : 0;
  const minD = Math.max(0, Math.min(10, Math.trunc(minDecimals)));
  const maxD = Math.max(minD, Math.min(10, Math.trunc(maxDecimals)));
  return safe.toLocaleString("es-CO", {
    minimumFractionDigits: minD,
    maximumFractionDigits: maxD,
  });
}

export function formatPct(
  val: number,
  decimals = 1,
  includePlusSign = false
): string {
  const safe = Number.isFinite(val) ? val || 0 : 0;
  const d = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const prefix = includePlusSign && safe > 0 ? "+" : "";
  return `${prefix}${formatDec(safe, d, d)}%`;
}

/**
 * Normaliza entradas de teclado con coma o punto decimal y purga ceros a la izquierda
 * conforme a PrecisionDecimalInput (<input type="text" inputMode="decimal">).
 */
export function sanitizeDecimalInputString(rawInput: string): {
  displayRaw: string;
  parsedNumber: number;
} {
  let raw = rawInput.replace(/[^0-9.,]/g, "");
  const firstSepIdx = raw.search(/[.,]/);
  if (firstSepIdx !== -1) {
    const prefix = raw.slice(0, firstSepIdx + 1).replace(".", ",");
    const rest = raw.slice(firstSepIdx + 1).replace(/[.,]/g, "");
    raw = prefix + rest;
  }
  raw = raw.replace(/^0+(?=\d)/, "");
  const normalized = raw.replace(",", ".");
  const parsed = normalized === "" || normalized === "." ? 0 : Number(normalized);
  return {
    displayRaw: raw,
    parsedNumber: Number.isFinite(parsed) ? parsed : 0,
  };
}
