import type { Metadata } from "next";
import { Clock, CreditCard, MapPin } from "lucide-react";
import { Button, Grid, Photo, Reveal, Stack } from "@/components/atoms";
import { BulletItem, InfoCard, ItemList, SectionHeading, StepItem } from "@/components/molecules";
import { FAQ, Hero } from "@/components/organisms";
import { PublicTemplate, Section, SplitLayout } from "@/components/templates";
import { FAQ_CLINICA } from "@/lib/dados-exemplo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Clínica",
  description: "Fisiatria em Belo Horizonte: avaliação e tratamento da dor e das limitações de movimento, com um plano feito para cada pessoa.",
};

const QUANDO_PROCURAR = [
  "Dor na coluna, lombar ou cervical",
  "Dores articulares e musculares",
  "Dor crônica",
  "Reabilitação após lesões e cirurgias",
  "Espasticidade e sequelas neurológicas",
  "Limitações do movimento no dia a dia",
];

export default function ClinicaPage() {
  return (
    <PublicTemplate whatsAppMessage="Olá! Gostaria de agendar uma consulta.">
      <Hero
        eyebrow="Clínica"
        title="Fisiatria em Belo Horizonte"
        lead="Avaliação e tratamento da dor e das limitações de movimento, com um plano feito para cada pessoa."
        primary={{ label: "Agendar consulta", href: "/contato" }}
        secondary={{ label: "Conheça a Dra.", href: "/sobre" }}
        image="/images/pedras-empilhadas.webp"
        imageAlt="Pedras empilhadas em equilíbrio"
      />

      <Section id="fisiatria">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading
              number="01"
              eyebrow="O que é fisiatria"
              title="Medicina do movimento"
              lead="A fisiatria, ou Medicina Física e Reabilitação, é a especialidade médica que diagnostica e trata o que afeta a função: dor, perda de movimento e limitações no dia a dia, com foco em tratamento conservador."
            />
          </Reveal>
          <Stack gap={4}>
            <p className="ap-eyebrow">Quando procurar</p>
            <ItemList variant="grid" minWidth={340} step={120}>
              {QUANDO_PROCURAR.map((item) => (
                <BulletItem key={item}>{item}</BulletItem>
              ))}
            </ItemList>
          </Stack>
        </Stack>
      </Section>

      <Section id="atendimento" background="sunken">
        <SplitLayout>
          <Stack gap={6}>
            <Reveal>
              <SectionHeading number="02" eyebrow="Atendimento" title="Como funciona" />
            </Reveal>
            <ItemList ordered>
              <StepItem size="lg" marker="01" title="Primeira consulta">
                Conversa sobre a sua história, exame físico e revisão dos exames que você já tem.
              </StepItem>
              <StepItem size="lg" marker="02" title="Plano de tratamento">
                Um plano conservador, explicado com calma, que pode reunir medicação, procedimentos e exercícios.
              </StepItem>
              <StepItem size="lg" marker="03" title="Acompanhamento">
                Retornos para avaliar como você está e ajustar o plano, em contato com a sua equipe de cuidado.
              </StepItem>
            </ItemList>
          </Stack>
          <Reveal delay={120}>
            <Photo src="/images/anatomia-quadril.webp" alt="Modelo anatômico do quadril" />
          </Reveal>
        </SplitLayout>
      </Section>

      <Section id="informacoes" theme="escuro">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number="03" eyebrow="Informações" title="Onde e quando" />
          </Reveal>
          <Grid minWidth={300}>
            <Reveal>
              <InfoCard icon={<MapPin size={24} strokeWidth={1.5} aria-hidden />} title="Endereço">
                {SITE.enderecoLinhas[0]}
                <br />
                {SITE.enderecoLinhas[1]}
              </InfoCard>
            </Reveal>
            <Reveal delay={120}>
              <InfoCard icon={<Clock size={24} strokeWidth={1.5} aria-hidden />} title="Horário">
                {SITE.horario}
                <br />
                Consultas com hora marcada
              </InfoCard>
            </Reveal>
            <Reveal delay={240}>
              <InfoCard icon={<CreditCard size={24} strokeWidth={1.5} aria-hidden />} title="Atendimento">
                Particular · Convênios a confirmar
                <br />
                Valor da consulta: R$ 000
              </InfoCard>
            </Reveal>
          </Grid>
          <div>
            <Button href="/contato" size="lg" arrow>
              Agendar consulta
            </Button>
          </div>
        </Stack>
      </Section>

      <Section id="duvidas" narrow>
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number="04" eyebrow="Dúvidas" title="Perguntas frequentes" />
          </Reveal>
          <Reveal delay={120}>
            <FAQ items={FAQ_CLINICA} />
          </Reveal>
        </Stack>
      </Section>
    </PublicTemplate>
  );
}
