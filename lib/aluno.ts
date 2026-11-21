import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { alunoRedefinicoes, alunos, inscricoes, turmas } from "@/db/schema";
import { gerarCodigo, normalizarCodigo } from "./aluno-codigo";
import { SENHA_ALUNO_MINIMA_CLIENTE } from "./aluno-cliente";
import { enviarERegistrar } from "./email/registro";
import { conferirSenha, gerarHash } from "./senha";

/* Regras da área do aluno: criação do acesso quando a inscrição é confirmada, primeiro acesso com o código, login com bloqueio depois de
   5 erros, "esqueci minha senha" e o aceite do aviso de confidencialidade. Nada aqui conhece cookie nem tela. */

/** Versão do aviso de confidencialidade: ao subir o número, todos os alunos precisam concordar de novo. */
export const TERMOS_VERSAO = 1;
export const SENHA_ALUNO_MINIMA = SENHA_ALUNO_MINIMA_CLIENTE;
const LIMITE_FALHAS = 5;
const BLOQUEIO_MS = 5 * 60 * 1000;
const REDEFINICAO_MS = 60 * 60 * 1000;

export type Aluno = typeof alunos.$inferSelect;
export const emailNormal = (email: string) => email.trim().toLowerCase();
const hashDoToken = (token: string) => createHash("sha256").update(token).digest("hex");

/* ------------------------- Acesso criado pela inscrição ------------------------- */

/**
 * Chamada quando uma inscrição vira CONFIRMADA. Se o e-mail ainda não tem aluno, cria e manda o código de primeiro acesso. Se já tem
 * (aluno recorrente), não manda nada: o conteúdo da nova turma passa a aparecer na conta que ele já usa. Nunca lança.
 */
export async function garantirAlunoDaInscricao(inscricaoId: string): Promise<{ criado: boolean; alunoId: string } | null> {
  try {
    const [ins] = await db.select().from(inscricoes).where(eq(inscricoes.id, inscricaoId));
    if (!ins || ins.situacao !== "CONFIRMADA") return null;
    const email = emailNormal(ins.email);
    const [existente] = await db.select({ id: alunos.id }).from(alunos).where(eq(alunos.email, email));
    if (existente) return { criado: false, alunoId: existente.id };

    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const [novo] = await db
        .insert(alunos)
        .values({ email, nome: ins.nome, idioma: ins.idioma, codigo: gerarCodigo() })
        .onConflictDoNothing()
        .returning({ id: alunos.id });
      if (novo) {
        await enviarCodigoAoAluno(novo.id);
        return { criado: true, alunoId: novo.id };
      }
      // Conflito: ou o e-mail foi criado agora por outra chamada, ou o código sorteado já existia.
      const [agora] = await db.select({ id: alunos.id }).from(alunos).where(eq(alunos.email, email));
      if (agora) return { criado: false, alunoId: agora.id };
    }
    return null;
  } catch (e) {
    console.error("[aluno] falha ao criar o acesso", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Manda (ou reenvia) o e-mail do código. Só faz sentido antes de a conta ser criada. */
export async function enviarCodigoAoAluno(alunoId: string): Promise<{ ok: boolean; erro?: string }> {
  const [a] = await db.select().from(alunos).where(eq(alunos.id, alunoId));
  if (!a) return { ok: false, erro: "Aluno não encontrado." };
  if (a.ativadoEm || !a.codigo) return { ok: false, erro: "Este aluno já criou a conta: o código não vale mais. Use “Enviar link de nova senha”." };
  const r = await enviarERegistrar("ALUNO_CODIGO", { alunoId });
  if (r.ok) await db.update(alunos).set({ codigoEnviadoEm: new Date(), updatedAt: new Date() }).where(eq(alunos.id, alunoId));
  return r.ok ? { ok: true } : { ok: false, erro: r.erro ?? "Não foi possível enviar o e-mail." };
}

/** Cria o acesso de todos os e-mails com inscrição CONFIRMADA que ainda não têm e manda os códigos. Para os alunos de antes da área existir. */
export async function gerarAcessosDosConfirmados(): Promise<{ criados: number; jaTinham: number; falhas: number }> {
  const confirmadas = await db.select({ id: inscricoes.id, email: inscricoes.email }).from(inscricoes).where(eq(inscricoes.situacao, "CONFIRMADA")).orderBy(asc(inscricoes.createdAt));
  const vistos = new Set<string>();
  let criados = 0;
  let jaTinham = 0;
  let falhas = 0;
  for (const i of confirmadas) {
    const email = emailNormal(i.email);
    if (vistos.has(email)) continue;
    vistos.add(email);
    const r = await garantirAlunoDaInscricao(i.id);
    if (!r) falhas++;
    else if (r.criado) criados++;
    else jaTinham++;
  }
  return { criados, jaTinham, falhas };
}

/** As turmas em que o e-mail tem inscrição CONFIRMADA: é o que o aluno enxerga na área dele (acesso vitalício). */
export async function turmasDoAluno(email: string) {
  return db
    .selectDistinct({ id: turmas.id, slug: turmas.slug, titulo: turmas.titulo, tituloCurto: turmas.tituloCurto, inicio: turmas.inicio })
    .from(inscricoes)
    .innerJoin(turmas, eq(turmas.id, inscricoes.turmaId))
    .where(and(sql`lower(${inscricoes.email}) = ${emailNormal(email)}`, eq(inscricoes.situacao, "CONFIRMADA"), isNull(turmas.excluidaEm)))
    .orderBy(sql`${turmas.inicio} desc`);
}

/* ------------------------- Entrada ------------------------- */

export type ResultadoAcesso =
  | { ok: true; aluno: Aluno }
  | { ok: false; erro: "credenciais" | "bloqueado" | "tempo"; minutos?: number };

const minutosAte = (quando: Date) => Math.max(1, Math.ceil((quando.getTime() - Date.now()) / 60_000));

async function registrarFalha(a: Aluno) {
  const falhas = a.falhas + 1;
  if (falhas >= LIMITE_FALHAS) await db.update(alunos).set({ falhas: 0, bloqueadoAte: new Date(Date.now() + BLOQUEIO_MS), updatedAt: new Date() }).where(eq(alunos.id, a.id));
  else await db.update(alunos).set({ falhas, updatedAt: new Date() }).where(eq(alunos.id, a.id));
}

// Hash de mentira: quando o e-mail não existe, a senha é conferida do mesmo jeito (o tempo de resposta não revela se o e-mail tem conta).
let hashFalso: Promise<string> | null = null;
const falso = () => (hashFalso ??= gerarHash("senha-que-ninguem-usa"));

/** Primeiro acesso: e-mail + código + a senha nova. O código some depois de usado. Mensagem genérica para qualquer erro de e-mail ou código. */
export async function ativarConta(emailBruto: string, codigoBruto: string, senha: string): Promise<ResultadoAcesso> {
  const email = emailNormal(emailBruto);
  const [a] = await db.select().from(alunos).where(eq(alunos.email, email));
  if (!a) {
    await conferirSenha(senha, await falso());
    return { ok: false, erro: "credenciais" };
  }
  if (a.bloqueado) return { ok: false, erro: "bloqueado" };
  if (a.bloqueadoAte && a.bloqueadoAte > new Date()) return { ok: false, erro: "tempo", minutos: minutosAte(a.bloqueadoAte) };
  if (a.ativadoEm || !a.codigo || a.codigo !== normalizarCodigo(codigoBruto)) {
    await registrarFalha(a);
    return { ok: false, erro: "credenciais" };
  }
  const [ativo] = await db
    .update(alunos)
    .set({ senhaHash: await gerarHash(senha), ativadoEm: new Date(), codigo: null, falhas: 0, bloqueadoAte: null, ultimoAcessoEm: new Date(), updatedAt: new Date() })
    .where(and(eq(alunos.id, a.id), isNull(alunos.ativadoEm)))
    .returning();
  return ativo ? { ok: true, aluno: ativo } : { ok: false, erro: "credenciais" };
}

/** Login com e-mail e senha. Cinco erros seguidos bloqueiam por 5 minutos; o ADMIN também pode bloquear a conta. */
export async function entrar(emailBruto: string, senha: string): Promise<ResultadoAcesso> {
  const email = emailNormal(emailBruto);
  const [a] = await db.select().from(alunos).where(eq(alunos.email, email));
  if (!a || !a.senhaHash || !a.ativadoEm) {
    await conferirSenha(senha, await falso());
    return { ok: false, erro: "credenciais" };
  }
  if (a.bloqueado) return { ok: false, erro: "bloqueado" };
  if (a.bloqueadoAte && a.bloqueadoAte > new Date()) return { ok: false, erro: "tempo", minutos: minutosAte(a.bloqueadoAte) };
  if (!(await conferirSenha(senha, a.senhaHash))) {
    await registrarFalha(a);
    return { ok: false, erro: "credenciais" };
  }
  const [ok] = await db.update(alunos).set({ falhas: 0, bloqueadoAte: null, ultimoAcessoEm: new Date(), updatedAt: new Date() }).where(eq(alunos.id, a.id)).returning();
  return { ok: true, aluno: ok };
}

/* ------------------------- Esqueci minha senha ------------------------- */

/** Cria o link de nova senha (só o hash fica no banco). Devolve null quando não há conta ativa para o e-mail (quem chamou responde igual nos dois casos). */
export async function criarRedefinicao(emailBruto: string): Promise<{ token: string; aluno: Aluno } | null> {
  const [a] = await db.select().from(alunos).where(eq(alunos.email, emailNormal(emailBruto)));
  if (!a || !a.ativadoEm || a.bloqueado) return null;
  const token = randomBytes(32).toString("base64url");
  await db.insert(alunoRedefinicoes).values({ alunoId: a.id, tokenHash: hashDoToken(token), expiraEm: new Date(Date.now() + REDEFINICAO_MS) });
  return { token, aluno: a };
}

export async function redefinicaoValida(token: string): Promise<boolean> {
  if (!token) return false;
  const [r] = await db
    .select({ id: alunoRedefinicoes.id })
    .from(alunoRedefinicoes)
    .where(and(eq(alunoRedefinicoes.tokenHash, hashDoToken(token)), isNull(alunoRedefinicoes.usadoEm), gt(alunoRedefinicoes.expiraEm, new Date())));
  return !!r;
}

/** Troca a senha pelo link. Derruba as sessões abertas (sessao_versao) e zera os bloqueios. */
export async function usarRedefinicao(token: string, senhaNova: string): Promise<boolean> {
  const [r] = await db
    .update(alunoRedefinicoes)
    .set({ usadoEm: new Date() })
    .where(and(eq(alunoRedefinicoes.tokenHash, hashDoToken(token)), isNull(alunoRedefinicoes.usadoEm), gt(alunoRedefinicoes.expiraEm, new Date())))
    .returning({ alunoId: alunoRedefinicoes.alunoId });
  if (!r) return false;
  await db
    .update(alunos)
    .set({ senhaHash: await gerarHash(senhaNova), sessaoVersao: sql`${alunos.sessaoVersao} + 1`, falhas: 0, bloqueadoAte: null, updatedAt: new Date() })
    .where(eq(alunos.id, r.alunoId));
  return true;
}

/* ------------------------- Aviso de confidencialidade ------------------------- */

export const precisaAceitar = (a: Pick<Aluno, "aceiteVersao">) => a.aceiteVersao < TERMOS_VERSAO;

export async function registrarAceite(alunoId: string) {
  await db.update(alunos).set({ aceiteEm: new Date(), aceiteVersao: TERMOS_VERSAO, updatedAt: new Date() }).where(eq(alunos.id, alunoId));
}
