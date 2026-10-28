import { IDIOMAS, LOCALE_PADRAO, type Locale } from "./i18n/idiomas";

/** Valor ainda não definido: placeholder explícito (o mesmo em todos os idiomas). */
export const PRECO_PLACEHOLDER = "R$ 0.000";

/** Preço em reais com a formatação do idioma (a moeda é sempre o real: "R$ 1.500", "R$1,500", "1 500 R$"…). */
export const formatarPreco = (centavos: number | null, locale: Locale = LOCALE_PADRAO) =>
  centavos == null
    ? PRECO_PLACEHOLDER
    : new Intl.NumberFormat(IDIOMAS[locale].intl, { style: "currency", currency: "BRL", minimumFractionDigits: centavos % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(centavos / 100);
