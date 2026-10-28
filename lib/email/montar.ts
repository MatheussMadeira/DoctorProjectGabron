import { createElement } from "react";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { inscricoes, mensagensContato, SITUACOES_QUE_OCUPAM, turmas, type TipoEmail } from "@/db/schema";
import { obterSiteAtual } from "@/lib/configuracoes";
import { formatPeriodo } from "@/lib/datas";
import { ROTULO_SITUACAO } from "@/lib/situacoes";
import { destinatariosDaEquipe } from "./destinatarios";
import type { MensagemEmail } from "./index";
import type { ContextoEmail } from "./modelos/Base";
import { ContatoAviso } from "./modelos/ContatoAviso";
import { InscricaoAviso } from "./modelos/InscricaoAviso";
import { InscricaoConfirmacao } from "./modelos/InscricaoConfirmacao";
import { VagaConfirmada } from "./modelos/VagaConfirmada";
import { urlDoSite } from "./textos";

export interface OrigemEmail {
  inscricaoId?: string | null;
  mensagemId?: string | null;
}

/** Logo em PNG com endereço absoluto: public/logos/logo-horizontal-negativo-2x.png servido pelo próprio site (SITE_URL). */
export const CAMINHO_LOGO_EMAIL = "/logos/logo-horizontal-negativo-2x.png";

/** O que todo e-mail leva: logo (URL absoluta) e a linha legal com CRM/RQE, lidos de Configurações no momento do envio. */
export async function contextoDoEmail(): Promise<ContextoEmail> {
  const site = await obterSiteAtual();
  return { logoUrl: `${urlDoSite()}${CAMINHO_LOGO_EMAIL}`, legal: site.legal };
}

/**
 * Monta o e-mail a partir dos dados ATUAIS do banco. É o mesmo caminho do primeiro envio e do "Reenviar":
 * se a turma mudou de horário entre uma tentativa e outra, o reenvio já sai com o dado novo.
 * Devolve null se a inscrição ou a mensagem não existe mais.
 */
export async function montarEmail(tipo: TipoEmail, origem: OrigemEmail): Promise<MensagemEmail | null> {
  const contexto = await contextoDoEmail();

  if (tipo === "CONTATO_AVISO") {
    if (!origem.mensagemId) return null;
    const [m] = await db.select().from(mensagensContato).where(eq(mensagensContato.id, origem.mensagemId));
    if (!m) return null;
    return {
      para: await destinatariosDaEquipe(),
      assunto: `Contato pelo site: ${m.assunto}`,
      responderPara: m.email,
      react: createElement(ContatoAviso, { nome: m.nome, email: m.email, telefone: m.telefone, assunto: m.assunto, mensagem: m.mensagem, contexto }),
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
  const local = turma.modalidade === "ONLINE" ? "Online, ao vivo" : [turma.local, turma.cidade].filter(Boolean).join(", ");
  const link = `${urlDoSite()}/agenda/${turma.slug}`;

  if (tipo === "INSCRICAO_CONFIRMACAO") {
    const listaEspera = ins.situacao === "LISTA_ESPERA";
    return {
      para: [ins.email],
      assunto: listaEspera ? `Lista de espera: ${turma.titulo}` : `Inscrição recebida: ${turma.titulo}`,
      react: createElement(InscricaoConfirmacao, {
        nome: ins.nome,
        turma: { titulo: turma.titulo, periodo, horario: turma.horario, local },
        conselho: ins.conselho,
        registro: ins.registro,
        listaEspera,
        link,
        contexto,
      }),
    };
  }

  if (tipo === "INSCRICAO_VAGA_CONFIRMADA") {
    return {
      para: [ins.email],
      assunto: `Vaga confirmada: ${turma.titulo}`,
      react: createElement(VagaConfirmada, { nome: ins.nome, turma: { titulo: turma.titulo, periodo, horario: turma.horario, local }, link, contexto }),
    };
  }

  // INSCRICAO_AVISO
  const [{ n }] = await db
    .select({ n: count() })
    .from(inscricoes)
    .where(and(eq(inscricoes.turmaId, turma.id), inArray(inscricoes.situacao, SITUACOES_QUE_OCUPAM)));
  return {
    para: await destinatariosDaEquipe(),
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
      contexto,
    }),
  };
}
