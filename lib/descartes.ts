import { sql } from "drizzle-orm";
import { db } from "@/db";
import { formulariosDescartes, type MotivoDescarte } from "@/db/schema";

/* Todo envio barrado nos formulários públicos passa por aqui: vira uma linha no terminal (em desenvolvimento, com o motivo),
   uma linha de log sem dado pessoal (em produção) e +1 num contador diário que o painel mostra. Nunca lança erro:
   registrar o descarte não pode derrubar a resposta ao visitante. */

export type FormularioPublico = "contato" | "inscricao";

const TEXTO: Record<MotivoDescarte, string> = {
  ARMADILHA: "campo escondido preenchido (parece robô)",
  CARIMBO: "sem carimbo de tempo válido (envio direto, sem abrir a página, ou página aberta há mais de 12 horas)",
  TEMPO: "envio rápido demais depois de abrir a página",
  LIMITE: "limite de envios por visitante",
  VALIDACAO: "campos inválidos",
};

export async function registrarDescarte(formulario: FormularioPublico, motivo: MotivoDescarte): Promise<void> {
  if (process.env.NODE_ENV !== "production") console.warn(`[descarte] ${formulario}: ${motivo}: ${TEXTO[motivo]}`);
  else console.warn(JSON.stringify({ evento: "formulario_descartado", formulario, motivo }));
  try {
    await db
      .insert(formulariosDescartes)
      .values({ dia: sql`(now() at time zone 'America/Sao_Paulo')::date`, formulario, motivo, contagem: 1 })
      .onConflictDoUpdate({
        target: [formulariosDescartes.dia, formulariosDescartes.formulario, formulariosDescartes.motivo],
        set: { contagem: sql`${formulariosDescartes.contagem} + 1` },
      });
  } catch (e) {
    console.error("[descarte] não foi possível contar", e instanceof Error ? e.message : e);
  }
}

export interface ResumoDescartes {
  formulario: string;
  motivo: MotivoDescarte;
  total: number;
}

/** Descartes dos últimos `dias` dias, somados por formulário e motivo. */
export async function resumoDeDescartes(dias = 7): Promise<ResumoDescartes[]> {
  const linhas = await db
    .select({ formulario: formulariosDescartes.formulario, motivo: formulariosDescartes.motivo, total: sql<number>`sum(${formulariosDescartes.contagem})::int` })
    .from(formulariosDescartes)
    .where(sql`${formulariosDescartes.dia} > (now() at time zone 'America/Sao_Paulo')::date - ${dias}::int`)
    .groupBy(formulariosDescartes.formulario, formulariosDescartes.motivo);
  return linhas;
}
