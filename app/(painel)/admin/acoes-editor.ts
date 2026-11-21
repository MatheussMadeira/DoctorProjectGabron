"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { siteAuditoria, siteSecoes } from "@/db/schema";
import { dadosDeTraducao, type DadosDeTraducao } from "@/lib/i18n/admin";
import { traduzirNaHora } from "@/lib/i18n/traduzir";
import { autorizar } from "@/lib/sessao";
import { validarConteudo, type Conteudo, type TipoSecao } from "@/lib/site-secoes/campos";
import { conteudoPadraoDaPagina } from "@/lib/site-secoes/editor-padrao";
import { conteudoIgual } from "@/lib/site-secoes/igual";
import { carregarPaginaEditor, liberarReserva, renovarReserva, reservarPagina, reservaValida, type PaginaEditor } from "@/lib/site-secoes/editor";
import { TAG_PAGINAS } from "@/lib/site-secoes/leitura";
import { defDaSecao, ehPagina, PAGINAS, type PaginaSlug } from "@/lib/site-secoes/paginas";

/* Editor visual: só o ADMIN ("site:editar"). Cada gravação confere também que a reserva da página é DESTA aba (uma pessoa por vez). */

const igual = conteudoIgual;

type Quem = { id: string; nome: string };
async function quem(pagina: string): Promise<{ ok: true; pagina: PaginaSlug; usuario: Quem } | { ok: false; erro: string }> {
  const auth = await autorizar("site:editar");
  if (!auth.ok) return { ok: false, erro: auth.erro };
  if (!ehPagina(pagina)) return { ok: false, erro: "Página desconhecida." };
  return { ok: true, pagina, usuario: { id: auth.usuario.id, nome: auth.usuario.nome } };
}

export type ResultadoAbertura = { ok: true; pagina: PaginaEditor } | { ok: false; erro?: string; ocupadaPor?: string };

/** Abre a página para esta aba: reserva (uma pessoa por vez) e devolve o estado do rascunho. */
export async function abrirPagina(pagina: string, token: string): Promise<ResultadoAbertura> {
  const q = await quem(pagina);
  if (!q.ok) return { ok: false, erro: q.erro };
  const r = await reservarPagina(q.pagina, q.usuario, token);
  if (!r.ok) return { ok: false, ocupadaPor: r.por };
  return { ok: true, pagina: await carregarPaginaEditor(q.pagina) };
}

/** Batimento: mantém a reserva enquanto o editor está aberto. `false` = outra aba ou outra pessoa assumiu (o editor pausa). */
export async function renovarPagina(pagina: string, token: string): Promise<boolean> {
  const q = await quem(pagina);
  return q.ok ? renovarReserva(q.pagina, q.usuario.id, token) : false;
}

export async function liberarPagina(pagina: string, token: string): Promise<void> {
  const q = await quem(pagina);
  if (q.ok) await liberarReserva(q.pagina, q.usuario.id, token);
}

export interface SecaoParaSalvar {
  chave: string;
  visivel: boolean;
  conteudo: Conteudo;
}
export interface ResultadoSalvar {
  ok: boolean;
  /** Reserva perdida: o editor pausa. */
  perdeu?: boolean;
  erro?: string;
  /** chave da seção → caminho do campo → mensagem. As seções com erro NÃO foram gravadas (ordem e visibilidade sim). */
  erros?: Record<string, Record<string, string>>;
  alteracoes?: number;
}

/** Grava o rascunho (a ordem do vetor é a ordem das seções). Conteúdo inválido não é gravado e volta com o erro de cada campo. */
export async function salvarRascunho(pagina: string, token: string, secoes: SecaoParaSalvar[]): Promise<ResultadoSalvar> {
  const q = await quem(pagina);
  if (!q.ok) return { ok: false, erro: q.erro };
  if (!(await reservaValida(q.pagina, q.usuario.id, token))) return { ok: false, perdeu: true, erro: "Outra pessoa (ou outra aba) assumiu esta página." };

  const erros: Record<string, Record<string, string>> = {};
  await db.transaction(async (tx) => {
    for (const [ordem, s] of secoes.entries()) {
      const def = defDaSecao(q.pagina, s.chave);
      if (!def) continue;
      const v = validarConteudo(def.tipo as TipoSecao, s.conteudo);
      const base = { ordem, visivel: !!s.visivel, atualizadoPor: q.usuario.id, updatedAt: new Date() };
      if (v.ok) await tx.update(siteSecoes).set({ ...base, rascunho: v.conteudo }).where(and(eq(siteSecoes.pagina, q.pagina), eq(siteSecoes.chave, s.chave)));
      else {
        erros[s.chave] = v.erros;
        await tx.update(siteSecoes).set(base).where(and(eq(siteSecoes.pagina, q.pagina), eq(siteSecoes.chave, s.chave)));
      }
    }
  });
  const estado = await carregarPaginaEditor(q.pagina);
  return { ok: Object.keys(erros).length === 0, erros: Object.keys(erros).length ? erros : undefined, alteracoes: estado.alteracoes };
}

export interface ResultadoPublicar {
  ok: boolean;
  perdeu?: boolean;
  erro?: string;
  erros?: Record<string, Record<string, string>>;
  publicadas?: number;
  traduzidas?: boolean;
}

/** Leva o rascunho ao ar (conteúdo, ordem e visibilidade) numa transação, expira o cache e manda traduzir o que mudou. */
export async function publicar(pagina: string, token: string): Promise<ResultadoPublicar> {
  const q = await quem(pagina);
  if (!q.ok) return { ok: false, erro: q.erro };
  if (!(await reservaValida(q.pagina, q.usuario.id, token))) return { ok: false, perdeu: true, erro: "Outra pessoa (ou outra aba) assumiu esta página." };

  const linhas = await db.select().from(siteSecoes).where(eq(siteSecoes.pagina, q.pagina));
  const erros: Record<string, Record<string, string>> = {};
  for (const l of linhas) {
    const def = defDaSecao(q.pagina, l.chave);
    if (!def) continue;
    const v = validarConteudo(def.tipo as TipoSecao, l.rascunho);
    if (!v.ok) erros[l.chave] = v.erros;
  }
  if (Object.keys(erros).length) return { ok: false, erro: "Há campos inválidos: corrija antes de publicar.", erros };

  const mudaram: string[] = [];
  const agora = new Date();
  await db.transaction(async (tx) => {
    for (const l of linhas) {
      if (!defDaSecao(q.pagina, l.chave)) continue;
      if (!igual(l.rascunho, l.publicado)) mudaram.push(l.id);
      await tx
        .update(siteSecoes)
        .set({ publicado: l.rascunho, ordemPublicada: l.ordem, visivelPublicada: l.visivel, publicadoEm: agora })
        .where(eq(siteSecoes.id, l.id));
    }
    await tx.insert(siteAuditoria).values({ pagina: q.pagina, usuarioId: q.usuario.id, usuarioNome: q.usuario.nome, acao: "PUBLICOU", secoes: linhas.filter((l) => mudaram.includes(l.id)).map((l) => l.chave) });
  });
  updateTag(TAG_PAGINAS);
  // As traduções vêm do que foi PUBLICADO; só os campos que mudaram vão à DeepL (hash). Em paralelo e sem derrubar a publicação se falhar.
  await Promise.all(mudaram.map((id) => traduzirNaHora("secaoPagina", id, 20_000)));
  return { ok: true, publicadas: linhas.length, traduzidas: mudaram.length > 0 };
}

/** Descarta as alterações não publicadas: o rascunho volta a ser o publicado (ou o padrão, se nunca foi publicado). */
export async function descartarAlteracoes(pagina: string, token: string): Promise<{ ok: boolean; erro?: string; perdeu?: boolean; pagina?: PaginaEditor }> {
  const q = await quem(pagina);
  if (!q.ok) return { ok: false, erro: q.erro };
  if (!(await reservaValida(q.pagina, q.usuario.id, token))) return { ok: false, perdeu: true, erro: "Outra pessoa (ou outra aba) assumiu esta página." };
  const linhas = await db.select().from(siteSecoes).where(eq(siteSecoes.pagina, q.pagina));
  const defs = PAGINAS[q.pagina].secoes;
  const padroes = await conteudoPadraoDaPagina(q.pagina);
  await db.transaction(async (tx) => {
    for (const l of linhas) {
      const indice = defs.findIndex((d) => d.chave === l.chave);
      await tx
        .update(siteSecoes)
        .set({ rascunho: l.publicado ?? padroes[l.chave] ?? l.rascunho, ordem: l.ordemPublicada ?? indice, visivel: l.visivelPublicada ?? true, updatedAt: new Date() })
        .where(eq(siteSecoes.id, l.id));
    }
  });
  return { ok: true, pagina: await carregarPaginaEditor(q.pagina) };
}

/** Traduções de uma seção (aba "Traduções" do editor). Só existem para o que já foi publicado. */
export async function traducoesDaSecao(secaoId: string): Promise<DadosDeTraducao | null> {
  const auth = await autorizar("site:editar");
  if (!auth.ok) return null;
  return dadosDeTraducao("secaoPagina", secaoId);
}
