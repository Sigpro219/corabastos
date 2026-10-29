"use client";

import React from "react";

interface CorabastosBrandLogoProps {
  variant?: "isotipo" | "horizontal-dark" | "horizontal-light";
  size?: number;
  className?: string;
}

/**
 * Isotipo y Logotipo Institucional de la Corporación de Abastos de Bogotá S.A. (CORABASTOS)
 * NIT: 860.028.093-7 — Vectorizado en alta precisión a partir del arte oficial de corabastos.com.co.
 */
export function CorabastosBrandLogo({
  variant = "isotipo",
  size = 32,
  className = "",
}: CorabastosBrandLogoProps) {
  if (variant === "isotipo") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Logo Oficial Corabastos"
      >
        <defs>
          <radialGradient id="cbSunIso" cx="62%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="35%" stopColor="#F7931B" />
            <stop offset="100%" stopColor="#DD6B20" />
          </radialGradient>
          <linearGradient id="cbLeafTopIso" x1="25%" y1="85%" x2="95%" y2="15%">
            <stop offset="0%" stopColor="#14532D" />
            <stop offset="55%" stopColor="#2E7D32" />
            <stop offset="100%" stopColor="#84CC16" />
          </linearGradient>
          <linearGradient id="cbLeafBrIso" x1="15%" y1="90%" x2="90%" y2="10%">
            <stop offset="0%" stopColor="#14532D" />
            <stop offset="55%" stopColor="#2E7D32" />
            <stop offset="100%" stopColor="#84CC16" />
          </linearGradient>
          <linearGradient id="cbLeafCradleIso" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E7D32" />
            <stop offset="100%" stopColor="#14532D" />
          </linearGradient>
        </defs>
        <path
          d="M24 114C38 56 88 22 146 24C165 24.8 182 30 192 36C174 64 142 74 106 68C68 62 40 82 24 114Z"
          fill="url(#cbLeafTopIso)"
        />
        <circle cx="106" cy="138" r="54" fill="url(#cbSunIso)" />
        <path
          d="M26 138C28 182 58 208 101 212C101 182 78 158 26 138Z"
          fill="url(#cbLeafCradleIso)"
        />
        <path
          d="M186 138C184 182 154 208 111 212C111 182 134 158 186 138Z"
          fill="url(#cbLeafCradleIso)"
        />
        <path
          d="M102 228C152 240 202 210 226 154C232 139 235 124 234 112C202 120 180 146 168 178C156 208 132 224 102 228Z"
          fill="url(#cbLeafBrIso)"
        />
      </svg>
    );
  }

  const isDarkBg = variant === "horizontal-dark";

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center p-1 shadow-xs border border-slate-200/80 shrink-0">
        <CorabastosBrandLogo variant="isotipo" size={28} />
      </div>
      <div className="leading-none">
        <div
          className={`font-serif font-bold tracking-wide text-sm flex items-start gap-0.5 ${
            isDarkBg ? "text-white" : "text-[#14532D]"
          }`}
        >
          <span>CORABASTOS</span>
          <span className="text-[9px] text-[#84CC16] font-sans">®</span>
        </div>
        <span
          className={`block font-mono text-[9px] tracking-widest mt-0.5 ${
            isDarkBg ? "text-[#f7931b]" : "text-slate-500"
          }`}
        >
          NIT: 860.028.093-7
        </span>
      </div>
    </div>
  );
}
