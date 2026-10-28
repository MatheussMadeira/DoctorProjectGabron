import { MESES, MESES_LONGOS, parseDate } from "./agenda";
import { IDIOMAS, LOCALE_PADRAO, type Locale } from "./i18n/idiomas";
import type { Tradutor } from "./i18n/tradutor";

/* Datas e períodos. Em português (o padrão) a redação é a de sempre ("21 e 22 de novembro"); nos outros idiomas vem do Intl
   (`IDIOMAS[locale].intl`), sempre em UTC porque as datas do banco são só dia, sem hora (o fuso de Belo Horizonte entra em `hojeISO`). */

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

/** "Dois dias", "Um dia"… para frases como "Dois dias de formação". Com `tr`, a redação vem de messages ("Datas.dias"). */
export function duracaoPorExtenso(inicio: string, fim?: string, tr?: Tradutor) {
  const n = duracaoDias(inicio, fim);
  if (tr) return tr("Datas.dias", { n });
  return `${NUMEROS[n] ?? n} ${n === 1 ? "dia" : "dias"}`;
}

/** "5 de dezembro", "21 e 22 de novembro", "21 a 23 de novembro", "30 de novembro a 2 de dezembro" (e o equivalente em cada idioma). */
export function formatPeriodo(inicio: string, fim?: string, locale: Locale = LOCALE_PADRAO) {
  const a = parseDate(inicio);
  if (!a) return "";
  const b = fim ? parseDate(fim) : null;
  const mesmoDia = !b || (b.d === a.d && b.m === a.m && b.y === a.y);
  if (locale !== LOCALE_PADRAO) {
    const formato = new Intl.DateTimeFormat(IDIOMAS[locale].intl, { day: "numeric", month: "long", timeZone: "UTC" });
    if (mesmoDia) return formato.format(utc(inicio));
    // O ICU do chinês não tem padrão de intervalo para "dia + mês por extenso" e cai em "11/21 – 11/22": monta com o "至" (até).
    if (IDIOMAS[locale].intl.startsWith("zh")) {
      const dia = new Intl.DateTimeFormat(IDIOMAS[locale].intl, { day: "numeric", timeZone: "UTC" });
      return b!.m === a.m && b!.y === a.y ? `${formato.format(utc(inicio))}至${dia.format(utc(fim!))}` : `${formato.format(utc(inicio))}至${formato.format(utc(fim!))}`;
    }
    return formato.formatRange(utc(inicio), utc(fim!));
  }
  if (mesmoDia) return `${a.d} de ${MESES_EXTENSO[a.m]}`;
  if (b.m === a.m) return `${a.d}${duracaoDias(inicio, fim) === 2 ? " e " : " a "}${b.d} de ${MESES_EXTENSO[a.m]}`;
  return `${a.d} de ${MESES_EXTENSO[a.m]} a ${b.d} de ${MESES_EXTENSO[b.m]}`;
}

/** Mês abreviado de um mês de 0 a 11: "nov" em português; nos outros idiomas, o do Intl sem o ponto final ("janv", "11月"). */
export function mesCurto(m: number, locale: Locale = LOCALE_PADRAO) {
  if (locale === LOCALE_PADRAO) return MESES[m];
  return new Intl.DateTimeFormat(IDIOMAS[locale].intl, { month: "short", timeZone: "UTC" }).format(Date.UTC(2026, m, 15)).replace(/\.$/, "");
}

/** Título de um grupo da agenda: "Novembro 2026" em português; "November 2026", "2026年11月"… nos outros. */
export function mesEAno(y: number, m: number, locale: Locale = LOCALE_PADRAO) {
  if (locale === LOCALE_PADRAO) return `${MESES_LONGOS[m]} ${y}`;
  const texto = new Intl.DateTimeFormat(IDIOMAS[locale].intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m, 15));
  return texto.charAt(0).toLocaleUpperCase(IDIOMAS[locale].intl) + texto.slice(1);
}

/** Data de hoje (YYYY-MM-DD) no fuso de Belo Horizonte. */
export function hojeISO(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

/** "21–22/11/2026", "30/10/2026", "30/11–02/12/2026": datas curtas para tabelas do painel (sempre em português). */
export function formatarDataCurta(inicio: string, fim?: string | null) {
  const a = parseDate(inicio);
  if (!a) return "";
  const dd = (n: number) => String(n).padStart(2, "0");
  const b = fim ? parseDate(fim) : null;
  if (!b || (b.d === a.d && b.m === a.m && b.y === a.y)) return `${dd(a.d)}/${dd(a.m + 1)}/${a.y}`;
  if (b.m === a.m && b.y === a.y) return `${dd(a.d)}–${dd(b.d)}/${dd(a.m + 1)}/${a.y}`;
  return `${dd(a.d)}/${dd(a.m + 1)}–${dd(b.d)}/${dd(b.m + 1)}/${b.y}`;
}
