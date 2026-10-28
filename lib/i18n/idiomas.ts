/* Os 7 idiomas do site público. O admin é só pt-BR. `codigo` é o que aparece em URL, cookie, banco e arquivos; os demais campos são
   a forma que cada sistema espera (hreflang do Google, Intl, DeepL, Open Graph, atributo lang do HTML). */

export const LOCALES = ["pt-BR", "en", "es", "fr", "it", "de", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_PADRAO: Locale = "pt-BR";

export interface Idioma {
  /** Mostrado no botão do seletor. */
  sigla: string;
  /** Nome na própria língua, mostrado na lista do seletor. */
  nome: string;
  /** hreflang (chinês simplificado é zh-Hans). */
  hreflang: string;
  /** Atributo lang do <html> (a fonte do chinês e as regras de tipografia usam :lang(zh)). */
  lang: string;
  /** Formatação com Intl (datas, horários, moeda). */
  intl: string;
  /** Idioma de destino na DeepL (o português do Brasil é a origem: PT-BR). */
  deepl: string;
  /** Arquivo em messages/. */
  arquivo: string;
  /** og:locale. */
  og: string;
  /** Idiomas com aviso de "tradução automática" no rodapé. */
  avisoDeTraducao: boolean;
}

export const IDIOMAS: Record<Locale, Idioma> = {
  "pt-BR": { sigla: "PT", nome: "Português", hreflang: "pt-BR", lang: "pt-BR", intl: "pt-BR", deepl: "PT-BR", arquivo: "pt-BR", og: "pt_BR", avisoDeTraducao: false },
  en: { sigla: "EN", nome: "English", hreflang: "en", lang: "en", intl: "en-US", deepl: "EN-US", arquivo: "en", og: "en_US", avisoDeTraducao: false },
  es: { sigla: "ES", nome: "Español", hreflang: "es", lang: "es", intl: "es-ES", deepl: "ES", arquivo: "es", og: "es_ES", avisoDeTraducao: false },
  fr: { sigla: "FR", nome: "Français", hreflang: "fr", lang: "fr", intl: "fr-FR", deepl: "FR", arquivo: "fr", og: "fr_FR", avisoDeTraducao: true },
  it: { sigla: "IT", nome: "Italiano", hreflang: "it", lang: "it", intl: "it-IT", deepl: "IT", arquivo: "it", og: "it_IT", avisoDeTraducao: true },
  de: { sigla: "DE", nome: "Deutsch", hreflang: "de", lang: "de", intl: "de-DE", deepl: "DE", arquivo: "de", og: "de_DE", avisoDeTraducao: true },
  zh: { sigla: "ZH", nome: "中文", hreflang: "zh-Hans", lang: "zh-Hans", intl: "zh-CN", deepl: "ZH-HANS", arquivo: "zh-CN", og: "zh_CN", avisoDeTraducao: true },
};

/** Os 6 idiomas que recebem tradução (tudo menos o português). */
export const IDIOMAS_TRADUZIDOS = LOCALES.filter((l) => l !== LOCALE_PADRAO);

export const ehLocale = (valor: unknown): valor is Locale => typeof valor === "string" && (LOCALES as readonly string[]).includes(valor);

/** Caminho com o prefixo do idioma (pt-BR não leva prefixo). */
export const comPrefixo = (locale: Locale, caminho: string): string => {
  const c = caminho.startsWith("/") ? caminho : `/${caminho}`;
  return locale === LOCALE_PADRAO ? c : `/${locale}${c === "/" ? "" : c}`;
};

/** Tag de cache de um idioma: além das tags de cada dado (que expiram todos os idiomas de uma vez), permite expirar só um idioma (ex.: depois de revisar uma tradução). */
export const tagIdioma = (locale: Locale) => `idioma:${locale}`;
