CREATE TABLE "fotos_galeria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"funcao" text NOT NULL,
	"registro" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"foto_url" text,
	"foto_alt" text,
	"coordenacao" boolean DEFAULT false NOT NULL,
	"visivel" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turma_professores" (
	"turma_id" uuid NOT NULL,
	"professor_id" uuid NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "turma_professores_turma_id_professor_id_pk" PRIMARY KEY("turma_id","professor_id")
);
--> statement-breakpoint
ALTER TABLE "turma_professores" ADD CONSTRAINT "turma_professores_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turma_professores" ADD CONSTRAINT "turma_professores_professor_id_professores_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."professores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fotos_galeria_ordem_idx" ON "fotos_galeria" USING btree ("ordem");--> statement-breakpoint
CREATE INDEX "professores_ordem_idx" ON "professores" USING btree ("ordem");--> statement-breakpoint
CREATE INDEX "turma_professores_prof_idx" ON "turma_professores" USING btree ("professor_id");