import type { NextConfig } from "next";
import { cabecalhosDeIndexacao, sitePublico } from "./lib/seo";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  images: {
    // Fotos enviadas pelo painel ficam no Vercel Blob (https://<loja>.public.blob.vercel-storage.com/...).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  async headers() {
    return [
      // O painel nunca é indexado, em nenhum modo.
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Enquanto SITE_PUBLICO não for "true", o site inteiro também manda não indexar.
      ...(cabecalhosDeIndexacao(sitePublico()).length ? [{ source: "/:path*", headers: cabecalhosDeIndexacao(sitePublico()) }] : []),
    ];
  },
};

export default nextConfig;
