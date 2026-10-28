import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { depoimentos, depoimentosTraducoes, textosCurso, textosCursoTraducoes } from "@/db/schema";
import { LOCALE_PADRAO, type Locale } from "./i18n/idiomas";
import { BLOCOS, TAG_CURSO, TEXTOS_PADRAO, type TextosDoCurso } from "./textos-curso-base";
import { sobrepor, temConteudo } from "./i18n/estrutura";

/* Textos do curso editáveis em Configurações › Curso, e depoimentos. O português fica em `textos_curso` (um bloco por linha) e
   `depoimentos`; as outras línguas em `*_traducoes`. Sem o bloco no banco (antes do seed), valem os textos padrão abaixo. */

export { TAG_CURSO, BLOCOS, LIMITES_CURSO, TEXTOS_PADRAO } from "./textos-curso-base";
export type { TopoDaHome, Pilar, Numero, TextosDoCurso, Bloco } from "./textos-curso-base";

/** O português dos blocos (banco por cima dos padrões). */
export async function lerBlocosEmPortugues(): Promise<TextosDoCurso> {
  const linhas = await db.select().from(textosCurso);
  const saida = structuredClone(TEXTOS_PADRAO) as unknown as Record<string, Record<string, unknown>>;
  for (const l of linhas) if ((BLOCOS as string[]).includes(l.bloco)) saida[l.bloco] = { ...saida[l.bloco], ...l.conteudo };
  return saida as unknown as TextosDoCurso;
}

/** Os textos do curso no idioma pedido; o que faltar em um bloco traduzido vem em português. */
export async function obterTextosCurso(locale: Locale): Promise<TextosDoCurso> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_CURSO);
  const pt = await lerBlocosEmPortugues();
  if (locale === LOCALE_PADRAO) return pt;
  const trad = await db.select().from(textosCursoTraducoes).where(eq(textosCursoTraducoes.locale, locale));
  const saida = { ...pt } as unknown as Record<string, Record<string, unknown>>;
  for (const t of trad) {
    const base = saida[t.bloco];
    if (base) saida[t.bloco] = sobrepor(base, t.conteudo, Object.keys(base));
  }
  return saida as unknown as TextosDoCurso;
}

export interface DepoimentoPublico {
  id: string;
  nome: string;
  profissao: string;
  cidade: string;
  texto: string;
}

/** Depoimentos do site: só os visíveis E com a data da autorização recebida (sem ela, nunca aparece). */
export async function listarDepoimentos(locale: Locale): Promise<DepoimentoPublico[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_CURSO);
  const linhas = await db
    .select({ id: depoimentos.id, nome: depoimentos.nome, profissao: depoimentos.profissao, cidade: depoimentos.cidade, texto: depoimentos.texto })
    .from(depoimentos)
    .where(and(eq(depoimentos.visivel, true), isNotNull(depoimentos.autorizacaoRecebidaEm)))
    .orderBy(asc(depoimentos.ordem), asc(depoimentos.createdAt));
  if (locale === LOCALE_PADRAO || !linhas.length) return linhas;
  const trad = await db.select().from(depoimentosTraducoes).where(eq(depoimentosTraducoes.locale, locale));
  const porId = new Map(trad.map((t) => [t.depoimentoId, t.conteudo]));
  return linhas.map((l) => sobrepor(l, porId.get(l.id), ["profissao", "cidade", "texto"]));
}

export { temConteudo };
