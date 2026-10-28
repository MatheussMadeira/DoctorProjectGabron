import type { AgendaEvent } from "@/components/organisms/AgendaList";
import type { EventCardProps } from "@/components/organisms/EventCard";
import { duracaoPorExtenso, formatPeriodo } from "./datas";
import type { Locale } from "./i18n/idiomas";
import type { Tradutor } from "./i18n/tradutor";
import type { Turma } from "./turmas";

/** O que a camada de apresentação precisa para falar o idioma: o idioma e a função de tradução (chaves completas). */
export interface ContextoDeIdioma {
  locale: Locale;
  tr: Tradutor;
}

export const hrefTurma = (t: Pick<Turma, "slug">) => `/agenda/${t.slug}`;

/** Texto de vagas do cartão, derivado da contagem (nunca digitado). */
export function textoVagas(t: Turma, { tr }: ContextoDeIdioma): string | undefined {
  switch (t.status) {
    case "em-breve":
      return tr("Turma.vagasADefinir");
    case "esgotado":
      return tr("Turma.vagasEsgotadas");
    case "encerrado":
      return undefined;
    case "ultimas":
      return t.vagasLivres === 1 ? tr("Turma.umaVagaRestante") : tr("Turma.vagasRestantes", { n: t.vagasLivres });
    default:
      return tr("Turma.vagas", { n: t.vagas });
  }
}

/** Rótulo de exibição da modalidade ("Presencial" / "Online"); o valor lógico continua sendo o do banco. */
export const rotuloDaModalidade = (t: Pick<Turma, "modalidade">, { tr }: ContextoDeIdioma) => tr(`Modalidade.${t.modalidade}`);

const CHAVE_DO_STATUS = { aberto: "aberto", ultimas: "ultimas", esgotado: "esgotado", "em-breve": "emBreve", encerrado: "encerrado" } as const;
export const rotuloDoStatus = (status: Turma["status"], { tr }: ContextoDeIdioma) => tr(`Status.${CHAVE_DO_STATUS[status]}`);

export function cardProps(t: Turma, ctx: ContextoDeIdioma): EventCardProps {
  return {
    title: t.titulo,
    href: hrefTurma(t),
    start: t.inicio,
    end: t.fim,
    time: t.horario,
    city: t.cidade,
    modality: t.modalidade,
    modalityLabel: rotuloDaModalidade(t, ctx),
    seats: textoVagas(t, ctx),
    price: t.preco,
    status: t.status,
    statusLabel: rotuloDoStatus(t.status, ctx),
    summary: t.resumo,
    image: t.fotoUrl,
    imageAlt: t.fotoAlt,
    transitionName: t.slug,
    cta: ctx.tr("Turma.verDetalhes"),
    waitlistLabel: ctx.tr("Turma.listaDeEspera"),
    pastLabel: ctx.tr("Turma.verComoFoi"),
  };
}

export function agendaEvent(t: Turma, ctx: ContextoDeIdioma): AgendaEvent {
  return {
    id: t.slug,
    title: t.titulo,
    start: t.inicio,
    end: t.fim,
    time: t.horario,
    venue: t.local,
    city: t.cidade,
    modality: t.modalidade,
    modalityLabel: rotuloDaModalidade(t, ctx),
    status: t.status,
    statusLabel: rotuloDoStatus(t.status, ctx),
    href: hrefTurma(t),
  };
}

/** "Belo Horizonte, MG" → "Belo Horizonte" (para linhas como "Presencial · Belo Horizonte"). */
export const cidadeSemUF = (cidade: string) => cidade.split(",")[0];

/** Onde a turma acontece, para sobretítulos: a cidade só aparece em turma presencial ("Presencial · Belo Horizonte"; "Online · Ao vivo"). */
export const localDaTurma = (t: Pick<Turma, "modalidade" | "cidade">, { tr }: ContextoDeIdioma) => (t.modalidade === "Online" ? tr("Modalidade.aoVivo") : cidadeSemUF(t.cidade));
export const sobretituloDaTurma = (t: Pick<Turma, "modalidade" | "cidade">, ctx: ContextoDeIdioma) => `${rotuloDaModalidade(t, ctx)} · ${localDaTurma(t, ctx)}`;

/** Texto da faixa de chamada para a próxima turma com inscrições abertas. */
export function chamadaProxima(t: Turma, { locale, tr }: ContextoDeIdioma) {
  const duracao = duracaoPorExtenso(t.inicio, t.fim, tr);
  return {
    title: `${t.tituloCurto} · ${formatPeriodo(t.inicio, t.fim, locale)}`,
    text: t.modalidade === "Online" ? tr("Turma.chamadaOnline", { duracao }) : tr("Turma.chamadaPresencial", { duracao, cidade: t.cidade }),
    href: hrefTurma(t),
  };
}
