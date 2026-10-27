import { createElement } from "react";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { inscricoes, mensagensContato, SITUACOES_QUE_OCUPAM, turmas, type TipoEmail } from "@/db/schema";
import { formatPeriodo } from "@/lib/datas";
import { destinoDaEquipe, type MensagemEmail } from "./index";
import { ContatoAviso } from "./modelos/ContatoAviso";
import { InscricaoAviso } from "./modelos/InscricaoAviso";
import { InscricaoConfirmacao } from "./modelos/InscricaoConfirmacao";
import { ROTULO_SITUACAO } from "@/lib/situacoes";
import { urlDoSite } from "./textos";

export interface OrigemEmail {
  inscricaoId?: string | null;
  mensagemId?: string | null;
}

/**
 * Monta o e-mail a partir dos dados ATUAIS do banco. É o mesmo caminho do primeiro envio e do "Reenviar":
 * se a turma mudou de horário entre uma tentativa e outra, o reenvio já sai com o dado novo.
 * Devolve null se a inscrição ou a mensagem não existe mais.
 */
export async function montarEmail(tipo: TipoEmail, origem: OrigemEmail): Promise<MensagemEmail | null> {
  if (tipo === "CONTATO_AVISO") {
    if (!origem.mensagemId) return null;
    const [m] = await db.select().from(mensagensContato).where(eq(mensagensContato.id, origem.mensagemId));
    if (!m) return null;
    return {
      para: destinoDaEquipe(),
      assunto: `Contato pelo site: ${m.assunto}`,
      responderPara: m.email,
      react: createElement(ContatoAviso, { nome: m.nome, email: m.email, telefone: m.telefone, assunto: m.assunto, mensagem: m.mensagem }),
    };
  }

  if (!origem.inscricaoId) return null;
  const [linha] = await db
    .select({ ins: inscricoes, turma: turmas })
    .from(inscricoes)
    .innerJoin(turmas, eq(turmas.id, inscricoes.turmaId))
    .where(eq(inscricoes.id, origem.inscricaoId));
  if (!linha) return null;
  const { ins, turma } = linha;

  const periodo = formatPeriodo(turma.inicio, turma.fim ?? undefined);
  const listaEspera = ins.situacao === "LISTA_ESPERA";

  if (tipo === "INSCRICAO_CONFIRMACAO") {
    const local = turma.modalidade === "ONLINE" ? "Online, ao vivo" : [turma.local, turma.cidade].filter(Boolean).join(", ");
    return {
      para: ins.email,
      assunto: listaEspera ? `Lista de espera: ${turma.titulo}` : `Inscrição recebida: ${turma.titulo}`,
      react: createElement(InscricaoConfirmacao, {
        nome: ins.nome,
        turma: { titulo: turma.titulo, periodo, horario: turma.horario, local },
        conselho: ins.conselho,
        registro: ins.registro,
        listaEspera,
        link: `${urlDoSite()}/agenda/${turma.slug}`,
      }),
    };
  }

  // INSCRICAO_AVISO
  const [{ n }] = await db
    .select({ n: count() })
    .from(inscricoes)
    .where(and(eq(inscricoes.turmaId, turma.id), inArray(inscricoes.situacao, SITUACOES_QUE_OCUPAM)));
  return {
    para: destinoDaEquipe(),
    assunto: `Nova inscrição: ${ins.nome} · ${turma.tituloCurto ?? turma.titulo}`,
    responderPara: ins.email,
    react: createElement(InscricaoAviso, {
      nome: ins.nome,
      email: ins.email,
      telefone: ins.telefone,
      profissao: ins.profissao,
      conselho: ins.conselho,
      registro: ins.registro,
      situacao: ROTULO_SITUACAO[ins.situacao],
      querAvisos: ins.querAvisos,
      turma: { titulo: turma.titulo, periodo },
      vagas: `${n} de ${turma.vagas} vagas ocupadas`,
      linkPainel: `${urlDoSite()}/admin/inscricoes?turma=${turma.id}`,
    }),
  };
}
