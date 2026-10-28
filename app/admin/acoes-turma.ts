"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { turmaProfessores, turmas, type Publicacao } from "@/db/schema";
import { obterTurmaAdmin } from "@/lib/admin-turmas";
import { autorizar } from "@/lib/sessao";
import { errosPorCampo, gerarSlug, turmaSchema, type EstadoTurma } from "@/lib/turma-form";
import { TAG_TURMAS, tagTurma } from "@/lib/turmas";

/** Depois de gravar, o site público não pode mostrar vagas ou dados velhos: expira as duas tags na hora. */
function invalidar(...slugs: string[]) {
  new Set(slugs).forEach((s) => updateTag(tagTurma(s)));
  updateTag(TAG_TURMAS);
}

async function slugLivre(base: string): Promise<string> {
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [existe] = await db.select({ id: turmas.id }).from(turmas).where(eq(turmas.slug, slug));
    if (!existe) return slug;
  }
  throw new Error("Não foi possível gerar um endereço único para a turma.");
}

/** Cria (id = null) ou atualiza uma turma. O botão "acao" decide: rascunho, ou publicar com a publicação escolhida. */
export async function salvarTurma(id: string | null, _anterior: EstadoTurma, formData: FormData): Promise<EstadoTurma> {
  const auth = await autorizar(id ? "turma:editar" : "turma:criar");
  if (!auth.ok) return { erroGeral: auth.erro };

  const bruto = Object.fromEntries(formData);
  const parsed = turmaSchema.safeParse(bruto);
  if (!parsed.success) {
    const erros = errosPorCampo(parsed.error);
    // O zod não confere o fim enquanto outro campo está inválido; mostra os dois erros de uma vez.
    const { inicio, fim } = bruto as Record<string, string>;
    if (inicio && fim && fim < inicio) erros.fim ??= "O fim não pode ser antes do início.";
    return { erros, erroGeral: "Revise os campos marcados e salve de novo." };
  }
  const t = parsed.data;

  const acao = String(bruto.acao ?? "publicar");
  const publicacao: Publicacao = acao === "rascunho" ? "RASCUNHO" : t.publicacao === "RASCUNHO" ? "PUBLICADO" : t.publicacao;

  const valores = {
    titulo: t.titulo,
    tituloCurto: t.tituloCurto,
    resumo: t.resumo,
    descricao: t.descricao,
    modalidade: t.modalidade,
    publicacao,
    inicio: t.inicio,
    fim: t.fim,
    horario: t.horario,
    cidade: t.cidade,
    local: t.local,
    vagas: t.vagas,
    precoCentavos: t.preco,
    parcelamento: t.parcelamento,
    fotoUrl: t.fotoUrl,
    fotoAlt: t.fotoAlt,
    publicoAlvo: t.publicoAlvo,
    aprendizados: t.aprendizados,
    programacao: t.programacao,
    faq: t.faq,
    updatedAt: new Date(),
  };

  let slug: string;
  if (id) {
    const atual = await obterTurmaAdmin(id);
    if (!atual) return { erroGeral: "Esta data não existe mais." };
    if (t.vagas < atual.ocupadas) {
      return { erros: { vagas: `Já há ${atual.ocupadas} inscrições ocupando vagas. Use ${atual.ocupadas} ou mais.` }, erroGeral: "Revise os campos marcados e salve de novo." };
    }
    slug = atual.slug; // o endereço da turma não muda depois de criada: links e buscas continuam valendo
    await db.update(turmas).set(valores).where(and(eq(turmas.id, id), isNull(turmas.excluidaEm)));
  } else {
    slug = await slugLivre(gerarSlug(t.tituloCurto || t.titulo, t.inicio));
    const [nova] = await db.insert(turmas).values({ ...valores, slug }).returning({ id: turmas.id });
    id = nova.id;
  }

  // Professores desta turma, na ordem escolhida (campos "professorId" repetidos, já na ordem da tela).
  const escolhidos = [...new Set(formData.getAll("professorId").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v)))];
  await db.transaction(async (tx) => {
    await tx.delete(turmaProfessores).where(eq(turmaProfessores.turmaId, id!));
    if (escolhidos.length) await tx.insert(turmaProfessores).values(escolhidos.map((professorId, ordem) => ({ turmaId: id!, professorId, ordem })));
  });

  invalidar(slug);
  redirect(`/admin/agenda?salvo=${publicacao === "RASCUNHO" ? "rascunho" : "publicada"}`);
}

/** Só o ADMIN exclui. Exclusão lógica: a turma sai do site e as inscrições ficam arquivadas. */
export async function excluirTurma(id: string): Promise<{ erro?: string }> {
  const auth = await autorizar("turma:excluir");
  if (!auth.ok) return { erro: auth.erro };

  const turma = await obterTurmaAdmin(id);
  if (!turma) return { erro: "Esta data não existe mais." };

  await db.update(turmas).set({ excluidaEm: new Date(), updatedAt: new Date() }).where(eq(turmas.id, id));
  invalidar(turma.slug);
  redirect("/admin/agenda?salvo=excluida");
}

/** Alternativa a excluir quando há inscritos: tira do site e mantém tudo. */
export async function mudarParaRascunho(id: string): Promise<{ erro?: string }> {
  const auth = await autorizar("turma:editar");
  if (!auth.ok) return { erro: auth.erro };

  const turma = await obterTurmaAdmin(id);
  if (!turma) return { erro: "Esta data não existe mais." };

  await db.update(turmas).set({ publicacao: "RASCUNHO", updatedAt: new Date() }).where(eq(turmas.id, id));
  invalidar(turma.slug);
  redirect("/admin/agenda?salvo=rascunho");
}
