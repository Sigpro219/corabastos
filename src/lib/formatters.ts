/**
 * Utilidades Canónicas de Formato Numérico Colombiano (es-CO).
 * Ley Marcial SDD #8 (disenador-web):
 * - Separador de miles: punto (.) -> ej. 1.457.589
 * - Separador de decimales: coma (,) con 1 solo decimal -> ej. 165,7
 * - Prohibido el uso directo de .toFixed() en strings de UI.
 */

export function formatCop(value: number, decimals = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  const targetDec = decimals > 0 ? 1 : 0;
  const formatted = (targetDec === 0 ? Math.round(safe) : safe).toLocaleString("es-CO", {
    minimumFractionDigits: targetDec,
    maximumFractionDigits: targetDec,
  });
  return `$${formatted}`;
}

export function formatDec(value: number, minDecimals = 1, maxDecimals = 1): string {
  const safe = Number.isFinite(value) ? value : 0;
  const minD = minDecimals > 0 ? 1 : 0;
  const maxD = maxDecimals > 0 ? 1 : 0;
  return safe.toLocaleString("es-CO", {
    minimumFractionDigits: minD,
    maximumFractionDigits: Math.max(minD, maxD),
  });
}

export function formatInt(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return safe.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPct(value: number, decimals = 1, includePlusSign = false): string {
  const safe = Number.isFinite(value) ? value : 0;
  const prefix = includePlusSign && safe > 0 ? "+" : "";
  return `${prefix}${formatDec(safe, decimals > 0 ? 1 : 0)}%`;
}

/**
 * Normaliza entradas de teclado con coma o punto decimal y purga ceros a la izquierda
 * conforme a REF-INPUT-NUMERICO-SIN-CERO-Y-COMA-DECIMAL.md.
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
