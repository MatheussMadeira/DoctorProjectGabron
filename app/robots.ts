import type { MetadataRoute } from "next";

/* Até a Fase 6 o site não pode ser indexado nem divulgado. Na Fase 7 (acabamento) este arquivo passa a liberar
   as páginas públicas, mantendo /admin e /dev bloqueados, e publica o sitemap. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
