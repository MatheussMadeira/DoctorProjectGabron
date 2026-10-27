import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { limitesTaxa } from "@/db/schema";

/* Limite de envios por visitante nos formulários públicos (janela fixa, no banco: funciona entre as várias
   instâncias das funções da Vercel). A chave é um hash de IP + rota + segredo; o IP em si nunca é guardado. */

export const LIMITES = {
  inscricao: { max: 5, janelaMinutos: 10 },
  contato: { max: 3, janelaMinutos: 10 },
} as const;

export type RotaLimitada = keyof typeof LIMITES;

async function ipDoVisitante(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

/** Conta mais um envio. Devolve false quando o visitante passou do limite da janela. */
export async function dentroDoLimite(rota: RotaLimitada, ip?: string): Promise<boolean> {
  const { max, janelaMinutos } = LIMITES[rota];
  const chave = createHash("sha256").update(`${ip ?? (await ipDoVisitante())}|${rota}|${process.env.AUTH_SECRET ?? ""}`).digest("hex");
  const [linha] = await db
    .insert(limitesTaxa)
    .values({ chave, contagem: 1, janelaFim: sql`now() + make_interval(mins => ${janelaMinutos})` })
    .onConflictDoUpdate({
      target: limitesTaxa.chave,
      set: {
        // Janela vencida recomeça do zero.
        contagem: sql`case when ${limitesTaxa.janelaFim} <= now() then 1 else ${limitesTaxa.contagem} + 1 end`,
        janelaFim: sql`case when ${limitesTaxa.janelaFim} <= now() then now() + make_interval(mins => ${janelaMinutos}) else ${limitesTaxa.janelaFim} end`,
      },
    })
    .returning({ contagem: limitesTaxa.contagem });
  return linha.contagem <= max;
}
