import { Marcellus, Noto_Sans_SC, Source_Sans_3 } from "next/font/google";

/* Fontes do site. O chinês (zh) usa Noto Sans SC, aplicada pelo atributo lang (ver ajustes.css, `:lang(zh)`): a Marcellus e a Source Sans não têm ideogramas. */
export const display = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--nf-display",
  display: "swap",
});

export const sans = Source_Sans_3({
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--nf-sans",
  display: "swap",
});

/** O Next divide a Noto Sans SC em fatias por faixa de caracteres (unicode-range): só baixa o que a página usa. */
export const chines = Noto_Sans_SC({
  weight: ["400", "600", "700"],
  variable: "--nf-sc",
  display: "swap",
  preload: false,
});

export const classesDeFonte = `${display.variable} ${sans.variable} ${chines.variable}`;
