import type { Metadata } from "next";
import "./globals.css";
import { CorabastosProvider } from "@/context/CorabastosContext";

export const metadata: Metadata = {
  title: "CORABASTOS OS · ERP Corporativo & Motor de Liquidación de Servicios Públicos",
  description:
    "Plataforma de Captura Móvil de Contadores en Terreno, Desacoplo Padre-Hijo de Macromedidores Comunales y Liquidación Exacta de Servicios Públicos y Expensas para 5.318 Locales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-[#F8F9FA] text-[#1D3557]">
        <CorabastosProvider>{children}</CorabastosProvider>
      </body>
    </html>
  );
}
