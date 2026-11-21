import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { alumni, alumniTurmas } from "@/db/schema";

/* Leituras do painel (Alumni): tudo, inclusive o que está oculto ou sem autorização. */

export interface AlumniTurmaAdmin {
  id: string;
  turmaId: string | null;
  titulo: string;
  dataInicio: string | null;
  dataFim: string | null;
  cidade: string;
  resumo: string;
  numeroAlunos: number | null;
  fotoUrl: string | null;
  fotoAlt: string | null;
  videoUrl: string | null;
  videoLegendaUrl: string | null;
  visivel: boolean;
  /** Quantos alunos desta turma estão cadastrados e quantos já estão autorizados e visíveis. */
  alunos: number;
  autorizados: number;
}

export async function listarAlumniTurmasAdmin(): Promise<AlumniTurmaAdmin[]> {
  const linhas = await db
    .select({
      id: alumniTurmas.id,
      turmaId: alumniTurmas.turmaId,
      titulo: alumniTurmas.titulo,
      dataInicio: alumniTurmas.dataInicio,
      dataFim: alumniTurmas.dataFim,
      cidade: alumniTurmas.cidade,
      resumo: alumniTurmas.resumo,
      numeroAlunos: alumniTurmas.numeroAlunos,
      fotoUrl: alumniTurmas.fotoUrl,
      fotoAlt: alumniTurmas.fotoAlt,
      videoUrl: alumniTurmas.videoUrl,
      videoLegendaUrl: alumniTurmas.videoLegendaUrl,
      visivel: alumniTurmas.visivel,
      alunos: sql<number>`(select count(*)::int from ${alumni} where ${alumni.alumniTurmaId} = ${alumniTurmas.id})`,
      autorizados: sql<number>`(select count(*)::int from ${alumni} where ${alumni.alumniTurmaId} = ${alumniTurmas.id} and ${alumni.visivel} and ${alumni.autorizacaoRecebidaEm} is not null)`,
    })
    .from(alumniTurmas)
    .orderBy(desc(alumniTurmas.dataInicio), asc(alumniTurmas.ordem), asc(alumniTurmas.titulo));
  return linhas;
}

export interface AlumniAdmin {
  id: string;
  alumniTurmaId: string | null;
  turma: string | null;
  nome: string;
  profissao: string;
  cidade: string;
  uf: string | null;
  pais: string;
  latitude: number | null;
  longitude: number | null;
  fotoUrl: string | null;
  fotoAlt: string | null;
  autorizacaoRecebidaEm: string | null;
  visivel: boolean;
  /** Veio de uma inscrição da agenda (importado). */
  importado: boolean;
}

export async function listarAlumniAdmin(): Promise<AlumniAdmin[]> {
  const linhas = await db
    .select({
      id: alumni.id,
      alumniTurmaId: alumni.alumniTurmaId,
      turma: alumniTurmas.titulo,
      nome: alumni.nome,
      profissao: alumni.profissao,
      cidade: alumni.cidade,
      uf: alumni.uf,
      pais: alumni.pais,
      latitude: alumni.latitude,
      longitude: alumni.longitude,
      fotoUrl: alumni.fotoUrl,
      fotoAlt: alumni.fotoAlt,
      autorizacaoRecebidaEm: alumni.autorizacaoRecebidaEm,
      visivel: alumni.visivel,
      inscricaoId: alumni.inscricaoId,
    })
    .from(alumni)
    .leftJoin(alumniTurmas, eq(alumniTurmas.id, alumni.alumniTurmaId))
    .orderBy(asc(alumni.nome));
  return linhas.map(({ inscricaoId, ...resto }) => ({ ...resto, importado: inscricaoId != null }));
}
