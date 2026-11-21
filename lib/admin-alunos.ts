import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { alunoCertificados, alunoComentarios, alunoMateriais, alunoModulos, alunos, emailsEnvios, inscricoes, turmas, type ImagemMaterial, type TipoMaterial } from "@/db/schema";

/* Leituras do painel da área do aluno: tudo, inclusive o que está oculto ou agendado. Os endereços dos arquivos não saem daqui para o navegador. */

export interface AlunoAdmin {
  id: string;
  nome: string;
  email: string;
  /** aguardando (código enviado, conta não criada), ativo ou bloqueado. */
  situacao: "aguardando" | "ativo" | "bloqueado";
  codigoEnviadoEm: string | null;
  ultimoAcessoEm: string | null;
  /** Último e-mail do código: ENVIADO, FALHOU ou PENDENTE. */
  emailDoCodigo: string | null;
  turmas: Array<{ id: string; titulo: string; certificado: { id: string; nome: string } | null }>;
}

export async function listarAlunosAdmin(): Promise<AlunoAdmin[]> {
  const lista = await db.select().from(alunos).orderBy(asc(alunos.nome));
  if (!lista.length) return [];
  const confirmadas = await db
    .select({ email: sql<string>`lower(${inscricoes.email})`, turmaId: turmas.id, titulo: turmas.titulo, curto: turmas.tituloCurto })
    .from(inscricoes)
    .innerJoin(turmas, eq(turmas.id, inscricoes.turmaId))
    .where(and(eq(inscricoes.situacao, "CONFIRMADA"), isNull(turmas.excluidaEm)));
  const certificados = await db.select().from(alunoCertificados);
  const envios = await db
    .select({ alunoId: emailsEnvios.alunoId, status: emailsEnvios.status, quando: emailsEnvios.createdAt })
    .from(emailsEnvios)
    .where(and(eq(emailsEnvios.tipo, "ALUNO_CODIGO"), inArray(emailsEnvios.alunoId, lista.map((a) => a.id))))
    .orderBy(desc(emailsEnvios.createdAt));

  return lista.map((a) => ({
    id: a.id,
    nome: a.nome,
    email: a.email,
    situacao: a.bloqueado ? "bloqueado" : a.ativadoEm ? "ativo" : "aguardando",
    codigoEnviadoEm: a.codigoEnviadoEm?.toISOString() ?? null,
    ultimoAcessoEm: a.ultimoAcessoEm?.toISOString() ?? null,
    emailDoCodigo: envios.find((e) => e.alunoId === a.id)?.status ?? null,
    turmas: [...new Map(confirmadas.filter((c) => c.email === a.email).map((c) => [c.turmaId, c])).values()].map((c) => ({
      id: c.turmaId,
      titulo: c.curto ?? c.titulo,
      certificado: (() => {
        const x = certificados.find((k) => k.alunoId === a.id && k.turmaId === c.turmaId);
        return x ? { id: x.id, nome: x.arquivoNome } : null;
      })(),
    })),
  }));
}

export async function listarTurmasParaMateriais(): Promise<Array<{ id: string; titulo: string; inicio: string }>> {
  return db
    .select({ id: turmas.id, titulo: sql<string>`coalesce(${turmas.tituloCurto}, ${turmas.titulo})`, inicio: turmas.inicio })
    .from(turmas)
    .where(isNull(turmas.excluidaEm))
    .orderBy(desc(turmas.inicio));
}

export interface MaterialAdmin {
  id: string;
  moduloId: string;
  tipo: TipoMaterial;
  titulo: string;
  texto: string;
  arquivoNome: string | null;
  temArquivo: boolean;
  imagens: ImagemMaterial[];
  videoUrl: string | null;
  videoLegendaUrl: string | null;
  visivel: boolean;
  /** Para o campo datetime-local, no horário de Brasília (AAAA-MM-DDTHH:mm). */
  publicarEm: string | null;
  avisar: boolean;
  notificado: boolean;
  /** A data de publicação ainda não chegou. */
  agendado: boolean;
  comentarios: number;
}
export interface ModuloAdmin {
  id: string;
  turmaId: string;
  titulo: string;
  descricao: string;
  visivel: boolean;
  materiais: MaterialAdmin[];
}

export async function listarModulosAdmin(turmaId: string): Promise<ModuloAdmin[]> {
  const modulos = await db.select().from(alunoModulos).where(eq(alunoModulos.turmaId, turmaId)).orderBy(asc(alunoModulos.ordem), asc(alunoModulos.createdAt));
  if (!modulos.length) return [];
  const materiais = await db
    .select({
      m: alunoMateriais,
      comentarios: sql<number>`(select count(*)::int from ${alunoComentarios} where ${alunoComentarios.materialId} = ${alunoMateriais.id})`,
      agendado: sql<boolean>`coalesce(${alunoMateriais.publicarEm} > now(), false)`,
      brasilia: sql<string | null>`to_char(${alunoMateriais.publicarEm} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI')`,
    })
    .from(alunoMateriais)
    .where(inArray(alunoMateriais.moduloId, modulos.map((m) => m.id)))
    .orderBy(asc(alunoMateriais.ordem), asc(alunoMateriais.createdAt));
  return modulos.map((mod) => ({
    id: mod.id,
    turmaId: mod.turmaId,
    titulo: mod.titulo,
    descricao: mod.descricao,
    visivel: mod.visivel,
    materiais: materiais
      .filter((x) => x.m.moduloId === mod.id)
      .map(({ m, comentarios, brasilia, agendado }) => ({
        id: m.id,
        moduloId: m.moduloId,
        tipo: m.tipo,
        titulo: m.titulo,
        texto: m.texto,
        arquivoNome: m.arquivoNome,
        temArquivo: !!m.arquivoUrl,
        imagens: m.imagens,
        videoUrl: m.videoUrl,
        videoLegendaUrl: m.videoLegendaUrl,
        visivel: m.visivel,
        publicarEm: brasilia,
        avisar: m.avisar,
        notificado: !!m.notificadoEm,
        agendado,
        comentarios,
      })),
  }));
}

export interface ComentarioAdmin {
  id: string;
  texto: string;
  oculto: boolean;
  em: string;
  aluno: string;
  material: string;
}

export async function listarComentariosAdmin(limite = 60): Promise<ComentarioAdmin[]> {
  const linhas = await db
    .select({ id: alunoComentarios.id, texto: alunoComentarios.texto, oculto: alunoComentarios.oculto, em: alunoComentarios.createdAt, aluno: alunos.nome, material: alunoMateriais.titulo })
    .from(alunoComentarios)
    .innerJoin(alunos, eq(alunos.id, alunoComentarios.alunoId))
    .innerJoin(alunoMateriais, eq(alunoMateriais.id, alunoComentarios.materialId))
    .orderBy(desc(alunoComentarios.createdAt))
    .limit(limite);
  return linhas.map((l) => ({ ...l, em: l.em.toISOString() }));
}
