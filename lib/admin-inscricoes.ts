import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { emailsEnvios, inscricoes, mensagensContato, turmas, type Conselho, type Situacao, type StatusEmail, type TipoEmail } from "@/db/schema";

/* Leituras da tela de inscrições do painel. Direto no banco, sem cache. */

export interface EmailDaLinha {
  id: string;
  tipo: TipoEmail;
  status: StatusEmail;
  tentativas: number;
  erro: string | null;
}

export interface InscricaoAdmin {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  profissao: string;
  conselho: Conselho;
  registro: string;
  querAvisos: boolean;
  situacao: Situacao;
  createdAt: Date;
  emails: EmailDaLinha[];
}

async function emailsDe(coluna: "inscricaoId" | "mensagemId", ids: string[]): Promise<Map<string, EmailDaLinha[]>> {
  const mapa = new Map<string, EmailDaLinha[]>();
  if (!ids.length) return mapa;
  const linhas = await db
    .select()
    .from(emailsEnvios)
    .where(inArray(emailsEnvios[coluna], ids))
    .orderBy(asc(emailsEnvios.createdAt));
  for (const l of linhas) {
    const chave = l[coluna];
    if (!chave) continue;
    const lista = mapa.get(chave) ?? [];
    lista.push({ id: l.id, tipo: l.tipo, status: l.status, tentativas: l.tentativas, erro: l.erro });
    mapa.set(chave, lista);
  }
  return mapa;
}

/** Inscrições de uma turma, da mais antiga para a mais nova (a ordem de chegada importa para a lista de espera). */
export async function listarInscricoes(turmaId: string): Promise<InscricaoAdmin[]> {
  const linhas = await db.select().from(inscricoes).where(eq(inscricoes.turmaId, turmaId)).orderBy(asc(inscricoes.createdAt));
  const emails = await emailsDe("inscricaoId", linhas.map((l) => l.id));
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    email: l.email,
    telefone: l.telefone,
    profissao: l.profissao,
    conselho: l.conselho,
    registro: l.registro,
    querAvisos: l.querAvisos,
    situacao: l.situacao,
    createdAt: l.createdAt,
    emails: emails.get(l.id) ?? [],
  }));
}

export interface MensagemAdmin {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  assunto: string;
  mensagem: string | null;
  createdAt: Date;
  emails: EmailDaLinha[];
}

export async function listarMensagens(limite = 20): Promise<MensagemAdmin[]> {
  const linhas = await db.select().from(mensagensContato).orderBy(desc(mensagensContato.createdAt)).limit(limite);
  const emails = await emailsDe("mensagemId", linhas.map((l) => l.id));
  return linhas.map((l) => ({ ...l, emails: emails.get(l.id) ?? [] }));
}

/** Para o CSV: a turma (sem excluídas) e suas inscrições. */
export async function turmaParaExportar(id: string) {
  const [t] = await db.select({ id: turmas.id, slug: turmas.slug, titulo: turmas.titulo }).from(turmas).where(and(eq(turmas.id, id), isNull(turmas.excluidaEm)));
  return t ?? null;
}
