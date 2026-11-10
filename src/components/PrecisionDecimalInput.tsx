"use client";

import React, { useState, useEffect } from "react";
import { formatDec, sanitizeDecimalInputString } from "@/lib/formatters";

interface PrecisionDecimalInputProps {
  value: number;
  onChange: (nextVal: number) => void;
  minDecimals?: number;
  maxDecimals?: number;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Input Numérico Canónico Anti-Cero y Coma Decimal (es-CO).
 * Cumple REF-INPUT-NUMERICO-SIN-CERO-Y-COMA-DECIMAL.md y Ley Marcial SDD #8:
 * - Usa exclusivamente type="text" con inputMode="decimal" (sin inputs numéricos nativos)
 * - Cuando está desenfocado muestra formato colombiano con puntos de miles y coma decimal (ej. 1.073,08)
 * - Al enfocar selecciona todo y permite editar con coma (,) o punto (.) purgando ceros a la izquierda
 */
export function PrecisionDecimalInput({
  value,
  onChange,
  minDecimals = 0,
  maxDecimals = 1,
  className = "",
  placeholder = "0",
  ariaLabel,
}: PrecisionDecimalInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawText, setRawText] = useState<string>(() =>
    value === 0 ? "" : String(value).replace(".", ",")
  );

  useEffect(() => {
    if (!isFocused) {
      setRawText(value === 0 ? "" : String(value).replace(".", ","));
    }
  }, [value, isFocused]);

  const formattedDisplay = formatDec(value, minDecimals, maxDecimals);

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={isFocused ? (rawText === "" && value === 0 ? "0" : rawText) : formattedDisplay}
      onFocus={(e) => {
        setIsFocused(true);
        const editable = value === 0 ? "0" : String(value).replace(".", ",");
        setRawText(editable);
        const target = e.currentTarget;
        requestAnimationFrame(() => {
          target.select();
        });
      }}
      onBlur={() => {
        setIsFocused(false);
      }}
      onChange={(e) => {
        const { displayRaw, parsedNumber } = sanitizeDecimalInputString(e.target.value);
        setRawText(displayRaw);
        onChange(parsedNumber);
      }}
      className={className}
    />
  );
}
