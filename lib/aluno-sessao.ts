import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { alunos } from "@/db/schema";

/* Sessão da área do aluno: um cookie assinado (HMAC-SHA256 com AUTH_SECRET) com o id, a versão da sessão e a validade. É separada do login
   do painel. A cada leitura o aluno é relido do banco: bloquear o aluno ou trocar a senha (versão) derruba a sessão na hora. */

const COOKIE = "aluno_sessao";
const DURACAO_S = 60 * 60 * 24 * 14;

export type AlunoSessao = typeof alunos.$inferSelect;

const segredo = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não está definido.");
  return s;
};
const assinar = (texto: string) => createHmac("sha256", segredo()).update(`aluno:${texto}`).digest("base64url");

export function criarToken(alunoId: string, versao: number, agoraMs = Date.now()): string {
  const corpo = `${alunoId}.${versao}.${Math.floor(agoraMs / 1000) + DURACAO_S}`;
  return `${corpo}.${assinar(corpo)}`;
}

/** Confere a assinatura e a validade. Devolve o que o token diz, ou null. */
export function lerToken(token: string | undefined, agoraMs = Date.now()): { alunoId: string; versao: number } | null {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 4) return null;
  const [id, versao, expira, assinatura] = partes;
  const esperado = assinar(`${id}.${versao}.${expira}`);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expira) * 1000 < agoraMs) return null;
  return { alunoId: id, versao: Number(versao) };
}

export async function iniciarSessao(alunoId: string, versao: number) {
  (await cookies()).set(COOKIE, criarToken(alunoId, versao), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACAO_S });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

/** O aluno da sessão, ou null (sem cookie, cookie inválido, conta bloqueada, não ativada ou senha trocada depois). */
export async function alunoAtual(): Promise<AlunoSessao | null> {
  await connection();
  const lido = lerToken((await cookies()).get(COOKIE)?.value);
  if (!lido) return null;
  const [a] = await db.select().from(alunos).where(eq(alunos.id, lido.alunoId));
  if (!a || a.bloqueado || !a.ativadoEm || a.sessaoVersao !== lido.versao) return null;
  return a;
}
