export type EventStatus = "aberto" | "ultimas" | "esgotado" | "em-breve" | "encerrado";
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export const STATUS: Record<EventStatus, { tone: Tone; label: string }> = {
  aberto: { tone: "success", label: "Inscrições abertas" },
  ultimas: { tone: "warning", label: "Últimas vagas" },
  esgotado: { tone: "danger", label: "Esgotado" },
  "em-breve": { tone: "neutral", label: "Em breve" },
  encerrado: { tone: "neutral", label: "Realizado" },
};

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Aceita "2026-03-14" (ISO). Devolve o mês de 0 a 11. */
export function parseDate(s?: string) {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return y ? { y, m: m - 1, d } : null;
}
