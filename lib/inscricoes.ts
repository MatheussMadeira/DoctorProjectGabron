import { and, count, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { inscricoes, SITUACOES_QUE_OCUPAM, turmas, type Conselho, type Situacao } from "@/db/schema";
import { hojeISO } from "./datas";

export interface NovaInscricao {
  slug: string;
  nome: string;
  email: string;
  telefone: string;
  profissao: string;
  conselho: Conselho;
  registro: string;
  querAvisos: boolean;
}

export class TurmaIndisponivelError extends Error {
  constructor(public motivo: "inexistente" | "em-breve" | "encerrada") {
    super(`Turma indisponível para inscrição: ${motivo}`);
  }
}

/** A mesma pessoa (mesmo e-mail) já tem inscrição ativa nesta turma. */
export class InscricaoDuplicadaError extends Error {
  constructor() {
    super("Já existe uma inscrição com este e-mail nesta turma.");
  }
}

export interface InscricaoCriada {
  id: string;
  turmaId: string;
  slug: string;
  situacao: Situacao;
}

/**
 * Grava uma inscrição sem deixar duas pessoas ficarem com a última vaga.
 *
 * A transação trava a linha da turma com SELECT ... FOR UPDATE, conta as vagas ocupadas direto no banco
 * (nunca do cache) e só então grava. Se as vagas acabaram, a inscrição entra como LISTA_ESPERA.
 * Inscrições simultâneas na mesma turma esperam a vez; turmas diferentes não se bloqueiam.
 *
 * Quem chama (a Server Action da Fase 6) valida os dados, envia os e-mails e invalida o cache:
 * updateTag(tagTurma(slug)) e updateTag(TAG_TURMAS).
 */
export async function criarInscricao(dados: NovaInscricao): Promise<InscricaoCriada> {
  return db.transaction(async (tx) => {
    const [turma] = await tx.select().from(turmas).where(eq(turmas.slug, dados.slug)).for("update");

    if (!turma || turma.excluidaEm || turma.publicacao === "RASCUNHO") throw new TurmaIndisponivelError("inexistente");
    if ((turma.fim ?? turma.inicio) < hojeISO()) throw new TurmaIndisponivelError("encerrada");
    if (turma.publicacao === "EM_BREVE") throw new TurmaIndisponivelError("em-breve");

    const [duplicada] = await tx
      .select({ id: inscricoes.id })
      .from(inscricoes)
      .where(and(eq(inscricoes.turmaId, turma.id), sql`lower(${inscricoes.email}) = ${dados.email.toLowerCase()}`, ne(inscricoes.situacao, "CANCELADA")));
    if (duplicada) throw new InscricaoDuplicadaError();

    const [{ ocupadas }] = await tx
      .select({ ocupadas: count() })
      .from(inscricoes)
      .where(and(eq(inscricoes.turmaId, turma.id), inArray(inscricoes.situacao, SITUACOES_QUE_OCUPAM)));

    const situacao: Situacao = ocupadas >= turma.vagas ? "LISTA_ESPERA" : "AGUARDANDO_PAGAMENTO";

    const [criada] = await tx
      .insert(inscricoes)
      .values({
        turmaId: turma.id,
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        profissao: dados.profissao,
        conselho: dados.conselho,
        registro: dados.registro,
        aceitePrivacidadeEm: new Date(),
        querAvisos: dados.querAvisos,
        situacao,
      })
      .returning({ id: inscricoes.id });

    return { id: criada.id, turmaId: turma.id, slug: turma.slug, situacao };
  });
}
