CREATE TABLE "site_auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pagina" text NOT NULL,
	"usuario_id" uuid,
	"usuario_nome" text NOT NULL,
	"acao" text NOT NULL,
	"secoes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_reservas" (
	"pagina" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"usuario_nome" text NOT NULL,
	"token" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"adquirida_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_secoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pagina" text NOT NULL,
	"chave" text NOT NULL,
	"tipo" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"visivel" boolean DEFAULT true NOT NULL,
	"rascunho" jsonb NOT NULL,
	"publicado" jsonb,
	"ordem_publicada" integer,
	"visivel_publicada" boolean,
	"publicado_em" timestamp with time zone,
	"atualizado_por" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_secoes_pagina_chave" UNIQUE("pagina","chave")
);
--> statement-breakpoint
CREATE TABLE "site_secoes_traducoes" (
	"secao_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_secoes_traducoes_secao_id_locale_pk" PRIMARY KEY("secao_id","locale")
);
--> statement-breakpoint
ALTER TABLE "site_auditoria" ADD CONSTRAINT "site_auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_reservas" ADD CONSTRAINT "site_reservas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_secoes" ADD CONSTRAINT "site_secoes_atualizado_por_usuarios_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_secoes_traducoes" ADD CONSTRAINT "site_secoes_traducoes_secao_id_site_secoes_id_fk" FOREIGN KEY ("secao_id") REFERENCES "public"."site_secoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_secoes_traducoes" ADD CONSTRAINT "site_secoes_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_auditoria_pagina_idx" ON "site_auditoria" USING btree ("pagina","created_at");--> statement-breakpoint
CREATE INDEX "site_secoes_pagina_idx" ON "site_secoes" USING btree ("pagina","ordem");