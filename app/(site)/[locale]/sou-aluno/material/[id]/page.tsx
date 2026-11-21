import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Hero } from "@/components/organisms";
import { MaterialDoAluno } from "@/components/organisms/MaterialDoAluno";
import { PublicTemplate, Section } from "@/components/templates";
import { precisaAceitar } from "@/lib/aluno";
import { materialDoAluno } from "@/lib/aluno-conteudo";
import { alunoAtual } from "@/lib/aluno-sessao";
import { criarTradutor } from "@/lib/i18n/mensagens";
import { comPrefixo, LOCALES, type Locale } from "@/lib/i18n/idiomas";
import { idiomaDe, prepararPagina } from "@/lib/i18n/pagina";
import type { Tradutor } from "@/lib/i18n/tradutor";

/* O id do material não é conhecido no build: gera só a "casca" (um id de modelo por idioma), e o conteúdo, que depende da sessão, fica no Suspense. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale, id: "modelo" }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/sou-aluno/material/[id]">): Promise<Metadata> {
  const t = criarTradutor(idiomaDe((await params).locale), "Aluno");
  return { title: t("metaTitulo"), robots: { index: false, follow: false } };
}

async function Conteudo({ locale, tr, params }: { locale: Locale; tr: Tradutor; params: PageProps<"/[locale]/sou-aluno/material/[id]">["params"] }) {
  // O id do material só se conhece na requisição: é lido aqui dentro, no Suspense.
  const { id } = await params;
  const aluno = await alunoAtual();
  // Sem sessão (ou sem o aceite do aviso), volta para a entrada da área do aluno.
  if (!aluno || precisaAceitar(aluno)) redirect(comPrefixo(locale, "/sou-aluno"));
  const material = await materialDoAluno(aluno, id, locale);
  if (!material) notFound();
  return <MaterialDoAluno material={material} locale={locale} tr={tr} />;
}

export default async function MaterialPage({ params }: PageProps<"/[locale]/sou-aluno/material/[id]">) {
  const { locale: l } = await params;
  const { locale, tr } = await prepararPagina(l);
  return (
    <PublicTemplate hideWhatsApp>
      <Hero eyebrow={tr("Aluno.heroEyebrow")} title={tr("Aluno.heroTitulo")} />
      <Section id="material">
        <Suspense fallback={<p role="status">{tr("Aluno.carregando")}</p>}>
          <Conteudo locale={locale} tr={tr} params={params} />
        </Suspense>
      </Section>
    </PublicTemplate>
  );
}
