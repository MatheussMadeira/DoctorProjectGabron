ALTER TYPE "public"."tipo_email" ADD VALUE 'ALUNO_CODIGO';--> statement-breakpoint
CREATE TABLE "aluno_certificados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aluno_id" uuid NOT NULL,
	"turma_id" uuid NOT NULL,
	"arquivo_url" text NOT NULL,
	"arquivo_nome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aluno_certificados_aluno_turma" UNIQUE("aluno_id","turma_id")
);
--> statement-breakpoint
CREATE TABLE "aluno_comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"aluno_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"oculto" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aluno_materiais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"texto" text DEFAULT '' NOT NULL,
	"arquivo_url" text,
	"arquivo_nome" text,
	"imagens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_url" text,
	"video_legenda_url" text,
	"visivel" boolean DEFAULT true NOT NULL,
	"publicar_em" timestamp with time zone,
	"avisar" boolean DEFAULT true NOT NULL,
	"notificado_em" timestamp with time zone,
	"ordem" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aluno_materiais_traducoes" (
	"material_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aluno_materiais_traducoes_material_id_locale_pk" PRIMARY KEY("material_id","locale")
);
--> statement-breakpoint
CREATE TABLE "aluno_modulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turma_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"visivel" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aluno_modulos_traducoes" (
	"modulo_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aluno_modulos_traducoes_modulo_id_locale_pk" PRIMARY KEY("modulo_id","locale")
);
--> statement-breakpoint
CREATE TABLE "aluno_redefinicoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aluno_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aluno_redefinicoes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "alunos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"idioma" text DEFAULT 'pt-BR' NOT NULL,
	"codigo" text,
	"codigo_enviado_em" timestamp with time zone,
	"ativado_em" timestamp with time zone,
	"senha_hash" text,
	"bloqueado" boolean DEFAULT false NOT NULL,
	"falhas" integer DEFAULT 0 NOT NULL,
	"bloqueado_ate" timestamp with time zone,
	"aceite_em" timestamp with time zone,
	"aceite_versao" integer DEFAULT 0 NOT NULL,
	"sessao_versao" integer DEFAULT 0 NOT NULL,
	"ultimo_acesso_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alunos_email_unique" UNIQUE("email"),
	CONSTRAINT "alunos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "emails_envios" DROP CONSTRAINT "emails_envios_uma_origem";--> statement-breakpoint
ALTER TABLE "emails_envios" ADD COLUMN "aluno_id" uuid;--> statement-breakpoint
ALTER TABLE "aluno_certificados" ADD CONSTRAINT "aluno_certificados_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_certificados" ADD CONSTRAINT "aluno_certificados_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_comentarios" ADD CONSTRAINT "aluno_comentarios_material_id_aluno_materiais_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."aluno_materiais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_comentarios" ADD CONSTRAINT "aluno_comentarios_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_materiais" ADD CONSTRAINT "aluno_materiais_modulo_id_aluno_modulos_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."aluno_modulos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_materiais_traducoes" ADD CONSTRAINT "aluno_materiais_traducoes_material_id_aluno_materiais_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."aluno_materiais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_materiais_traducoes" ADD CONSTRAINT "aluno_materiais_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_modulos" ADD CONSTRAINT "aluno_modulos_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_modulos_traducoes" ADD CONSTRAINT "aluno_modulos_traducoes_modulo_id_aluno_modulos_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."aluno_modulos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_modulos_traducoes" ADD CONSTRAINT "aluno_modulos_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_redefinicoes" ADD CONSTRAINT "aluno_redefinicoes_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aluno_comentarios_material_idx" ON "aluno_comentarios" USING btree ("material_id","created_at");--> statement-breakpoint
CREATE INDEX "aluno_materiais_modulo_idx" ON "aluno_materiais" USING btree ("modulo_id","ordem");--> statement-breakpoint
CREATE INDEX "aluno_modulos_turma_idx" ON "aluno_modulos" USING btree ("turma_id","ordem");--> statement-breakpoint
CREATE INDEX "alunos_codigo_idx" ON "alunos" USING btree ("codigo");--> statement-breakpoint
ALTER TABLE "emails_envios" ADD CONSTRAINT "emails_envios_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails_envios" ADD CONSTRAINT "emails_envios_uma_origem" CHECK (("emails_envios"."inscricao_id" is not null)::int + ("emails_envios"."mensagem_id" is not null)::int + ("emails_envios"."aluno_id" is not null)::int = 1);