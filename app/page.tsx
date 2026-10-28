import type { Metadata } from "next";
import { Button, Grid, JsonLd, Photo, Reveal, Stack } from "@/components/atoms";
import { ItemList, SectionHeading, StepItem, Stats, Testimonial } from "@/components/molecules";
import { CTABand, EventCard, Hero, ProfessorCard } from "@/components/organisms";
import { PublicTemplate, Section, SplitLayout } from "@/components/templates";
import { obterSite } from "@/lib/configuracoes";
import { organizacaoLd } from "@/lib/dados-estruturados";
import { DEPOIMENTOS, NUMEROS_CURSO } from "@/lib/dados-exemplo";
import { listarProfessores } from "@/lib/professores";
import { leadDosProfessores } from "@/lib/professores-texto";
import { urlDoSite } from "@/lib/seo";
import { listarProximas, proximaComInscricoesAbertas } from "@/lib/turmas";
import { cardProps, chamadaProxima } from "@/lib/turmas-view";

export const metadata: Metadata = {
  title: { absolute: "ReabToxin — Curso de toxina botulínica para profissionais da saúde" },
  description: "Curso prático de toxina botulínica para médicos, dentistas, biomédicos e outros profissionais da saúde, com base anatômica e prática supervisionada.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [destaques, proxima, site, professores] = await Promise.all([listarProximas(3), proximaComInscricoesAbertas(), obterSite(), listarProfessores()]);
  const chamada = proxima && chamadaProxima(proxima);

  return (
    <PublicTemplate>
      <JsonLd dados={organizacaoLd(site, urlDoSite())} />
      <Hero
        eyebrow="Formação em toxina botulínica"
        title="ReabToxin"
        lead="Curso prático de toxina botulínica para médicos, dentistas, biomédicos e outros profissionais da saúde, com base anatômica e prática supervisionada."
        primary={{ label: "Ver agenda de cursos", href: "/agenda" }}
        secondary={{ label: "Conheça o curso", href: "/sobre-o-curso" }}
        image="/images/maos.webp"
        imageAlt="Mãos em luvas preparando uma aplicação"
      />

      <Section id="curso">
        <SplitLayout>
          <Stack gap={7}>
            <Reveal>
              <SectionHeading number="01" eyebrow="O curso" title="Como é a formação" lead="Texto curto sobre a proposta do ReabToxin: o que o curso ensina, para quem é e o que o diferencia." />
            </Reveal>
            <ItemList ordered step={120}>
              <StepItem marker="01" title="Base anatômica">Cada técnica parte da anatomia aplicada e do critério de indicação.</StepItem>
              <StepItem marker="02" title="Prática supervisionada">As aplicações são acompanhadas de perto pelos professores, com orientação individual.</StepItem>
              <StepItem marker="03" title="Segurança antes de tudo">Critérios para indicar ou não o procedimento e conduta diante de intercorrências.</StepItem>
            </ItemList>
            <div>
              <Button variant="secondary" href="/sobre-o-curso" arrow>
                Conheça o curso
              </Button>
            </div>
          </Stack>
          <Reveal delay={120}>
            <Photo src="/images/anatomia-quadril.webp" alt="Modelo anatômico usado nas aulas" />
          </Reveal>
        </SplitLayout>
      </Section>

      <Section id="turmas" background="sunken">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number="02" eyebrow="Agenda de cursos" title="Próximas turmas" lead="Veja datas, local e programação de cada turma, e faça sua inscrição." />
          </Reveal>
          <Grid minWidth={320}>
            {destaques.map((t, i) => (
              <Reveal key={t.slug} delay={i * 120}>
                <EventCard {...cardProps(t)} />
              </Reveal>
            ))}
          </Grid>
          <Stack row justify="end">
            <Button variant="link" href="/agenda" arrow>
              Ver agenda completa
            </Button>
          </Stack>
        </Stack>
      </Section>

      {professores.length > 0 && (
        <Section id="professores">
          <Stack gap={7}>
            <Reveal>
              <SectionHeading number="03" eyebrow="Professores" title="Quem ensina" lead={leadDosProfessores(professores.length)} />
            </Reveal>
            <div className="ap-prof-grade">
              {professores.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 3) * 120}>
                  <ProfessorCard nome={p.nome} titulo={p.funcao} registro={p.registro} foto={p.fotoUrl} fotoAlt={p.fotoAlt} />
                </Reveal>
              ))}
            </div>
            <Stack row justify="end">
              <Button variant="link" href="/sobre-o-curso#professores" arrow>
                Conheça os professores
              </Button>
            </Stack>
          </Stack>
        </Section>
      )}

      <Section theme="escuro">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading align="center" eyebrow="ReabToxin" title="O curso em números" />
          </Reveal>
          <Stats items={NUMEROS_CURSO} />
        </Stack>
      </Section>

      <Section id="depoimentos" background="sunken">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number="04" eyebrow="Depoimentos" title="Quem já fez a formação" />
          </Reveal>
          <Grid minWidth={300}>
            {DEPOIMENTOS.map((d, i) => (
              <Reveal key={i} delay={i * 120}>
                <Testimonial {...d} />
              </Reveal>
            ))}
          </Grid>
        </Stack>
      </Section>

      {chamada && (
        <Section>
          <Reveal>
            <CTABand eyebrow="Próxima turma · Inscrições abertas" title={chamada.title} text={chamada.text} action={{ label: "Garantir minha vaga", href: chamada.href }} />
          </Reveal>
        </Section>
      )}
    </PublicTemplate>
  );
}
