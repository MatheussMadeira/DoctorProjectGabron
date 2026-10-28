import type { Metadata } from "next";
import { Button, Logo, Reveal, Stack } from "@/components/atoms";
import { SectionHeading } from "@/components/molecules";
import { AgendaList } from "@/components/organisms";
import { PublicTemplate, Section } from "@/components/templates";
import { metadataDaPagina, prepararPagina } from "@/lib/i18n/pagina";
import { listarTurmas } from "@/lib/turmas";
import { agendaEvent } from "@/lib/turmas-view";
import styles from "../paginas.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/agenda">): Promise<Metadata> {
  return metadataDaPagina((await params).locale, "Agenda", "/agenda");
}

export default async function AgendaPage({ params }: PageProps<"/[locale]/agenda">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  const turmas = await listarTurmas(locale);
  const semDatas = turmas.length === 0;

  return (
    <PublicTemplate>
      <Section id="agenda">
        <div className={styles.agenda}>
          <Stack gap={7}>
            <Reveal>
              <SectionHeading as="h1" eyebrow={tr("Agenda.eyebrow")} title={tr("Agenda.titulo")} lead={tr("Agenda.lead")} />
            </Reveal>

            <Reveal delay={120}>
              {semDatas ? (
                <div className={styles.vazia}>
                  <Logo variant="simbolo" width={48} />
                  <AgendaList events={[]} emptyText={tr("Agenda.vazio")} />
                  <Stack row wrap gap={3}>
                    <Button href="/contato" arrow>
                      {tr("Agenda.queroSerAvisado")}
                    </Button>
                    <Button variant="secondary" href="/">
                      {tr("Comum.voltarInicio")}
                    </Button>
                  </Stack>
                </div>
              ) : (
                <AgendaList events={turmas.map((t) => agendaEvent(t, { locale, tr }))} filterBy="modality" allLabel={tr("Agenda.todas")} emptyText={tr("Agenda.vazioFiltro")} noDateLabel={tr("Datas.semData")} filterLabel={tr("Agenda.filtrar")} />
              )}
            </Reveal>

            {!semDatas && (
              <div className={styles.agendaFim}>
                <div>
                  <h2 className={styles.titulo}>{tr("Agenda.fimTitulo")}</h2>
                  <p className={styles.muted}>{tr("Agenda.fimTexto")}</p>
                </div>
                <Button variant="secondary" href="/contato" arrow>
                  {tr("Agenda.entrarContato")}
                </Button>
              </div>
            )}
          </Stack>
        </div>
      </Section>
    </PublicTemplate>
  );
}
