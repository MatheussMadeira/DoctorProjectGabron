import type { MetadataRoute } from "next";
import { regrasDoRobots, sitePublico, urlDoSite } from "@/lib/seo";

/* Controlado por SITE_PUBLICO (ver lib/seo.ts): sem "true", bloqueia tudo e não anuncia o sitemap. */
export default function robots(): MetadataRoute.Robots {
  return regrasDoRobots(sitePublico(), urlDoSite());
}
