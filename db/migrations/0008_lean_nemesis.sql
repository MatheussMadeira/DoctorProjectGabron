ALTER TABLE "depoimentos" ADD COLUMN "pendente" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "idioma" text;--> statement-breakpoint
ALTER TABLE "depoimentos" ADD COLUMN "consentimento_em" timestamp with time zone;