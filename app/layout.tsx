import type { Metadata } from "next";
import "./globals.css";
import { ThemeRoot } from "@/components/orbit/providers";

export const metadata: Metadata = {
  title: { default: "Orbit — Prospecção inteligente", template: "%s · Orbit" },
  description:
    "Descubra negócios locais, analise oportunidades e transforme sua próxima proposta em uma demonstração visual.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <a className="skip-link" href="#main-content">
          Pular para o conteúdo
        </a>
        <ThemeRoot>{children}</ThemeRoot>
      </body>
    </html>
  );
}
