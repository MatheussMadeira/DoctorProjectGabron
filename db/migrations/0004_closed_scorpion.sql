CREATE TYPE "public"."motivo_descarte" AS ENUM('ARMADILHA', 'TEMPO', 'CARIMBO', 'LIMITE', 'VALIDACAO');--> statement-breakpoint
CREATE TABLE "formularios_descartes" (
	"dia" date NOT NULL,
	"formulario" text NOT NULL,
	"motivo" "motivo_descarte" NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "formularios_descartes_dia_formulario_motivo_pk" PRIMARY KEY("dia","formulario","motivo")
);
