import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fotosGaleria, fotosGaleriaTraducoes, professores, professoresTraducoes, turmaProfessores } from "@/db/schema";
import { sobrepor } from "./i18n/estrutura";
import { LOCALE_PADRAO, tagIdioma, type Locale } from "./i18n/idiomas";
import { tagTurma } from "./turmas";

/* Leituras públicas de professores e galeria: em cache, com tag. Quem salva no admin chama updateTag das tags abaixo
   (e a das turmas, quando a escolha de professores de uma turma muda). */

export const TAG_PROFESSORES = "professores";
export const TAG_GALERIA = "galeria";

export interface ProfessorPublico {
  id: string;
  nome: string;
  funcao: string;
  registro: string;
  bio: string;
  fotoUrl: string | null;
  fotoAlt: string | null;
}

const colunas = {
  id: professores.id,
  nome: professores.nome,
  funcao: professores.funcao,
  registro: professores.registro,
  bio: professores.bio,
  fotoUrl: professores.fotoUrl,
  fotoAlt: professores.fotoAlt,
};

async function traduzirProfessores(lista: ProfessorPublico[], locale: Locale): Promise<ProfessorPublico[]> {
  if (locale === LOCALE_PADRAO || !lista.length) return lista;
  const trad = await db.select().from(professoresTraducoes).where(eq(professoresTraducoes.locale, locale));
  const porId = new Map(trad.map((t) => [t.professorId, t.conteudo]));
  return lista.map((p) => sobrepor(p, porId.get(p.id), ["funcao", "bio", "fotoAlt"]));
}

/** Professores visíveis, na ordem do site, no idioma (o que faltar da tradução vem em português). */
export async function listarProfessores(locale: Locale = LOCALE_PADRAO): Promise<ProfessorPublico[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_PROFESSORES, tagIdioma(locale));
  const lista = await db.select(colunas).from(professores).where(eq(professores.visivel, true)).orderBy(asc(professores.ordem), asc(professores.nome));
  return traduzirProfessores(lista, locale);
}

/** Os professores de uma turma (só os visíveis), na ordem escolhida no editar turma. */
export async function professoresDaTurma(locale: Locale, turmaId: string, slug: string): Promise<ProfessorPublico[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_PROFESSORES, tagTurma(slug), tagIdioma(locale));
  const lista = await db
    .select(colunas)
    .from(turmaProfessores)
    .innerJoin(professores, eq(professores.id, turmaProfessores.professorId))
    .where(and(eq(turmaProfessores.turmaId, turmaId), eq(professores.visivel, true)))
    .orderBy(asc(turmaProfessores.ordem), asc(professores.nome));
  return traduzirProfessores(lista, locale);
}

export interface FotoGaleriaPublica {
  src: string;
  alt: string;
}

/** Galeria de "Sobre o curso", na ordem do admin, com a descrição no idioma. A primeira foto sai maior. */
export async function listarGaleria(locale: Locale = LOCALE_PADRAO): Promise<FotoGaleriaPublica[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_GALERIA, tagIdioma(locale));
  const linhas = await db.select({ id: fotosGaleria.id, src: fotosGaleria.url, alt: fotosGaleria.alt }).from(fotosGaleria).orderBy(asc(fotosGaleria.ordem), asc(fotosGaleria.createdAt));
  if (locale === LOCALE_PADRAO || !linhas.length) return linhas.map(({ src, alt }) => ({ src, alt }));
  const trad = await db.select().from(fotosGaleriaTraducoes).where(eq(fotosGaleriaTraducoes.locale, locale));
  const porId = new Map(trad.map((t) => [t.fotoId, t.conteudo]));
  return linhas.map((l) => ({ src: l.src, alt: sobrepor({ alt: l.alt }, porId.get(l.id), ["alt"]).alt }));
}
