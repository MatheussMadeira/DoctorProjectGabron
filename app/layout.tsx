import type { Metadata } from "next";
import { Marcellus, Source_Sans_3 } from "next/font/google";
import { openGraphDoSite, robotsDaPagina, sitePublico, urlDoSite } from "@/lib/seo";
import "./styles/ap-tokens.css";
import "./styles/bundle.css";
import "./styles/ajustes.css";

const display = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--nf-display",
  display: "swap",
});

const sans = Source_Sans_3({
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--nf-sans",
  display: "swap",
});

/* Indexação controlada por SITE_PUBLICO (lib/seo.ts): sem "true", todas as páginas saem com noindex. */
export const metadata: Metadata = {
  metadataBase: new URL(urlDoSite()),
  title: {
    default: "ReabToxin — Curso de toxina botulínica para profissionais da saúde",
    template: "%s · ReabToxin",
  },
  description: "Curso prático de toxina botulínica para médicos, dentistas, biomédicos e outros profissionais da saúde, com base anatômica e prática supervisionada.",
  applicationName: "ReabToxin",
  // Kit de logo do ReabToxin: SVG (navegadores novos), PNG de 16 e 32 (fallback) e o ícone do iOS (180).
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  robots: robotsDaPagina(sitePublico()),
  openGraph: openGraphDoSite(),
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // O site tem só o tema claro. As seções escuras da marca (Hero, faixas de chamada, rodapé) forçam `data-theme="escuro"` sozinhas.
    <html lang="pt-BR" data-theme="claro" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
