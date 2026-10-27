import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/* Schema da seção 3 de site-dra-ana-paula/docs/ESPECIFICACAO.md. */

export const modalidadeEnum = pgEnum("modalidade", ["PRESENCIAL", "ONLINE"]);
export const publicacaoEnum = pgEnum("publicacao", ["RASCUNHO", "EM_BREVE", "PUBLICADO"]);
export const conselhoEnum = pgEnum("conselho", ["CRM", "CRO", "CRBM", "CRF", "Outro"]);
export const situacaoEnum = pgEnum("situacao_inscricao", [
  "AGUARDANDO_PAGAMENTO",
  "REGISTRO_A_CONFERIR",
  "CONFIRMADA",
  "LISTA_ESPERA",
  "CANCELADA",
]);
export const papelEnum = pgEnum("papel_usuario", ["ADMIN", "EQUIPE"]);
export const tipoEmailEnum = pgEnum("tipo_email", ["INSCRICAO_CONFIRMACAO", "INSCRICAO_AVISO", "CONTATO_AVISO"]);
export const statusEmailEnum = pgEnum("status_email", ["PENDENTE", "ENVIADO", "FALHOU"]);

export type Modalidade = (typeof modalidadeEnum.enumValues)[number];
export type Publicacao = (typeof publicacaoEnum.enumValues)[number];
export type Conselho = (typeof conselhoEnum.enumValues)[number];
export type Situacao = (typeof situacaoEnum.enumValues)[number];
export type Papel = (typeof papelEnum.enumValues)[number];
export type TipoEmail = (typeof tipoEmailEnum.enumValues)[number];
export type StatusEmail = (typeof statusEmailEnum.enumValues)[number];

/** Situações que ocupam uma vaga. LISTA_ESPERA e CANCELADA não ocupam. */
export const SITUACOES_QUE_OCUPAM: Situacao[] = ["AGUARDANDO_PAGAMENTO", "REGISTRO_A_CONFERIR", "CONFIRMADA"];

export interface ItemProgramacao {
  time?: string;
  title: string;
  description?: string;
  duration?: string;
}
export interface DiaProgramacao {
  titulo: string;
  itens: ItemProgramacao[];
}
export interface PerguntaFaq {
  q: string;
  a: string;
}

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const turmas = pgTable(
  "turmas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Único. Gerado do título + mês/ano ("modulo-essencial-nov-2026"). */
    slug: text("slug").notNull().unique(),
    titulo: text("titulo").notNull(),
    /** Versão curta para faixas de chamada ("Módulo essencial"). Vazio = usa o título. */
    tituloCurto: text("titulo_curto"),
    /** Uma frase. */
    resumo: text("resumo").notNull(),
    /** Texto longo; parágrafos separados por uma linha em branco. */
    descricao: text("descricao").notNull(),
    modalidade: modalidadeEnum("modalidade").notNull(),
    publicacao: publicacaoEnum("publicacao").notNull().default("RASCUNHO"),
    inicio: date("inicio", { mode: "string" }).notNull(),
    fim: date("fim", { mode: "string" }),
    /** Texto livre: "8h às 18h". */
    horario: text("horario").notNull(),
    /** Presencial: "Belo Horizonte, MG". Online: "Ao vivo". */
    cidade: text("cidade").notNull(),
    local: text("local"),
    vagas: integer("vagas").notNull().default(0),
    /** Nulo enquanto o valor real não foi definido; o site mostra o placeholder "R$ 0.000". */
    precoCentavos: integer("preco_centavos"),
    /** Texto: "ou 10x de R$ 000". */
    parcelamento: text("parcelamento"),
    fotoUrl: text("foto_url").notNull(),
    fotoAlt: text("foto_alt").notNull(),
    publicoAlvo: text("publico_alvo").array().notNull().default(sql`'{}'::text[]`),
    aprendizados: text("aprendizados").array().notNull().default(sql`'{}'::text[]`),
    programacao: jsonb("programacao").$type<DiaProgramacao[]>().notNull().default(sql`'[]'::jsonb`),
    faq: jsonb("faq").$type<PerguntaFaq[]>().notNull().default(sql`'[]'::jsonb`),
    /** Exclusão lógica: as inscrições ficam arquivadas. */
    excluidaEm: timestamp("excluida_em", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("turmas_vagas_nao_negativas", sql`${t.vagas} >= 0`),
    check("turmas_fim_depois_do_inicio", sql`${t.fim} is null or ${t.fim} >= ${t.inicio}`),
    index("turmas_publicacao_inicio_idx").on(t.publicacao, t.inicio),
  ],
);

export const inscricoes = pgTable(
  "inscricoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    turmaId: uuid("turma_id")
      .notNull()
      .references(() => turmas.id, { onDelete: "restrict" }),
    nome: text("nome").notNull(),
    email: text("email").notNull(),
    telefone: text("telefone").notNull(),
    profissao: text("profissao").notNull(),
    conselho: conselhoEnum("conselho").notNull(),
    /** "00000 / MG" */
    registro: text("registro").notNull(),
    aceitePrivacidadeEm: timestamp("aceite_privacidade_em", { withTimezone: true }).notNull(),
    querAvisos: boolean("quer_avisos").notNull().default(false),
    situacao: situacaoEnum("situacao").notNull().default("AGUARDANDO_PAGAMENTO"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inscricoes_turma_situacao_idx").on(t.turmaId, t.situacao), index("inscricoes_email_idx").on(t.email)],
);

export const mensagensContato = pgTable("mensagens_contato", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  assunto: text("assunto").notNull(),
  mensagem: text("mensagem"),
  aceitePrivacidadeEm: timestamp("aceite_privacidade_em", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  /** Nulo se o login for por link mágico (decisão da Fase 5). */
  senhaHash: text("senha_hash"),
  papel: papelEnum("papel").notNull().default("EQUIPE"),
  /** Usuário desativado não entra e perde a sessão na próxima ação (o papel e o `ativo` são relidos do banco). */
  ativo: boolean("ativo").notNull().default(true),
  ...timestamps,
});

/** Tentativas de login erradas por e-mail (inclusive e-mails que não existem, para não revelar quem tem conta). */
export const loginTentativas = pgTable("login_tentativas", {
  email: text("email").primaryKey(),
  falhas: integer("falhas").notNull().default(0),
  /** Depois de 5 erros seguidos, o e-mail fica bloqueado por 15 minutos. */
  bloqueadoAte: timestamp("bloqueado_ate", { withTimezone: true }),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Registro de cada e-mail: nasce PENDENTE antes do envio e vira ENVIADO ou FALHOU. O botão "Reenviar" refaz o envio
    deste mesmo registro, remontando o e-mail a partir dos dados atuais da inscrição ou da mensagem. */
export const emailsEnvios = pgTable(
  "emails_envios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: tipoEmailEnum("tipo").notNull(),
    status: statusEmailEnum("status").notNull().default("PENDENTE"),
    destinatario: text("destinatario").notNull(),
    assunto: text("assunto").notNull(),
    inscricaoId: uuid("inscricao_id").references(() => inscricoes.id, { onDelete: "cascade" }),
    mensagemId: uuid("mensagem_id").references(() => mensagensContato.id, { onDelete: "cascade" }),
    tentativas: integer("tentativas").notNull().default(0),
    /** Motivo da última falha, sem credenciais. */
    erro: text("erro"),
    /** Qual provedor enviou (smtp, resend, console). */
    provedor: text("provedor"),
    enviadoEm: timestamp("enviado_em", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("emails_envios_uma_origem", sql`(${t.inscricaoId} is not null) <> (${t.mensagemId} is not null)`),
    index("emails_envios_status_idx").on(t.status),
    index("emails_envios_inscricao_idx").on(t.inscricaoId),
  ],
);

/** Limite de envios por visitante (janela fixa). A chave é um hash do IP + a rota; o IP nunca é guardado. */
export const limitesTaxa = pgTable("limites_taxa", {
  chave: text("chave").primaryKey(),
  contagem: integer("contagem").notNull().default(0),
  janelaFim: timestamp("janela_fim", { withTimezone: true }).notNull(),
});
