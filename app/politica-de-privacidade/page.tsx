import type { Metadata } from "next";
import { Reveal, Stack } from "@/components/atoms";
import { SectionHeading } from "@/components/molecules";
import { PublicTemplate, Section } from "@/components/templates";
import styles from "../paginas.module.css";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o ReabToxin trata os dados enviados pelo site.",
  alternates: { canonical: "/politica-de-privacidade" },
};

/* Sem tela de referência: Section estreita com texto placeholder, a ser substituído pelo texto jurídico aprovado. */
export default function PoliticaDePrivacidadePage() {
  return (
    <PublicTemplate>
      <Section narrow>
        <Stack gap={7}>
          <Reveal>
            <SectionHeading as="h1" eyebrow="Privacidade" title="Política de privacidade" lead="Texto a confirmar com a equipe e com o responsável jurídico." />
          </Reveal>
          <Stack gap={4}>
            <p className={`ap-body-l ${styles.corpo}`}>Quais dados coletamos: nome, e-mail, telefone, profissão e número de registro no conselho, informados nos formulários de inscrição e de contato. Texto a confirmar.</p>
            <p className={`ap-body-l ${styles.corpo}`}>Para que usamos: responder ao contato, confirmar inscrições e enviar os próximos passos da turma. Texto a confirmar.</p>
            <p className={`ap-body-l ${styles.corpo}`}>Seus direitos e como falar com o responsável pelos dados: texto a confirmar, com o e-mail de contato do ReabToxin.</p>
          </Stack>
        </Stack>
      </Section>
    </PublicTemplate>
  );
}
