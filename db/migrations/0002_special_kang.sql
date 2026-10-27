CREATE TYPE "public"."status_email" AS ENUM('PENDENTE', 'ENVIADO', 'FALHOU');--> statement-breakpoint
CREATE TYPE "public"."tipo_email" AS ENUM('INSCRICAO_CONFIRMACAO', 'INSCRICAO_AVISO', 'CONTATO_AVISO');--> statement-breakpoint
CREATE TABLE "emails_envios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_email" NOT NULL,
	"status" "status_email" DEFAULT 'PENDENTE' NOT NULL,
	"destinatario" text NOT NULL,
	"assunto" text NOT NULL,
	"inscricao_id" uuid,
	"mensagem_id" uuid,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"erro" text,
	"provedor" text,
	"enviado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emails_envios_uma_origem" CHECK (("emails_envios"."inscricao_id" is not null) <> ("emails_envios"."mensagem_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "limites_taxa" (
	"chave" text PRIMARY KEY NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	"janela_fim" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emails_envios" ADD CONSTRAINT "emails_envios_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails_envios" ADD CONSTRAINT "emails_envios_mensagem_id_mensagens_contato_id_fk" FOREIGN KEY ("mensagem_id") REFERENCES "public"."mensagens_contato"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_envios_status_idx" ON "emails_envios" USING btree ("status");--> statement-breakpoint
CREATE INDEX "emails_envios_inscricao_idx" ON "emails_envios" USING btree ("inscricao_id");