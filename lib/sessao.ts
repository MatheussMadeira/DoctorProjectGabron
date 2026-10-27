import { redirect } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { usuarios, type Papel } from "@/db/schema";
import { pode, type Permissao } from "./permissoes";

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

/**
 * Usuário da sessão, relido do banco. O papel do token pode estar velho (a Dra. pode ter rebaixado ou
 * desativado a pessoa depois do login), então a decisão sempre usa o que está no banco.
 */
export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  // O Auth.js gera valores aleatórios antes de ler os cookies; com cacheComponents isso só pode rodar na requisição.
  await connection();
  const sessao = await auth();
  if (!sessao?.user?.id) return null;
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, sessao.user.id));
  if (!u || !u.ativo) return null;
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel };
}

/** Para páginas do admin: sem sessão válida, vai para o login (?sair=1 faz o proxy apagar o cookie que sobrou). */
export async function exigirSessao(): Promise<UsuarioSessao> {
  const u = await usuarioAtual();
  if (!u) redirect("/admin/login?sair=1");
  return u;
}

/** Páginas só para quem tem a permissão; quem não tem volta ao painel. */
export async function exigirPermissao(permissao: Permissao): Promise<UsuarioSessao> {
  const u = await exigirSessao();
  if (!pode(u.papel, permissao)) redirect("/admin?aviso=sem-permissao");
  return u;
}

export type Autorizacao = { ok: true; usuario: UsuarioSessao } | { ok: false; erro: string };

/**
 * Primeira linha de TODA Server Action e Route Handler do admin. Confere sessão e permissão de novo,
 * mesmo que o proxy e a interface já tenham barrado: elas podem ser chamadas direto, sem passar pela tela.
 */
export async function autorizar(permissao: Permissao): Promise<Autorizacao> {
  const u = await usuarioAtual();
  if (!u) return { ok: false, erro: "Sua sessão terminou. Entre de novo." };
  if (!pode(u.papel, permissao)) return { ok: false, erro: "Você não tem permissão para fazer isso." };
  return { ok: true, usuario: u };
}

/** Qualquer usuário ativo (ex.: trocar a própria senha). */
export async function autorizarSessao(): Promise<Autorizacao> {
  const u = await usuarioAtual();
  return u ? { ok: true, usuario: u } : { ok: false, erro: "Sua sessão terminou. Entre de novo." };
}
