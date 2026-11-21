import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/organisms";
import { PreviaDaArea } from "@/components/organisms/PreviaDoAluno";
import { PublicTemplate, Section } from "@/components/templates";
import { prepararPagina } from "@/lib/i18n/pagina";

export const metadata: Metadata = { title: "Prévia da área do aluno", robots: { index: false, follow: false } };

/* Prévia do ADMIN ("Ver como aluno"): só leitura. Quem não é ADMIN volta para /sou-aluno. */
export default async function PreviaPage({ params, searchParams }: PageProps<"/[locale]/sou-aluno/previa">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  return (
    <PublicTemplate hideWhatsApp>
      <Hero eyebrow={tr("Aluno.heroEyebrow")} title={tr("Aluno.heroTitulo")} />
      <Section id="previa">
        <Suspense fallback={<p role="status">{tr("Aluno.carregando")}</p>}>
          <PreviaDaArea locale={locale} tr={tr} searchParams={searchParams} />
        </Suspense>
      </Section>
    </PublicTemplate>
  );
}
