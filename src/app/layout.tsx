import type { Metadata } from "next";
import "./globals.css";
import { CorabastosProvider } from "@/context/CorabastosContext";

export const metadata: Metadata = {
  title: "CORABASTOS · Liquidación de Servicios Públicos, Expensas & Captura de Medidores",
  description:
    "Sistema de Captura Móvil de 1.688 Medidores Físicos, Desacoplo Padre-Hijo de 62 Macromedidores Comunales y Liquidación Exacta de Servicios Públicos y Expensas para 5.318 Locales de Corabastos S.A.",
  icons: {
    icon: "/corabastos-isotipo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--text-main)] print:min-h-0 print:bg-white print:text-slate-950">
        <CorabastosProvider>{children}</CorabastosProvider>
      </body>
    </html>
  );
}
