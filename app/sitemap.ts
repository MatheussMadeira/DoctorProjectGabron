import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/idiomas";
import { entradasDoSitemapDoIdioma } from "@/lib/i18n/seo";
import { sitePublico, urlDoSite } from "@/lib/seo";
import { listarTurmas } from "@/lib/turmas";

/* Um sitemap por idioma: /sitemap/0.xml (pt-BR), /sitemap/1.xml (en), /sitemap/2.xml (es), /sitemap/3.xml (fr), /sitemap/4.xml (it),
   /sitemap/5.xml (de) e /sitemap/6.xml (zh), na ordem de LOCALES. Cada URL leva os hreflang das outras versões.
   Só as páginas públicas e as turmas que ainda não aconteceram; nunca o admin. Vazio enquanto SITE_PUBLICO não for "true". */
export async function generateSitemaps() {
  return LOCALES.map((_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  if (!sitePublico()) return [];
  const locale = LOCALES[Number(await id)];
  if (!locale) return [];
  const turmas = (await listarTurmas(locale)).filter((t) => t.status !== "encerrado");
  return entradasDoSitemapDoIdioma(true, urlDoSite(), locale, turmas);
}
