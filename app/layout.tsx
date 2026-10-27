import type { Metadata } from "next";
import { Marcellus, Source_Sans_3 } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
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

export const metadata: Metadata = {
  title: {
    default: "Dra. Ana Paula Fonseca — Médica Fisiatra",
    template: "%s · Dra. Ana Paula Fonseca",
  },
  description: "Médica fisiatra em Belo Horizonte e turmas de toxina botulínica para profissionais da saúde.",
  icons: { icon: "/favicon.svg" },
  // Fora do ar para o público até a Fase 6; a Fase 7 troca por index/follow.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme é fixado pelo script abaixo antes da pintura; por isso o suppressHydrationWarning.
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
