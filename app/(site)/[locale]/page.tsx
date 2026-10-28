import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button, Grid, JsonLd, Photo, Reveal, Stack } from "@/components/atoms";
import { ItemList, SectionHeading, StepItem, Stats, Testimonial } from "@/components/molecules";
import { CTABand, EventCard, Hero, ProfessorCard } from "@/components/organisms";
import { PublicTemplate, Section, SplitLayout } from "@/components/templates";
import { obterSite } from "@/lib/configuracoes";
import { organizacaoLd } from "@/lib/dados-estruturados";
import { alternativas } from "@/lib/i18n/seo";
import { idiomaDe, prepararPagina } from "@/lib/i18n/pagina";
import { listarProfessores } from "@/lib/professores";
import { urlDoSite } from "@/lib/seo";
import { listarDepoimentos, obterTextosCurso } from "@/lib/textos-curso";
import { listarProximas, proximaComInscricoesAbertas } from "@/lib/turmas";
import { cardProps, chamadaProxima } from "@/lib/turmas-view";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = idiomaDe((await params).locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: { absolute: t("titulo") }, description: t("descricao"), alternates: alternativas(locale, "/") };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  const ctx = { locale, tr };
  const [destaques, proxima, site, professores, curso, depoimentos] = await Promise.all([
    listarProximas(locale, 3),
    proximaComInscricoesAbertas(locale),
    obterSite(locale),
    listarProfessores(locale),
    obterTextosCurso(locale),
    listarDepoimentos(locale),
  ]);
  const chamada = proxima && chamadaProxima(proxima, ctx);

  return (
    <PublicTemplate>
      <JsonLd dados={organizacaoLd(site, urlDoSite(), locale, tr("Metadata.descricao"))} />
      <Hero
        eyebrow={curso.topo.sobretitulo}
        title={curso.topo.titulo}
        lead={curso.topo.frase}
        primary={{ label: tr("Comum.verAgenda"), href: "/agenda" }}
        secondary={{ label: tr("Comum.conhecaCurso"), href: "/sobre-o-curso" }}
        image={curso.topo.fotoUrl}
        imageAlt={curso.topo.fotoAlt}
      />

      <Section id="curso">
        <SplitLayout>
          <Stack gap={7}>
            <Reveal>
              <SectionHeading number="01" eyebrow={tr("Home.cursoEyebrow")} title={tr("Home.cursoTitulo")} lead={curso.proposta.paragrafos[0]} />
            </Reveal>
            <ItemList ordered step={120}>
              {curso.pilares.itens.slice(0, 3).map((p, i) => (
                <StepItem key={p.titulo} marker={String(i + 1).padStart(2, "0")} title={p.titulo}>
                  {p.texto}
                </StepItem>
              ))}
            </ItemList>
            <div>
              <Button variant="secondary" href="/sobre-o-curso" arrow>
                {tr("Comum.conhecaCurso")}
              </Button>
            </div>
          </Stack>
          <Reveal delay={120}>
            <Photo src="/images/anatomia-quadril.webp" alt={tr("Home.fotoCursoAlt")} />
          </Reveal>
        </SplitLayout>
      </Section>

      <Section id="turmas" background="sunken">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number="02" eyebrow={tr("Home.turmasEyebrow")} title={tr("Home.turmasTitulo")} lead={tr("Home.turmasLead")} />
          </Reveal>
          <Grid minWidth={320}>
            {destaques.map((t, i) => (
              <Reveal key={t.slug} delay={i * 120}>
                <EventCard {...cardProps(t, ctx)} />
              </Reveal>
            ))}
          </Grid>
          <Stack row justify="end">
            <Button variant="link" href="/agenda" arrow>
              {tr("Home.verAgendaCompleta")}
            </Button>
          </Stack>
        </Stack>
      </Section>

      {professores.length > 0 && (
        <Section id="professores">
          <Stack gap={7}>
            <Reveal>
              <SectionHeading number="03" eyebrow={tr("Home.professoresEyebrow")} title={tr("Home.professoresTitulo")} lead={tr("Comum.leadProfessores", { n: professores.length })} />
            </Reveal>
            <div className="ap-prof-grade">
              {professores.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 3) * 120}>
                  <ProfessorCard nome={p.nome} titulo={p.funcao} registro={p.registro} foto={p.fotoUrl} fotoAlt={p.fotoAlt ?? tr("Comum.fotoDe", { nome: p.nome })} />
                </Reveal>
              ))}
            </div>
            <Stack row justify="end">
              <Button variant="link" href="/sobre-o-curso#professores" arrow>
                {tr("Home.conhecaProfessores")}
              </Button>
            </Stack>
          </Stack>
        </Section>
      )}

      <Section theme="escuro">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading align="center" eyebrow={tr("Home.numerosEyebrow")} title={tr("Home.numerosTitulo")} />
          </Reveal>
          <Stats items={curso.numeros.itens.map((n) => ({ value: n.valor, label: n.rotulo }))} />
        </Stack>
      </Section>

      {depoimentos.length > 0 && (
        <Section id="depoimentos" background="sunken">
          <Stack gap={7}>
            <Reveal>
              <SectionHeading number="04" eyebrow={tr("Home.depoimentosEyebrow")} title={tr("Home.depoimentosTitulo")} />
            </Reveal>
            <Grid minWidth={300}>
              {depoimentos.map((d, i) => (
                <Reveal key={d.id} delay={i * 120}>
                  <Testimonial quote={d.texto} name={d.nome} role={`${d.profissao} · ${d.cidade}`} />
                </Reveal>
              ))}
            </Grid>
          </Stack>
        </Section>
      )}

      {chamada && (
        <Section>
          <Reveal>
            <CTABand eyebrow={tr("Comum.proximaTurma")} title={chamada.title} text={chamada.text} action={{ label: tr("Comum.garantirVaga"), href: chamada.href }} />
          </Reveal>
        </Section>
      )}
    </PublicTemplate>
  );
}
