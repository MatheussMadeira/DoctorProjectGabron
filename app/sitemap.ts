import type { MetadataRoute } from "next";
import { entradasDoSitemap, sitePublico, urlDoSite } from "@/lib/seo";
import { listarTurmas } from "@/lib/turmas";

/* Só as páginas públicas e as turmas que ainda não aconteceram. Nunca o admin. Vazio enquanto SITE_PUBLICO não for "true". */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!sitePublico()) return [];
  const turmas = (await listarTurmas()).filter((t) => t.status !== "encerrado");
  return entradasDoSitemap(true, urlDoSite(), turmas);
}
