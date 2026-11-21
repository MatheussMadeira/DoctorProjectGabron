"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { alunoComentarios } from "@/db/schema";
import { ativarConta, criarRedefinicao, entrar, registrarAceite, SENHA_ALUNO_MINIMA, usarRedefinicao, type ResultadoAcesso } from "@/lib/aluno";
import { podeComentar } from "@/lib/aluno-conteudo";
import { alunoAtual, encerrarSessao, iniciarSessao } from "@/lib/aluno-sessao";
import { comentarioSchema, emailSchema, type EstadoAluno, valoresSemSenha } from "@/lib/aluno-form";
import { enviarLinkDeNovaSenha } from "@/lib/email/aluno";
import { idiomaDoFormulario } from "@/lib/formularios";
import { comPrefixo } from "@/lib/i18n/idiomas";
import { criarTradutor } from "@/lib/i18n/mensagens";
import { dentroDoLimite } from "@/lib/limite-taxa";
import { normalizarCodigo } from "@/lib/aluno-codigo";

/* Ações públicas da área do aluno. Os textos de erro saem no idioma da página (campo oculto "idioma"). Nenhuma diz se um e-mail existe:
   e-mail, código ou senha errados dão sempre a mesma mensagem. */

const tradutorDe = (formData: FormData) => {
  const idioma = idiomaDoFormulario(formData);
  return { idioma, t: criarTradutor(idioma, "Aluno") };
};

function erroDoAcesso(r: Extract<ResultadoAcesso, { ok: false }>, t: ReturnType<typeof criarTradutor>): string {
  if (r.erro === "bloqueado") return t("erroBloqueado");
  if (r.erro === "tempo") return t("erroTempo", { min: r.minutos ?? 5 });
  return t("erroCredenciais");
}

export async function entrarAluno(_anterior: EstadoAluno, formData: FormData): Promise<EstadoAluno> {
  const { idioma, t } = tradutorDe(formData);
  const valores = valoresSemSenha(formData);
  if (!(await dentroDoLimite("aluno_entrar"))) return { erro: t("erroLimite"), valores };
  const email = emailSchema.safeParse(formData.get("email"));
  const senha = String(formData.get("senha") ?? "");
  if (!email.success || !senha) return { erro: t("erroCredenciais"), valores };

  const r = await entrar(email.data, senha);
  if (!r.ok) return { erro: erroDoAcesso(r, t), valores };
  await iniciarSessao(r.aluno.id, r.aluno.sessaoVersao);
  redirect(comPrefixo(idioma, "/sou-aluno"));
}

export async function primeiroAcesso(_anterior: EstadoAluno, formData: FormData): Promise<EstadoAluno> {
  const { idioma, t } = tradutorDe(formData);
  const valores = valoresSemSenha(formData);
  if (!(await dentroDoLimite("aluno_ativar"))) return { erro: t("erroLimite"), valores };
  const email = emailSchema.safeParse(formData.get("email"));
  const codigo = normalizarCodigo(String(formData.get("codigo") ?? ""));
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("senhaConfirmar") ?? "");

  const erros: Record<string, string> = {};
  if (!email.success) erros.email = t("erroEmail");
  if (!codigo) erros.codigo = t("erroCodigo");
  if (senha.length < SENHA_ALUNO_MINIMA || senha.length > 128) erros.senha = t("erroSenhaCurta", { min: SENHA_ALUNO_MINIMA });
  else if (senha !== confirmar) erros.senhaConfirmar = t("erroSenhaDiferente");
  if (Object.keys(erros).length || !email.success) return { erros, valores };

  const r = await ativarConta(email.data, codigo, senha);
  if (!r.ok) return { erro: erroDoAcesso(r, t), valores };
  await iniciarSessao(r.aluno.id, r.aluno.sessaoVersao);
  redirect(comPrefixo(idioma, "/sou-aluno"));
}

/** "Esqueci minha senha": a resposta é a mesma exista ou não a conta. */
export async function esqueciSenha(_anterior: EstadoAluno, formData: FormData): Promise<EstadoAluno> {
  const { t } = tradutorDe(formData);
  const valores = valoresSemSenha(formData);
  if (!(await dentroDoLimite("aluno_esqueci"))) return { erro: t("erroLimite"), valores };
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { erros: { email: t("erroEmail") }, valores };
  const pedido = await criarRedefinicao(email.data);
  if (pedido) await enviarLinkDeNovaSenha(pedido.aluno, pedido.token);
  return { ok: true };
}

export async function redefinirSenha(_anterior: EstadoAluno, formData: FormData): Promise<EstadoAluno> {
  const { t } = tradutorDe(formData);
  if (!(await dentroDoLimite("aluno_esqueci"))) return { erro: t("erroLimite") };
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("senhaConfirmar") ?? "");
  if (senha.length < SENHA_ALUNO_MINIMA || senha.length > 128) return { erros: { senha: t("erroSenhaCurta", { min: SENHA_ALUNO_MINIMA }) } };
  if (senha !== confirmar) return { erros: { senhaConfirmar: t("erroSenhaDiferente") } };
  const ok = await usarRedefinicao(String(formData.get("token") ?? ""), senha);
  return ok ? { ok: true } : { erro: t("redefinirInvalido") };
}

export async function aceitarAviso(formData: FormData): Promise<void> {
  const idioma = idiomaDoFormulario(formData);
  const aluno = await alunoAtual();
  if (aluno) await registrarAceite(aluno.id);
  redirect(comPrefixo(idioma, "/sou-aluno"));
}

export async function sairAluno(formData: FormData): Promise<void> {
  await encerrarSessao();
  redirect(comPrefixo(idiomaDoFormulario(formData), "/sou-aluno"));
}

/** Comentário em uma discussão de caso. */
export async function comentar(materialId: string, _anterior: EstadoAluno, formData: FormData): Promise<EstadoAluno> {
  const { t } = tradutorDe(formData);
  const aluno = await alunoAtual();
  if (!aluno) return { erro: t("erroGeral") };
  if (!(await dentroDoLimite("aluno_comentar"))) return { erro: t("erroLimite") };
  const texto = comentarioSchema.safeParse(formData.get("texto"));
  if (!texto.success) return { erros: { texto: t("erroComentario") }, valores: { texto: String(formData.get("texto") ?? "") } };
  if (!(await podeComentar(aluno, materialId))) return { erro: t("erroGeral") };
  await db.insert(alunoComentarios).values({ materialId, alunoId: aluno.id, texto: texto.data });
  refresh(); // a página mostra o comentário novo
  return { ok: true };
}
