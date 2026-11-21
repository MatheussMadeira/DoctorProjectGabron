import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { siteReservas, siteSecoes, siteAuditoria } from "@/db/schema";
import { CAMPOS, type Conteudo, type TipoSecao } from "./campos";
import { conteudoPadraoDaPagina } from "./editor-padrao";
import { conteudoIgual } from "./igual";
import { defDaSecao, PAGINAS, type PaginaSlug } from "./paginas";

/* Servidor do editor: carregar a página (criando as seções que ainda não existem, com o texto padrão), a reserva de "uma pessoa por vez" e a
   conta das alterações ainda não publicadas. As Server Actions (app/(painel)/admin/acoes-editor.ts) chamam isto depois de conferir a permissão. */

export interface SecaoEditor {
  id: string;
  chave: string;
  tipo: TipoSecao;
  rotulo: string;
  dados: boolean;
  numerada: boolean;
  visivel: boolean;
  conteudo: Conteudo;
  /** Tem alteração (de texto, ordem ou visibilidade) que ainda não foi publicada. */
  alterada: boolean;
}

export interface PaginaEditor {
  pagina: PaginaSlug;
  secoes: SecaoEditor[];
  alteracoes: number;
  ultimaPublicacao: { em: string; por: string } | null;
}

const igual = conteudoIgual;

/** Garante uma linha por seção (rascunho = padrão) e devolve a página como o editor a mostra. */
export async function carregarPaginaEditor(pagina: PaginaSlug): Promise<PaginaEditor> {
  const padroes = await conteudoPadraoDaPagina(pagina);
  const defs = PAGINAS[pagina].secoes;
  let linhas = await db.select().from(siteSecoes).where(eq(siteSecoes.pagina, pagina)).orderBy(asc(siteSecoes.ordem));
  const faltam = defs.filter((d) => !linhas.some((l) => l.chave === d.chave));
  if (faltam.length) {
    await db
      .insert(siteSecoes)
      .values(faltam.map((d) => ({ pagina, chave: d.chave, tipo: d.tipo, ordem: defs.findIndex((x) => x.chave === d.chave), rascunho: padroes[d.chave] })))
      .onConflictDoNothing();
    linhas = await db.select().from(siteSecoes).where(eq(siteSecoes.pagina, pagina)).orderBy(asc(siteSecoes.ordem));
  }

  const secoes: SecaoEditor[] = linhas
    .filter((l) => defDaSecao(pagina, l.chave))
    .map((l) => {
      const def = defDaSecao(pagina, l.chave)!;
      const indicePadrao = defs.findIndex((d) => d.chave === l.chave);
      const alterada = l.publicado
        ? !igual(l.rascunho, l.publicado) || l.ordem !== (l.ordemPublicada ?? indicePadrao) || l.visivel !== (l.visivelPublicada ?? true)
        : !igual(l.rascunho, padroes[l.chave]) || l.ordem !== indicePadrao || !l.visivel;
      return { id: l.id, chave: l.chave, tipo: def.tipo, rotulo: def.rotulo, dados: !!def.dados, numerada: !!def.numerada, visivel: l.visivel, conteudo: l.rascunho, alterada };
    });
  const [recente] = await db.select().from(siteAuditoria).where(and(eq(siteAuditoria.pagina, pagina), eq(siteAuditoria.acao, "PUBLICOU"))).orderBy(desc(siteAuditoria.createdAt)).limit(1);
  return {
    pagina,
    secoes,
    alteracoes: secoes.filter((s) => s.alterada).length,
    ultimaPublicacao: recente ? { em: recente.createdAt.toISOString(), por: recente.usuarioNome } : null,
  };
}

/* ------------------------------ Uma pessoa por vez ------------------------------ */

const VALIDADE_MS = 45_000;

export type ResultadoReserva = { ok: true } | { ok: false; por: string };

/** Abre a página para esta aba: livre, vencida ou da mesma pessoa (outra aba) → assume; de outra pessoa, ainda válida → recusa. */
export async function reservarPagina(pagina: PaginaSlug, usuario: { id: string; nome: string }, token: string): Promise<ResultadoReserva> {
  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + VALIDADE_MS);
  const [atual] = await db.select().from(siteReservas).where(eq(siteReservas.pagina, pagina));
  if (atual && atual.expiraEm > agora && atual.usuarioId !== usuario.id) return { ok: false, por: atual.usuarioNome };
  await db
    .insert(siteReservas)
    .values({ pagina, usuarioId: usuario.id, usuarioNome: usuario.nome, token, expiraEm })
    .onConflictDoUpdate({ target: siteReservas.pagina, set: { usuarioId: usuario.id, usuarioNome: usuario.nome, token, expiraEm, adquiridaEm: agora } });
  return { ok: true };
}

/** Renova a reserva SÓ se ela ainda é desta aba (outra aba ou outra pessoa pode ter assumido). */
export async function renovarReserva(pagina: PaginaSlug, usuarioId: string, token: string): Promise<boolean> {
  const r = await db
    .update(siteReservas)
    .set({ expiraEm: new Date(Date.now() + VALIDADE_MS) })
    .where(and(eq(siteReservas.pagina, pagina), eq(siteReservas.usuarioId, usuarioId), eq(siteReservas.token, token), gt(siteReservas.expiraEm, new Date())))
    .returning({ pagina: siteReservas.pagina });
  return r.length > 0;
}

export async function liberarReserva(pagina: PaginaSlug, usuarioId: string, token: string) {
  await db.delete(siteReservas).where(and(eq(siteReservas.pagina, pagina), eq(siteReservas.usuarioId, usuarioId), eq(siteReservas.token, token)));
}

/** A reserva é desta aba e está válida? (Gravar e publicar exigem.) */
export async function reservaValida(pagina: PaginaSlug, usuarioId: string, token: string): Promise<boolean> {
  const [r] = await db.select({ p: siteReservas.pagina }).from(siteReservas).where(and(eq(siteReservas.pagina, pagina), eq(siteReservas.usuarioId, usuarioId), eq(siteReservas.token, token), gt(siteReservas.expiraEm, new Date())));
  return !!r;
}

/** Limpa reservas vencidas (higiene; chamada ao abrir o editor). */
export async function limparReservasVencidas() {
  await db.delete(siteReservas).where(lt(siteReservas.expiraEm, new Date(Date.now() - 3600_000)));
}

export { CAMPOS };
