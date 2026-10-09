import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Sentinel — Plataforma de Saúde Psicossocial",
  description:
    "Avaliação de riscos psicossociais para a gestão exigida pela NR-1, com respostas anônimas e planos de ação gerados com IA.",
};

import { ThemeProvider } from "@/components/theme-provider";
import { AccessibilityWidget } from "@/components/accessibility-widget";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <head>
        {/* Material Symbols é uma fonte de ícones variável — precisa do <link> global. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <AccessibilityWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
