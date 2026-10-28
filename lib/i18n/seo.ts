import type { Metadata, MetadataRoute } from "next";
import { PAGINAS_PUBLICAS, urlDoSite } from "../seo";
import { comPrefixo, IDIOMAS, LOCALE_PADRAO, LOCALES, type Locale } from "./idiomas";

/** canonical + hreflang (inclusive x-default, que é o português) de uma página. `caminho` sem prefixo de idioma ("/agenda", "/agenda/<slug>"). */
export function alternativas(locale: Locale, caminho: string): NonNullable<Metadata["alternates"]> {
  const base = urlDoSite();
  const url = (l: Locale) => `${base}${comPrefixo(l, caminho)}`;
  const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [IDIOMAS[l].hreflang, url(l)]));
  languages["x-default"] = url(LOCALE_PADRAO);
  return { canonical: url(locale), languages };
}

/** Open Graph da página no idioma: og:locale e og:locale:alternate dos outros. */
export function localesDoOg(locale: Locale) {
  return { locale: IDIOMAS[locale].og, alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => IDIOMAS[l].og) };
}

/** Entradas do sitemap de UM idioma: as páginas fixas e as turmas ainda por acontecer, cada uma com `alternates.languages` (hreflang + x-default).
    Vazio enquanto o site não for público. */
export function entradasDoSitemapDoIdioma(publico: boolean, base: string, locale: Locale, turmas: Array<{ slug: string; atualizadaEm: string }>): MetadataRoute.Sitemap {
  if (!publico) return [];
  // A raiz em português é o próprio endereço do site (sem barra no fim), como no sitemap de sempre.
  const url = (l: Locale, caminho: string) => `${base}${caminho === "/" && l === LOCALE_PADRAO ? "" : comPrefixo(l, caminho)}`;
  const alternativas = (caminho: string) => ({
    languages: { ...Object.fromEntries(LOCALES.map((l) => [IDIOMAS[l].hreflang, url(l, caminho)])), "x-default": url(LOCALE_PADRAO, caminho) },
  });
  return [
    ...PAGINAS_PUBLICAS.map((p) => ({ url: url(locale, p.caminho), changeFrequency: p.frequencia, priority: p.prioridade, alternates: alternativas(p.caminho) })),
    ...turmas.map((t) => ({
      url: url(locale, `/agenda/${t.slug}`),
      lastModified: t.atualizadaEm,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: alternativas(`/agenda/${t.slug}`),
    })),
  ];
}
