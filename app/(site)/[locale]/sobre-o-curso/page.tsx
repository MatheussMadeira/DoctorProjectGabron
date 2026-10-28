import type { Metadata } from "next";
import { JsonLd, Reveal, Stack } from "@/components/atoms";
import { SectionHeading } from "@/components/molecules";
import { CTABand, Gallery, Hero, ProfessorCard } from "@/components/organisms";
import { PublicTemplate, Section } from "@/components/templates";
import { obterSite } from "@/lib/configuracoes";
import { organizacaoLd } from "@/lib/dados-estruturados";
import { metadataDaPagina, prepararPagina } from "@/lib/i18n/pagina";
import { listarGaleria, listarProfessores } from "@/lib/professores";
import { urlDoSite } from "@/lib/seo";
import { obterTextosCurso } from "@/lib/textos-curso";
import { proximaComInscricoesAbertas } from "@/lib/turmas";
import { chamadaProxima } from "@/lib/turmas-view";
import styles from "../paginas.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/sobre-o-curso">): Promise<Metadata> {
  return metadataDaPagina((await params).locale, "Sobre", "/sobre-o-curso");
}

export default async function SobreOCursoPage({ params }: PageProps<"/[locale]/sobre-o-curso">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  const [proxima, site, professores, galeria, curso] = await Promise.all([
    proximaComInscricoesAbertas(locale),
    obterSite(locale),
    listarProfessores(locale),
    listarGaleria(locale),
    obterTextosCurso(locale),
  ]);
  const chamada = proxima && chamadaProxima(proxima, { locale, tr });

  return (
    <PublicTemplate>
      <JsonLd dados={organizacaoLd(site, urlDoSite(), locale, tr("Metadata.descricao"))} />
      <Hero
        eyebrow={tr("Sobre.heroEyebrow")}
        title={curso.topo.titulo}
        lead={tr("Sobre.heroLead")}
        primary={{ label: tr("Comum.verAgenda"), href: "/agenda" }}
        secondary={{ label: tr("Sobre.falarEquipe"), href: "/contato" }}
        image="/images/boneco-articulado.webp"
        imageAlt={tr("Sobre.heroImagemAlt")}
      />

      <Section id="proposta">
        <div className={styles.proposta}>
          <Stack gap={6}>
            <Reveal>
              <SectionHeading number="01" eyebrow={tr("Sobre.propostaEyebrow")} title={tr("Sobre.propostaTitulo")} />
            </Reveal>
            {curso.proposta.paragrafos.map((p) => (
              <p key={p} className={`ap-body-l ${styles.corpo}`}>
                {p}
              </p>
            ))}
          </Stack>
          <ol className={styles.pilares}>
            {curso.pilares.itens.map((p, i) => (
              <Reveal key={p.titulo} as="li" delay={i * 120}>
                <div className={styles.pilar}>
                  <span className={styles.pilarNumero}>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className={styles.pilarTitulo}>{p.titulo}</h3>
                    <p className={styles.pilarTexto}>{p.texto}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      {professores.length > 0 && (
        <Section id="professores" background="sunken">
          <Stack gap={7}>
            <Reveal>
              <SectionHeading number="02" eyebrow={tr("Sobre.professoresEyebrow")} title={tr("Sobre.professoresTitulo")} lead={tr("Comum.leadProfessores", { n: professores.length })} />
            </Reveal>
            <div className="ap-prof-grade ap-prof-grade-larga">
              {professores.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 3) * 120}>
                  <ProfessorCard nome={p.nome} titulo={p.funcao} registro={p.registro} bio={p.bio} foto={p.fotoUrl} fotoAlt={p.fotoAlt ?? tr("Comum.fotoDe", { nome: p.nome })} />
                </Reveal>
              ))}
            </div>
          </Stack>
        </Section>
      )}

      {galeria.length > 0 && (
        <Section id="galeria">
          <Stack gap={7}>
            <Reveal>
              <SectionHeading number="03" eyebrow={tr("Sobre.galeriaEyebrow")} title={tr("Sobre.galeriaTitulo")} lead={tr("Sobre.galeriaLead")} />
            </Reveal>
            <Reveal delay={120}>
              <Gallery images={galeria} />
            </Reveal>
          </Stack>
        </Section>
      )}

      <Section theme="escuro" pedras>
        <Reveal>
          <div className={styles.leitura}>
            <SectionHeading number="04" eyebrow={tr("Sobre.valoresEyebrow")} title={curso.valores.titulo} lead={curso.valores.frase} />
          </div>
        </Reveal>
      </Section>

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
