import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { alunoMateriais } from "@/db/schema";
import { avisarNovoMaterial } from "@/lib/email/aluno";

/* Chamado todo dia pela Vercel (vercel.json): avisa por e-mail os alunos dos materiais cuja publicação agendada já chegou e que ainda não
   foram avisados. A Vercel manda "Authorization: Bearer <CRON_SECRET>"; sem a variável CRON_SECRET (ou com outro valor), recusa. */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) return new Response("Unauthorized", { status: 401 });

  const devidos = await db
    .select({ id: alunoMateriais.id })
    .from(alunoMateriais)
    .where(and(eq(alunoMateriais.visivel, true), eq(alunoMateriais.avisar, true), isNull(alunoMateriais.notificadoEm), isNotNull(alunoMateriais.publicarEm), lte(alunoMateriais.publicarEm, sql`now()`)));
  let emails = 0;
  for (const m of devidos) emails += await avisarNovoMaterial(m.id);
  return Response.json({ materiais: devidos.length, emails });
}
