import type { Metadata } from "next";
import { Button, Logo, Reveal, Stack } from "@/components/atoms";
import { SectionHeading } from "@/components/molecules";
import { AgendaList } from "@/components/organisms";
import { PublicTemplate, Section } from "@/components/templates";
import { listarTurmas } from "@/lib/turmas";
import { agendaEvent } from "@/lib/turmas-view";
import styles from "../paginas.module.css";

export const metadata: Metadata = {
  title: "Agenda de cursos",
  description: "Turmas de toxina botulínica para médicos, dentistas, biomédicos e outros profissionais da saúde. Veja datas, local e programação.",
};

export default async function AgendaPage() {
  const turmas = await listarTurmas();
  const semDatas = turmas.length === 0;

  return (
    <PublicTemplate>
      <Section id="agenda">
        <div className={styles.agenda}>
          <Stack gap={7}>
            <Reveal>
              <SectionHeading
                as="h1"
                eyebrow="Toxina botulínica"
                title="Agenda de cursos"
                lead="Turmas para médicos, dentistas, biomédicos e outros profissionais da saúde. Escolha uma data para ver a programação e fazer sua inscrição."
              />
            </Reveal>

            <Reveal delay={120}>
              {semDatas ? (
                <div className={styles.vazia}>
                  <Logo variant="simbolo" width={48} />
                  <AgendaList events={[]} emptyText="Nenhuma turma com data aberta no momento. Novas turmas aparecem aqui assim que forem cadastradas." />
                  <Stack row wrap gap={3}>
                    <Button href="/contato" arrow>
                      Quero ser avisado
                    </Button>
                    <Button variant="secondary" href="/">
                      Voltar ao início
                    </Button>
                  </Stack>
                </div>
              ) : (
                <AgendaList events={turmas.map(agendaEvent)} filterBy="modality" allLabel="Todas" />
              )}
            </Reveal>

            {!semDatas && (
              <div className={styles.agendaFim}>
                <div>
                  <h2 className={styles.titulo}>Não encontrou uma data?</h2>
                  <p className={styles.muted}>Fale com a equipe para saber das próximas turmas ou organizar uma turma para o seu grupo.</p>
                </div>
                <Button variant="secondary" href="/contato" arrow>
                  Entrar em contato
                </Button>
              </div>
            )}
          </Stack>
        </div>
      </Section>
    </PublicTemplate>
  );
}
