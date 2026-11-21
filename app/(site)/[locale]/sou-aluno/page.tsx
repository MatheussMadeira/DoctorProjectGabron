import type { Metadata } from "next";
import { Suspense } from "react";
import { AreaDoAluno } from "@/components/organisms/AreaDoAluno";
import { Hero } from "@/components/organisms";
import { PublicTemplate, Section } from "@/components/templates";
import { idiomaDe, prepararPagina } from "@/lib/i18n/pagina";
import { criarTradutor } from "@/lib/i18n/mensagens";

/* Área do aluno: nunca indexada. O cabeçalho é estático; quem lê o cookie (a área em si) fica dentro de um Suspense. */
export async function generateMetadata({ params }: PageProps<"/[locale]/sou-aluno">): Promise<Metadata> {
  const t = criarTradutor(idiomaDe((await params).locale), "Aluno");
  return { title: t("metaTitulo"), description: t("metaDescricao"), robots: { index: false, follow: false } };
}

export default async function SouAlunoPage({ params, searchParams }: PageProps<"/[locale]/sou-aluno">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  return (
    <PublicTemplate hideWhatsApp>
      <Hero eyebrow={tr("Aluno.heroEyebrow")} title={tr("Aluno.heroTitulo")} lead={tr("Aluno.heroLead")} />
      <Section id="area">
        <Suspense fallback={<p role="status">{tr("Aluno.carregando")}</p>}>
          <AreaDoAluno locale={locale} tr={tr} searchParams={searchParams} />
        </Suspense>
      </Section>
    </PublicTemplate>
  );
}
