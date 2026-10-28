import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/idiomas";
import { regrasDoRobots, sitePublico, urlDoSite } from "@/lib/seo";

/* Controlado por SITE_PUBLICO (ver lib/seo.ts): sem "true", bloqueia tudo e não anuncia nenhum sitemap.
   Com "true", anuncia um sitemap por idioma (ver app/sitemap.ts). */
export default function robots(): MetadataRoute.Robots {
  const publico = sitePublico();
  const base = urlDoSite();
  const regras = regrasDoRobots(publico, base);
  if (!publico) return regras;
  return { ...regras, sitemap: LOCALES.map((_, i) => `${base}/sitemap/${i}.xml`) };
}
