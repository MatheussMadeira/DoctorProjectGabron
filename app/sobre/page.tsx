import type { Metadata } from "next";
import { Button, Photo, Reveal, Stack } from "@/components/atoms";
import { CTABand, Hero } from "@/components/organisms";
import { FeatureItem, ItemList, SectionHeading, StepItem } from "@/components/molecules";
import { PublicTemplate, Section, SplitLayout } from "@/components/templates";
import { obterSite } from "@/lib/configuracoes";
import { proximaComInscricoesAbertas } from "@/lib/turmas";
import { chamadaProxima } from "@/lib/turmas-view";
import styles from "../paginas.module.css";

export const metadata: Metadata = {
  title: "Sobre a Dra.",
  description: "Formação, trajetória e ensino da Dra. Ana Paula Fonseca, médica fisiatra em Belo Horizonte.",
  alternates: { canonical: "/sobre" },
};

export default async function SobrePage() {
  const [proxima, site] = await Promise.all([proximaComInscricoesAbertas(), obterSite()]);
  const chamada = proxima && chamadaProxima(proxima);

  return (
    <PublicTemplate>
      <Hero
        eyebrow="Médica Fisiatra"
        title="Dra. Ana Paula Fonseca"
        lead="Cuida de pessoas com dor e limitação de movimento em Belo Horizonte e ensina toxina botulínica a profissionais da saúde."
        primary={{ label: "Agendar consulta", href: "/contato" }}
        secondary={{ label: "Ver agenda de cursos", href: "/agenda" }}
        image="/images/retrato-dra-ana-paula.webp"
        imageAlt="Retrato da Dra. Ana Paula Fonseca"
      />

      <Section id="trajetoria">
        <SplitLayout align="start">
          <Stack gap={6}>
            <Reveal>
              <SectionHeading number="01" eyebrow="Trajetória" title="Formação e caminho" />
            </Reveal>
            <p className="ap-eyebrow">{site.registro}</p>
            <p className={`ap-body-l ${styles.corpo}`}>
              Texto de apresentação da Dra. Ana Paula Fonseca: onde se formou, por que escolheu a Medicina Física e Reabilitação e como é o cuidado que oferece na clínica.
            </p>
            <p className={`ap-body-l ${styles.corpo}`}>
              Segundo parágrafo: como chegou ao ensino da toxina botulínica e o que a motiva a formar outros profissionais da saúde.
            </p>
          </Stack>
          <ItemList ordered step={120}>
            <StepItem marker="0000" title="Graduação em Medicina">Instituição a confirmar</StepItem>
            <StepItem marker="0000" title="Residência em Medicina Física e Reabilitação">Instituição a confirmar</StepItem>
            <StepItem marker="0000" title="Título de especialista">Sociedade ou entidade a confirmar</StepItem>
            <StepItem marker="0000" title="Primeira turma de toxina botulínica">Cidade e detalhes a confirmar</StepItem>
          </ItemList>
        </SplitLayout>
      </Section>

      <Section id="ensino" background="sunken">
        <SplitLayout reverse basis={[400, 440]}>
          <Reveal>
            <Photo src="/images/maos.webp" alt="Mãos em luvas durante uma aula prática" />
          </Reveal>
          <Stack gap={6}>
            <Reveal>
              <SectionHeading
                number="02"
                eyebrow="Ensino"
                title="Na sala de aula"
                lead="As turmas de toxina botulínica unem anatomia, critério de indicação e prática acompanhada de perto."
              />
            </Reveal>
            <ItemList>
              <FeatureItem compact title="Base anatômica">Cada técnica parte da anatomia aplicada e da indicação correta.</FeatureItem>
              <FeatureItem compact title="Prática supervisionada">As aplicações são acompanhadas pela Dra., com orientação individual.</FeatureItem>
              <FeatureItem compact title="Segurança antes de tudo">Critérios para indicar ou não o procedimento e conduta diante de intercorrências.</FeatureItem>
            </ItemList>
            <div>
              <Button variant="secondary" href="/agenda" arrow>
                Ver agenda de cursos
              </Button>
            </div>
          </Stack>
        </SplitLayout>
      </Section>

      <Section theme="escuro" pedras>
        <Reveal>
          <div className={styles.leitura}>
            <SectionHeading
              number="03"
              eyebrow="O que guia o trabalho"
              title="Equilíbrio, cuidado, paciência"
              lead="Os mesmos valores na clínica e na sala de aula: ouvir com atenção, decidir com critério e acompanhar cada etapa."
            />
          </div>
        </Reveal>
      </Section>

      {chamada && (
        <Section>
          <Reveal>
            <CTABand
              eyebrow="Próxima turma · Inscrições abertas"
              title={chamada.title}
              text={chamada.text}
              action={{ label: "Garantir minha vaga", href: chamada.href }}
            />
          </Reveal>
        </Section>
      )}
    </PublicTemplate>
  );
}
