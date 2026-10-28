import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fotosGaleria, professores, turmaProfessores } from "@/db/schema";
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

/** Professores visíveis, na ordem do site. */
export async function listarProfessores(): Promise<ProfessorPublico[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_PROFESSORES);
  return db.select(colunas).from(professores).where(eq(professores.visivel, true)).orderBy(asc(professores.ordem), asc(professores.nome));
}

/** Os professores de uma turma (só os visíveis), na ordem escolhida no editar turma. */
export async function professoresDaTurma(turmaId: string, slug: string): Promise<ProfessorPublico[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_PROFESSORES, tagTurma(slug));
  return db
    .select(colunas)
    .from(turmaProfessores)
    .innerJoin(professores, eq(professores.id, turmaProfessores.professorId))
    .where(and(eq(turmaProfessores.turmaId, turmaId), eq(professores.visivel, true)))
    .orderBy(asc(turmaProfessores.ordem), asc(professores.nome));
}

export interface FotoGaleriaPublica {
  src: string;
  alt: string;
}

/** Galeria de "Sobre o curso", na ordem do admin. A primeira foto sai maior. */
export async function listarGaleria(): Promise<FotoGaleriaPublica[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_GALERIA);
  const linhas = await db.select({ src: fotosGaleria.url, alt: fotosGaleria.alt }).from(fotosGaleria).orderBy(asc(fotosGaleria.ordem), asc(fotosGaleria.createdAt));
  return linhas;
}
