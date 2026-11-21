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

export interface DepoimentoAdmin {
  id: string;
  nome: string;
  profissao: string;
  cidade: string;
  texto: string;
  ordem: number;
  visivel: boolean;
  autorizacaoRecebidaEm: string | null;
  /** Enviado pelo site e ainda não aprovado. */
  pendente: boolean;
  email: string | null;
  idioma: string | null;
  /** Dia (AAAA-MM-DD) em que a pessoa marcou a autorização no formulário. */
  consentimentoEm: string | null;
  uf: string | null;
  pais: string;
  latitude: number | null;
  longitude: number | null;
  fotoUrl: string | null;
  fotoAlt: string | null;
  videoUrl: string | null;
  videoLegendaUrl: string | null;
}

export async function listarDepoimentosAdmin(): Promise<DepoimentoAdmin[]> {
  const { depoimentos } = await import("@/db/schema");
  return db
    .select({ id: depoimentos.id, nome: depoimentos.nome, profissao: depoimentos.profissao, cidade: depoimentos.cidade, texto: depoimentos.texto, ordem: depoimentos.ordem, visivel: depoimentos.visivel, autorizacaoRecebidaEm: depoimentos.autorizacaoRecebidaEm, pendente: depoimentos.pendente, email: depoimentos.email, idioma: depoimentos.idioma, consentimentoEm: sql<string | null>`to_char(${depoimentos.consentimentoEm} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`, uf: depoimentos.uf, pais: depoimentos.pais, latitude: depoimentos.latitude, longitude: depoimentos.longitude, fotoUrl: depoimentos.fotoUrl, fotoAlt: depoimentos.fotoAlt, videoUrl: depoimentos.videoUrl, videoLegendaUrl: depoimentos.videoLegendaUrl })
    .from(depoimentos)
    .orderBy(asc(depoimentos.ordem), asc(depoimentos.createdAt));
}
