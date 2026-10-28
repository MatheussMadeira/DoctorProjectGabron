import { createTranslator } from "use-intl/core";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import it from "../../messages/it.json";
import ptBR from "../../messages/pt-BR.json";
import zh from "../../messages/zh-CN.json";
import { IDIOMAS, LOCALE_PADRAO, type Locale } from "./idiomas";

/* Textos fixos fora de uma requisição: Server Actions (mensagens de erro), e-mails (montados em after()) e testes.
   Dentro de páginas e componentes use next-intl (getTranslations / useTranslations). Os dois leem os mesmos arquivos de messages/. */

export type Arvore = { [chave: string]: string | Arvore };
export type Tradutor = (chave: string, valores?: Record<string, string | number>) => string;

const TODAS: Record<Locale, Arvore> = { "pt-BR": ptBR as Arvore, en: en as Arvore, es: es as Arvore, fr: fr as Arvore, it: it as Arvore, de: de as Arvore, zh: zh as Arvore };

/** O idioma por cima do português: o que faltar na tradução cai no português (nunca aparece a chave). Texto vazio também cai. */
export function mesclar(base: Arvore, sobre: Arvore): Arvore {
  const saida: Arvore = { ...base };
  for (const [k, v] of Object.entries(sobre)) {
    const atual = saida[k];
    if (v && typeof v === "object") saida[k] = typeof atual === "object" && atual ? mesclar(atual, v) : v;
    else if (v) saida[k] = v;
  }
  return saida;
}

export function carregarMensagens(locale: Locale): Arvore {
  return locale === LOCALE_PADRAO ? TODAS[LOCALE_PADRAO] : mesclar(TODAS[LOCALE_PADRAO], TODAS[locale] ?? {});
}

/** Tradutor de um namespace ("Validacao", "Emails"…) sem depender de contexto de requisição. */
export function criarTradutor(locale: Locale, namespace: string): Tradutor {
  const t = createTranslator({
    locale: IDIOMAS[locale].intl,
    messages: carregarMensagens(locale) as never,
    namespace: namespace as never,
    onError: () => {},
    getMessageFallback: ({ key }) => key,
  }) as unknown as Tradutor;
  return t;
}
