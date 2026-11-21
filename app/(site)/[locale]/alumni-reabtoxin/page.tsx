import type { Metadata } from "next";
import { Button, Reveal, Stack } from "@/components/atoms";
import { SectionHeading, Stats } from "@/components/molecules";
import { DepoimentoAlumniCard, Hero, ListaAlumniPorLocal, MapaAlumni, TurmaAlumniCard } from "@/components/organisms";
import { PublicTemplate, Section } from "@/components/templates";
import { listarPinsAlumni, listarTurmasAlumni } from "@/lib/alumni";
import { metadataDaPagina, prepararPagina } from "@/lib/i18n/pagina";
import { listarDepoimentos } from "@/lib/textos-curso";
import styles from "@/components/organisms/alumni.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/alumni-reabtoxin">): Promise<Metadata> {
  return metadataDaPagina((await params).locale, "Alumni", "/alumni-reabtoxin");
}

export default async function AlumniPage({ params }: PageProps<"/[locale]/alumni-reabtoxin">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  const [pins, turmas, depoimentos] = await Promise.all([listarPinsAlumni(locale), listarTurmasAlumni(locale), listarDepoimentos(locale)]);

  const estados = new Set(pins.filter((p) => p.pais === "BR" && p.uf).map((p) => p.uf)).size;
  const paises = new Set(pins.map((p) => p.pais)).size;
  const pessoas = pins.length;

  return (
    <PublicTemplate>
      <Hero eyebrow={tr("Alumni.heroEyebrow")} title={tr("Alumni.heroTitulo")} lead={tr("Alumni.heroLead")} primary={{ label: tr("Alumni.enviarDepoimento"), href: "/depoimento" }} />

      <Section id="mapa">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number="01" eyebrow={tr("Alumni.mapaEyebrow")} title={tr("Alumni.mapaSecaoTitulo")} lead={tr("Alumni.mapaLead")} />
          </Reveal>
          {pins.length > 0 ? (
            <>
              <Stats
                items={[
                  { value: String(pessoas), label: tr("Alumni.statsAlunos") },
                  { value: String(estados), label: tr("Alumni.statsEstados") },
                  { value: String(paises), label: tr("Alumni.statsPaises") },
                  { value: String(turmas.length), label: tr("Alumni.statsTurmas") },
                ]}
              />
              <Reveal>
                <MapaAlumni pins={pins} />
              </Reveal>
              <details>
                <summary className={styles.sumario}>{tr("Alumni.listaTitulo")}</summary>
                <ListaAlumniPorLocal pins={pins} locale={locale} tr={tr} />
              </details>
            </>
          ) : (
            <p>{tr("Alumni.vazioMapa")}</p>
          )}
        </Stack>
      </Section>

      <Section id="turmas" background="sunken">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number="02" eyebrow={tr("Alumni.turmasEyebrow")} title={tr("Alumni.turmasTitulo")} lead={tr("Alumni.turmasLead")} />
          </Reveal>
          {turmas.length > 0 ? (
            <div className={styles.turmas}>
              {turmas.map((t, i) => (
                <Reveal key={t.id} delay={Math.min(i, 3) * 120}>
                  <TurmaAlumniCard turma={t} locale={locale} tr={tr} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p>{tr("Alumni.vazioTurmas")}</p>
          )}
        </Stack>
      </Section>

      <Section id="depoimentos">
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number="03" eyebrow={tr("Alumni.depoimentosEyebrow")} title={tr("Alumni.depoimentosTitulo")} lead={tr("Alumni.depoimentosLead")} />
          </Reveal>
          {depoimentos.length > 0 ? (
            <div className={styles.depoimentos}>
              {depoimentos.map((d) => (
                <DepoimentoAlumniCard key={d.id} depoimento={d} tr={tr} />
              ))}
            </div>
          ) : (
            <p>{tr("Alumni.vazioDepoimentos")}</p>
          )}
          <Stack row justify="end">
            <Button href="/depoimento" arrow>
              {tr("Alumni.enviarDepoimento")}
            </Button>
          </Stack>
        </Stack>
      </Section>
    </PublicTemplate>
  );
}
