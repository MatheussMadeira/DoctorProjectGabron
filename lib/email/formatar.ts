import { parseDate } from "../agenda";
import { IDIOMAS, LOCALE_PADRAO, type Locale } from "../i18n/idiomas";

/** Período da turma com Intl pelo idioma: "21 e 22 de novembro" (pt-BR, como sempre), "November 21 – 22" (en), "21.–22. November" (de)… */
export function periodoDaTurma(inicio: string, fim: string | null | undefined, locale: Locale): string {
  const a = parseDate(inicio);
  if (!a) return "";
  const b = fim ? parseDate(fim) : null;
  const intl = IDIOMAS[locale].intl;
  const diaEMes = new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", timeZone: "UTC" });
  const doDia = (p: { y: number; m: number; d: number }) => new Date(Date.UTC(p.y, p.m, p.d));
  if (!b || (b.d === a.d && b.m === a.m && b.y === a.y)) return diaEMes.format(doDia(a));
  if (locale === LOCALE_PADRAO) {
    // A regra do português (e do e-mail de sempre): "21 e 22 de novembro" para dois dias, "21 a 23 de novembro" para mais.
    const mes = new Intl.DateTimeFormat(intl, { month: "long", timeZone: "UTC" });
    if (b.m === a.m && b.y === a.y) {
      const dias = Math.round((Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d)) / 86_400_000) + 1;
      return `${a.d}${dias === 2 ? " e " : " a "}${b.d} de ${mes.format(doDia(a))}`;
    }
    return `${diaEMes.format(doDia(a))} a ${diaEMes.format(doDia(b))}`;
  }
  return diaEMes.formatRange(doDia(a), doDia(b));
}
