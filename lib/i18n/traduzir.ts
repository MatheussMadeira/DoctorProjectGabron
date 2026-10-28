import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ENTIDADES, type Entidade, type IdEntidade } from "./campos";
import { aplicarTextos, camposParaTraduzir, extrairTextos, hashDe } from "./estrutura";
import { provedorDeTraducao, type ProvedorDeTraducao } from "./deepl";
import { IDIOMAS_TRADUZIDOS, tagIdioma, type Locale } from "./idiomas";

/* Tradução automática do conteúdo do banco. Ao salvar uma entidade no admin, `traduzirEntidade` compara o português de cada campo com o
   hash guardado em `origem` e manda para a DeepL só o que mudou (ou ainda não tem tradução), nos 6 idiomas.
   Regra de frescor: se o português mudou, a tradução automática nova OCUPA o lugar da revisada antiga (status rascunho_automatico) e a
   linha ganha `precisa_revisar`; informação desatualizada é pior que tradução não revisada. */

export interface LinhaDeTraducao {
  locale: string;
  conteudo: Record<string, unknown>;
  origem: Record<string, string>;
  status: "rascunho_automatico" | "revisada";
  precisaRevisar: boolean;
  revisadaPor: string | null;
  revisadaEm: Date | null;
  updatedAt: Date;
}

export async function lerTraducoes(entidade: Entidade, id: IdEntidade): Promise<LinhaDeTraducao[]> {
  const e = ENTIDADES[entidade];
  const linhas = await db.select().from(e.tabela).where(eq(e.colId, id as never));
  return linhas as unknown as LinhaDeTraducao[];
}

export { camposParaTraduzir };

export interface ResultadoTraducao {
  provedor: string | null;
  /** locale → campos traduzidos nesta rodada. */
  traduzidos: Partial<Record<Locale, string[]>>;
  erros: Partial<Record<Locale, string>>;
}

async function expirarTags(entidade: Entidade, id: IdEntidade, locales: Locale[]) {
  const tags = new Set([...(await ENTIDADES[entidade].tags(id)), ...locales.map(tagIdioma)]);
  // revalidateTag (e não updateTag) porque isto roda depois da resposta (after) e também fora de Server Actions.
  try {
    for (const t of tags) revalidateTag(t, { expire: 0 });
  } catch {
    // Fora do Next (scripts de linha de comando) não há cache para expirar: o site novo já lê o banco.
  }
}

/**
 * Traduz o que está novo ou mudou em português. Seguro de chamar sempre: sem chave da DeepL (e sem o provedor falso) não faz nada.
 * Nunca lança: erro de um idioma vai para `erros` e não derruba o salvamento no admin.
 */
let avisouSemChave = false;

export async function traduzirEntidade(entidade: Entidade, id: IdEntidade, opcoes: { forcar?: boolean; provedor?: ProvedorDeTraducao | null; locales?: Locale[] } = {}): Promise<ResultadoTraducao> {
  const provedor = opcoes.provedor === undefined ? provedorDeTraducao() : opcoes.provedor;
  const resultado: ResultadoTraducao = { provedor: provedor?.nome ?? null, traduzidos: {}, erros: {} };
  if (!provedor) {
    if (!avisouSemChave) {
      avisouSemChave = true;
      console.warn("[i18n] Sem DEEPL_API_KEY: nenhuma tradução foi gerada, o site mostra o português. Ponha a chave no .env.local (ou nas variáveis da Vercel).");
    }
    return resultado;
  }

  const e = ENTIDADES[entidade];
  const origem = await e.lerOrigem(id);
  if (!origem) return resultado;
  const existentes = new Map((await lerTraducoes(entidade, id)).map((l) => [l.locale, l]));

  await Promise.all(
    IDIOMAS_TRADUZIDOS.filter((l) => !opcoes.locales || opcoes.locales.includes(l)).map(async (locale) => {
      const linha = existentes.get(locale);
      const campos = camposParaTraduzir(origem, linha, opcoes.forcar);
      if (!campos.length) return;
      try {
        const textos = campos.flatMap((c) => extrairTextos(origem[c], c));
        const traduzidos = await provedor.traduzir(textos, locale);
        const conteudo: Record<string, unknown> = { ...(linha?.conteudo ?? {}) };
        const hashes: Record<string, string> = { ...(linha?.origem ?? {}) };
        let cursor = 0;
        for (const c of campos) {
          const n = extrairTextos(origem[c], c).length;
          conteudo[c] = aplicarTextos(origem[c], traduzidos.slice(cursor, cursor + n), c);
          hashes[c] = hashDe(origem[c]);
          cursor += n;
        }
        // Já havia uma revisão (ou um aviso pendente) e o português mudou: a automática nova substitui a revisada e pede revisão de novo.
        const substituiuRevisada = linha?.status === "revisada" || !!linha?.precisaRevisar;
        const valores = { conteudo, origem: hashes, status: "rascunho_automatico" as const, precisaRevisar: substituiuRevisada, revisadaPor: null, revisadaEm: null, updatedAt: new Date() };
        await db
          .insert(e.tabela)
          .values({ [chaveDeId(entidade)]: id, locale, ...valores } as never)
          .onConflictDoUpdate({ target: alvoDoConflito(entidade), set: valores as never });
        resultado.traduzidos[locale] = campos;
      } catch (erro) {
        resultado.erros[locale] = erro instanceof Error ? erro.message : String(erro);
        console.error(`[i18n] ${entidade} ${id} → ${locale}: ${resultado.erros[locale]}`);
      }
    }),
  );

  if (Object.keys(resultado.traduzidos).length) await expirarTags(entidade, id, Object.keys(resultado.traduzidos) as Locale[]);
  return resultado;
}

/** Nome da propriedade do id na tabela de traduções (turmaId, professorId…). */
function chaveDeId(entidade: Entidade): string {
  return { turma: "turmaId", professor: "professorId", foto: "fotoId", config: "configId", textoCurso: "bloco", depoimento: "depoimentoId" }[entidade];
}
function alvoDoConflito(entidade: Entidade) {
  const e = ENTIDADES[entidade] as unknown as { tabela: Record<string, never>; colId: never };
  return [e.colId, e.tabela.locale] as never;
}

/**
 * Salva a revisão feita por uma pessoa no formulário do admin: o texto passa a ser o dela, o hash do português atual é guardado (ela
 * viu a versão de agora) e a linha vira `revisada` quando ela marca (ou continua rascunho se não marcou).
 */
export async function salvarTraducaoRevisada(entidade: Entidade, id: IdEntidade, locale: Locale, conteudo: Record<string, unknown>, opcoes: { revisada: boolean; usuarioId: string }): Promise<boolean> {
  const e = ENTIDADES[entidade];
  const origem = await e.lerOrigem(id);
  if (!origem) return false;
  const existente = (await lerTraducoes(entidade, id)).find((l) => l.locale === locale);
  const hashes: Record<string, string> = { ...(existente?.origem ?? {}) };
  for (const campo of Object.keys(conteudo)) if (campo in origem) hashes[campo] = hashDe(origem[campo]);
  const valores = {
    conteudo: { ...(existente?.conteudo ?? {}), ...conteudo },
    origem: hashes,
    status: opcoes.revisada ? ("revisada" as const) : ("rascunho_automatico" as const),
    precisaRevisar: opcoes.revisada ? false : (existente?.precisaRevisar ?? false),
    revisadaPor: opcoes.revisada ? opcoes.usuarioId : null,
    revisadaEm: opcoes.revisada ? new Date() : null,
    updatedAt: new Date(),
  };
  await db
    .insert(e.tabela)
    .values({ [chaveDeId(entidade)]: id, locale, ...valores } as never)
    .onConflictDoUpdate({ target: alvoDoConflito(entidade), set: valores as never });
  await expirarTags(entidade, id, [locale]);
  return true;
}



/**
 * Chamada dos Server Actions do admin logo depois de gravar: traduz o que mudou em até `prazoMs` (a pessoa já vê o rascunho na aba
 * de revisão ao voltar para a tela). Passado o prazo, devolve sem esperar; a tradução termina em segundo plano. Nunca lança.
 */
export async function traduzirNaHora(entidade: Entidade, id: IdEntidade, prazoMs = 12_000): Promise<ResultadoTraducao | null> {
  try {
    const trabalho = traduzirEntidade(entidade, id);
    return await Promise.race([trabalho, new Promise<null>((r) => setTimeout(() => r(null), prazoMs))]);
  } catch (e) {
    console.error(`[i18n] ${entidade} ${id}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}
