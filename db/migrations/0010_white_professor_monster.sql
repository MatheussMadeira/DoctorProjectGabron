CREATE TABLE "alumni" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumni_turma_id" uuid,
	"inscricao_id" uuid,
	"nome" text NOT NULL,
	"profissao" text DEFAULT '' NOT NULL,
	"cidade" text DEFAULT '' NOT NULL,
	"uf" text,
	"pais" text DEFAULT 'BR' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"foto_url" text,
	"foto_alt" text,
	"autorizacao_recebida_em" date,
	"visivel" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alumni_inscricao_id_unique" UNIQUE("inscricao_id")
);
--> statement-breakpoint
CREATE TABLE "alumni_traducoes" (
	"alumni_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alumni_traducoes_alumni_id_locale_pk" PRIMARY KEY("alumni_id","locale")
);
--> statement-breakpoint
CREATE TABLE "alumni_turmas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turma_id" uuid,
	"titulo" text NOT NULL,
	"data_inicio" date,
	"data_fim" date,
	"cidade" text DEFAULT '' NOT NULL,
	"resumo" text DEFAULT '' NOT NULL,
	"numero_alunos" integer,
	"foto_url" text,
	"foto_alt" text,
	"video_url" text,
	"video_legenda_url" text,
	"visivel" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alumni_turmas_turma_id_unique" UNIQUE("turma_id")
);
--> statement-breakpoint
CREATE TABLE "alumni_turmas_traducoes" (
	"alumni_turma_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alumni_turmas_traducoes_alumni_turma_id_locale_pk" PRIMARY KEY("alumni_turma_id","locale")
);
--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "uf" text;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "pais" text DEFAULT 'BR' NOT NULL;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "foto_url" text;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "foto_alt" text;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "video_legenda_url" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "cidade" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "uf" text;--> statement-breakpoint
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_alumni_turma_id_alumni_turmas_id_fk" FOREIGN KEY ("alumni_turma_id") REFERENCES "public"."alumni_turmas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alumni_traducoes" ADD CONSTRAINT "alumni_traducoes_alumni_id_alumni_id_fk" FOREIGN KEY ("alumni_id") REFERENCES "public"."alumni"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alumni_traducoes" ADD CONSTRAINT "alumni_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alumni_turmas" ADD CONSTRAINT "alumni_turmas_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alumni_turmas_traducoes" ADD CONSTRAINT "alumni_turmas_traducoes_alumni_turma_id_alumni_turmas_id_fk" FOREIGN KEY ("alumni_turma_id") REFERENCES "public"."alumni_turmas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alumni_turmas_traducoes" ADD CONSTRAINT "alumni_turmas_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alumni_turma_idx" ON "alumni" USING btree ("alumni_turma_id");--> statement-breakpoint
CREATE INDEX "alumni_turmas_ordem_idx" ON "alumni_turmas" USING btree ("ordem");