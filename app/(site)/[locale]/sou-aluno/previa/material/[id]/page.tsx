import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/organisms";
import { PreviaDoMaterial } from "@/components/organisms/PreviaDoAluno";
import { PublicTemplate, Section } from "@/components/templates";
import { LOCALES, type Locale } from "@/lib/i18n/idiomas";
import { prepararPagina } from "@/lib/i18n/pagina";
import type { Tradutor } from "@/lib/i18n/tradutor";

export const metadata: Metadata = { title: "Prévia da área do aluno", robots: { index: false, follow: false } };

/* O id do material só se conhece na requisição: gera só a casca (um id de modelo por idioma). */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale, id: "modelo" }));
}

async function Conteudo({ locale, tr, params, searchParams }: { locale: Locale; tr: Tradutor; params: PageProps<"/[locale]/sou-aluno/previa/material/[id]">["params"]; searchParams: PageProps<"/[locale]/sou-aluno/previa/material/[id]">["searchParams"] }) {
  const { id } = await params;
  return <PreviaDoMaterial locale={locale} tr={tr} id={id} searchParams={searchParams} />;
}

export default async function PreviaMaterialPage({ params, searchParams }: PageProps<"/[locale]/sou-aluno/previa/material/[id]">) {
  const { locale: l } = await params;
  const { locale, tr } = await prepararPagina(l);
  return (
    <PublicTemplate hideWhatsApp>
      <Hero eyebrow={tr("Aluno.heroEyebrow")} title={tr("Aluno.heroTitulo")} />
      <Section id="previa-material">
        <Suspense fallback={<p role="status">{tr("Aluno.carregando")}</p>}>
          <Conteudo locale={locale} tr={tr} params={params} searchParams={searchParams} />
        </Suspense>
      </Section>
    </PublicTemplate>
  );
}
