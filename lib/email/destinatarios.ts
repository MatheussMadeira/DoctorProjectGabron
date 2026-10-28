import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { lerConfig } from "./config";

/** Regra pura: os ADMIN ativos; se não houver nenhum, a caixa de reserva (EMAIL_EQUIPE ou EMAIL_TESTE). */
export function escolherDestinatarios(admins: string[], reserva: string | undefined): string[] {
  const unicos = [...new Set(admins.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (unicos.length) return unicos;
  return reserva ? [reserva] : [];
}

/** Quem recebe os avisos internos (nova inscrição, mensagem de contato): o e-mail dos usuários ADMIN ativos. */
export async function destinatariosDaEquipe(): Promise<string[]> {
  const admins = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(and(eq(usuarios.papel, "ADMIN"), eq(usuarios.ativo, true)))
    .orderBy(asc(usuarios.createdAt));
  const cfg = lerConfig();
  return escolherDestinatarios(admins.map((a) => a.email), cfg.ok ? cfg.equipe : undefined);
}
