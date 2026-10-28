import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { fotosGaleria, professores, turmaProfessores } from "@/db/schema";

/* Leituras do painel (direto no banco, sem cache). */

export interface ProfessorAdmin {
  id: string;
  nome: string;
  funcao: string;
  registro: string;
  bio: string;
  fotoUrl: string | null;
  fotoAlt: string | null;
  visivel: boolean;
  ordem: number;
  turmas: number;
}

export async function listarProfessoresAdmin(): Promise<ProfessorAdmin[]> {
  const linhas = await db
    .select({
      id: professores.id,
      nome: professores.nome,
      funcao: professores.funcao,
      registro: professores.registro,
      bio: professores.bio,
      fotoUrl: professores.fotoUrl,
      fotoAlt: professores.fotoAlt,
      visivel: professores.visivel,
      ordem: professores.ordem,
      turmas: sql<number>`count(${turmaProfessores.turmaId})::int`,
    })
    .from(professores)
    .leftJoin(turmaProfessores, eq(turmaProfessores.professorId, professores.id))
    .groupBy(professores.id)
    .orderBy(asc(professores.ordem), asc(professores.nome));
  return linhas;
}

/** Professores escolhidos para uma turma, na ordem. */
export async function idsDeProfessoresDaTurma(turmaId: string): Promise<string[]> {
  const linhas = await db.select({ id: turmaProfessores.professorId }).from(turmaProfessores).where(eq(turmaProfessores.turmaId, turmaId)).orderBy(asc(turmaProfessores.ordem));
  return linhas.map((l) => l.id);
}

export interface FotoGaleriaAdmin {
  id: string;
  url: string;
  alt: string;
}

export async function listarGaleriaAdmin(): Promise<FotoGaleriaAdmin[]> {
  return db.select({ id: fotosGaleria.id, url: fotosGaleria.url, alt: fotosGaleria.alt }).from(fotosGaleria).orderBy(asc(fotosGaleria.ordem), asc(fotosGaleria.createdAt));
}
