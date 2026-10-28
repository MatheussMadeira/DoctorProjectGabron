import type { Metadata } from "next";
import { Reveal, Stack } from "@/components/atoms";
import { SectionHeading } from "@/components/molecules";
import { PublicTemplate, Section } from "@/components/templates";
import { metadataDaPagina, prepararPagina } from "@/lib/i18n/pagina";
import styles from "../paginas.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/politica-de-privacidade">): Promise<Metadata> {
  return metadataDaPagina((await params).locale, "Politica", "/politica-de-privacidade");
}

/* Sem tela de referência: Section estreita com texto placeholder, a ser substituído pelo texto jurídico aprovado. */
export default async function PoliticaDePrivacidadePage({ params }: PageProps<"/[locale]/politica-de-privacidade">) {
  const { tr } = await prepararPagina((await params).locale);
  return (
    <PublicTemplate>
      <Section narrow>
        <Stack gap={7}>
          <Reveal>
            <SectionHeading as="h1" eyebrow={tr("Politica.eyebrow")} title={tr("Politica.titulo")} lead={tr("Politica.lead")} />
          </Reveal>
          <Stack gap={4}>
            {["Politica.p1", "Politica.p2", "Politica.p3"].map((chave) => (
              <p key={chave} className={`ap-body-l ${styles.corpo}`}>
                {tr(chave)}
              </p>
            ))}
          </Stack>
        </Stack>
      </Section>
    </PublicTemplate>
  );
}
