"use server";

import { revalidatePath, updateTag } from "next/cache";
import { asc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { traduzirNaHora } from "@/lib/i18n/traduzir";
import { fotosGaleria, professores } from "@/db/schema";
import { errosPorCampo, galeriaSchema, professorSchema, type EstadoProfessor } from "@/lib/professor-form";
import { TAG_GALERIA, TAG_PROFESSORES } from "@/lib/professores";
import { autorizar } from "@/lib/sessao";

/* Professores e galeria: só o ADMIN. Tudo expira as tags na hora (o site público acompanha). */

/** Cria (id = null) ou atualiza um professor. */
export async function salvarProfessor(id: string | null, _anterior: EstadoProfessor, formData: FormData): Promise<EstadoProfessor> {
  const auth = await autorizar("professor:gerir");
  if (!auth.ok) return { erroGeral: auth.erro };

  const parsed = professorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erros: errosPorCampo(parsed.error), erroGeral: "Revise os campos marcados e salve de novo." };
  const d = parsed.data;
  // Com foto, a descrição dela é obrigatória (leitor de tela); sem foto o card usa a inicial do nome.
  if (d.fotoUrl && !d.fotoAlt) d.fotoAlt = `Foto de ${d.nome}`;

  const valores = {
    nome: d.nome,
    funcao: d.funcao,
    registro: d.registro,
    bio: d.bio,
    fotoUrl: d.fotoUrl || null,
    fotoAlt: d.fotoUrl ? d.fotoAlt : null,
    visivel: d.visivel === "on",
    updatedAt: new Date(),
  };

  let salvoId = id;
  if (id) {
    const [existe] = await db.update(professores).set(valores).where(eq(professores.id, id)).returning({ id: professores.id });
    if (!existe) return { erroGeral: "Este professor não existe mais." };
  } else {
    const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${professores.ordem}), -1) + 1` }).from(professores);
    const [novo] = await db.insert(professores).values({ ...valores, ordem: proxima }).returning({ id: professores.id });
    salvoId = novo.id;
  }

  if (salvoId) await traduzirNaHora("professor", salvoId);
  updateTag(TAG_PROFESSORES);
  revalidatePath("/admin/configuracoes");
  return { ok: true, id: salvoId ?? undefined };
}

/** Exclui o professor (e o tira das turmas, por cascata). */
export async function excluirProfessor(id: string): Promise<{ erro?: string }> {
  const auth = await autorizar("professor:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(professores).where(eq(professores.id, id));
  updateTag(TAG_PROFESSORES);
  revalidatePath("/admin/configuracoes");
  return {};
}

/** Sobe ou desce um professor na ordem do site. */
export async function moverProfessor(id: string, direcao: "sobe" | "desce"): Promise<{ erro?: string }> {
  const auth = await autorizar("professor:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const lista = await db.select({ id: professores.id }).from(professores).orderBy(asc(professores.ordem), asc(professores.nome));
  const i = lista.findIndex((p) => p.id === id);
  const j = direcao === "sobe" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return {};
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await db.transaction(async (tx) => {
    for (const [ordem, p] of lista.entries()) await tx.update(professores).set({ ordem }).where(eq(professores.id, p.id));
  });
  updateTag(TAG_PROFESSORES);
  revalidatePath("/admin/configuracoes");
  return {};
}

/**
 * Salva a galeria inteira: a lista enviada (na ordem) vira a galeria. Fotos que já existiam (têm `id`) são atualizadas no lugar, para não
 * perder as traduções delas; as novas são criadas; as que saíram da lista são apagadas. Descrição é obrigatória em toda foto.
 */
export async function salvarGaleria(lista: Array<{ id?: string; url: string; alt: string }>): Promise<{ ok?: boolean; erro?: string; erros?: Record<number, string> }> {
  const auth = await autorizar("galeria:gerir");
  if (!auth.ok) return { erro: auth.erro };

  const parsed = galeriaSchema.safeParse(lista);
  if (!parsed.success) {
    const erros: Record<number, string> = {};
    for (const i of parsed.error.issues) if (typeof i.path[0] === "number") erros[i.path[0]] ??= i.message;
    return { erro: "Toda foto precisa de uma descrição. Confira as fotos marcadas.", erros };
  }

  const ids: string[] = [];
  await db.transaction(async (tx) => {
    const existentes = new Set((await tx.select({ id: fotosGaleria.id }).from(fotosGaleria)).map((f) => f.id));
    const mantidas = parsed.data.map((f) => f.id).filter((id): id is string => !!id && existentes.has(id));
    if (mantidas.length) await tx.delete(fotosGaleria).where(notInArray(fotosGaleria.id, mantidas));
    else await tx.delete(fotosGaleria);
    for (const [ordem, f] of parsed.data.entries()) {
      if (f.id && existentes.has(f.id)) {
        await tx.update(fotosGaleria).set({ url: f.url, alt: f.alt, ordem, updatedAt: new Date() }).where(eq(fotosGaleria.id, f.id));
        ids.push(f.id);
      } else {
        const [nova] = await tx.insert(fotosGaleria).values({ url: f.url, alt: f.alt, ordem }).returning({ id: fotosGaleria.id });
        ids.push(nova.id);
      }
    }
  });
  await Promise.all(ids.map((id) => traduzirNaHora("foto", id)));
  updateTag(TAG_GALERIA);
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}
