import type { Metadata } from "next";
import { Activity, ClipboardList, Users } from "lucide-react";
import { Button, Grid, Photo, Reveal, Stack } from "@/components/atoms";
import { FeatureItem, ItemList, SectionHeading, Stats, Testimonial } from "@/components/molecules";
import { AboutDoctor, CTABand, EventCard, Hero } from "@/components/organisms";
import { PublicTemplate, Section, SplitLayout } from "@/components/templates";
import { CREDENCIAIS, DEPOIMENTOS, NUMEROS_TRAJETORIA, REGISTRO } from "@/lib/dados-exemplo";
import { SITE } from "@/lib/site";
import { listarProximas, proximaComInscricoesAbertas } from "@/lib/turmas";
import { cardProps, chamadaProxima } from "@/lib/turmas-view";
import styles from "./paginas.module.css";

export const metadata: Metadata = {
  title: { absolute: "Dra. Ana Paula Fonseca — Médica Fisiatra em Belo Horizonte" },
  description: "Medicina física e reabilitação em Belo Horizonte e turmas de toxina botulínica para profissionais da saúde.",
};

export default async function Home() {
  const [destaques, proxima] = await Promise.all([listarProximas(3), proximaComInscricoesAbertas()]);
  const chamada = proxima && chamadaProxima(proxima);

  return (
    <PublicTemplate>
      <Hero
        eyebrow="Médica Fisiatra"
        title="Movimento com equilíbrio"
        lead="Medicina física e reabilitação em Belo Horizonte, e turmas de toxina botulínica para médicos, dentistas, biomédicos e outros profissionais da saúde."
        primary={{ label: "Ver agenda de cursos", href: "/agenda" }}
        secondary={{ label: "Conheça a Dra.", href: "#sobre" }}
        image="/images/retrato-dra-ana-paula.webp"
        imageAlt="Retrato da Dra. Ana Paula Fonseca"
      />

      <Section id="clinica">
        <SplitLayout>
          <Stack gap={7}>
            <Reveal>
              <SectionHeading
                number="01"
                eyebrow="A clínica"
                title="Fisiatria"
                lead="A fisiatria é a especialidade médica que cuida da função e do movimento: dor, limitações e reabilitação, com tratamento conservador e um plano feito para cada pessoa."
              />
            </Reveal>
            <ItemList>
              <FeatureItem icon={<ClipboardList size={24} strokeWidth={1.5} aria-hidden />} title="Avaliação completa">
                Consulta sem pressa, com exame físico e revisão dos exames que você já tem, para entender a dor e o que ela limita no seu dia.
              </FeatureItem>
              <FeatureItem icon={<Activity size={24} strokeWidth={1.5} aria-hidden />} title="Plano individual">
                Tratamento conservador que pode combinar medicação, procedimentos e orientação de exercícios, conforme a indicação de cada caso.
              </FeatureItem>
              <FeatureItem icon={<Users size={24} strokeWidth={1.5} aria-hidden />} title="Acompanhamento próximo">
                Retornos para ajustar o plano e conversa com fisioterapeutas e outros profissionais que cuidam de você.
              </FeatureItem>
            </ItemList>
            <Stack row wrap align="center" gap={5} rowGap={4}>
              <Button variant="secondary" href="/contato" arrow>
                Agendar consulta
              </Button>
              <span className={styles.nota}>{SITE.enderecoCurto}</span>
            </Stack>
          </Stack>
          <Reveal delay={120}>
            <Photo src="/images/boneco-articulado.webp" alt="Boneco articulado de madeira em pose de movimento" />
          </Reveal>
        </SplitLayout>
      </Section>

      <Section id="turmas" background="sunken">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading
              number="02"
              eyebrow="Agenda de cursos"
              title="Próximas turmas"
              lead="Formação em toxina botulínica para profissionais da saúde. Veja datas, local e programação, e faça sua inscrição."
            />
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

      <Section id="sobre">
        <Reveal>
          <AboutDoctor
            photo="/images/retrato-dra-ana-paula.webp"
            registry={REGISTRO}
            bio="Texto de apresentação da Dra. Ana Paula Fonseca: formação, trajetória em fisiatria e como chegou ao ensino da toxina botulínica."
            credentials={CREDENCIAIS}
            action={{ label: "Conheça a Dra.", href: "/sobre" }}
          />
        </Reveal>
      </Section>

      <Section theme="escuro">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading align="center" eyebrow="Trajetória" title="Em números" />
          </Reveal>
          <Stats items={NUMEROS_TRAJETORIA} />
        </Stack>
      </Section>

      <Section id="depoimentos" background="sunken">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number="03" eyebrow="Depoimentos" title="Quem já fez a formação" />
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
