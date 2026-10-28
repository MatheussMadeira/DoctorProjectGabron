import type { Metadata } from "next";
import { JsonLd, Reveal, Stack } from "@/components/atoms";
import { SectionHeading } from "@/components/molecules";
import { CTABand, Gallery, Hero, ProfessorCard } from "@/components/organisms";
import { PublicTemplate, Section } from "@/components/templates";
import { obterSite } from "@/lib/configuracoes";
import { organizacaoLd } from "@/lib/dados-estruturados";
import { listarGaleria, listarProfessores } from "@/lib/professores";
import { leadDosProfessores } from "@/lib/professores-texto";
import { urlDoSite } from "@/lib/seo";
import { proximaComInscricoesAbertas } from "@/lib/turmas";
import { chamadaProxima } from "@/lib/turmas-view";
import styles from "../paginas.module.css";

export const metadata: Metadata = {
  title: "Sobre o curso",
  description: "Como é o ReabToxin: a proposta, os professores e as turmas de toxina botulínica para profissionais da saúde.",
  alternates: { canonical: "/sobre-o-curso" },
};

const PILARES = [
  { n: "01", titulo: "Base anatômica", texto: "Cada técnica parte da anatomia aplicada e do critério de indicação." },
  { n: "02", titulo: "Prática supervisionada", texto: "As aplicações são acompanhadas pelos professores, com orientação individual." },
  { n: "03", titulo: "Segurança antes de tudo", texto: "Critérios para indicar ou não o procedimento e conduta diante de intercorrências." },
  { n: "04", titulo: "Depois do curso", texto: "Como funciona o contato com os professores depois da turma: a confirmar." },
];

export default async function SobreOCursoPage() {
  const [proxima, site, professores, galeria] = await Promise.all([proximaComInscricoesAbertas(), obterSite(), listarProfessores(), listarGaleria()]);
  const chamada = proxima && chamadaProxima(proxima);

  return (
    <PublicTemplate>
      <JsonLd dados={organizacaoLd(site, urlDoSite())} />
      <Hero
        eyebrow="Sobre o curso"
        title="ReabToxin"
        lead="Formação em toxina botulínica construída sobre anatomia aplicada, critério de indicação e prática acompanhada de perto."
        primary={{ label: "Ver agenda de cursos", href: "/agenda" }}
        secondary={{ label: "Falar com a equipe", href: "/contato" }}
        image="/images/boneco-articulado.webp"
        imageAlt="Boneco articulado de madeira em pose de movimento"
      />

      <Section id="proposta">
        <div className={styles.proposta}>
          <Stack gap={6}>
            <Reveal>
              <SectionHeading number="01" eyebrow="A proposta" title="Por que ReabToxin" />
            </Reveal>
            <p className={`ap-body-l ${styles.corpo}`}>Primeiro parágrafo sobre o curso: de onde vem a proposta, a ligação com a reabilitação e o que o profissional leva para a rotina.</p>
            <p className={`ap-body-l ${styles.corpo}`}>Segundo parágrafo: o formato das turmas, como teoria e prática se combinam e o acompanhamento oferecido pelos professores.</p>
          </Stack>
          <ol className={styles.pilares}>
            {PILARES.map((p, i) => (
              <Reveal key={p.n} as="li" delay={i * 120}>
                <div className={styles.pilar}>
                  <span className={styles.pilarNumero}>{p.n}</span>
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
              <SectionHeading number="02" eyebrow="Professores" title="Quem ensina" lead={leadDosProfessores(professores.length)} />
            </Reveal>
            <div className="ap-prof-grade ap-prof-grade-larga">
              {professores.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 3) * 120}>
                  <ProfessorCard nome={p.nome} titulo={p.funcao} registro={p.registro} bio={p.bio} foto={p.fotoUrl} fotoAlt={p.fotoAlt} />
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
              <SectionHeading number="03" eyebrow="Galeria" title="Nas turmas" lead="Momentos das aulas teóricas e práticas." />
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
            <SectionHeading number="04" eyebrow="O que guia o curso" title="Equilíbrio, cuidado, paciência" lead="Ouvir com atenção, decidir com critério e acompanhar cada etapa, em sala e na prática." />
          </div>
        </Reveal>
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
