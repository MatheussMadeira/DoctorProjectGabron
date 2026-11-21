import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert } from "@/components/molecules/Alert";
import { Hero } from "@/components/organisms";
import { RedefinirSenhaForm } from "@/components/organisms/AcessoAluno";
import { AppLink } from "@/components/atoms/AppLink";
import { PublicTemplate, Section } from "@/components/templates";
import { redefinicaoValida } from "@/lib/aluno";
import { criarTradutor } from "@/lib/i18n/mensagens";
import { idiomaDe, prepararPagina } from "@/lib/i18n/pagina";
import type { Tradutor } from "@/lib/i18n/tradutor";

export async function generateMetadata({ params }: PageProps<"/[locale]/sou-aluno/redefinir">): Promise<Metadata> {
  const t = criarTradutor(idiomaDe((await params).locale), "Aluno");
  return { title: t("redefinirTitulo"), robots: { index: false, follow: false } };
}

async function Formulario({ tr, searchParams }: { tr: Tradutor; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = String((await searchParams).token ?? "");
  if (!(await redefinicaoValida(token))) {
    return (
      <div>
        <Alert tone="danger" title={tr("Aluno.redefinirInvalido")}>
          {null}
        </Alert>
        <p>
          <AppLink href="/sou-aluno">{tr("Aluno.irParaEntrar")}</AppLink>
        </p>
      </div>
    );
  }
  return <RedefinirSenhaForm token={token} />;
}

export default async function RedefinirPage({ params, searchParams }: PageProps<"/[locale]/sou-aluno/redefinir">) {
  const { tr } = await prepararPagina((await params).locale);
  return (
    <PublicTemplate hideWhatsApp>
      <Hero eyebrow={tr("Aluno.heroEyebrow")} title={tr("Aluno.redefinirTitulo")} />
      <Section id="redefinir">
        <Suspense fallback={<p role="status">{tr("Aluno.carregando")}</p>}>
          <Formulario tr={tr} searchParams={searchParams} />
        </Suspense>
      </Section>
    </PublicTemplate>
  );
}
