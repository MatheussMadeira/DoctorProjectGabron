import type { Metadata } from "next";
import { JsonLd } from "@/components/atoms";
import { PaginaSecoes } from "@/components/site-secoes/PaginaSecoes";
import { PublicTemplate } from "@/components/templates";
import { obterSite } from "@/lib/configuracoes";
import { organizacaoLd } from "@/lib/dados-estruturados";
import { metadataDaPagina, prepararPagina } from "@/lib/i18n/pagina";
import { urlDoSite } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/sobre-o-curso">): Promise<Metadata> {
  return metadataDaPagina((await params).locale, "Sobre", "/sobre-o-curso");
}

/* O corpo da página vem das seções publicadas no editor visual (/admin/editor), ou do padrão enquanto nada foi publicado. */
export default async function SobreOCursoPage({ params }: PageProps<"/[locale]/sobre-o-curso">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  const site = await obterSite(locale);
  return (
    <PublicTemplate>
      <JsonLd dados={organizacaoLd(site, urlDoSite(), locale, tr("Metadata.descricao"))} />
      <PaginaSecoes pagina="sobre-o-curso" locale={locale} tr={tr} />
    </PublicTemplate>
  );
}
