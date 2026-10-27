import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button, Grid, Reveal, Stack } from "@/components/atoms";
import { Alert, BulletItem, ItemList, SectionHeading, Testimonial } from "@/components/molecules";
import { AboutDoctor, EventSummary, FAQ, Hero, InscricaoForm, Schedule } from "@/components/organisms";
import { MainAside, PublicTemplate, Section } from "@/components/templates";
import { CONSELHOS, CREDENCIAIS, DEPOIMENTOS, PROFISSOES, REGISTRO } from "@/lib/dados-exemplo";
import { duracaoPorExtenso, formatPeriodo } from "@/lib/datas";
import { SITE } from "@/lib/site";
import { listarSlugs, obterTurma, type Turma } from "@/lib/turmas";
import { cidadeSemUF } from "@/lib/turmas-view";
import { inscrever } from "./acoes";
import styles from "../../paginas.module.css";

/** Slug que nunca existe. Com cacheComponents o Next exige ao menos um parâmetro no build; num banco ainda vazio
    (produção antes da primeira turma) a lista de slugs é vazia, e este valor evita a falha. A página responde 404. */
const SLUG_DE_RESERVA = "__reserva__";

export async function generateStaticParams() {
  const slugs = await listarSlugs();
  return (slugs.length ? slugs : [SLUG_DE_RESERVA]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/agenda/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const turma = await obterTurma(slug);
  if (!turma) return {};
  return { title: turma.titulo, description: turma.resumo };
}

export default async function TurmaPage({ params }: PageProps<"/agenda/[slug]">) {
  const { slug } = await params;
  const turma = await obterTurma(slug);
  // Antes de qualquer trecho da página ser enviado: a resposta sai com status 404 de verdade.
  if (!turma) notFound();

  const periodo = formatPeriodo(turma.inicio, turma.fim);
  const dias = turma.programacao.length;

  return (
    <PublicTemplate withBar whatsAppMessage={`Olá! Tenho uma dúvida sobre a turma ${turma.titulo} de ${periodo}.`}>
      <Hero
        eyebrow={`${turma.modalidade} · ${cidadeSemUF(turma.cidade)}`}
        title={turma.titulo}
        lead={turma.resumo}
        image={turma.fotoUrl}
        imageAlt={turma.fotoAlt}
        transitionName={turma.slug}
      />

      <Section>
        <MainAside
          sticky
          main={
            <div className={styles.colunaTurma}>
              <section id="sobre-turma" className={styles.secao}>
                <Reveal>
                  <SectionHeading number="01" eyebrow="A turma" title="Sobre a turma" />
                </Reveal>
                <Reveal delay={120}>
                  <Stack gap={4}>
                    {turma.descricao.map((p, i) => (
                      <p key={i} className={`ap-body-l ${styles.corpo}`}>
                        {p}
                      </p>
                    ))}
                  </Stack>
                </Reveal>
              </section>

              <section id="para-quem" className={styles.secao}>
                <Reveal>
                  <SectionHeading number="02" eyebrow="Público" title="Para quem é" />
                </Reveal>
                <ItemList variant="grid" minWidth={240}>
                  {turma.publicoAlvo.map((p) => (
                    <BulletItem key={p}>{p}</BulletItem>
                  ))}
                </ItemList>
                <Reveal delay={240}>
                  <Alert tone="info" title="Registro ativo no conselho">
                    Para participar é preciso ter registro ativo no conselho da sua profissão. O número é pedido na inscrição e conferido antes da confirmação da vaga.
                  </Alert>
                </Reveal>
              </section>

              <section id="aprender" className={styles.secao}>
                <Reveal>
                  <SectionHeading number="03" eyebrow="Conteúdo" title="O que você vai aprender" />
                </Reveal>
                <ItemList step={70}>
                  {turma.aprendizados.map((a) => (
                    <BulletItem key={a} variant="check">
                      {a}
                    </BulletItem>
                  ))}
                </ItemList>
              </section>

              <section id="programacao" className={styles.secao}>
                <Reveal>
                  <SectionHeading
                    number="04"
                    eyebrow={duracaoPorExtenso(turma.inicio, turma.fim)}
                    title="Programação"
                    lead="Programação de exemplo, a confirmar com a Dra."
                  />
                </Reveal>
                {turma.programacao.map((dia) => (
                  <Schedule key={dia.titulo} title={dias > 1 ? dia.titulo : undefined} items={dia.itens} />
                ))}
              </section>

              <section id="quem-conduz" className={styles.secao}>
                <Reveal>
                  <SectionHeading number="05" eyebrow="Professora" title="Quem conduz" />
                </Reveal>
                <Reveal delay={120}>
                  <AboutDoctor
                    photo="/images/retrato-dra-ana-paula.webp"
                    registry={REGISTRO}
                    bio="Texto curto sobre a Dra. Ana Paula Fonseca: formação em fisiatria e experiência com toxina botulínica e com o ensino."
                    credentials={CREDENCIAIS}
                    action={{ label: "Conheça a Dra.", href: "/sobre" }}
                  />
                </Reveal>
              </section>

              <section id="duvidas" className={styles.secao}>
                <Reveal>
                  <SectionHeading number="06" eyebrow="Dúvidas" title="Perguntas frequentes" />
                </Reveal>
                <Reveal delay={120}>
                  <FAQ items={turma.faq} />
                </Reveal>
              </section>
            </div>
          }
          aside={
            <>
              <EventSummary
                start={turma.inicio}
                end={turma.fim}
                time={turma.horario}
                venue={turma.local}
                city={turma.cidade}
                modality={turma.modalidade}
                seatsTotal={turma.vagas || undefined}
                seatsTaken={turma.ocupadas}
                price={turma.preco}
                installment={turma.parcelamento}
                status={turma.status}
                action={
                  turma.status === "encerrado"
                    ? { label: "Ver agenda de cursos", href: "/agenda" }
                    : { label: "Quero me inscrever", href: "#inscricao" }
                }
              />
              <Stack row justify="center">
                <Button variant="link" href={`https://wa.me/${SITE.whatsapp}`} arrow>
                  Tirar dúvidas no WhatsApp
                </Button>
              </Stack>
            </>
          }
        />
      </Section>

      <Section theme="escuro">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading eyebrow="Depoimentos" title="Quem já fez a formação" />
          </Reveal>
          <Grid minWidth={420}>
            {DEPOIMENTOS.slice(0, 2).map((d, i) => (
              <Reveal key={i} delay={i * 120}>
                <Testimonial {...d} />
              </Reveal>
            ))}
          </Grid>
        </Stack>
      </Section>

      <Section id="inscricao" background="sunken" narrow>
        <Inscricao turma={turma} periodo={periodo} />
      </Section>
    </PublicTemplate>
  );
}

/** Formulário, lista de espera ou aviso, conforme o status calculado da turma. */
function Inscricao({ turma, periodo }: { turma: Turma; periodo: string }) {
  if (turma.status === "em-breve") {
    return (
      <div className={styles.aviso}>
        <SectionHeading number="07" eyebrow={periodo} title="Inscrições abrem em breve" lead="Esta turma ainda não abriu vagas. Fale com a equipe para ser avisado quando abrir." />
        <Button href="/contato" arrow>
          Quero ser avisado
        </Button>
      </div>
    );
  }
  if (turma.status === "encerrado") {
    return (
      <div className={styles.aviso}>
        <SectionHeading number="07" eyebrow="Turma realizada" title="Esta turma já aconteceu" lead="Veja as próximas datas na agenda de cursos." />
        <Button href="/agenda" arrow>
          Ver agenda de cursos
        </Button>
      </div>
    );
  }
  return (
    <InscricaoForm
      acao={inscrever.bind(null, turma.slug)}
      esgotada={turma.status === "esgotado"}
      eyebrow={`${periodo} · ${cidadeSemUF(turma.cidade)}`}
      profissoes={PROFISSOES}
      conselhos={CONSELHOS}
    />
  );
}
