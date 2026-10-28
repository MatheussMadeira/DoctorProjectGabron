import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { configuracoes, configuracoesTraducoes } from "@/db/schema";
import { sobrepor } from "./i18n/estrutura";
import { LOCALE_PADRAO, tagIdioma, type Locale } from "./i18n/idiomas";
import { montarSite, type DadosSite } from "./site";

/** Tag de cache dos dados da clínica. Quem salva Configurações chama updateTag(TAG_CONFIGURACOES). */
export const TAG_CONFIGURACOES = "configuracoes";

async function ler(locale: Locale = LOCALE_PADRAO): Promise<DadosSite> {
  const [linha] = await db.select().from(configuracoes);
  if (!linha || locale === LOCALE_PADRAO) return montarSite(linha ?? null);
  const [trad] = await db.select().from(configuracoesTraducoes).where(and(eq(configuracoesTraducoes.configId, 1), eq(configuracoesTraducoes.locale, locale)));
  return montarSite(sobrepor(linha, trad?.conteudo, ["horario"]));
}

/** Para as páginas públicas (Header, Footer, WhatsApp, Contato, Clínica): em cache, com tag. */
export async function obterSite(locale: Locale = LOCALE_PADRAO): Promise<DadosSite> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_CONFIGURACOES, tagIdioma(locale));
  return ler(locale);
}

/** Sem cache: para os e-mails e para a tela de Configurações, que precisam do valor atual. */
export async function obterSiteAtual(): Promise<DadosSite> {
  return ler();
}

/** Linha crua, para preencher o formulário de Configurações. */
export async function lerLinhaConfiguracoes() {
  const [linha] = await db.select().from(configuracoes);
  return linha ?? null;
}
