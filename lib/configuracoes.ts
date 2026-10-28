import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { configuracoes } from "@/db/schema";
import { montarSite, type DadosSite } from "./site";

/** Tag de cache dos dados da clínica. Quem salva Configurações chama updateTag(TAG_CONFIGURACOES). */
export const TAG_CONFIGURACOES = "configuracoes";

async function ler(): Promise<DadosSite> {
  const [linha] = await db.select().from(configuracoes);
  return montarSite(linha ?? null);
}

/** Para as páginas públicas (Header, Footer, WhatsApp, Contato, Clínica): em cache, com tag. */
export async function obterSite(): Promise<DadosSite> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_CONFIGURACOES);
  return ler();
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
