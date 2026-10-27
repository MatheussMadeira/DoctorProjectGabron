CREATE TYPE "public"."conselho" AS ENUM('CRM', 'CRO', 'CRBM', 'CRF', 'Outro');--> statement-breakpoint
CREATE TYPE "public"."modalidade" AS ENUM('PRESENCIAL', 'ONLINE');--> statement-breakpoint
CREATE TYPE "public"."papel_usuario" AS ENUM('ADMIN', 'EQUIPE');--> statement-breakpoint
CREATE TYPE "public"."publicacao" AS ENUM('RASCUNHO', 'EM_BREVE', 'PUBLICADO');--> statement-breakpoint
CREATE TYPE "public"."situacao_inscricao" AS ENUM('AGUARDANDO_PAGAMENTO', 'REGISTRO_A_CONFERIR', 'CONFIRMADA', 'LISTA_ESPERA', 'CANCELADA');--> statement-breakpoint
CREATE TABLE "inscricoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turma_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text NOT NULL,
	"profissao" text NOT NULL,
	"conselho" "conselho" NOT NULL,
	"registro" text NOT NULL,
	"aceite_privacidade_em" timestamp with time zone NOT NULL,
	"quer_avisos" boolean DEFAULT false NOT NULL,
	"situacao" "situacao_inscricao" DEFAULT 'AGUARDANDO_PAGAMENTO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagens_contato" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text,
	"assunto" text NOT NULL,
	"mensagem" text,
	"aceite_privacidade_em" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turmas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"titulo_curto" text,
	"resumo" text NOT NULL,
	"descricao" text NOT NULL,
	"modalidade" "modalidade" NOT NULL,
	"publicacao" "publicacao" DEFAULT 'RASCUNHO' NOT NULL,
	"inicio" date NOT NULL,
	"fim" date,
	"horario" text NOT NULL,
	"cidade" text NOT NULL,
	"local" text,
	"vagas" integer DEFAULT 0 NOT NULL,
	"preco_centavos" integer,
	"parcelamento" text,
	"foto_url" text NOT NULL,
	"foto_alt" text NOT NULL,
	"publico_alvo" text[] DEFAULT '{}'::text[] NOT NULL,
	"aprendizados" text[] DEFAULT '{}'::text[] NOT NULL,
	"programacao" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluida_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "turmas_slug_unique" UNIQUE("slug"),
	CONSTRAINT "turmas_vagas_nao_negativas" CHECK ("turmas"."vagas" >= 0),
	CONSTRAINT "turmas_fim_depois_do_inicio" CHECK ("turmas"."fim" is null or "turmas"."fim" >= "turmas"."inicio")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text,
	"papel" "papel_usuario" DEFAULT 'EQUIPE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inscricoes_turma_situacao_idx" ON "inscricoes" USING btree ("turma_id","situacao");--> statement-breakpoint
CREATE INDEX "inscricoes_email_idx" ON "inscricoes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "turmas_publicacao_inicio_idx" ON "turmas" USING btree ("publicacao","inicio");