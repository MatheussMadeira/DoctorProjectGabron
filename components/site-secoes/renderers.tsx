import type { ReactNode } from "react";
import { Button } from "@/components/atoms/Button";
import { Photo } from "@/components/atoms/Photo";
import { Reveal } from "@/components/atoms/Reveal";
import { Stack } from "@/components/atoms/Stack";
import { ItemList } from "@/components/molecules/ItemList";
import { SectionHeading } from "@/components/molecules/SectionHeading";
import { Stats } from "@/components/molecules/Stats";
import { StepItem } from "@/components/molecules/StepItem";
import { Hero } from "@/components/organisms/Hero";
import { Section } from "@/components/templates/Section";
import { SplitLayout } from "@/components/templates/SplitLayout";
import styles from "@/app/(site)/[locale]/paginas.module.css";
import type { Tradutor } from "@/lib/i18n/tradutor";
import type { Conteudo, Foto } from "@/lib/site-secoes/campos";
import type { DefSecao, PaginaSlug } from "@/lib/site-secoes/paginas";

/* Como cada TIPO de seção vira tela. É o mesmo código do site público e da prévia do editor (por isso não lê banco nem cookie): recebe o
   conteúdo, os textos fixos e, nas seções com dados vivos, o corpo já renderizado (`slots`). Sem "use client": quem importa decide onde roda. */

export interface CtxSecao {
  pagina: PaginaSlug;
  tr: Tradutor;
  /** Número de cada seção numerada (chave → "01"), na ordem das seções que aparecem. */
  numeros: Record<string, string>;
  /** Corpo das seções com dados vivos, já renderizado no servidor. `null` = não há o que mostrar e a seção some. */
  slots: Record<string, ReactNode | null>;
  /** Quantos professores aparecem (frase automática do cabeçalho). */
  nProfessores: number;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");
const lista = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const foto = (v: unknown): Foto => (v && typeof v === "object" ? (v as Foto) : { url: "", alt: "" });
const botao = (rotulo: unknown, href: unknown) => (s(rotulo).trim() && s(href).trim() ? { label: s(rotulo), href: s(href) } : undefined);

/** Fundo da seção quando a página a quer "afundada". */
const FUNDO_AFUNDADO = new Set(["inicio/turmas", "inicio/depoimentos", "sobre-o-curso/professores"]);

function Hero_({ c }: { c: Conteudo }) {
  const f = foto(c.foto);
  return <Hero eyebrow={s(c.sobretitulo) || undefined} title={s(c.titulo)} lead={s(c.frase)} primary={botao(c.botao1Rotulo, c.botao1Link)} secondary={botao(c.botao2Rotulo, c.botao2Link)} image={f.url || undefined} imageAlt={f.alt} />;
}

function Curso({ c, numero }: { c: Conteudo; numero?: string }) {
  const f = foto(c.foto);
  const b = botao(c.botaoRotulo, c.botaoLink);
  return (
    <Section id="curso">
      <SplitLayout>
        <Stack gap={7}>
          <Reveal>
            <SectionHeading number={numero} eyebrow={s(c.eyebrow) || undefined} title={s(c.titulo)} lead={s(c.lead)} />
          </Reveal>
          <ItemList ordered step={120}>
            {lista<{ titulo: string; texto: string }>(c.pilares).map((p, i) => (
              <StepItem key={`${i}-${p.titulo}`} marker={String(i + 1).padStart(2, "0")} title={p.titulo}>
                {p.texto}
              </StepItem>
            ))}
          </ItemList>
          {b && (
            <div>
              <Button variant="secondary" href={b.href} arrow>
                {b.label}
              </Button>
            </div>
          )}
        </Stack>
        <Reveal delay={120}>{f.url && <Photo src={f.url} alt={f.alt} />}</Reveal>
      </SplitLayout>
    </Section>
  );
}

function Cabecalho({ def, c, ctx }: { def: DefSecao; c: Conteudo; ctx: CtxSecao }) {
  const corpo = ctx.slots[def.chave];
  if (def.dados && corpo == null) return null;
  const lead = s(c.lead).trim() || (def.chave === "professores" ? ctx.tr("Comum.leadProfessores", { n: ctx.nProfessores }) : undefined);
  const link = s(c.linkRotulo).trim() && def.linkHref ? { label: s(c.linkRotulo), href: def.linkHref } : null;
  return (
    <Section id={def.chave} background={FUNDO_AFUNDADO.has(`${ctx.pagina}/${def.chave}`) ? "sunken" : "surface"}>
      <Stack gap={7}>
        <Reveal>
          <SectionHeading number={ctx.numeros[def.chave]} eyebrow={s(c.eyebrow) || undefined} title={s(c.titulo)} lead={lead} />
        </Reveal>
        {corpo}
        {link && (
          <Stack row justify="end">
            <Button variant="link" href={link.href} arrow>
              {link.label}
            </Button>
          </Stack>
        )}
      </Stack>
    </Section>
  );
}

function Numeros({ c }: { c: Conteudo }) {
  return (
    <Section theme="escuro">
      <Stack gap={7}>
        <Reveal>
          <SectionHeading align="center" eyebrow={s(c.eyebrow) || undefined} title={s(c.titulo)} />
        </Reveal>
        <Stats items={lista<{ valor: string; rotulo: string }>(c.itens).map((n) => ({ value: n.valor, label: n.rotulo }))} />
      </Stack>
    </Section>
  );
}

function Proposta({ c, numero }: { c: Conteudo; numero?: string }) {
  return (
    <Section id="proposta">
      <div className={styles.proposta}>
        <Stack gap={6}>
          <Reveal>
            <SectionHeading number={numero} eyebrow={s(c.eyebrow) || undefined} title={s(c.titulo)} />
          </Reveal>
          {lista<{ texto: string }>(c.paragrafos).map((p, i) => (
            <p key={i} className={`ap-body-l ${styles.corpo}`}>
              {p.texto}
            </p>
          ))}
        </Stack>
        <ol className={styles.pilares}>
          {lista<{ titulo: string; texto: string }>(c.pilares).map((p, i) => (
            <Reveal key={`${i}-${p.titulo}`} as="li" delay={i * 120}>
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
  );
}

function Valores({ c, numero }: { c: Conteudo; numero?: string }) {
  return (
    <Section theme="escuro" pedras>
      <Reveal>
        <div className={styles.leitura}>
          <SectionHeading number={numero} eyebrow={s(c.eyebrow) || undefined} title={s(c.titulo)} lead={s(c.frase)} />
        </div>
      </Reveal>
    </Section>
  );
}

/** A seção pronta, ou null (seção com dados e nada para mostrar). */
export function renderizarSecao(def: DefSecao, conteudo: Conteudo, ctx: CtxSecao): ReactNode {
  const numero = ctx.numeros[def.chave];
  switch (def.tipo) {
    case "hero":
      return <Hero_ c={conteudo} />;
    case "curso":
      return <Curso c={conteudo} numero={numero} />;
    case "cabecalho":
      return <Cabecalho def={def} c={conteudo} ctx={ctx} />;
    case "numeros":
      return <Numeros c={conteudo} />;
    case "proposta":
      return <Proposta c={conteudo} numero={numero} />;
    case "valores":
      return <Valores c={conteudo} numero={numero} />;
  }
}

/** Numera as seções numeradas que vão aparecer (as com dados e sem corpo não entram na conta). */
export function numerar(secoes: Array<{ def: DefSecao }>, slots: Record<string, ReactNode | null>): Record<string, string> {
  const numeros: Record<string, string> = {};
  let n = 0;
  for (const { def } of secoes) {
    if (!def.numerada) continue;
    if (def.dados && slots[def.chave] == null) continue;
    numeros[def.chave] = String(++n).padStart(2, "0");
  }
  return numeros;
}
