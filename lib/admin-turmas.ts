import { and, asc, count, desc, eq, getTableColumns, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { inscricoes, SITUACOES_QUE_OCUPAM, turmas } from "@/db/schema";
import type { EventStatus } from "./agenda";
import { calcularStatus } from "./status";

/* Leituras do painel. Direto no banco, sem cache: a equipe precisa ver o que acabou de salvar. */

export type StatusAdmin = EventStatus | "rascunho";

export interface TurmaAdmin {
  id: string;
  slug: string;
  titulo: string;
  tituloCurto: string | null;
  resumo: string;
  descricao: string;
  modalidade: "PRESENCIAL" | "ONLINE";
  publicacao: "RASCUNHO" | "EM_BREVE" | "PUBLICADO";
  inicio: string;
  fim: string | null;
  horario: string;
  cidade: string;
  local: string | null;
  vagas: number;
  precoCentavos: number | null;
  parcelamento: string | null;
  fotoUrl: string;
  fotoAlt: string;
  publicoAlvo: string[];
  aprendizados: string[];
  programacao: import("@/db/schema").DiaProgramacao[];
  faq: import("@/db/schema").PerguntaFaq[];
  ocupadas: number;
  listaEspera: number;
  status: StatusAdmin;
}

const ocupadasSql = sql<number>`count(${inscricoes.id}) filter (where ${inArray(inscricoes.situacao, SITUACOES_QUE_OCUPAM)})::int`;
const esperaSql = sql<number>`count(${inscricoes.id}) filter (where ${inscricoes.situacao} = 'LISTA_ESPERA')::int`;

async function consultar(id?: string): Promise<TurmaAdmin[]> {
  const linhas = await db
    .select({ ...getTableColumns(turmas), ocupadas: ocupadasSql, listaEspera: esperaSql })
    .from(turmas)
    .leftJoin(inscricoes, eq(inscricoes.turmaId, turmas.id))
    .where(and(isNull(turmas.excluidaEm), id ? eq(turmas.id, id) : undefined))
    .groupBy(turmas.id)
    .orderBy(asc(turmas.inicio), asc(turmas.slug));

  return linhas.map((l) => ({
    ...l,
    status: calcularStatus({ publicacao: l.publicacao, inicio: l.inicio, fim: l.fim, vagas: l.vagas, ocupadas: l.ocupadas }) ?? "rascunho",
  }));
}

export const listarTurmasAdmin = () => consultar();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function obterTurmaAdmin(id: string): Promise<TurmaAdmin | null> {
  if (!UUID.test(id)) return null;
  return (await consultar(id))[0] ?? null;
}

export async function inscricoesRecentes(limite = 4) {
  return db
    .select({ id: inscricoes.id, nome: inscricoes.nome, createdAt: inscricoes.createdAt, turma: turmas.tituloCurto, titulo: turmas.titulo, inicio: turmas.inicio })
    .from(inscricoes)
    .innerJoin(turmas, eq(turmas.id, inscricoes.turmaId))
    .where(isNull(turmas.excluidaEm))
    .orderBy(desc(inscricoes.createdAt))
    .limit(limite);
}

export async function totalARConferir(): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(inscricoes)
    .innerJoin(turmas, eq(turmas.id, inscricoes.turmaId))
    .where(and(eq(inscricoes.situacao, "REGISTRO_A_CONFERIR"), isNull(turmas.excluidaEm)));
  return n;
}
