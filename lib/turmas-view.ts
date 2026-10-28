import type { AgendaEvent } from "@/components/organisms/AgendaList";
import type { EventCardProps } from "@/components/organisms/EventCard";
import { duracaoPorExtenso, formatPeriodo } from "./datas";
import type { Turma } from "./turmas";

export const hrefTurma = (t: Pick<Turma, "slug">) => `/agenda/${t.slug}`;

/** Texto de vagas do cartão, derivado da contagem (nunca digitado). */
export function textoVagas(t: Turma): string | undefined {
  switch (t.status) {
    case "em-breve":
      return "Vagas a definir";
    case "esgotado":
      return "Vagas esgotadas";
    case "encerrado":
      return undefined;
    case "ultimas":
      return t.vagasLivres === 1 ? "1 vaga restante" : `${t.vagasLivres} vagas restantes`;
    default:
      return `${t.vagas} vagas`;
  }
}

export function cardProps(t: Turma): EventCardProps {
  return {
    title: t.titulo,
    href: hrefTurma(t),
    start: t.inicio,
    end: t.fim,
    time: t.horario,
    city: t.cidade,
    modality: t.modalidade,
    seats: textoVagas(t),
    price: t.preco,
    status: t.status,
    summary: t.resumo,
    image: t.fotoUrl,
    imageAlt: t.fotoAlt,
    transitionName: t.slug,
  };
}

export function agendaEvent(t: Turma): AgendaEvent {
  return {
    id: t.slug,
    title: t.titulo,
    start: t.inicio,
    end: t.fim,
    time: t.horario,
    venue: t.local,
    city: t.cidade,
    modality: t.modalidade,
    status: t.status,
    href: hrefTurma(t),
  };
}

/** "Belo Horizonte, MG" → "Belo Horizonte" (para linhas como "Presencial · Belo Horizonte"). */
export const cidadeSemUF = (cidade: string) => cidade.split(",")[0];

/** Onde a turma acontece, para sobretítulos: a cidade só aparece em turma presencial ("Presencial · Belo Horizonte"; "Online · Ao vivo"). */
export const localDaTurma = (t: Pick<Turma, "modalidade" | "cidade">) => (t.modalidade === "Online" ? "Ao vivo" : cidadeSemUF(t.cidade));
export const sobretituloDaTurma = (t: Pick<Turma, "modalidade" | "cidade">) => `${t.modalidade} · ${localDaTurma(t)}`;

/** Texto da faixa de chamada para a próxima turma com inscrições abertas. */
export function chamadaProxima(t: Turma) {
  const duracao = duracaoPorExtenso(t.inicio, t.fim);
  return {
    title: `${t.tituloCurto} · ${formatPeriodo(t.inicio, t.fim)}`,
    text:
      t.modalidade === "Online"
        ? `${duracao} de formação online, ao vivo. Veja a programação completa e garanta sua vaga.`
        : `${duracao} de formação em ${t.cidade}. Veja a programação completa e garanta sua vaga.`,
    href: hrefTurma(t),
  };
}
