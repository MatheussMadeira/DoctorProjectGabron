import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { turmas as tabelaTurmas, alunoCertificados, alunoComentarios, alunoMateriais, alunoMateriaisTraducoes, alunoModulos, alunoModulosTraducoes, alunos, type ImagemMaterial, type TipoMaterial } from "@/db/schema";
import { turmasDoAluno } from "./aluno";
import { sobrepor } from "./i18n/estrutura";
import { LOCALE_PADRAO, type Locale } from "./i18n/idiomas";

/* O que a área do aluno mostra. Sempre filtrado pelas turmas em que o e-mail tem inscrição CONFIRMADA, pelo "visível" e pela data de
   publicação. Os endereços dos arquivos NUNCA saem daqui: o navegador recebe só índices, e o arquivo vem por /api/aluno/arquivo. */

/** Quem olha: o aluno (turmas pela inscrição confirmada) ou, na prévia do ADMIN por turma, uma lista de turmas forçada (sem aluno de verdade). */
export type Quem = { id: string; email: string; turmaIds?: string[] };

/** Id que não pertence a nenhum aluno: na prévia por turma, não há certificado nem comentário "meu". */
export const ID_PREVIA = "00000000-0000-4000-8000-000000000000";

async function turmasPermitidas(q: Quem) {
  if (!q.turmaIds) return turmasDoAluno(q.email);
  if (!q.turmaIds.length) return [];
  return db
    .select({ id: tabelaTurmas.id, slug: tabelaTurmas.slug, titulo: tabelaTurmas.titulo, tituloCurto: tabelaTurmas.tituloCurto, inicio: tabelaTurmas.inicio })
    .from(tabelaTurmas)
    .where(and(inArray(tabelaTurmas.id, q.turmaIds), isNull(tabelaTurmas.excluidaEm)));
}

/** Material publicado: visível e sem data de publicação no futuro. */
const publicado = () => and(eq(alunoMateriais.visivel, true), or(isNull(alunoMateriais.publicarEm), lte(alunoMateriais.publicarEm, sql`now()`)));

export interface MaterialResumo {
  id: string;
  tipo: TipoMaterial;
  titulo: string;
  /** Quando saiu (data da publicação agendada, ou da criação). */
  em: string;
}
export interface ModuloDoAluno {
  id: string;
  titulo: string;
  descricao: string;
  materiais: MaterialResumo[];
}
export interface TurmaDoAluno {
  id: string;
  titulo: string;
  inicio: string;
  modulos: ModuloDoAluno[];
  certificado: { id: string; nome: string } | null;
}

export async function conteudoDoAluno(aluno: Quem, locale: Locale): Promise<TurmaDoAluno[]> {
  const minhas = await turmasPermitidas(aluno);
  if (!minhas.length) return [];
  const ids = minhas.map((t) => t.id);
  const modulos = await db.select().from(alunoModulos).where(and(inArray(alunoModulos.turmaId, ids), eq(alunoModulos.visivel, true))).orderBy(asc(alunoModulos.ordem), asc(alunoModulos.createdAt));
  const materiais = modulos.length
    ? await db
        .select()
        .from(alunoMateriais)
        .where(and(inArray(alunoMateriais.moduloId, modulos.map((m) => m.id)), publicado()))
        .orderBy(asc(alunoMateriais.ordem), asc(alunoMateriais.createdAt))
    : [];
  const certificados = await db.select().from(alunoCertificados).where(eq(alunoCertificados.alunoId, aluno.id));
  const tradModulos = locale === LOCALE_PADRAO || !modulos.length ? [] : await db.select().from(alunoModulosTraducoes).where(eq(alunoModulosTraducoes.locale, locale));
  const tradMateriais = locale === LOCALE_PADRAO || !materiais.length ? [] : await db.select().from(alunoMateriaisTraducoes).where(eq(alunoMateriaisTraducoes.locale, locale));
  const doModulo = new Map(tradModulos.map((t) => [t.moduloId, t.conteudo]));
  const doMaterial = new Map(tradMateriais.map((t) => [t.materialId, t.conteudo]));

  return minhas.map((t) => ({
    id: t.id,
    titulo: t.tituloCurto ?? t.titulo,
    inicio: t.inicio,
    modulos: modulos
      .filter((m) => m.turmaId === t.id)
      .map((m) => ({
        ...sobrepor({ id: m.id, titulo: m.titulo, descricao: m.descricao }, doModulo.get(m.id), ["titulo", "descricao"]),
        materiais: materiais
          .filter((x) => x.moduloId === m.id)
          .map((x) => ({ id: x.id, tipo: x.tipo, titulo: sobrepor({ titulo: x.titulo }, doMaterial.get(x.id), ["titulo"]).titulo, em: (x.publicarEm ?? x.createdAt).toISOString().slice(0, 10) })),
      })),
    certificado: (() => {
      const c = certificados.find((x) => x.turmaId === t.id);
      return c ? { id: c.id, nome: c.arquivoNome } : null;
    })(),
  }));
}

export interface ComentarioDoMaterial {
  id: string;
  nome: string;
  texto: string;
  em: string;
  meu: boolean;
}
export interface MaterialCompleto {
  id: string;
  tipo: TipoMaterial;
  titulo: string;
  texto: string;
  arquivoNome: string | null;
  /** Só a descrição e o índice: o endereço da imagem não sai do servidor. */
  imagens: Array<{ indice: number; alt: string }>;
  videoUrl: string | null;
  videoLegendaUrl: string | null;
  modulo: { id: string; titulo: string };
  turma: { id: string; titulo: string };
  comentarios: ComentarioDoMaterial[];
}

/** Um material, se o aluno pode ver (turma dele, módulo e material visíveis e já publicados). */
export async function materialDoAluno(aluno: Quem, materialId: string, locale: Locale): Promise<MaterialCompleto | null> {
  const [linha] = await db
    .select({ m: alunoMateriais, mod: alunoModulos })
    .from(alunoMateriais)
    .innerJoin(alunoModulos, eq(alunoModulos.id, alunoMateriais.moduloId))
    .where(and(eq(alunoMateriais.id, materialId), eq(alunoModulos.visivel, true), publicado()));
  if (!linha) return null;
  const minhas = await turmasPermitidas(aluno);
  const turma = minhas.find((t) => t.id === linha.mod.turmaId);
  if (!turma) return null;

  const [trad] = locale === LOCALE_PADRAO ? [] : await db.select().from(alunoMateriaisTraducoes).where(and(eq(alunoMateriaisTraducoes.materialId, materialId), eq(alunoMateriaisTraducoes.locale, locale)));
  const [tradModulo] = locale === LOCALE_PADRAO ? [] : await db.select().from(alunoModulosTraducoes).where(and(eq(alunoModulosTraducoes.moduloId, linha.mod.id), eq(alunoModulosTraducoes.locale, locale)));
  const base = sobrepor({ titulo: linha.m.titulo, texto: linha.m.texto }, trad?.conteudo, ["titulo", "texto"]);
  const imagensTraduzidas = trad?.conteudo?.imagens;
  const imagens = linha.m.imagens.map((img: ImagemMaterial, indice: number) => {
    const t = Array.isArray(imagensTraduzidas) && imagensTraduzidas.length === linha.m.imagens.length ? (imagensTraduzidas[indice] as { alt?: string } | undefined) : undefined;
    return { indice, alt: t?.alt?.trim() ? t.alt : img.alt };
  });

  const comentarios = await db
    .select({ id: alunoComentarios.id, texto: alunoComentarios.texto, createdAt: alunoComentarios.createdAt, alunoId: alunoComentarios.alunoId, nome: alunos.nome })
    .from(alunoComentarios)
    .innerJoin(alunos, eq(alunos.id, alunoComentarios.alunoId))
    .where(and(eq(alunoComentarios.materialId, materialId), eq(alunoComentarios.oculto, false)))
    .orderBy(asc(alunoComentarios.createdAt));

  return {
    id: linha.m.id,
    tipo: linha.m.tipo,
    titulo: base.titulo,
    texto: base.texto,
    arquivoNome: linha.m.arquivoUrl ? linha.m.arquivoNome : null,
    imagens,
    videoUrl: linha.m.videoUrl,
    videoLegendaUrl: linha.m.videoLegendaUrl,
    modulo: { id: linha.mod.id, titulo: sobrepor({ titulo: linha.mod.titulo }, tradModulo?.conteudo, ["titulo"]).titulo },
    turma: { id: turma.id, titulo: turma.tituloCurto ?? turma.titulo },
    comentarios: comentarios.map((c) => ({ id: c.id, nome: c.nome, texto: c.texto, em: c.createdAt.toISOString(), meu: c.alunoId === aluno.id })),
  };
}

export type TipoArquivo = "material" | "imagem" | "certificado";

/** O endereço de um arquivo que o aluno pode baixar (usado só por /api/aluno/arquivo, que entrega o conteúdo sem mostrar o endereço). */
export async function arquivoDoAluno(aluno: Quem, tipo: TipoArquivo, id: string, indice = 0): Promise<{ url: string; nome: string } | null> {
  if (tipo === "certificado") {
    const [c] = await db.select().from(alunoCertificados).where(and(eq(alunoCertificados.id, id), eq(alunoCertificados.alunoId, aluno.id)));
    return c ? { url: c.arquivoUrl, nome: c.arquivoNome } : null;
  }
  const material = await materialDoAluno(aluno, id, LOCALE_PADRAO);
  if (!material) return null;
  const [m] = await db.select().from(alunoMateriais).where(eq(alunoMateriais.id, id));
  if (tipo === "material") return m?.arquivoUrl ? { url: m.arquivoUrl, nome: m.arquivoNome ?? "material.pdf" } : null;
  const img = m?.imagens[indice];
  return img ? { url: img.url, nome: `imagem-${indice + 1}` } : null;
}

/** O material aceita comentários (discussão de caso) e o aluno pode vê-lo? */
export async function podeComentar(aluno: Quem, materialId: string): Promise<boolean> {
  const m = await materialDoAluno(aluno, materialId, LOCALE_PADRAO);
  return !!m && m.tipo === "CASO";
}
