"use server";

import { revalidatePath } from "next/cache";
import { ENTIDADES, type Entidade } from "@/lib/i18n/campos";
import { aplicarTextos } from "@/lib/i18n/estrutura";
import { ehLocale, LOCALE_PADRAO, type Locale } from "@/lib/i18n/idiomas";
import { salvarTraducaoRevisada, traduzirEntidade } from "@/lib/i18n/traduzir";
import type { Permissao } from "@/lib/permissoes";
import { autorizar } from "@/lib/sessao";

/* Revisão das traduções do conteúdo do banco (abas por idioma nos formulários do admin). A tradução automática sai da DeepL quando o
   português é salvo (lib/i18n/traduzir.ts); aqui a pessoa confere, edita e marca como revisada. */

const PERMISSAO: Record<Entidade, Permissao> = {
  turma: "turma:editar",
  professor: "professor:gerir",
  foto: "galeria:gerir",
  config: "configuracao:editar",
  textoCurso: "curso:gerir",
  depoimento: "curso:gerir",
};

export interface EstadoTraducao {
  ok?: boolean;
  erro?: string;
  mensagem?: string;
}

const ENTIDADES_VALIDAS = Object.keys(ENTIDADES) as Entidade[];

/**
 * Salva o que a pessoa digitou numa aba de idioma. `campos` é, por campo, a lista de textos na mesma ordem dos textos do português
 * (um campo simples tem 1 texto; programação, perguntas e afins têm vários). `revisada` marca a tradução como revisada.
 */
export async function salvarTraducao(entidade: Entidade, id: string | number, locale: string, campos: Record<string, string[]>, revisada: boolean): Promise<EstadoTraducao> {
  if (!ENTIDADES_VALIDAS.includes(entidade)) return { erro: "Conteúdo desconhecido." };
  const auth = await autorizar(PERMISSAO[entidade]);
  if (!auth.ok) return { erro: auth.erro };
  if (!ehLocale(locale) || locale === LOCALE_PADRAO) return { erro: "Idioma inválido." };

  const origem = await ENTIDADES[entidade].lerOrigem(id);
  if (!origem) return { erro: "Este conteúdo não existe mais." };

  const conteudo: Record<string, unknown> = {};
  for (const [campo, textos] of Object.entries(campos)) {
    if (!(campo in origem)) continue;
    conteudo[campo] = aplicarTextos(origem[campo], textos.map((t) => t.trim()));
  }
  const gravou = await salvarTraducaoRevisada(entidade, id, locale as Locale, conteudo, { revisada, usuarioId: auth.usuario.id });
  if (!gravou) return { erro: "Não foi possível salvar." };
  revalidatePath("/admin", "layout");
  return { ok: true, mensagem: revisada ? "Tradução salva e marcada como revisada." : "Tradução salva (ainda sem a marca de revisada)." };
}

/** "Traduzir de novo com a DeepL" num idioma: refaz a tradução automática de todos os campos, no lugar do que está lá (inclusive o revisado). */
export async function traduzirDeNovo(entidade: Entidade, id: string | number, locale: string): Promise<EstadoTraducao> {
  if (!ENTIDADES_VALIDAS.includes(entidade)) return { erro: "Conteúdo desconhecido." };
  const auth = await autorizar(PERMISSAO[entidade]);
  if (!auth.ok) return { erro: auth.erro };
  if (!ehLocale(locale) || locale === LOCALE_PADRAO) return { erro: "Idioma inválido." };

  const r = await traduzirEntidade(entidade, id, { forcar: true, locales: [locale as Locale] });
  if (!r.provedor) return { erro: "A tradução automática não está configurada (falta DEEPL_API_KEY)." };
  if (r.erros[locale as Locale]) return { erro: `A DeepL não conseguiu traduzir: ${r.erros[locale as Locale]}` };
  revalidatePath("/admin", "layout");
  return { ok: true, mensagem: "Tradução automática refeita. Revise e marque como revisada." };
}
