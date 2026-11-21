import { z } from "zod";

/* Formas e validações da área do aluno (formulários públicos e cadastro de materiais no painel). */

export interface EstadoAluno {
  ok?: boolean;
  /** Mensagem geral (já no idioma da pessoa). */
  erro?: string;
  erros?: Record<string, string>;
  /** O que a pessoa digitou (menos senhas), para não perder ao errar. */
  valores?: Record<string, string>;
}

/** Arquivo do Vercel Blob (PDF, imagem, certificado): só endereços do nosso Blob entram no banco, e só eles são buscados pelo servidor. */
export const ARQUIVO_BLOB = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s]+$/i;

export const emailSchema = z.string().trim().toLowerCase().email().max(160);
export const comentarioSchema = z.string().trim().min(2).max(1000);

export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const i of erro.issues) saida[String(i.path[0])] ??= i.message;
  return saida;
}

/** Valores digitados, sem senhas. */
export function valoresSemSenha(formData: FormData): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, valor] of formData.entries()) if (typeof valor === "string" && !/senha|token/i.test(k) && k !== "idioma") v[k] = valor;
  return v;
}
