"use server";

import { revalidatePath, updateTag } from "next/cache";
import { and, asc, eq, isNull, lt, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { alumni, alumniTurmas, inscricoes, turmas } from "@/db/schema";
import { alumniSchema, alumniTurmaSchema, errosPorCampo, type EstadoAlumni } from "@/lib/alumni-form";
import { TAG_ALUMNI } from "@/lib/alumni";
import { buscarLocais, consultaDeCidade, type Local } from "@/lib/geocodificar";
import { traduzirNaHora } from "@/lib/i18n/traduzir";
import { autorizar } from "@/lib/sessao";

/* Alumni: só o ADMIN. Tudo expira a tag na hora (o site público acompanha) e a DeepL traduz o que mudou. */

const atualizar = () => {
  updateTag(TAG_ALUMNI);
  revalidatePath("/admin/alumni");
};

const ERRO_REVISE = "Revise os campos marcados e salve de novo.";

/* ------------------------------ Turmas realizadas ------------------------------ */

export async function salvarAlumniTurma(id: string | null, _anterior: EstadoAlumni, formData: FormData): Promise<EstadoAlumni> {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return { erroGeral: auth.erro };
  const parsed = alumniTurmaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erros: errosPorCampo(parsed.error), erroGeral: ERRO_REVISE };
  const d = parsed.data;
  if (d.dataInicio && d.dataFim && d.dataFim < d.dataInicio) return { erros: { dataFim: "A data final não pode ser antes da inicial." }, erroGeral: ERRO_REVISE };
  if (d.fotoUrl && !d.fotoAlt) d.fotoAlt = `Foto da turma ${d.titulo}`;

  const valores = {
    titulo: d.titulo,
    turmaId: d.turmaId,
    dataInicio: d.dataInicio,
    dataFim: d.dataFim,
    cidade: d.cidade,
    resumo: d.resumo,
    numeroAlunos: d.numeroAlunos,
    fotoUrl: d.fotoUrl || null,
    fotoAlt: d.fotoUrl ? d.fotoAlt : null,
    videoUrl: d.videoUrl || null,
    videoLegendaUrl: d.videoUrl && d.videoLegendaUrl ? d.videoLegendaUrl : null,
    visivel: d.visivel === "on",
    updatedAt: new Date(),
  };

  let salvoId = id;
  try {
    if (id) {
      const [existe] = await db.update(alumniTurmas).set(valores).where(eq(alumniTurmas.id, id)).returning({ id: alumniTurmas.id });
      if (!existe) return { erroGeral: "Esta turma não existe mais." };
    } else {
      const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${alumniTurmas.ordem}), -1) + 1` }).from(alumniTurmas);
      const [nova] = await db.insert(alumniTurmas).values({ ...valores, ordem: proxima }).returning({ id: alumniTurmas.id });
      salvoId = nova.id;
    }
  } catch (e) {
    if (e instanceof Error && /alumni_turmas_turma_id_unique|duplicate key/i.test(`${e.message} ${(e as { cause?: Error }).cause?.message ?? ""}`)) return { erros: { turmaId: "Esta turma da agenda já tem página na Alumni." }, erroGeral: ERRO_REVISE };
    throw e;
  }
  if (salvoId) await traduzirNaHora("alumniTurma", salvoId);
  atualizar();
  return { ok: true, id: salvoId ?? undefined };
}

export async function excluirAlumniTurma(id: string): Promise<{ erro?: string }> {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(alumniTurmas).where(eq(alumniTurmas.id, id));
  atualizar();
  return {};
}

export async function moverAlumniTurma(id: string, direcao: "sobe" | "desce"): Promise<{ erro?: string }> {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const lista = await db.select({ id: alumniTurmas.id }).from(alumniTurmas).orderBy(asc(alumniTurmas.ordem), asc(alumniTurmas.titulo));
  const i = lista.findIndex((l) => l.id === id);
  const j = direcao === "sobe" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return {};
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await db.transaction(async (tx) => {
    for (const [ordem, l] of lista.entries()) await tx.update(alumniTurmas).set({ ordem }).where(eq(alumniTurmas.id, l.id));
  });
  atualizar();
  return {};
}

/** Turmas da agenda que já aconteceram e ainda não têm página na Alumni. */
export async function turmasEncerradasSemAlumni(): Promise<Array<{ id: string; titulo: string; inicio: string; cidade: string }>> {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return [];
  const hoje = new Date().toISOString().slice(0, 10);
  const jaTem = db.select({ id: alumniTurmas.turmaId }).from(alumniTurmas).where(sql`${alumniTurmas.turmaId} is not null`);
  return db
    .select({ id: turmas.id, titulo: turmas.titulo, inicio: turmas.inicio, cidade: turmas.cidade })
    .from(turmas)
    .where(and(isNull(turmas.excluidaEm), lt(sql`coalesce(${turmas.fim}, ${turmas.inicio})`, hoje), notInArray(turmas.id, jaTem)))
    .orderBy(sql`${turmas.inicio} desc`);
}

/** Cria a página da Alumni de uma turma da agenda que já aconteceu (título, datas, cidade e foto vêm da turma; o resto o ADMIN completa). */
export async function criarAlumniTurmaDaAgenda(turmaId: string): Promise<EstadoAlumni> {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return { erroGeral: auth.erro };
  const [t] = await db.select().from(turmas).where(eq(turmas.id, turmaId));
  if (!t) return { erroGeral: "Esta turma não existe mais." };
  const [existe] = await db.select({ id: alumniTurmas.id }).from(alumniTurmas).where(eq(alumniTurmas.turmaId, turmaId));
  if (existe) return { ok: true, id: existe.id };
  const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${alumniTurmas.ordem}), -1) + 1` }).from(alumniTurmas);
  const [nova] = await db
    .insert(alumniTurmas)
    .values({ turmaId, titulo: t.tituloCurto || t.titulo, dataInicio: t.inicio, dataFim: t.fim, cidade: t.cidade, fotoUrl: t.fotoUrl, fotoAlt: t.fotoAlt, visivel: false, ordem: proxima })
    .returning({ id: alumniTurmas.id });
  await traduzirNaHora("alumniTurma", nova.id);
  atualizar();
  return { ok: true, id: nova.id };
}

/**
 * Traz para a lista de alunos as inscrições CONFIRMADAS da turma da agenda, com a cidade e o UF informados na inscrição. Entram ocultos e
 * sem autorização: só vão para o mapa quando o ADMIN registrar a data da autorização. A cidade vira coordenadas pelo OpenStreetMap
 * (no máximo 12 por vez, por causa do limite do serviço; o resto o ADMIN completa com "Buscar no mapa").
 */
export async function importarAlunosDaTurma(alumniTurmaId: string): Promise<EstadoAlumni & { semCoordenadas?: number }> {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return { erroGeral: auth.erro };
  const [at] = await db.select().from(alumniTurmas).where(eq(alumniTurmas.id, alumniTurmaId));
  if (!at) return { erroGeral: "Esta turma não existe mais." };
  if (!at.turmaId) return { erroGeral: "Esta turma não veio da agenda, então não há inscrições para importar. Cadastre os alunos à mão." };

  const jaImportadas = db.select({ id: alumni.inscricaoId }).from(alumni).where(sql`${alumni.inscricaoId} is not null`);
  const novas = await db
    .select()
    .from(inscricoes)
    .where(and(eq(inscricoes.turmaId, at.turmaId), eq(inscricoes.situacao, "CONFIRMADA"), notInArray(inscricoes.id, jaImportadas)))
    .orderBy(asc(inscricoes.nome));
  if (!novas.length) return { ok: true, importados: 0 };

  let geocodificados = 0;
  let semCoordenadas = 0;
  for (const i of novas) {
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (i.cidade && geocodificados < 12) {
      if (geocodificados > 0) await new Promise((r) => setTimeout(r, 1100)); // Nominatim: 1 busca por segundo
      geocodificados++;
      const r = await buscarLocais(consultaDeCidade(i.cidade, i.uf, "BR"), { pais: "br", limite: 1 });
      if (r.locais?.[0]) ({ latitude, longitude } = r.locais[0]);
    }
    if (latitude == null) semCoordenadas++;
    await db
      .insert(alumni)
      .values({ alumniTurmaId, inscricaoId: i.id, nome: i.nome, profissao: i.profissao, cidade: i.cidade ?? "", uf: i.uf, pais: "BR", latitude, longitude, visivel: false })
      .onConflictDoNothing();
  }
  atualizar();
  return { ok: true, importados: novas.length, semCoordenadas };
}

/* ------------------------------ Alunos do mapa ------------------------------ */

export async function salvarAlumni(id: string | null, _anterior: EstadoAlumni, formData: FormData): Promise<EstadoAlumni> {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return { erroGeral: auth.erro };
  const parsed = alumniSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erros: errosPorCampo(parsed.error), erroGeral: ERRO_REVISE };
  const d = parsed.data;
  if ((d.latitude == null) !== (d.longitude == null)) return { erros: { latitude: "Preencha latitude e longitude, ou deixe as duas vazias." }, erroGeral: ERRO_REVISE };
  const visivel = d.visivel === "on";
  if (visivel && !d.autorizacaoRecebidaEm) {
    return { erros: { autorizacaoRecebidaEm: "Informe a data em que a autorização por escrito foi recebida. Sem ela, o aluno não aparece no site." }, erroGeral: ERRO_REVISE };
  }
  if (d.fotoUrl && !d.fotoAlt) d.fotoAlt = `Foto de ${d.nome}`;

  const valores = {
    nome: d.nome,
    profissao: d.profissao,
    alumniTurmaId: d.alumniTurmaId,
    cidade: d.cidade,
    uf: d.uf,
    pais: d.pais,
    latitude: d.latitude,
    longitude: d.longitude,
    fotoUrl: d.fotoUrl || null,
    fotoAlt: d.fotoUrl ? d.fotoAlt : null,
    autorizacaoRecebidaEm: d.autorizacaoRecebidaEm,
    visivel,
    updatedAt: new Date(),
  };
  let salvoId = id;
  if (id) {
    const [existe] = await db.update(alumni).set(valores).where(eq(alumni.id, id)).returning({ id: alumni.id });
    if (!existe) return { erroGeral: "Este aluno não existe mais." };
  } else {
    const [novo] = await db.insert(alumni).values(valores).returning({ id: alumni.id });
    salvoId = novo.id;
  }
  // Só vai para a DeepL quem já foi autorizado a aparecer.
  if (salvoId && visivel) await traduzirNaHora("alumni", salvoId);
  atualizar();
  return { ok: true, id: salvoId ?? undefined };
}

export async function excluirAlumni(id: string): Promise<{ erro?: string }> {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(alumni).where(eq(alumni.id, id));
  atualizar();
  return {};
}

/** Busca coordenadas de uma cidade (botão "Buscar no mapa" dos formulários). */
export async function buscarCoordenadas(cidade: string, uf: string, pais: string): Promise<{ locais?: Local[]; erro?: string }> {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return { erro: auth.erro };
  return buscarLocais(consultaDeCidade(cidade, uf || null, pais || "BR"), { pais: pais && pais !== "BR" ? pais : "br" });
}
