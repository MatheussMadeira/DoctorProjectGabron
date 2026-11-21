import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
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
export const tipoEmailEnum = pgEnum("tipo_email", ["INSCRICAO_CONFIRMACAO", "INSCRICAO_AVISO", "CONTATO_AVISO", "INSCRICAO_VAGA_CONFIRMADA", "ALUNO_CODIGO"]);
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
    /** De onde a pessoa vem (opcional): alimenta o mapa da Alumni depois que a turma acontece. */
    cidade: text("cidade"),
    uf: text("uf"),
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
    /** E-mail do código de acesso da área do aluno. */
    alunoId: uuid("aluno_id").references((): AnyPgColumn => alunos.id, { onDelete: "cascade" }),
    tentativas: integer("tentativas").notNull().default(0),
    /** Motivo da última falha, sem credenciais. */
    erro: text("erro"),
    /** Qual provedor enviou (smtp, resend, console). */
    provedor: text("provedor"),
    enviadoEm: timestamp("enviado_em", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("emails_envios_uma_origem", sql`(${t.inscricaoId} is not null)::int + (${t.mensagemId} is not null)::int + (${t.alunoId} is not null)::int = 1`),
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
    /** Enviado pelo formulário público e ainda não aprovado por um ADMIN: nunca aparece no site, mesmo que `visivel` seja true. */
    pendente: boolean("pendente").notNull().default(false),
    /** Só nos enviados pelo site: e-mail para a equipe falar com a pessoa (nunca mostrado no site), idioma da página e aceite do envio. */
    email: text("email"),
    idioma: text("idioma"),
    consentimentoEm: timestamp("consentimento_em", { withTimezone: true }),
    /** Localização do aluno (mapa da Alumni), foto opcional e vídeo de feedback (link do YouTube/Vimeo ou arquivo MP4 do Cloudinary). */
    uf: text("uf"),
    pais: text("pais").notNull().default("BR"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    fotoUrl: text("foto_url"),
    fotoAlt: text("foto_alt"),
    videoUrl: text("video_url"),
    videoLegendaUrl: text("video_legenda_url"),
    ...timestamps,
  },
  (t) => [index("depoimentos_ordem_idx").on(t.ordem)],
);

export const depoimentosTraducoes = pgTable(
  "depoimentos_traducoes",
  { depoimentoId: uuid("depoimento_id").notNull().references(() => depoimentos.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.depoimentoId, t.locale] })],
);


/* ---------------------------------------------------------------------------------------------------------------------
   Travel info (/viagem): guia para quem vem a Belo Horizonte. `viagem_locais` guarda o local do curso, hotéis, restaurantes e
   pontos turísticos; `viagem_chegada` guarda os itens do "Como chegar" (aeroporto, ônibus e aplicativo, carro…).
   O português fica aqui; as outras línguas, nas tabelas `_traducoes` (mesmo esquema do resto do site). Aplicar a migration ANTES do deploy.
   --------------------------------------------------------------------------------------------------------------------- */
export const CATEGORIAS_VIAGEM = ["LOCAL", "HOTEL", "RESTAURANTE", "TURISMO"] as const;
export type CategoriaViagem = (typeof CATEGORIAS_VIAGEM)[number];
export const ICONES_CHEGADA = ["aviao", "onibus", "carro", "bilhete"] as const;
export type IconeChegada = (typeof ICONES_CHEGADA)[number];

export const viagemLocais = pgTable(
  "viagem_locais",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** LOCAL (onde acontece o curso), HOTEL, RESTAURANTE ou TURISMO. */
    categoria: text("categoria").$type<CategoriaViagem>().notNull(),
    nome: text("nome").notNull(),
    descricao: text("descricao").notNull().default(""),
    endereco: text("endereco").notNull().default(""),
    /** Coordenadas (para o mapa, o link do Maps e a distância até o local do curso). Vazias = sem mapa. */
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    fotoUrl: text("foto_url"),
    fotoAlt: text("foto_alt"),
    site: text("site"),
    telefone: text("telefone"),
    /** 1 a 4 ("$" a "$$$$"). */
    faixaPreco: smallint("faixa_preco"),
    visivel: boolean("visivel").notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("viagem_locais_categoria_idx").on(t.categoria, t.ordem)],
);

export const viagemLocaisTraducoes = pgTable(
  "viagem_locais_traducoes",
  { localId: uuid("local_id").notNull().references(() => viagemLocais.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.localId, t.locale] })],
);

export const viagemChegada = pgTable(
  "viagem_chegada",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    icone: text("icone").$type<IconeChegada>().notNull().default("aviao"),
    titulo: text("titulo").notNull(),
    texto: text("texto").notNull().default(""),
    visivel: boolean("visivel").notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("viagem_chegada_ordem_idx").on(t.ordem)],
);

export const viagemChegadaTraducoes = pgTable(
  "viagem_chegada_traducoes",
  { chegadaId: uuid("chegada_id").notNull().references(() => viagemChegada.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.chegadaId, t.locale] })],
);


/* ---------------------------------------------------------------------------------------------------------------------
   Alumni ReabToxin (/alumni-reabtoxin): turmas que já aconteceram e os alunos no mapa. `alumni_turmas` guarda a página de cada turma
   realizada (pode vir da agenda, `turma_id`, ou ser uma turma de antes do site); `alumni` guarda cada aluno do mapa. Aluno e turma só
   aparecem no site com `visivel` e, no caso do aluno, com a data da autorização (`autorizacao_recebida_em`). Aplicar a migration ANTES do deploy.
   --------------------------------------------------------------------------------------------------------------------- */
export const alumniTurmas = pgTable(
  "alumni_turmas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Turma da agenda que deu origem a esta (vazio = turma de antes do site). */
    turmaId: uuid("turma_id").unique().references(() => turmas.id, { onDelete: "set null" }),
    titulo: text("titulo").notNull(),
    dataInicio: date("data_inicio", { mode: "string" }),
    dataFim: date("data_fim", { mode: "string" }),
    cidade: text("cidade").notNull().default(""),
    resumo: text("resumo").notNull().default(""),
    numeroAlunos: integer("numero_alunos"),
    fotoUrl: text("foto_url"),
    fotoAlt: text("foto_alt"),
    videoUrl: text("video_url"),
    videoLegendaUrl: text("video_legenda_url"),
    visivel: boolean("visivel").notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("alumni_turmas_ordem_idx").on(t.ordem)],
);

export const alumni = pgTable(
  "alumni",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alumniTurmaId: uuid("alumni_turma_id").references(() => alumniTurmas.id, { onDelete: "set null" }),
    /** Inscrição de onde o aluno foi importado (evita importar duas vezes). */
    inscricaoId: uuid("inscricao_id").unique().references(() => inscricoes.id, { onDelete: "set null" }),
    nome: text("nome").notNull(),
    profissao: text("profissao").notNull().default(""),
    cidade: text("cidade").notNull().default(""),
    uf: text("uf"),
    /** Código do país (BR, PT, US…): Brasil aparece no mapa do Brasil, os demais no globo. */
    pais: text("pais").notNull().default("BR"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    fotoUrl: text("foto_url"),
    fotoAlt: text("foto_alt"),
    /** Data em que o aluno autorizou por escrito. Sem ela, o aluno nunca aparece no site. */
    autorizacaoRecebidaEm: date("autorizacao_recebida_em", { mode: "string" }),
    visivel: boolean("visivel").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("alumni_turma_idx").on(t.alumniTurmaId)],
);

export const alumniTurmasTraducoes = pgTable(
  "alumni_turmas_traducoes",
  { alumniTurmaId: uuid("alumni_turma_id").notNull().references(() => alumniTurmas.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.alumniTurmaId, t.locale] })],
);

export const alumniTraducoes = pgTable(
  "alumni_traducoes",
  { alumniId: uuid("alumni_id").notNull().references(() => alumni.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.alumniId, t.locale] })],
);


/* ---------------------------------------------------------------------------------------------------------------------
   Área do aluno (/sou-aluno). Um aluno por e-mail, com UM código aleatório que vale só para criar a conta (primeiro acesso) e some
   depois (`codigo` vira null). O acesso aos materiais é vitalício e por turma: vale cada turma em que o e-mail tem inscrição CONFIRMADA.
   Materiais ficam em módulos de uma turma; arquivos (PDF e imagens) ficam no Blob, mas o endereço nunca vai para o navegador: o site os
   entrega por /api/aluno/arquivo depois de conferir a sessão. Aplicar a migration ANTES do deploy.
   --------------------------------------------------------------------------------------------------------------------- */
export const alunos = pgTable(
  "alunos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Sempre em minúsculas. É o mesmo e-mail da inscrição. */
    email: text("email").notNull().unique(),
    nome: text("nome").notNull(),
    /** Idioma da inscrição: os e-mails para o aluno saem nele. */
    idioma: text("idioma").notNull().default("pt-BR"),
    /** Código de primeiro acesso (ex.: K7M2-9QXA), guardado só até a conta ser criada. */
    codigo: text("codigo").unique(),
    codigoEnviadoEm: timestamp("codigo_enviado_em", { withTimezone: true }),
    ativadoEm: timestamp("ativado_em", { withTimezone: true }),
    senhaHash: text("senha_hash"),
    /** O ADMIN bloqueou o acesso (botão "Bloquear"). */
    bloqueado: boolean("bloqueado").notNull().default(false),
    /** Erros seguidos de senha ou código; no 5º, bloqueia por 5 minutos. */
    falhas: integer("falhas").notNull().default(0),
    bloqueadoAte: timestamp("bloqueado_ate", { withTimezone: true }),
    /** Aviso de confidencialidade ("Eu concordo"): quando e qual versão do aviso. */
    aceiteEm: timestamp("aceite_em", { withTimezone: true }),
    aceiteVersao: integer("aceite_versao").notNull().default(0),
    /** Muda ao trocar a senha: derruba as sessões abertas. */
    sessaoVersao: integer("sessao_versao").notNull().default(0),
    ultimoAcessoEm: timestamp("ultimo_acesso_em", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("alunos_codigo_idx").on(t.codigo)],
);

/** Link de "Esqueci minha senha": só o hash do token é guardado; vale 1 hora e uma vez. */
export const alunoRedefinicoes = pgTable("aluno_redefinicoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  alunoId: uuid("aluno_id").notNull().references(() => alunos.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  usadoEm: timestamp("usado_em", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alunoModulos = pgTable(
  "aluno_modulos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    turmaId: uuid("turma_id").notNull().references(() => turmas.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    descricao: text("descricao").notNull().default(""),
    visivel: boolean("visivel").notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("aluno_modulos_turma_idx").on(t.turmaId, t.ordem)],
);

export const TIPOS_MATERIAL = ["PDF", "CASO", "VIDEO"] as const;
export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];
export interface ImagemMaterial {
  url: string;
  alt: string;
}

export const alunoMateriais = pgTable(
  "aluno_materiais",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduloId: uuid("modulo_id").notNull().references(() => alunoModulos.id, { onDelete: "cascade" }),
    /** PDF (um arquivo), CASO (discussão de caso: texto, imagens e comentários) ou VIDEO (link ou arquivo). */
    tipo: text("tipo").$type<TipoMaterial>().notNull(),
    titulo: text("titulo").notNull(),
    texto: text("texto").notNull().default(""),
    /** PDF: endereço do arquivo no Blob (nunca exposto) e o nome para o download. */
    arquivoUrl: text("arquivo_url"),
    arquivoNome: text("arquivo_nome"),
    /** CASO: imagens com descrição. */
    imagens: jsonb("imagens").$type<ImagemMaterial[]>().notNull().default(sql`'[]'::jsonb`),
    videoUrl: text("video_url"),
    videoLegendaUrl: text("video_legenda_url"),
    visivel: boolean("visivel").notNull().default(true),
    /** Publicação agendada: vazio = já publicado. */
    publicarEm: timestamp("publicar_em", { withTimezone: true }),
    /** Avisar os alunos por e-mail quando o material sair; `notificado_em` marca que já avisou. */
    avisar: boolean("avisar").notNull().default(true),
    notificadoEm: timestamp("notificado_em", { withTimezone: true }),
    ordem: integer("ordem").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("aluno_materiais_modulo_idx").on(t.moduloId, t.ordem)],
);

export const alunoComentarios = pgTable(
  "aluno_comentarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    materialId: uuid("material_id").notNull().references(() => alunoMateriais.id, { onDelete: "cascade" }),
    alunoId: uuid("aluno_id").notNull().references(() => alunos.id, { onDelete: "cascade" }),
    texto: text("texto").notNull(),
    /** Moderação: oculto some para os alunos. */
    oculto: boolean("oculto").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("aluno_comentarios_material_idx").on(t.materialId, t.createdAt)],
);

/** Certificado em PDF de um aluno em uma turma, enviado à mão pelo ADMIN. */
export const alunoCertificados = pgTable(
  "aluno_certificados",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alunoId: uuid("aluno_id").notNull().references(() => alunos.id, { onDelete: "cascade" }),
    turmaId: uuid("turma_id").notNull().references(() => turmas.id, { onDelete: "cascade" }),
    arquivoUrl: text("arquivo_url").notNull(),
    arquivoNome: text("arquivo_nome").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("aluno_certificados_aluno_turma").on(t.alunoId, t.turmaId)],
);

export const alunoModulosTraducoes = pgTable(
  "aluno_modulos_traducoes",
  { moduloId: uuid("modulo_id").notNull().references(() => alunoModulos.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.moduloId, t.locale] })],
);

export const alunoMateriaisTraducoes = pgTable(
  "aluno_materiais_traducoes",
  { materialId: uuid("material_id").notNull().references(() => alunoMateriais.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.materialId, t.locale] })],
);


/* ---------------------------------------------------------------------------------------------------------------------
   Editor visual (/admin/editor): as páginas Início e Sobre o curso são listas de SEÇÕES. Cada seção tem rascunho e versão publicada (o
   site lê só a publicada), ordem e visibilidade também com as duas versões. O português é editado no editor; as outras línguas saem da DeepL
   ao publicar, na tabela de traduções (mesmo esquema do resto do site). `site_reservas` garante uma pessoa por vez em cada página.
   Aplicar a migration ANTES do deploy.
   --------------------------------------------------------------------------------------------------------------------- */
export const siteSecoes = pgTable(
  "site_secoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "inicio" ou "sobre-o-curso". */
    pagina: text("pagina").notNull(),
    /** Chave estável da seção dentro da página ("topo", "curso", "turmas"…). */
    chave: text("chave").notNull(),
    /** Tipo (define os campos): hero, curso, cabecalho, numeros, proposta, valores. */
    tipo: text("tipo").notNull(),
    ordem: integer("ordem").notNull().default(0),
    visivel: boolean("visivel").notNull().default(true),
    rascunho: jsonb("rascunho").$type<Record<string, unknown>>().notNull(),
    publicado: jsonb("publicado").$type<Record<string, unknown>>(),
    ordemPublicada: integer("ordem_publicada"),
    visivelPublicada: boolean("visivel_publicada"),
    publicadoEm: timestamp("publicado_em", { withTimezone: true }),
    atualizadoPor: uuid("atualizado_por").references(() => usuarios.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("site_secoes_pagina_chave").on(t.pagina, t.chave), index("site_secoes_pagina_idx").on(t.pagina, t.ordem)],
);

export const siteSecoesTraducoes = pgTable(
  "site_secoes_traducoes",
  { secaoId: uuid("secao_id").notNull().references(() => siteSecoes.id, { onDelete: "cascade" }), ...colunasDeTraducao },
  (t) => [primaryKey({ columns: [t.secaoId, t.locale] })],
);

/** Reserva de edição: só uma pessoa (uma aba) edita cada página por vez. Vale por alguns segundos e é renovada enquanto o editor está aberto. */
export const siteReservas = pgTable("site_reservas", {
  pagina: text("pagina").primaryKey(),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  usuarioNome: text("usuario_nome").notNull(),
  token: text("token").notNull(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  adquiridaEm: timestamp("adquirida_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Quem publicou o quê e quando. */
export const siteAuditoria = pgTable(
  "site_auditoria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pagina: text("pagina").notNull(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
    usuarioNome: text("usuario_nome").notNull(),
    acao: text("acao").notNull(),
    /** Chaves das seções que mudaram. */
    secoes: jsonb("secoes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("site_auditoria_pagina_idx").on(t.pagina, t.createdAt)],
);
