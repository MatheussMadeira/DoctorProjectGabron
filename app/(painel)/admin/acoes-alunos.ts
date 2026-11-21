"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { alunoCertificados, alunoComentarios, alunoMateriais, alunoModulos, alunos, inscricoes, TIPOS_MATERIAL } from "@/db/schema";
import { criarRedefinicao, enviarCodigoAoAluno, gerarAcessosDosConfirmados } from "@/lib/aluno";
import { ARQUIVO_BLOB, errosPorCampo } from "@/lib/aluno-form";
import { camposDeMidia } from "@/lib/alumni-form";
import { avisarNovoMaterial, enviarLinkDeNovaSenha } from "@/lib/email/aluno";
import { traduzirNaHora } from "@/lib/i18n/traduzir";
import { autorizar } from "@/lib/sessao";

/* Área do aluno no painel: só o ADMIN. Alunos (códigos, bloqueio, nova senha, certificados), módulos e materiais de cada turma, e moderação
   dos comentários. A área do aluno lê direto do banco (é por sessão, sem cache), então não há tags para expirar. */

const atualizar = () => revalidatePath("/admin/alunos");

export interface EstadoAdminAlunos {
  ok?: boolean;
  erro?: string;
  mensagem?: string;
  erros?: Record<string, string>;
  id?: string;
}

const ERRO_REVISE = "Revise os campos marcados e salve de novo.";

/* ------------------------------ Alunos ------------------------------ */

export async function gerarAcessos(): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const r = await gerarAcessosDosConfirmados();
  atualizar();
  return { ok: true, mensagem: `${r.criados} acesso(s) criado(s) e código enviado. ${r.jaTinham} já tinham acesso.${r.falhas ? ` ${r.falhas} com falha: veja o e-mail na lista.` : ""}` };
}

export async function reenviarCodigo(alunoId: string): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const r = await enviarCodigoAoAluno(alunoId);
  atualizar();
  return r.ok ? { ok: true, mensagem: "Código enviado de novo." } : { erro: r.erro };
}

export async function enviarNovaSenha(alunoId: string): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const [a] = await db.select().from(alunos).where(eq(alunos.id, alunoId));
  if (!a) return { erro: "Aluno não encontrado." };
  const pedido = await criarRedefinicao(a.email);
  if (!pedido) return { erro: "Este aluno ainda não criou a conta (use “Reenviar código”) ou está bloqueado." };
  const ok = await enviarLinkDeNovaSenha(pedido.aluno, pedido.token);
  return ok ? { ok: true, mensagem: "Link de nova senha enviado por e-mail." } : { erro: "Não foi possível enviar o e-mail agora." };
}

export async function alternarBloqueio(alunoId: string): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const [a] = await db.select({ bloqueado: alunos.bloqueado }).from(alunos).where(eq(alunos.id, alunoId));
  if (!a) return { erro: "Aluno não encontrado." };
  // Bloquear derruba as sessões abertas (a sessão é relida do banco a cada pedido).
  await db.update(alunos).set({ bloqueado: !a.bloqueado, falhas: 0, bloqueadoAte: null, updatedAt: new Date() }).where(eq(alunos.id, alunoId));
  atualizar();
  return { ok: true, mensagem: a.bloqueado ? "Acesso liberado." : "Acesso bloqueado." };
}

export async function salvarCertificado(alunoId: string, turmaId: string, url: string, nome: string): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  if (!ARQUIVO_BLOB.test(url)) return { erro: "Envie o arquivo pelo botão “Enviar PDF”." };
  const [a] = await db.select({ email: alunos.email }).from(alunos).where(eq(alunos.id, alunoId));
  if (!a) return { erro: "Aluno não encontrado." };
  const [conf] = await db.select({ id: inscricoes.id }).from(inscricoes).where(and(eq(inscricoes.turmaId, turmaId), sql`lower(${inscricoes.email}) = ${a.email}`, eq(inscricoes.situacao, "CONFIRMADA")));
  if (!conf) return { erro: "Este aluno não tem inscrição confirmada nesta turma." };
  await db
    .insert(alunoCertificados)
    .values({ alunoId, turmaId, arquivoUrl: url, arquivoNome: nome.slice(0, 160) || "certificado.pdf" })
    .onConflictDoUpdate({ target: [alunoCertificados.alunoId, alunoCertificados.turmaId], set: { arquivoUrl: url, arquivoNome: nome.slice(0, 160) || "certificado.pdf", createdAt: new Date() } });
  atualizar();
  return { ok: true, mensagem: "Certificado salvo." };
}

export async function excluirCertificado(id: string): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(alunoCertificados).where(eq(alunoCertificados.id, id));
  atualizar();
  return { ok: true };
}

/* ------------------------------ Módulos ------------------------------ */

const moduloSchema = z.object({
  titulo: z.string().trim().min(2, "Digite o título do módulo.").max(120, "Use no máximo 120 caracteres."),
  descricao: z.string().trim().max(600, "Use no máximo 600 caracteres.").default(""),
  visivel: z.string().optional(),
});

export async function salvarModulo(turmaId: string, id: string | null, _anterior: EstadoAdminAlunos, formData: FormData): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const parsed = moduloSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erros: errosPorCampo(parsed.error), erro: ERRO_REVISE };
  const d = parsed.data;
  const valores = { titulo: d.titulo, descricao: d.descricao, visivel: d.visivel === "on", updatedAt: new Date() };
  let salvoId = id;
  if (id) {
    const [existe] = await db.update(alunoModulos).set(valores).where(eq(alunoModulos.id, id)).returning({ id: alunoModulos.id });
    if (!existe) return { erro: "Este módulo não existe mais." };
  } else {
    const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${alunoModulos.ordem}), -1) + 1` }).from(alunoModulos).where(eq(alunoModulos.turmaId, turmaId));
    const [novo] = await db.insert(alunoModulos).values({ ...valores, turmaId, ordem: proxima }).returning({ id: alunoModulos.id });
    salvoId = novo.id;
  }
  if (salvoId) await traduzirNaHora("alunoModulo", salvoId);
  atualizar();
  return { ok: true, id: salvoId ?? undefined };
}

export async function excluirModulo(id: string): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(alunoModulos).where(eq(alunoModulos.id, id));
  atualizar();
  return { ok: true };
}

export async function moverModulo(id: string, direcao: "sobe" | "desce"): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const [atual] = await db.select({ turmaId: alunoModulos.turmaId }).from(alunoModulos).where(eq(alunoModulos.id, id));
  if (!atual) return {};
  const lista = await db.select({ id: alunoModulos.id }).from(alunoModulos).where(eq(alunoModulos.turmaId, atual.turmaId)).orderBy(asc(alunoModulos.ordem), asc(alunoModulos.createdAt));
  const i = lista.findIndex((l) => l.id === id);
  const j = direcao === "sobe" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return {};
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await db.transaction(async (tx) => {
    for (const [ordem, l] of lista.entries()) await tx.update(alunoModulos).set({ ordem }).where(eq(alunoModulos.id, l.id));
  });
  atualizar();
  return { ok: true };
}

/* ------------------------------ Materiais ------------------------------ */

const imagensSchema = z
  .array(z.object({ url: z.string().regex(ARQUIVO_BLOB, "Imagem inválida: envie de novo."), alt: z.string().trim().min(3, "Descreva cada imagem (para leitor de tela).").max(200, "Use no máximo 200 caracteres.") }))
  .max(12, "Use no máximo 12 imagens.");

const materialSchema = z.object({
  tipo: z.enum(TIPOS_MATERIAL, "Escolha o tipo."),
  titulo: z.string().trim().min(2, "Digite o título.").max(160, "Use no máximo 160 caracteres."),
  texto: z.string().trim().max(8000, "Use no máximo 8000 caracteres.").default(""),
  arquivoUrl: z.string().trim().default("").refine((v) => !v || ARQUIVO_BLOB.test(v), "Envie o arquivo pelo botão “Enviar PDF”."),
  arquivoNome: z.string().trim().max(160).default(""),
  imagens: z.string().default("[]"),
  videoUrl: camposDeMidia.videoUrl,
  videoLegendaUrl: camposDeMidia.videoLegendaUrl,
  publicarEm: z.string().trim().default("").refine((v) => !v || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v), "Use data e hora válidas."),
  visivel: z.string().optional(),
  avisar: z.string().optional(),
});

export async function salvarMaterial(moduloId: string, id: string | null, _anterior: EstadoAdminAlunos, formData: FormData): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const parsed = materialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erros: errosPorCampo(parsed.error), erro: ERRO_REVISE };
  const d = parsed.data;

  let imagens: z.infer<typeof imagensSchema> = [];
  try {
    const lidas = imagensSchema.safeParse(JSON.parse(d.imagens));
    if (!lidas.success) return { erros: { imagens: lidas.error.issues[0]?.message ?? "Imagens inválidas." }, erro: ERRO_REVISE };
    imagens = lidas.data;
  } catch {
    return { erros: { imagens: "Imagens inválidas." }, erro: ERRO_REVISE };
  }

  const [existente] = id ? await db.select().from(alunoMateriais).where(eq(alunoMateriais.id, id)) : [];
  if (id && !existente) return { erro: "Este material não existe mais." };
  const arquivoUrl = d.arquivoUrl || existente?.arquivoUrl || null;
  const arquivoNome = d.arquivoUrl ? d.arquivoNome || "material.pdf" : existente?.arquivoNome ?? null;

  const erros: Record<string, string> = {};
  if (d.tipo === "PDF" && !arquivoUrl) erros.arquivoUrl = "Envie o arquivo PDF.";
  if (d.tipo === "VIDEO" && !d.videoUrl) erros.videoUrl = "Cole o link do vídeo ou envie o arquivo.";
  if (d.tipo === "CASO" && !d.texto && !imagens.length) erros.texto = "Escreva o caso ou envie ao menos uma imagem.";
  if (Object.keys(erros).length) return { erros, erro: ERRO_REVISE };

  // O horário digitado é o de Brasília (UTC-3, sem horário de verão).
  const publicarEm = d.publicarEm ? new Date(`${d.publicarEm}:00-03:00`) : null;
  const valores = {
    tipo: d.tipo,
    titulo: d.titulo,
    texto: d.texto,
    arquivoUrl: d.tipo === "PDF" ? arquivoUrl : null,
    arquivoNome: d.tipo === "PDF" ? arquivoNome : null,
    imagens: d.tipo === "CASO" ? imagens : [],
    videoUrl: d.tipo === "VIDEO" || d.tipo === "CASO" ? d.videoUrl || null : null,
    videoLegendaUrl: d.videoUrl && d.videoLegendaUrl ? d.videoLegendaUrl : null,
    visivel: d.visivel === "on",
    publicarEm,
    avisar: d.avisar === "on",
    updatedAt: new Date(),
  };

  let salvoId = id;
  if (id) {
    await db.update(alunoMateriais).set(valores).where(eq(alunoMateriais.id, id));
  } else {
    const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${alunoMateriais.ordem}), -1) + 1` }).from(alunoMateriais).where(eq(alunoMateriais.moduloId, moduloId));
    const [novo] = await db.insert(alunoMateriais).values({ ...valores, moduloId, ordem: proxima }).returning({ id: alunoMateriais.id });
    salvoId = novo.id;
  }
  if (salvoId) {
    await traduzirNaHora("alunoMaterial", salvoId);
    // Já publicado e com "avisar": avisa os alunos agora (uma vez). Agendado: o cron diário avisa quando chegar a hora.
    const id2 = salvoId;
    after(async () => {
      await avisarNovoMaterial(id2);
    });
  }
  atualizar();
  return { ok: true, id: salvoId ?? undefined };
}

export async function excluirMaterial(id: string): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(alunoMateriais).where(eq(alunoMateriais.id, id));
  atualizar();
  return { ok: true };
}

export async function moverMaterial(id: string, direcao: "sobe" | "desce"): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const [atual] = await db.select({ moduloId: alunoMateriais.moduloId }).from(alunoMateriais).where(eq(alunoMateriais.id, id));
  if (!atual) return {};
  const lista = await db.select({ id: alunoMateriais.id }).from(alunoMateriais).where(eq(alunoMateriais.moduloId, atual.moduloId)).orderBy(asc(alunoMateriais.ordem), asc(alunoMateriais.createdAt));
  const i = lista.findIndex((l) => l.id === id);
  const j = direcao === "sobe" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return {};
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await db.transaction(async (tx) => {
    for (const [ordem, l] of lista.entries()) await tx.update(alunoMateriais).set({ ordem }).where(eq(alunoMateriais.id, l.id));
  });
  atualizar();
  return { ok: true };
}

/* ------------------------------ Comentários ------------------------------ */

export async function alternarComentarioOculto(id: string): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const [c] = await db.select({ oculto: alunoComentarios.oculto }).from(alunoComentarios).where(eq(alunoComentarios.id, id));
  if (!c) return { erro: "Comentário não encontrado." };
  await db.update(alunoComentarios).set({ oculto: !c.oculto }).where(eq(alunoComentarios.id, id));
  atualizar();
  return { ok: true };
}

export async function excluirComentario(id: string): Promise<EstadoAdminAlunos> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(alunoComentarios).where(eq(alunoComentarios.id, id));
  atualizar();
  return { ok: true };
}
