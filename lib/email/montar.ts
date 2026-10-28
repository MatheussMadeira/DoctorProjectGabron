import { createElement } from "react";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { inscricoes, mensagensContato, SITUACOES_QUE_OCUPAM, turmas, turmasTraducoes, type TipoEmail } from "@/db/schema";
import { comPrefixo, ehLocale, LOCALE_PADRAO, type Locale } from "@/lib/i18n/idiomas";
import { sobrepor } from "@/lib/i18n/estrutura";
import { criarTradutor } from "@/lib/i18n/mensagens";
import { ROTULO_SITUACAO } from "@/lib/situacoes";
import { destinatariosDaEquipe } from "./destinatarios";
import { periodoDaTurma } from "./formatar";
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

/**
 * O que todo e-mail leva: logo (URL absoluta), a linha legal e os tradutores, no idioma do e-mail.
 * E-mails para a pessoa: o idioma dela. Avisos internos e e-mail de teste: pt-BR (é o padrão). Roda em after(), sem contexto de requisição.
 */
export async function contextoDoEmail(locale: Locale = LOCALE_PADRAO): Promise<ContextoEmail> {
  const t = criarTradutor(locale, "Emails");
  return {
    logoUrl: `${urlDoSite()}${CAMINHO_LOGO_EMAIL}`,
    legal: t("legal", { ano: new Date().getFullYear() }),
    locale,
    t,
    ti: criarTradutor(LOCALE_PADRAO, "EmailsInternos"),
  };
}

/** Campos da turma que o e-mail mostra e que existem por idioma (o que faltar da tradução continua em português). */
const CAMPOS_DA_TURMA = ["titulo", "horario", "cidade", "local"] as const;

async function turmaNoIdioma<T extends { id: string; titulo: string; horario: string; cidade: string; local: string | null }>(turma: T, locale: Locale): Promise<T> {
  if (locale === LOCALE_PADRAO) return turma;
  const [trad] = await db.select().from(turmasTraducoes).where(and(eq(turmasTraducoes.turmaId, turma.id), eq(turmasTraducoes.locale, locale)));
  return sobrepor(turma, trad?.conteudo, CAMPOS_DA_TURMA);
}

/**
 * Monta o e-mail a partir dos dados ATUAIS do banco. É o mesmo caminho do primeiro envio e do "Reenviar":
 * se a turma mudou de horário entre uma tentativa e outra, o reenvio já sai com o dado novo. O e-mail para a pessoa sai no
 * idioma guardado na inscrição (também no Reenviar); os avisos para a equipe saem sempre em português.
 * Devolve null se a inscrição ou a mensagem não existe mais.
 */
export async function montarEmail(tipo: TipoEmail, origem: OrigemEmail): Promise<MensagemEmail | null> {
  const contextoInterno = await contextoDoEmail(LOCALE_PADRAO);

  if (tipo === "CONTATO_AVISO") {
    if (!origem.mensagemId) return null;
    const [m] = await db.select().from(mensagensContato).where(eq(mensagensContato.id, origem.mensagemId));
    if (!m) return null;
    return {
      para: await destinatariosDaEquipe(),
      assunto: contextoInterno.ti("contato.assunto", { assunto: m.assunto }),
      responderPara: m.email,
      react: createElement(ContatoAviso, { nome: m.nome, email: m.email, telefone: m.telefone, assunto: m.assunto, mensagem: m.mensagem, contexto: contextoInterno }),
    };
  }

  if (!origem.inscricaoId) return null;
  const [linha] = await db
    .select({ ins: inscricoes, turma: turmas })
    .from(inscricoes)
    .innerJoin(turmas, eq(turmas.id, inscricoes.turmaId))
    .where(eq(inscricoes.id, origem.inscricaoId));
  if (!linha) return null;
  const { ins } = linha;
  const turmaPt = linha.turma;
  const idioma: Locale = ehLocale(ins.idioma) ? ins.idioma : LOCALE_PADRAO;

  if (tipo === "INSCRICAO_CONFIRMACAO" || tipo === "INSCRICAO_VAGA_CONFIRMADA") {
    const contexto = await contextoDoEmail(idioma);
    const t = contexto.t;
    const turma = await turmaNoIdioma(turmaPt, idioma);
    const periodo = periodoDaTurma(turma.inicio, turma.fim, idioma);
    const local = turma.modalidade === "ONLINE" ? t("localOnline") : [turma.local, turma.cidade].filter(Boolean).join(", ");
    const dadosDaTurma = { titulo: turma.titulo, periodo, horario: turma.horario, local };
    const link = `${urlDoSite()}${comPrefixo(idioma, `/agenda/${turmaPt.slug}`)}`;

    if (tipo === "INSCRICAO_VAGA_CONFIRMADA") {
      return {
        para: [ins.email],
        assunto: t("vagaConfirmada.assunto", { turma: turma.titulo }),
        react: createElement(VagaConfirmada, { nome: ins.nome, turma: dadosDaTurma, link, contexto }),
      };
    }

    const listaEspera = ins.situacao === "LISTA_ESPERA";
    return {
      para: [ins.email],
      assunto: listaEspera ? t("confirmacao.assuntoEspera", { turma: turma.titulo }) : t("confirmacao.assunto", { turma: turma.titulo }),
      react: createElement(InscricaoConfirmacao, { nome: ins.nome, turma: dadosDaTurma, conselho: ins.conselho, registro: ins.registro, listaEspera, link, contexto }),
    };
  }

  // INSCRICAO_AVISO (interno, em português; o título da turma é o do português, que é o que a equipe cadastrou)
  const ti = contextoInterno.ti;
  const [{ n }] = await db
    .select({ n: count() })
    .from(inscricoes)
    .where(and(eq(inscricoes.turmaId, turmaPt.id), inArray(inscricoes.situacao, SITUACOES_QUE_OCUPAM)));
  const periodo = periodoDaTurma(turmaPt.inicio, turmaPt.fim, LOCALE_PADRAO);
  return {
    para: await destinatariosDaEquipe(),
    assunto: ti("inscricao.assunto", { nome: ins.nome, turma: turmaPt.tituloCurto ?? turmaPt.titulo }),
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
      turma: { titulo: turmaPt.titulo, periodo },
      vagas: ti("inscricao.vagasOcupadas", { ocupadas: n, total: turmaPt.vagas }),
      linkPainel: `${urlDoSite()}/admin/inscricoes?turma=${turmaPt.id}`,
      contexto: contextoInterno,
    }),
  };
}
