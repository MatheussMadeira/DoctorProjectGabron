import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/atoms";
import { PaginaSecoes } from "@/components/site-secoes/PaginaSecoes";
import { PublicTemplate } from "@/components/templates";
import { obterSite } from "@/lib/configuracoes";
import { organizacaoLd } from "@/lib/dados-estruturados";
import { alternativas } from "@/lib/i18n/seo";
import { idiomaDe, prepararPagina } from "@/lib/i18n/pagina";
import { urlDoSite } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = idiomaDe((await params).locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: { absolute: t("titulo") }, description: t("descricao"), alternates: alternativas(locale, "/") };
}

/* O corpo da página vem das seções publicadas no editor visual (/admin/editor), ou do padrão enquanto nada foi publicado. */
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  const site = await obterSite(locale);
  return (
    <PublicTemplate>
      <JsonLd dados={organizacaoLd(site, urlDoSite(), locale, tr("Metadata.descricao"))} />
      <PaginaSecoes pagina="inicio" locale={locale} tr={tr} />
    </PublicTemplate>
  );
}
