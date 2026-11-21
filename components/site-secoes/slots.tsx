import type { ReactNode } from "react";
import { Grid, Reveal } from "@/components/atoms";
import { Testimonial } from "@/components/molecules";
import { CTABand, EventCard, Gallery, ProfessorCard } from "@/components/organisms";
import { Section } from "@/components/templates";
import type { Locale } from "@/lib/i18n/idiomas";
import type { Tradutor } from "@/lib/i18n/tradutor";
import type { PaginaSlug } from "@/lib/site-secoes/paginas";
import { listarProfessores, listarGaleria } from "@/lib/professores";
import { listarDepoimentos } from "@/lib/textos-curso";
import { listarProximas, proximaComInscricoesAbertas } from "@/lib/turmas";
import { cardProps, chamadaProxima } from "@/lib/turmas-view";

/* O corpo das seções com dados vivos (turmas, professores, galeria, depoimentos) e a chamada da próxima turma. É renderizado no servidor, com os
   dados do idioma, e entregue ao renderizador de seções: no site público e na prévia do editor sai o mesmo HTML. */

export interface Corpos {
  slots: Record<string, ReactNode | null>;
  nProfessores: number;
  /** A faixa "Próxima turma" do fim da página (ou null). */
  chamada: ReactNode | null;
}

export async function construirCorpos(pagina: PaginaSlug, locale: Locale, tr: Tradutor): Promise<Corpos> {
  const ctx = { locale, tr };
  const [proxima, professores] = await Promise.all([proximaComInscricoesAbertas(locale), listarProfessores(locale)]);
  const chamadaDados = proxima && chamadaProxima(proxima, ctx);
  const chamada = chamadaDados ? (
    <Section>
      <Reveal>
        <CTABand eyebrow={tr("Comum.proximaTurma")} title={chamadaDados.title} text={chamadaDados.text} action={{ label: tr("Comum.garantirVaga"), href: chamadaDados.href }} />
      </Reveal>
    </Section>
  ) : null;

  const slots: Record<string, ReactNode | null> = {};
  if (pagina === "inicio") {
    const [destaques, depoimentos] = await Promise.all([listarProximas(locale, 3), listarDepoimentos(locale)]);
    slots.turmas = (
      <Grid minWidth={320}>
        {destaques.map((t, i) => (
          <Reveal key={t.slug} delay={i * 120}>
            <EventCard {...cardProps(t, ctx)} />
          </Reveal>
        ))}
      </Grid>
    );
    slots.professores = professores.length ? (
      <div className="ap-prof-grade">
        {professores.map((p, i) => (
          <Reveal key={p.id} delay={Math.min(i, 3) * 120}>
            <ProfessorCard nome={p.nome} titulo={p.funcao} registro={p.registro} foto={p.fotoUrl} fotoAlt={p.fotoAlt ?? tr("Comum.fotoDe", { nome: p.nome })} />
          </Reveal>
        ))}
      </div>
    ) : null;
    slots.depoimentos = depoimentos.length ? (
      <Grid minWidth={300}>
        {depoimentos.slice(0, 3).map((d, i) => (
          <Reveal key={d.id} delay={i * 120}>
            <Testimonial quote={d.texto} name={d.nome} role={`${d.profissao} · ${d.cidade}`} avatar={d.fotoUrl ?? undefined} href={`/alumni-reabtoxin#depoimento-${d.id}`} linkLabel={tr("Alumni.lerDepoimento")} />
          </Reveal>
        ))}
      </Grid>
    ) : null;
  } else {
    const galeria = await listarGaleria(locale);
    slots.professores = professores.length ? (
      <div className="ap-prof-grade ap-prof-grade-larga">
        {professores.map((p, i) => (
          <Reveal key={p.id} delay={Math.min(i, 3) * 120}>
            <ProfessorCard nome={p.nome} titulo={p.funcao} registro={p.registro} bio={p.bio} foto={p.fotoUrl} fotoAlt={p.fotoAlt ?? tr("Comum.fotoDe", { nome: p.nome })} />
          </Reveal>
        ))}
      </div>
    ) : null;
    slots.galeria = galeria.length ? (
      <Reveal delay={120}>
        <Gallery images={galeria} />
      </Reveal>
    ) : null;
  }
  return { slots, nProfessores: professores.length, chamada };
}
