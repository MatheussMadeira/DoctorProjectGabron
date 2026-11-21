import type { Metadata } from "next";
import { Reveal, Stack } from "@/components/atoms";
import { ItemList, StepItem } from "@/components/molecules";
import { DepoimentoForm, Hero } from "@/components/organisms";
import { MainAside, PublicTemplate, Section } from "@/components/templates";
import { metadataDaPagina, prepararPagina } from "@/lib/i18n/pagina";
import { enviarDepoimento } from "./acoes";

export async function generateMetadata({ params }: PageProps<"/[locale]/depoimento">): Promise<Metadata> {
  return metadataDaPagina((await params).locale, "Depoimento", "/depoimento");
}

export default async function DepoimentoPage({ params }: PageProps<"/[locale]/depoimento">) {
  const { tr } = await prepararPagina((await params).locale);
  return (
    <PublicTemplate>
      <Hero eyebrow={tr("Depoimento.heroEyebrow")} title={tr("Depoimento.heroTitulo")} lead={tr("Depoimento.heroLead")} />
      <Section id="formulario">
        <MainAside
          mainBasis={560}
          mainGrow={999}
          asideBasis={320}
          main={
            <Reveal>
              <DepoimentoForm acao={enviarDepoimento} />
            </Reveal>
          }
          aside={
            <Reveal delay={120}>
              <Stack gap={5}>
                <p className="ap-eyebrow">{tr("Depoimento.comoFunciona")}</p>
                <ItemList ordered>
                  <StepItem marker="01" title={tr("Depoimento.passo1")} />
                  <StepItem marker="02" title={tr("Depoimento.passo2")} />
                  <StepItem marker="03" title={tr("Depoimento.passo3")} />
                </ItemList>
              </Stack>
            </Reveal>
          }
        />
      </Section>
    </PublicTemplate>
  );
}
