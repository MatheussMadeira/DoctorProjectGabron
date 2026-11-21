CREATE TABLE "viagem_chegada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"icone" text DEFAULT 'aviao' NOT NULL,
	"titulo" text NOT NULL,
	"texto" text DEFAULT '' NOT NULL,
	"visivel" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viagem_chegada_traducoes" (
	"chegada_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "viagem_chegada_traducoes_chegada_id_locale_pk" PRIMARY KEY("chegada_id","locale")
);
--> statement-breakpoint
CREATE TABLE "viagem_locais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"endereco" text DEFAULT '' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"foto_url" text,
	"foto_alt" text,
	"site" text,
	"telefone" text,
	"faixa_preco" smallint,
	"visivel" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viagem_locais_traducoes" (
	"local_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"conteudo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "status_traducao" DEFAULT 'rascunho_automatico' NOT NULL,
	"precisa_revisar" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "viagem_locais_traducoes_local_id_locale_pk" PRIMARY KEY("local_id","locale")
);
--> statement-breakpoint
ALTER TABLE "viagem_chegada_traducoes" ADD CONSTRAINT "viagem_chegada_traducoes_chegada_id_viagem_chegada_id_fk" FOREIGN KEY ("chegada_id") REFERENCES "public"."viagem_chegada"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viagem_chegada_traducoes" ADD CONSTRAINT "viagem_chegada_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viagem_locais_traducoes" ADD CONSTRAINT "viagem_locais_traducoes_local_id_viagem_locais_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."viagem_locais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viagem_locais_traducoes" ADD CONSTRAINT "viagem_locais_traducoes_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "viagem_chegada_ordem_idx" ON "viagem_chegada" USING btree ("ordem");--> statement-breakpoint
CREATE INDEX "viagem_locais_categoria_idx" ON "viagem_locais" USING btree ("categoria","ordem");