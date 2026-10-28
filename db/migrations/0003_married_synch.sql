ALTER TYPE "public"."tipo_email" ADD VALUE 'INSCRICAO_VAGA_CONFIRMADA';--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"telefone" text,
	"whatsapp" text,
	"instagram" text,
	"email" text,
	"endereco_linha1" text,
	"endereco_linha2" text,
	"horario" text,
	"crm" text,
	"rqe" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracoes_linha_unica" CHECK ("configuracoes"."id" = 1)
);
