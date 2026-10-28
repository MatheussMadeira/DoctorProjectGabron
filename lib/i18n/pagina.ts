import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ehLocale, LOCALE_PADRAO, type Locale } from "./idiomas";
import { alternativas } from "./seo";
import type { Tradutor } from "./tradutor";

/* Ajuda das páginas públicas (servidor): o idioma da rota, a função de tradução com chaves completas e o contexto que
   lib/turmas-view.ts usa para falar o idioma. */

/** O idioma vindo de `params.locale`; qualquer valor desconhecido vira o padrão (o layout já respondeu 404 para ele). */
export const idiomaDe = (locale: string): Locale => (ehLocale(locale) ? locale : LOCALE_PADRAO);

/** Chama `setRequestLocale` (a página fica estática por idioma) e devolve o idioma e o tradutor. */
export async function prepararPagina(locale: string): Promise<{ locale: Locale; tr: Tradutor }> {
  const l = idiomaDe(locale);
  setRequestLocale(l);
  return { locale: l, tr: (await getTranslations({ locale: l })) as unknown as Tradutor };
}

/** Metadata de uma página fixa: título e descrição de messages (`<namespace>.metaTitulo` e `.metaDescricao`) e canonical + hreflang. */
export async function metadataDaPagina(locale: string, namespace: string, caminho: string): Promise<Metadata> {
  const l = idiomaDe(locale);
  const t = await getTranslations({ locale: l, namespace });
  return { title: t("metaTitulo"), description: t("metaDescricao"), alternates: alternativas(l, caminho) };
}
