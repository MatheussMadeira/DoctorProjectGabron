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
  primaryKey,
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
export const tipoEmailEnum = pgEnum("tipo_email", ["INSCRICAO_CONFIRMACAO", "INSCRICAO_AVISO", "CONTATO_AVISO", "INSCRICAO_VAGA_CONFIRMADA"]);
/** Por que um envio dos formulários públicos foi barrado. */
export const motivoDescarteEnum = pgEnum("motivo_descarte", ["ARMADILHA", "TEMPO", "CARIMBO", "LIMITE", "VALIDACAO"]);
/** Situação de uma tradução: sai da DeepL como rascunho_automatico e vira revisada quando alguém confere e marca. */
export const statusTraducaoEnum = pgEnum("status_traducao", ["rascunho_automatico", "revisada"]);
export type StatusTraducao = (typeof statusTraducaoEnum.enumValues)[number];
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
    /** Idioma em que a pessoa usou o site (pt-BR, en, es, fr, it, de, zh): os e-mails para ela saem nesse idioma. */
    idioma: text("idioma").notNull().default("pt-BR"),
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
  /** Idioma em que a pessoa usou o site. */
  idioma: text("idioma").notNull().default("pt-BR"),
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

/** Professores do curso: todos iguais, na ordem do admin (`ordem`); `visivel` controla o site.
    Professor médico sempre mostra CRM e RQE em `registro` (regra do CFM; validada em lib/professor-form.ts). */
export const professores = pgTable(
  "professores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    /** Função ou especialidade: "Médica Fisiatra". */
    funcao: text("funcao").notNull(),
    /** "CRM-MG 00000 · RQE 00000" (médicos) ou conselho e número (demais). */
    registro: text("registro").notNull(),
    bio: text("bio").notNull().default(""),
    fotoUrl: text("foto_url"),
    fotoAlt: text("foto_alt"),
    visivel: boolean("visivel").notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("professores_ordem_idx").on(t.ordem)],
);

/** Quais professores conduzem cada turma, e em que ordem. */
export const turmaProfessores = pgTable(
  "turma_professores",
  {
    turmaId: uuid("turma_id")
      .notNull()
      .references(() => turmas.id, { onDelete: "cascade" }),
    professorId: uuid("professor_id")
      .notNull()
      .references(() => professores.id, { onDelete: "cascade" }),
    ordem: integer("ordem").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.turmaId, t.professorId] }), index("turma_professores_prof_idx").on(t.professorId)],
);

/** Galeria de "Sobre o curso". A primeira foto aparece maior. Descrição (alt) obrigatória. */
export const fotosGaleria = pgTable(
  "fotos_galeria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    ordem: integer("ordem").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("fotos_galeria_ordem_idx").on(t.ordem)],
);

/** Envios barrados nos formulários, contados por dia, formulário e motivo (sem dados pessoais e sem crescer a cada tentativa).
    O painel mostra estes números: se "Tempo" ou "Limite" subir sem motivo, pessoas reais podem estar sendo barradas. */
export const formulariosDescartes = pgTable(
  "formularios_descartes",
  {
    dia: date("dia", { mode: "string" }).notNull(),
    formulario: text("formulario").notNull(),
    motivo: motivoDescarteEnum("motivo").notNull(),
    contagem: integer("contagem").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.dia, t.formulario, t.motivo] })],
);
export type MotivoDescarte = (typeof motivoDescarteEnum.enumValues)[number];

/** Dados de contato e registro da clínica, editados em Configurações. Uma única linha (id = 1).
    Coluna vazia = o site usa o placeholder de lib/site.ts. */
export const configuracoes = pgTable(
  "configuracoes",
  {
    id: integer("id").primaryKey().default(1),
    /** Como aparece: "(31) 99999-9999". */
    telefone: text("telefone"),
    /** Só dígitos com o código do país: "5531999999999". */
    whatsapp: text("whatsapp"),
    /** "@perfil" */
    instagram: text("instagram"),
    /** E-mail público (rodapé e página de contato). Não é o e-mail que envia. */
    email: text("email"),
    enderecoLinha1: text("endereco_linha1"),
    enderecoLinha2: text("endereco_linha2"),
    horario: text("horario"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("configuracoes_linha_unica", sql`${t.id} = 1`)],
);


/* ---------------------------------------------------------------------------------------------------------------------
   Idiomas. O português fica nas tabelas de sempre (turmas, professores, fotos_galeria, configuracoes, textos_curso, depoimentos);
   cada tabela tem uma `<nome>_traducoes` com uma linha por idioma (en, es, fr, it, de, zh). O conteúdo traduzido vai num jsonb
   `conteudo` ({ campo: valor }) e o hash do português de cada campo em `origem`: quando o português muda, o campo é traduzido de novo na
   hora e a linha volta a `rascunho_automatico` com `precisa_revisar` (informação desatualizada é pior que tradução não revisada).
   Sem linha (ou sem o campo), o site mostra o português. Aplicar a migration ANTES do deploy.
   --------------------------------------------------------------------------------------------------------------------- */
const colunasDeTraducao = {
  locale: text("locale").notNull(),
  conteudo: jsonb("conteudo").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  origem: jsonb("origem").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
  status: statusTraducaoEnum("status").notNull().default("rascunho_automatico"),
  /** O português mudou depois da última revisão: a tradução automática nova ocupou o lugar da revisada. */
  precisaRevisar: boolean("precisa_revisar").notNull().default(false),
  revisadaPor: uuid("revisada_por").references(() => usuarios.id, { onDelete: "set null" }),
  revisadaEm: timestamp("revisada_em", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const turmasTraducoes = pgTable(
  "turmas_traducoes",
  { turmaId: uuid("turma_id").notNull().references(() => turmas.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.turmaId, t.locale] })],
);

export const professoresTraducoes = pgTable(
  "professores_traducoes",
  { professorId: uuid("professor_id").notNull().references(() => professores.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.professorId, t.locale] })],
);

export const fotosGaleriaTraducoes = pgTable(
  "fotos_galeria_traducoes",
  { fotoId: uuid("foto_id").notNull().references(() => fotosGaleria.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.fotoId, t.locale] })],
);

export const configuracoesTraducoes = pgTable(
  "configuracoes_traducoes",
  { configId: integer("config_id").notNull().default(1).references(() => configuracoes.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.configId, t.locale] })],
);

/** Textos do curso editáveis (Configurações › Curso), um bloco por linha: topo, proposta, pilares, numeros e valores.
    `conteudo` é o português; a forma de cada bloco está em lib/textos-curso.ts. */
export const textosCurso = pgTable("textos_curso", {
  bloco: text("bloco").primaryKey(),
  conteudo: jsonb("conteudo").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const textosCursoTraducoes = pgTable(
  "textos_curso_traducoes",
  { bloco: text("bloco").notNull().references(() => textosCurso.bloco, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.bloco, t.locale] })],
);

/** Depoimentos. Só aparece no site o que está visível E tem `autorizacaoRecebidaEm` (autorização por escrito, obrigatória). */
export const depoimentos = pgTable(
  "depoimentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    profissao: text("profissao").notNull(),
    cidade: text("cidade").notNull(),
    texto: text("texto").notNull(),
    ordem: integer("ordem").notNull().default(0),
    visivel: boolean("visivel").notNull().default(true),
    autorizacaoRecebidaEm: date("autorizacao_recebida_em", { mode: "string" }),
    ...timestamps,
  },
  (t) => [index("depoimentos_ordem_idx").on(t.ordem)],
);

export const depoimentosTraducoes = pgTable(
  "depoimentos_traducoes",
  { depoimentoId: uuid("depoimento_id").notNull().references(() => depoimentos.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.depoimentoId, t.locale] })],
);
