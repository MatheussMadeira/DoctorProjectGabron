import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { classesDeFonte } from "@/lib/fontes";
import { IDIOMAS, LOCALES, type Locale } from "@/lib/i18n/idiomas";
import { localesDoOg } from "@/lib/i18n/seo";
import { openGraphDoSite, robotsDaPagina, sitePublico, urlDoSite } from "@/lib/seo";
import "../../styles/ap-tokens.css";
import "../../styles/bundle.css";
import "../../styles/ajustes.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/* Indexação controlada por SITE_PUBLICO (lib/seo.ts): sem "true", todas as páginas saem com noindex.
   Título, descrição e Open Graph vêm de messages/<idioma>.json (namespace "Metadata"). */
export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const og = openGraphDoSite();
  return {
    metadataBase: new URL(urlDoSite()),
    title: { default: t("titulo"), template: t("modelo") },
    description: t("descricao"),
    applicationName: t("nome"),
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
    openGraph: { ...og, ...localesDoOg(locale as Locale), siteName: t("nome"), images: [{ url: "/og.png", width: 1200, height: 630, alt: t("ogAlt") }] },
    twitter: { card: "summary_large_image", images: ["/og.png"] },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    // O site tem só o tema claro. As seções escuras da marca (Hero, faixas de chamada, rodapé) forçam `data-theme="escuro"` sozinhas.
    <html lang={IDIOMAS[locale as Locale].lang} data-theme="claro" className={classesDeFonte}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
