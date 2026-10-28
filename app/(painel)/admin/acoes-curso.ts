"use server";

import { revalidatePath, updateTag } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { depoimentos, textosCurso } from "@/db/schema";
import { traduzirNaHora } from "@/lib/i18n/traduzir";
import { autorizar } from "@/lib/sessao";
import { cursoSchema } from "@/lib/curso-form";
import { BLOCOS, TAG_CURSO, type TextosDoCurso } from "@/lib/textos-curso";

/* Configurações › Curso: textos do topo da home, proposta, pilares, números e valores, e os depoimentos. Só o ADMIN.
   Ao salvar o português, a DeepL traduz o que mudou (rascunho automático, a revisar na aba Traduções de cada bloco). */

export interface EstadoCurso {
  ok?: boolean;
  erro?: string;
  /** "topo.titulo" → mensagem. */
  erros?: Record<string, string>;
}

export async function salvarCurso(dados: TextosDoCurso): Promise<EstadoCurso> {
  const auth = await autorizar("curso:gerir");
  if (!auth.ok) return { erro: auth.erro };

  const parsed = cursoSchema.safeParse(dados);
  if (!parsed.success) {
    const erros: Record<string, string> = {};
    for (const i of parsed.error.issues) erros[i.path.join(".")] ??= i.message;
    return { erro: "Revise os campos marcados e salve de novo.", erros };
  }

  for (const bloco of BLOCOS) {
    const conteudo = parsed.data[bloco] as Record<string, unknown>;
    await db.insert(textosCurso).values({ bloco, conteudo }).onConflictDoUpdate({ target: textosCurso.bloco, set: { conteudo, updatedAt: new Date() } });
  }
  await Promise.all(BLOCOS.map((b) => traduzirNaHora("textoCurso", b)));
  updateTag(TAG_CURSO);
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}

/* ---------------- Depoimentos ---------------- */

export interface EstadoDepoimento {
  ok?: boolean;
  erroGeral?: string;
  erros?: Record<string, string>;
  id?: string;
}

const texto = (max: number, vazio: string) => z.string().trim().min(1, vazio).max(max, `Use no máximo ${max} caracteres.`);

const dataSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD.");

const depoimentoSchema = z.object({
  nome: texto(120, "Digite o nome."),
  profissao: texto(120, "Digite a profissão."),
  cidade: texto(120, "Digite a cidade."),
  texto: texto(1200, "Escreva o depoimento."),
  autorizacaoRecebidaEm: z.string().trim().default(""),
  visivel: z.string().optional(),
});

/** Cria (id = null) ou atualiza um depoimento. Sem a data da autorização por escrito, ele não pode ficar visível no site. */
export async function salvarDepoimento(id: string | null, _anterior: EstadoDepoimento, formData: FormData): Promise<EstadoDepoimento> {
  const auth = await autorizar("curso:gerir");
  if (!auth.ok) return { erroGeral: auth.erro };

  const parsed = depoimentoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const erros: Record<string, string> = {};
    for (const i of parsed.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, erroGeral: "Revise os campos marcados e salve de novo." };
  }
  const d = parsed.data;
  const visivel = d.visivel === "on";
  if (d.autorizacaoRecebidaEm && !dataSchema.safeParse(d.autorizacaoRecebidaEm).success) return { erros: { autorizacaoRecebidaEm: "Use a data no formato AAAA-MM-DD." }, erroGeral: "Revise os campos marcados e salve de novo." };
  if (visivel && !d.autorizacaoRecebidaEm) {
    return { erros: { autorizacaoRecebidaEm: "Informe a data em que a autorização por escrito foi recebida. Sem ela, o depoimento não aparece no site." }, erroGeral: "Revise os campos marcados e salve de novo." };
  }

  const valores = { nome: d.nome, profissao: d.profissao, cidade: d.cidade, texto: d.texto, visivel, autorizacaoRecebidaEm: d.autorizacaoRecebidaEm || null, updatedAt: new Date() };
  let salvoId = id;
  if (id) {
    const [existe] = await db.update(depoimentos).set(valores).where(eq(depoimentos.id, id)).returning({ id: depoimentos.id });
    if (!existe) return { erroGeral: "Este depoimento não existe mais." };
  } else {
    const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${depoimentos.ordem}), -1) + 1` }).from(depoimentos);
    const [novo] = await db.insert(depoimentos).values({ ...valores, ordem: proxima }).returning({ id: depoimentos.id });
    salvoId = novo.id;
  }
  if (salvoId) await traduzirNaHora("depoimento", salvoId);
  updateTag(TAG_CURSO);
  revalidatePath("/admin/configuracoes");
  return { ok: true, id: salvoId ?? undefined };
}

export async function excluirDepoimento(id: string): Promise<{ erro?: string }> {
  const auth = await autorizar("curso:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(depoimentos).where(eq(depoimentos.id, id));
  updateTag(TAG_CURSO);
  revalidatePath("/admin/configuracoes");
  return {};
}

export async function moverDepoimento(id: string, direcao: "sobe" | "desce"): Promise<{ erro?: string }> {
  const auth = await autorizar("curso:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const lista = await db.select({ id: depoimentos.id }).from(depoimentos).orderBy(asc(depoimentos.ordem), asc(depoimentos.createdAt));
  const i = lista.findIndex((d) => d.id === id);
  const j = direcao === "sobe" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return {};
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await db.transaction(async (tx) => {
    for (const [ordem, d] of lista.entries()) await tx.update(depoimentos).set({ ordem }).where(and(eq(depoimentos.id, d.id)));
  });
  updateTag(TAG_CURSO);
  revalidatePath("/admin/configuracoes");
  return {};
}
