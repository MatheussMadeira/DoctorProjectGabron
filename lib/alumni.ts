import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { alumni, alumniTraducoes, alumniTurmas, alumniTurmasTraducoes, depoimentos, depoimentosTraducoes } from "@/db/schema";
import { sobrepor } from "./i18n/estrutura";
import { LOCALE_PADRAO, tagIdioma, type Locale } from "./i18n/idiomas";
import { TAG_CURSO } from "./textos-curso-base";

/* Leituras públicas da Alumni (/alumni-reabtoxin): em cache, com tag. Quem salva no admin chama updateTag(TAG_ALUMNI).
   Só aparece quem tem `visivel` e a data da autorização por escrito. Os depoimentos (e os pins deles) seguem a regra de sempre. */

export const TAG_ALUMNI = "alumni";

/** Um pin do mapa: um aluno ou o autor de um depoimento. */
export interface PinAlumni {
  id: string;
  nome: string;
  profissao: string;
  cidade: string;
  uf: string | null;
  pais: string;
  latitude: number;
  longitude: number;
  fotoUrl: string | null;
  fotoAlt: string | null;
  /** Quando é o autor de um depoimento: o pin leva até ele na página. */
  depoimentoId: string | null;
}

export async function listarPinsAlumni(locale: Locale = LOCALE_PADRAO): Promise<PinAlumni[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_ALUMNI, TAG_CURSO, tagIdioma(locale));
  const [alunos, falas] = await Promise.all([
    db
      .select()
      .from(alumni)
      .where(and(eq(alumni.visivel, true), isNotNull(alumni.autorizacaoRecebidaEm), isNotNull(alumni.latitude), isNotNull(alumni.longitude)))
      .orderBy(asc(alumni.nome)),
    db
      .select()
      .from(depoimentos)
      .where(and(eq(depoimentos.visivel, true), eq(depoimentos.pendente, false), isNotNull(depoimentos.autorizacaoRecebidaEm), isNotNull(depoimentos.latitude), isNotNull(depoimentos.longitude)))
      .orderBy(asc(depoimentos.ordem)),
  ]);
  const tradAlunos = locale === LOCALE_PADRAO ? [] : await db.select().from(alumniTraducoes).where(eq(alumniTraducoes.locale, locale));
  const tradFalas = locale === LOCALE_PADRAO ? [] : await db.select().from(depoimentosTraducoes).where(eq(depoimentosTraducoes.locale, locale));
  const aluno = new Map(tradAlunos.map((t) => [t.alumniId, t.conteudo]));
  const fala = new Map(tradFalas.map((t) => [t.depoimentoId, t.conteudo]));

  return [
    ...alunos.map((a) =>
      sobrepor(
        { id: a.id, nome: a.nome, profissao: a.profissao, cidade: a.cidade, uf: a.uf, pais: a.pais, latitude: a.latitude!, longitude: a.longitude!, fotoUrl: a.fotoUrl, fotoAlt: a.fotoAlt, depoimentoId: null as string | null },
        aluno.get(a.id),
        ["profissao", "fotoAlt"],
      ),
    ),
    ...falas.map((d) =>
      sobrepor(
        { id: `d-${d.id}`, nome: d.nome, profissao: d.profissao, cidade: d.cidade, uf: d.uf, pais: d.pais, latitude: d.latitude!, longitude: d.longitude!, fotoUrl: d.fotoUrl, fotoAlt: d.fotoAlt, depoimentoId: d.id as string | null },
        fala.get(d.id),
        ["profissao", "cidade", "fotoAlt"],
      ),
    ),
  ];
}

export interface TurmaAlumni {
  id: string;
  titulo: string;
  dataInicio: string | null;
  dataFim: string | null;
  cidade: string;
  resumo: string;
  numeroAlunos: number | null;
  fotoUrl: string | null;
  fotoAlt: string | null;
  videoUrl: string | null;
  videoLegendaUrl: string | null;
  /** Nomes dos alunos que autorizaram aparecer. */
  alunos: Array<{ id: string; nome: string; profissao: string }>;
}

/** Turmas realizadas visíveis, da mais recente para a mais antiga (e a ordem manual quando não há data), com os alunos autorizados. */
export async function listarTurmasAlumni(locale: Locale = LOCALE_PADRAO): Promise<TurmaAlumni[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_ALUMNI, tagIdioma(locale));
  const turmas = await db.select().from(alumniTurmas).where(eq(alumniTurmas.visivel, true)).orderBy(desc(alumniTurmas.dataInicio), asc(alumniTurmas.ordem), asc(alumniTurmas.titulo));
  if (!turmas.length) return [];
  const alunos = await db
    .select()
    .from(alumni)
    .where(and(eq(alumni.visivel, true), isNotNull(alumni.autorizacaoRecebidaEm)))
    .orderBy(asc(alumni.nome));
  const trad = locale === LOCALE_PADRAO ? [] : await db.select().from(alumniTurmasTraducoes).where(eq(alumniTurmasTraducoes.locale, locale));
  const tradAlunos = locale === LOCALE_PADRAO ? [] : await db.select().from(alumniTraducoes).where(eq(alumniTraducoes.locale, locale));
  const porTurma = new Map(trad.map((t) => [t.alumniTurmaId, t.conteudo]));
  const porAluno = new Map(tradAlunos.map((t) => [t.alumniId, t.conteudo]));

  return turmas.map((t) => {
    const base = {
      id: t.id,
      titulo: t.titulo,
      dataInicio: t.dataInicio,
      dataFim: t.dataFim,
      cidade: t.cidade,
      resumo: t.resumo,
      numeroAlunos: t.numeroAlunos,
      fotoUrl: t.fotoUrl,
      fotoAlt: t.fotoAlt,
      videoUrl: t.videoUrl,
      videoLegendaUrl: t.videoLegendaUrl,
    };
    return {
      ...sobrepor(base, porTurma.get(t.id), ["titulo", "resumo", "fotoAlt"]),
      alunos: alunos
        .filter((a) => a.alumniTurmaId === t.id)
        .map((a) => ({ id: a.id, nome: a.nome, profissao: sobrepor({ profissao: a.profissao }, porAluno.get(a.id), ["profissao"]).profissao })),
    };
  });
}
