import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button, Grid, JsonLd, Reveal, Stack } from "@/components/atoms";
import { Alert, BulletItem, ItemList, SectionHeading, Testimonial } from "@/components/molecules";
import { EventSummary, FAQ, Hero, InscricaoForm, ProfessorCard, Schedule } from "@/components/organisms";
import { MainAside, PublicTemplate, Section } from "@/components/templates";
import { obterSite } from "@/lib/configuracoes";
import { cursoLd, eventoLd } from "@/lib/dados-estruturados";
import { duracaoPorExtenso, formatPeriodo } from "@/lib/datas";
import { LOCALES, comPrefixo } from "@/lib/i18n/idiomas";
import { idiomaDe, prepararPagina } from "@/lib/i18n/pagina";
import { alternativas, localesDoOg } from "@/lib/i18n/seo";
import type { Tradutor } from "@/lib/i18n/tradutor";
import { professoresDaTurma } from "@/lib/professores";
import { openGraphDoSite, urlDoSite } from "@/lib/seo";
import { listarDepoimentos } from "@/lib/textos-curso";
import { listarSlugs, obterTurma, type Turma } from "@/lib/turmas";
import { localDaTurma, rotuloDaModalidade, rotuloDoStatus, sobretituloDaTurma, type ContextoDeIdioma } from "@/lib/turmas-view";
import { inscrever } from "./acoes";
import styles from "../../paginas.module.css";

/** Slug que nunca existe. Com cacheComponents o Next exige ao menos um parâmetro no build; num banco ainda vazio
    (produção antes da primeira turma) a lista de slugs é vazia, e este valor evita a falha. A página responde 404. */
const SLUG_DE_RESERVA = "__reserva__";

/** Uma página por idioma e por turma (as turmas criadas depois do build nascem na primeira visita). */
export async function generateStaticParams() {
  const slugs = await listarSlugs();
  return LOCALES.flatMap((locale) => (slugs.length ? slugs : [SLUG_DE_RESERVA]).map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/agenda/[slug]">): Promise<Metadata> {
  const { locale: bruto, slug } = await params;
  const locale = idiomaDe(bruto);
  const turma = await obterTurma(locale, slug);
  if (!turma) return {};
  const caminho = `/agenda/${turma.slug}`;
  return {
    title: turma.titulo,
    description: turma.resumo,
    alternates: alternativas(locale, caminho),
    openGraph: { ...openGraphDoSite({ title: turma.titulo, description: turma.resumo, url: comPrefixo(locale, caminho) }), ...localesDoOg(locale) },
  };
}

/* Os params ficam dentro de um <Suspense>: se o cache da página expirar por uma tag que não é da turma (ex.: o ADMIN salvou
   Configurações), o Next refaz o shell com params ainda desconhecidos, e ler `params` fora do Suspense derrubava a rota com 500. */
export default function TurmaPage({ params }: PageProps<"/[locale]/agenda/[slug]">) {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} aria-busy="true" />}>
      <Turma params={params} />
    </Suspense>
  );
}

async function Turma({ params }: Pick<PageProps<"/[locale]/agenda/[slug]">, "params">) {
  const { locale: bruto, slug } = await params;
  const { locale, tr } = await prepararPagina(bruto);
  const ctx: ContextoDeIdioma = { locale, tr };
  const turma = await obterTurma(locale, slug);
  // Antes de qualquer trecho da página ser enviado: a resposta sai com status 404 de verdade.
  if (!turma) notFound();

  const [site, professores, depoimentos] = await Promise.all([obterSite(locale), professoresDaTurma(locale, turma.id, turma.slug), listarDepoimentos(locale)]);
  const periodo = formatPeriodo(turma.inicio, turma.fim, locale);
  const dias = turma.programacao.length;
  const base = urlDoSite();

  return (
    <PublicTemplate withBar whatsAppMessage={tr("Turma.whatsappTurma", { titulo: turma.titulo, periodo })}>
      <JsonLd dados={cursoLd(turma, professores, base, locale)} />
      <JsonLd dados={eventoLd(turma, professores, base, locale)} />
      <Hero
        eyebrow={sobretituloDaTurma(turma, ctx)}
        title={turma.titulo}
        lead={turma.resumo}
        image={turma.fotoUrl}
        imageAlt={turma.fotoAlt}
        imageRatio="paisagem"
        transitionName={turma.slug}
      />

      <Section>
        <MainAside
          sticky
          main={
            <div className={styles.colunaTurma}>
              <section id="sobre-turma" className={styles.secao}>
                <Reveal>
                  <SectionHeading number="01" eyebrow={tr("Turma.sobreEyebrow")} title={tr("Turma.sobreTitulo")} />
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
                  <SectionHeading number="02" eyebrow={tr("Turma.publicoEyebrow")} title={tr("Turma.publicoTitulo")} />
                </Reveal>
                <ItemList variant="grid" minWidth={240}>
                  {turma.publicoAlvo.map((p) => (
                    <BulletItem key={p}>{p}</BulletItem>
                  ))}
                </ItemList>
                <Reveal delay={240}>
                  <Alert tone="info" title={tr("Turma.registroTitulo")}>
                    {tr("Turma.registroTexto")}
                  </Alert>
                </Reveal>
              </section>

              <section id="aprender" className={styles.secao}>
                <Reveal>
                  <SectionHeading number="03" eyebrow={tr("Turma.conteudoEyebrow")} title={tr("Turma.aprenderTitulo")} />
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
                  <SectionHeading number="04" eyebrow={duracaoPorExtenso(turma.inicio, turma.fim, tr)} title={tr("Turma.programacaoTitulo")} lead={tr("Turma.programacaoLead")} />
                </Reveal>
                {turma.programacao.map((dia) => (
                  <Schedule key={dia.titulo} title={dias > 1 ? dia.titulo : undefined} items={dia.itens} />
                ))}
              </section>

              {professores.length > 0 && (
                <section id="professores" className={styles.secao}>
                  <Reveal>
                    <SectionHeading number="05" eyebrow={tr("Turma.professoresEyebrow")} title={tr("Turma.professoresTitulo")} />
                  </Reveal>
                  <div className="ap-prof-lista">
                    {professores.map((p, i) => (
                      <Reveal key={p.id} delay={Math.min(i, 3) * 120}>
                        <ProfessorCard layout="horizontal" nome={p.nome} titulo={p.funcao} registro={p.registro} bio={p.bio} foto={p.fotoUrl} fotoAlt={p.fotoAlt ?? tr("Comum.fotoDe", { nome: p.nome })} />
                      </Reveal>
                    ))}
                  </div>
                  <div>
                    <Button variant="link" href="/sobre-o-curso#professores" arrow>
                      {tr("Turma.conhecaTodos")}
                    </Button>
                  </div>
                </section>
              )}

              <section id="duvidas" className={styles.secao}>
                <Reveal>
                  <SectionHeading number={professores.length > 0 ? "06" : "05"} eyebrow={tr("Turma.duvidasEyebrow")} title={tr("Turma.duvidasTitulo")} />
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
                modalityLabel={rotuloDaModalidade(turma, ctx)}
                seatsTotal={turma.vagas || undefined}
                seatsTaken={turma.ocupadas}
                price={turma.preco}
                installment={turma.parcelamento}
                status={turma.status}
                statusLabel={rotuloDoStatus(turma.status, ctx)}
                rotulos={rotulosDoResumo(tr)}
                action={turma.status === "encerrado" ? { label: tr("Turma.verAgendaCursos"), href: "/agenda" } : { label: tr("Turma.resumoQuero"), href: "#inscricao" }}
              />
              <Stack row justify="center">
                <Button variant="link" href={`https://wa.me/${site.whatsapp}`} arrow>
                  {tr("Turma.whatsappDuvidas")}
                </Button>
              </Stack>
            </>
          }
        />
      </Section>

      {depoimentos.length > 0 && (
        <Section theme="escuro">
          <Stack gap={7}>
            <Reveal>
              <SectionHeading eyebrow={tr("Turma.depoimentosEyebrow")} title={tr("Turma.depoimentosTitulo")} />
            </Reveal>
            <Grid minWidth={420}>
              {depoimentos.slice(0, 2).map((d, i) => (
                <Reveal key={d.id} delay={i * 120}>
                  <Testimonial quote={d.texto} name={d.nome} role={`${d.profissao} · ${d.cidade}`} />
                </Reveal>
              ))}
            </Grid>
          </Stack>
        </Section>
      )}

      <Section id="inscricao" background="sunken" narrow>
        <Inscricao turma={turma} periodo={periodo} ctx={ctx} />
      </Section>
    </PublicTemplate>
  );
}

/** Os textos do resumo e da barra do celular, de messages. */
function rotulosDoResumo(tr: Tradutor) {
  return {
    aria: tr("Turma.resumoAria"),
    vagas: tr("Turma.resumoVagas"),
    esgotado: tr("Turma.resumoEsgotado"),
    disponiveis: tr("Turma.resumoDisponiveis", { livres: "{livres}", total: "{total}" }),
    progresso: tr("Turma.resumoProgresso"),
    entrarListaDeEspera: tr("Turma.resumoEntrarListaDeEspera"),
    listaDeEspera: tr("Turma.barraListaDeEspera"),
    verAgenda: tr("Turma.barraVerAgenda"),
    inscrever: tr("Turma.barraInscrever"),
  };
}

/** Formulário, lista de espera ou aviso, conforme o status calculado da turma. */
function Inscricao({ turma, periodo, ctx }: { turma: Turma; periodo: string; ctx: ContextoDeIdioma }) {
  const { tr } = ctx;
  if (turma.status === "em-breve") {
    return (
      <div className={styles.aviso}>
        <SectionHeading number="07" eyebrow={periodo} title={tr("Turma.emBreveTitulo")} lead={tr("Turma.emBreveLead")} />
        <Button href="/contato" arrow>
          {tr("Agenda.queroSerAvisado")}
        </Button>
      </div>
    );
  }
  if (turma.status === "encerrado") {
    return (
      <div className={styles.aviso}>
        <SectionHeading number="07" eyebrow={tr("Turma.realizadaEyebrow")} title={tr("Turma.realizadaTitulo")} lead={tr("Turma.realizadaLead")} />
        <Button href="/agenda" arrow>
          {tr("Turma.verAgendaCursos")}
        </Button>
      </div>
    );
  }
  return <InscricaoForm acao={inscrever.bind(null, turma.slug)} esgotada={turma.status === "esgotado"} eyebrow={`${periodo} · ${localDaTurma(turma, ctx)}`} />;
}
