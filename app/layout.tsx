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
    default: "Dra. Ana Paula Fonseca — Médica Fisiatra em Belo Horizonte",
    template: "%s · Dra. Ana Paula Fonseca",
  },
  description: "Médica fisiatra em Belo Horizonte e turmas de toxina botulínica para profissionais da saúde.",
  applicationName: "Dra. Ana Paula Fonseca",
  icons: { icon: "/favicon.svg" },
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
