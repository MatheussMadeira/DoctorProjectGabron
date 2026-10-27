import { parseDate } from "./agenda";

const MESES_EXTENSO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const NUMEROS = ["", "Um", "Dois", "Três", "Quatro", "Cinco"];

const utc = (s: string) => {
  const d = parseDate(s)!;
  return Date.UTC(d.y, d.m, d.d);
};

/** Quantos dias a turma dura (1 quando não há data de fim). */
export function duracaoDias(inicio: string, fim?: string) {
  return fim ? Math.round((utc(fim) - utc(inicio)) / 86_400_000) + 1 : 1;
}

/** "Dois dias", "Um dia"… para frases como "Dois dias de formação". */
export function duracaoPorExtenso(inicio: string, fim?: string) {
  const n = duracaoDias(inicio, fim);
  return `${NUMEROS[n] ?? n} ${n === 1 ? "dia" : "dias"}`;
}

/** "5 de dezembro", "21 e 22 de novembro", "21 a 23 de novembro", "30 de novembro a 2 de dezembro". */
export function formatPeriodo(inicio: string, fim?: string) {
  const a = parseDate(inicio);
  if (!a) return "";
  const b = fim ? parseDate(fim) : null;
  if (!b || (b.d === a.d && b.m === a.m)) return `${a.d} de ${MESES_EXTENSO[a.m]}`;
  if (b.m === a.m) return `${a.d}${duracaoDias(inicio, fim) === 2 ? " e " : " a "}${b.d} de ${MESES_EXTENSO[a.m]}`;
  return `${a.d} de ${MESES_EXTENSO[a.m]} a ${b.d} de ${MESES_EXTENSO[b.m]}`;
}

/** Data de hoje (YYYY-MM-DD) no fuso de Belo Horizonte. */
export function hojeISO(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

/** "21–22/11/2026", "30/10/2026", "30/11–02/12/2026": datas curtas para tabelas do painel. */
export function formatarDataCurta(inicio: string, fim?: string | null) {
  const a = parseDate(inicio);
  if (!a) return "";
  const dd = (n: number) => String(n).padStart(2, "0");
  const b = fim ? parseDate(fim) : null;
  if (!b || (b.d === a.d && b.m === a.m && b.y === a.y)) return `${dd(a.d)}/${dd(a.m + 1)}/${a.y}`;
  if (b.m === a.m && b.y === a.y) return `${dd(a.d)}–${dd(b.d)}/${dd(a.m + 1)}/${a.y}`;
  return `${dd(a.d)}/${dd(a.m + 1)}–${dd(b.d)}/${dd(b.m + 1)}/${b.y}`;
}
