CREATE TYPE "public"."status_traducao" AS ENUM('rascunho_automatico', 'revisada');--> statement-breakpoint
CREATE TABLE "configuracoes_traducoes" (
	"config_id" integer DEFAULT 1 NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracoes_traducoes_config_id_locale_pk" PRIMARY KEY("config_id","locale")
);
--> statement-breakpoint
CREATE TABLE "depoimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"profissao" text NOT NULL,
	"cidade" text NOT NULL,
	"texto" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"visivel" boolean DEFAULT true NOT NULL,
	"autorizacao_recebida_em" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "depoimentos_traducoes" (
	"depoimento_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "depoimentos_traducoes_depoimento_id_locale_pk" PRIMARY KEY("depoimento_id","locale")
);
--> statement-breakpoint
CREATE TABLE "fotos_galeria_traducoes" (
	"foto_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fotos_galeria_traducoes_foto_id_locale_pk" PRIMARY KEY("foto_id","locale")
);
--> statement-breakpoint
CREATE TABLE "professores_traducoes" (
	"professor_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professores_traducoes_professor_id_locale_pk" PRIMARY KEY("professor_id","locale")
);
--> statement-breakpoint
CREATE TABLE "textos_curso" (
	"bloco" text PRIMARY KEY NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "textos_curso_traducoes" (
	"bloco" text NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "textos_curso_traducoes_bloco_locale_pk" PRIMARY KEY("bloco","locale")
);
--> statement-breakpoint
CREATE TABLE "turmas_traducoes" (
	"turma_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "turmas_traducoes_turma_id_locale_pk" PRIMARY KEY("turma_id","locale")
);
--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "idioma" text DEFAULT 'pt-BR' NOT NULL;--> statement-breakpoint
ALTER TABLE "mensagens_contato" ADD COLUMN "idioma" text DEFAULT 'pt-BR' NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracoes_traducoes" ADD CONSTRAINT "configuracoes_traducoes_config_id_configuracoes_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."configuracoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracoes_traducoes" ADD CONSTRAINT "configuracoes_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depoimentos_traducoes" ADD CONSTRAINT "depoimentos_traducoes_depoimento_id_depoimentos_id_fk" FOREIGN KEY ("depoimento_id") REFERENCES "public"."depoimentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depoimentos_traducoes" ADD CONSTRAINT "depoimentos_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos_galeria_traducoes" ADD CONSTRAINT "fotos_galeria_traducoes_foto_id_fotos_galeria_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."fotos_galeria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos_galeria_traducoes" ADD CONSTRAINT "fotos_galeria_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professores_traducoes" ADD CONSTRAINT "professores_traducoes_professor_id_professores_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."professores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professores_traducoes" ADD CONSTRAINT "professores_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textos_curso_traducoes" ADD CONSTRAINT "textos_curso_traducoes_bloco_textos_curso_bloco_fk" FOREIGN KEY ("bloco") REFERENCES "public"."textos_curso"("bloco") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textos_curso_traducoes" ADD CONSTRAINT "textos_curso_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turmas_traducoes" ADD CONSTRAINT "turmas_traducoes_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turmas_traducoes" ADD CONSTRAINT "turmas_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "depoimentos_ordem_idx" ON "depoimentos" USING btree ("ordem");