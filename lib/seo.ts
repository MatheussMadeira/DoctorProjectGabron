import type { Metadata, MetadataRoute } from "next";

/* SEO controlado por UMA variável: SITE_PUBLICO.
   - diferente de "true" (padrão): robots.txt bloqueia tudo, toda página sai com noindex, o sitemap fica vazio e não é
     anunciado, e o cabeçalho X-Robots-Tag também manda não indexar.
   - "true": libera a indexação das páginas públicas e anuncia o sitemap.
   O painel (/admin) é sempre noindex e nunca entra no sitemap, em qualquer dos dois modos.
   As páginas são estáticas: depois de mudar SITE_PUBLICO na Vercel, faça um novo deploy. */

export const sitePublico = (env: Record<string, string | undefined> = process.env) => env.SITE_PUBLICO === "true";

/** Endereço público do site. SITE_URL tem prioridade; na Vercel cai no domínio de produção do projeto, depois no do deploy. */
export function urlDoSite(env: Record<string, string | undefined> = process.env): string {
  const definida = env.SITE_URL?.trim();
  if (definida) return definida.replace(/\/$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL ?? env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

/** Open Graph padrão do site (imagem em PNG: o WhatsApp, o LinkedIn e o Facebook não leem WebP de forma confiável).
    Uma página que define o próprio `openGraph` substitui o do layout inteiro, então ela parte deste. */
export function openGraphDoSite(extra: { title?: string; description?: string; url?: string } = {}): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    locale: "pt_BR",
    siteName: "Dra. Ana Paula Fonseca",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Dra. Ana Paula Fonseca — Médica Fisiatra" }],
    ...extra,
  };
}

/** `robots` dos metadados de página: noindex em tudo enquanto o site não for público. */
export const robotsDaPagina = (publico: boolean): NonNullable<Metadata["robots"]> =>
  publico ? { index: true, follow: true } : { index: false, follow: false };

/** Conteúdo do robots.txt. */
export function regrasDoRobots(publico: boolean, base: string): MetadataRoute.Robots {
  if (!publico) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/dev"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

/** Cabeçalhos globais: X-Robots-Tag extra enquanto o site não for público (vale também para arquivos que não são HTML). */
export const cabecalhosDeIndexacao = (publico: boolean) => (publico ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]);

export interface PaginaDoSitemap {
  caminho: string;
  prioridade: number;
  frequencia: "weekly" | "monthly" | "yearly";
}

/** Páginas fixas que entram no sitemap. O admin nunca aparece aqui. */
export const PAGINAS_PUBLICAS: PaginaDoSitemap[] = [
  { caminho: "/", prioridade: 1, frequencia: "weekly" },
  { caminho: "/agenda", prioridade: 0.9, frequencia: "weekly" },
  { caminho: "/sobre", prioridade: 0.7, frequencia: "monthly" },
  { caminho: "/clinica", prioridade: 0.7, frequencia: "monthly" },
  { caminho: "/contato", prioridade: 0.6, frequencia: "yearly" },
  { caminho: "/politica-de-privacidade", prioridade: 0.2, frequencia: "yearly" },
];

/** Monta as entradas do sitemap. Vazio enquanto o site não for público. */
export function entradasDoSitemap(publico: boolean, base: string, turmas: Array<{ slug: string; atualizadaEm: string }>): MetadataRoute.Sitemap {
  if (!publico) return [];
  return [
    ...PAGINAS_PUBLICAS.map((p) => ({ url: `${base}${p.caminho === "/" ? "" : p.caminho}`, changeFrequency: p.frequencia, priority: p.prioridade })),
    ...turmas.map((t) => ({ url: `${base}/agenda/${t.slug}`, lastModified: t.atualizadaEm, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
