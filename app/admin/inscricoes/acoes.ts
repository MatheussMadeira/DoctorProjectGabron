"use server";

import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { and, count, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { inscricoes, SITUACOES_QUE_OCUPAM, situacaoEnum, turmas, type Situacao } from "@/db/schema";
import { reenviar } from "@/lib/email/registro";
import { autorizar } from "@/lib/sessao";
import { TAG_TURMAS, tagTurma } from "@/lib/turmas";

export interface EstadoAcao {
  ok?: boolean;
  erro?: string;
}

/** Muda a situação de uma inscrição. A transação trava a turma, como na inscrição pelo site. */
export async function alterarSituacao(inscricaoId: string, _anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const auth = await autorizar("inscricao:gerir");
  if (!auth.ok) return { erro: auth.erro };

  const nova = String(formData.get("situacao") ?? "") as Situacao;
  if (!(situacaoEnum.enumValues as readonly string[]).includes(nova)) return { erro: "Escolha uma situação válida." };

  const resultado = await db.transaction(async (tx) => {
    const [ins] = await tx.select().from(inscricoes).where(eq(inscricoes.id, inscricaoId));
    if (!ins) return { erro: "Esta inscrição não existe mais." } as const;
    const [turma] = await tx.select().from(turmas).where(eq(turmas.id, ins.turmaId)).for("update");

    // Passar para uma situação que ocupa vaga exige vaga livre (sem contar a própria inscrição).
    if (SITUACOES_QUE_OCUPAM.includes(nova) && !SITUACOES_QUE_OCUPAM.includes(ins.situacao)) {
      const [{ n }] = await tx
        .select({ n: count() })
        .from(inscricoes)
        .where(and(eq(inscricoes.turmaId, turma.id), inArray(inscricoes.situacao, SITUACOES_QUE_OCUPAM), ne(inscricoes.id, ins.id)));
      if (n >= turma.vagas) return { erro: "Não há vagas livres nesta turma. Aumente as vagas na agenda ou cancele outra inscrição." } as const;
    }

    await tx.update(inscricoes).set({ situacao: nova }).where(eq(inscricoes.id, ins.id));
    return { slug: turma.slug } as const;
  });

  if ("erro" in resultado) return { erro: resultado.erro };

  // A contagem de vagas mudou: invalida o site público na hora.
  updateTag(tagTurma(resultado.slug));
  updateTag(TAG_TURMAS);
  revalidatePath("/admin/inscricoes");
  return { ok: true };
}

/** "Reenviar": nova tentativa de um e-mail que falhou (ou que a pessoa pediu de novo). */
export async function reenviarEmail(emailId: string): Promise<EstadoAcao> {
  const auth = await autorizar("inscricao:gerir");
  if (!auth.ok) return { erro: auth.erro };

  const r = await reenviar(emailId);
  revalidatePath("/admin/inscricoes");
  return r.ok ? { ok: true } : { erro: r.erro ?? "Não foi possível reenviar." };
}
