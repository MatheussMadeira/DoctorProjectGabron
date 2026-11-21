import { Quote } from "lucide-react";
import Image from "@/components/atoms/ImagemSegura";
import { Photo } from "@/components/atoms/Photo";
import { estadoPorSigla } from "@/lib/brasil";
import { formatPeriodo } from "@/lib/datas";
import { ICON } from "@/lib/icon";
import type { Locale } from "@/lib/i18n/idiomas";
import type { Tradutor } from "@/lib/i18n/tradutor";
import type { PinAlumni, TurmaAlumni } from "@/lib/alumni";
import type { DepoimentoPublico } from "@/lib/textos-curso";
import { VideoFeedback } from "./VideoFeedback";
import styles from "./alumni.module.css";

/* Peças da página Alumni que não precisam de JavaScript no navegador: a lista por local (alternativa ao mapa), os cartões das turmas
   realizadas e os depoimentos com foto e vídeo. */

/** Lista dos alunos por estado (Brasil) e por país (fora), a mesma informação do mapa para quem não usa mouse. */
export function ListaAlumniPorLocal({ pins, locale, tr }: { pins: PinAlumni[]; locale: Locale; tr: Tradutor }) {
  const paises = new Intl.DisplayNames([locale === "zh" ? "zh-CN" : locale], { type: "region" });
  const grupos = new Map<string, { titulo: string; pessoas: PinAlumni[] }>();
  for (const p of pins) {
    const estado = p.pais === "BR" ? estadoPorSigla(p.uf) : undefined;
    const chave = p.pais === "BR" ? `BR-${p.uf ?? ""}` : p.pais;
    const titulo = p.pais === "BR" ? (estado ? `${estado.nome} (${estado.sigla})` : "Brasil") : (() => {
      try {
        return paises.of(p.pais) ?? p.pais;
      } catch {
        return p.pais;
      }
    })();
    const g = grupos.get(chave) ?? { titulo, pessoas: [] };
    g.pessoas.push(p);
    grupos.set(chave, g);
  }
  const ordenados = [...grupos.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, locale));
  return (
    <ul className={styles.listaLocais} aria-label={tr("Alumni.listaTitulo")}>
      {ordenados.map((g) => (
        <li key={g.titulo}>
          <h4>
            {g.titulo} <span className="ap-hint">· {tr("Alumni.mapaPessoas", { n: g.pessoas.length })}</span>
          </h4>
          <ul>
            {g.pessoas.map((p) => (
              <li key={p.id}>
                {p.nome}
                {p.cidade ? `, ${p.cidade}` : ""}
                {p.depoimentoId && (
                  <>
                    {" "}
                    <a href={`#depoimento-${p.depoimentoId}`}>{tr("Alumni.lerDepoimento")}</a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function TurmaAlumniCard({ turma, locale, tr }: { turma: TurmaAlumni; locale: Locale; tr: Tradutor }) {
  const periodo = turma.dataInicio ? formatPeriodo(turma.dataInicio, turma.dataFim ?? undefined, locale) : "";
  return (
    <article className={styles.turma}>
      {turma.fotoUrl && <Photo src={turma.fotoUrl} alt={turma.fotoAlt ?? turma.titulo} ratio="16/10" sizes="(max-width: 900px) 100vw, 560px" />}
      <div className={styles.turmaCorpo}>
        <h3 className={styles.turmaTitulo}>{turma.titulo}</h3>
        <ul className={styles.turmaMeta}>
          {periodo && <li>{periodo}</li>}
          {turma.cidade && <li>{turma.cidade}</li>}
          {turma.numeroAlunos != null && <li>{tr("Alumni.turmaAlunos", { n: turma.numeroAlunos })}</li>}
        </ul>
        {turma.resumo && <p className={styles.turmaTexto}>{turma.resumo}</p>}
        {turma.videoUrl && <VideoFeedback url={turma.videoUrl} legendaUrl={turma.videoLegendaUrl} titulo={tr("Alumni.videoTitulo", { nome: turma.titulo })} rotuloLegenda={tr("Alumni.legenda")} />}
        {turma.alunos.length > 0 && (
          <details>
            <summary className={styles.sumario}>{tr("Alumni.turmaQuem", { n: turma.alunos.length })}</summary>
            <ul className={styles.turmaAlunos}>
              {turma.alunos.map((a) => (
                <li key={a.id}>
                  {a.nome}
                  {a.profissao ? ` · ${a.profissao}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}

export function DepoimentoAlumniCard({ depoimento: d, tr }: { depoimento: DepoimentoPublico; tr: Tradutor }) {
  const lugar = [d.profissao, [d.cidade, d.uf].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  return (
    <figure id={`depoimento-${d.id}`} className={styles.depoimento}>
      <Quote {...ICON} size={28} aria-hidden="true" />
      {d.videoUrl && <VideoFeedback url={d.videoUrl} legendaUrl={d.videoLegendaUrl} titulo={tr("Alumni.videoTitulo", { nome: d.nome })} rotuloLegenda={tr("Alumni.legenda")} />}
      <blockquote className={styles.depoimentoTexto}>{d.texto}</blockquote>
      <figcaption className={styles.depoimentoAutor}>
        {d.fotoUrl ? <Image src={d.fotoUrl} alt={d.fotoAlt ?? ""} width={56} height={56} className={styles.fotoRedonda} /> : <span className={styles.inicialRedonda} aria-hidden="true">{d.nome.trim()[0]}</span>}
        <span>
          <strong>{d.nome}</strong>
          {lugar && <span>{lugar}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
