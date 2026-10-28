"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { loginTentativas, usuarios, type Papel } from "@/db/schema";
import { normalizarEmail } from "@/lib/login";
import { conferirSenha, gerarHash, gerarSenhaTemporaria, validarSenha } from "@/lib/senha";
import { autorizar, autorizarSessao } from "@/lib/sessao";

export interface EstadoUsuario {
  ok?: boolean;
  erro?: string;
  /** Mostrada uma única vez ao ADMIN, para ele entregar à pessoa. Não fica guardada em lugar nenhum. */
  senhaTemporaria?: string;
  email?: string;
  mensagem?: string;
}

const PAPEIS: Papel[] = ["ADMIN", "EQUIPE"];

/** Quantos ADMIN ativos existem (nunca pode chegar a zero). */
async function adminsAtivos() {
  const [{ n }] = await db.select({ n: count() }).from(usuarios).where(and(eq(usuarios.papel, "ADMIN"), eq(usuarios.ativo, true)));
  return n;
}

export async function criarUsuario(_anterior: EstadoUsuario, formData: FormData): Promise<EstadoUsuario> {
  const auth = await autorizar("usuario:gerir");
  if (!auth.ok) return { erro: auth.erro };

  const nome = String(formData.get("nome") ?? "").trim();
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  const papel = String(formData.get("papel") ?? "EQUIPE") as Papel;
  if (!nome) return { erro: "Preencha o nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Digite um e-mail válido, como nome@dominio.com.br." };
  if (!PAPEIS.includes(papel)) return { erro: "Escolha o papel." };

  const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email));
  if (existe) return { erro: "Já existe um usuário com este e-mail." };

  const senhaTemporaria = gerarSenhaTemporaria();
  await db.insert(usuarios).values({ nome, email, papel, senhaHash: await gerarHash(senhaTemporaria), ativo: true });
  revalidatePath("/admin/configuracoes");
  return { ok: true, email, senhaTemporaria, mensagem: `Usuário criado: ${nome}.` };
}

/** O ADMIN redefine a senha de quem esqueceu (não há "esqueci minha senha" por e-mail por enquanto). */
export async function redefinirSenhaUsuario(_anterior: EstadoUsuario, formData: FormData): Promise<EstadoUsuario> {
  const auth = await autorizar("usuario:gerir");
  if (!auth.ok) return { erro: auth.erro };

  const id = String(formData.get("id") ?? "");
  const [alvo] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  if (!alvo) return { erro: "Usuário não encontrado." };

  const senhaTemporaria = gerarSenhaTemporaria();
  await db.update(usuarios).set({ senhaHash: await gerarHash(senhaTemporaria), updatedAt: new Date() }).where(eq(usuarios.id, id));
  await db.delete(loginTentativas).where(eq(loginTentativas.email, alvo.email)); // libera um bloqueio por tentativas
  return { ok: true, email: alvo.email, senhaTemporaria, mensagem: `Nova senha de ${alvo.nome}.` };
}

export async function alternarUsuarioAtivo(_anterior: EstadoUsuario, formData: FormData): Promise<EstadoUsuario> {
  const auth = await autorizar("usuario:gerir");
  if (!auth.ok) return { erro: auth.erro };

  const id = String(formData.get("id") ?? "");
  const [alvo] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  if (!alvo) return { erro: "Usuário não encontrado." };
  if (alvo.id === auth.usuario.id) return { erro: "Você não pode desativar a própria conta." };
  if (alvo.ativo && alvo.papel === "ADMIN" && (await adminsAtivos()) <= 1) return { erro: "É preciso manter pelo menos um ADMIN ativo." };

  await db.update(usuarios).set({ ativo: !alvo.ativo, updatedAt: new Date() }).where(eq(usuarios.id, id));
  revalidatePath("/admin/configuracoes");
  return { ok: true, mensagem: alvo.ativo ? `${alvo.nome} foi desativado.` : `${alvo.nome} foi reativado.` };
}

export async function alterarPapelUsuario(_anterior: EstadoUsuario, formData: FormData): Promise<EstadoUsuario> {
  const auth = await autorizar("usuario:gerir");
  if (!auth.ok) return { erro: auth.erro };

  const id = String(formData.get("id") ?? "");
  const papel = String(formData.get("papel") ?? "") as Papel;
  if (!PAPEIS.includes(papel)) return { erro: "Escolha o papel." };
  const [alvo] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  if (!alvo) return { erro: "Usuário não encontrado." };
  if (alvo.papel === "ADMIN" && papel !== "ADMIN" && alvo.ativo && (await adminsAtivos()) <= 1) return { erro: "É preciso manter pelo menos um ADMIN ativo." };

  await db.update(usuarios).set({ papel, updatedAt: new Date() }).where(eq(usuarios.id, id));
  revalidatePath("/admin/configuracoes");
  return { ok: true, mensagem: `${alvo.nome} agora é ${papel === "ADMIN" ? "ADMIN" : "EQUIPE"}.` };
}

/** Qualquer usuário troca a própria senha, confirmando a atual. */
export async function trocarMinhaSenha(_anterior: EstadoUsuario, formData: FormData): Promise<EstadoUsuario> {
  const auth = await autorizarSessao();
  if (!auth.ok) return { erro: auth.erro };

  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");
  const repetida = String(formData.get("repetida") ?? "");

  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, auth.usuario.id));
  if (!u?.senhaHash || !(await conferirSenha(atual, u.senhaHash))) return { erro: "A senha atual não confere." };
  const erroNova = validarSenha(nova);
  if (erroNova) return { erro: erroNova };
  if (nova !== repetida) return { erro: "As duas senhas novas não são iguais." };

  await db.update(usuarios).set({ senhaHash: await gerarHash(nova), updatedAt: new Date() }).where(eq(usuarios.id, u.id));
  return { ok: true, mensagem: "Senha alterada." };
}
