import { z } from "zod";
import { ASSUNTOS_CONTATO, CONSELHOS, PROFISSOES } from "./dados-exemplo";
import { CAMPO_ARMADILHA } from "./formularios-tipos";

/* Validação no servidor dos formulários públicos. As mensagens dizem o que fazer. */

const texto = (min: number, max: number, mensagem: string) => z.string().trim().min(min, mensagem).max(max, `Use no máximo ${max} caracteres.`);

export const inscricaoSchema = z.object({
  nome: texto(5, 120, "Digite o seu nome completo."),
  email: z.string().trim().toLowerCase().email("Digite um e-mail válido, como nome@dominio.com.br.").max(160, "Use no máximo 160 caracteres."),
  telefone: z
    .string()
    .trim()
    .refine((v) => {
      const digitos = v.replace(/\D/g, "").length;
      return digitos >= 10 && digitos <= 13;
    }, "Digite um telefone com DDD, como (31) 90000-0000."),
  profissao: z.string("Escolha a sua profissão.").refine((v) => PROFISSOES.includes(v), "Escolha a sua profissão."),
  conselho: z.enum(CONSELHOS as [string, ...string[]], "Escolha o conselho."),
  registro: texto(3, 40, "Digite o número do registro e a UF, como 00000 / MG."),
  privacidade: z.literal("on", "Marque esta opção para enviar a inscrição."),
  avisos: z.string().optional(),
  [CAMPO_ARMADILHA]: z.string().optional(),
});

export const contatoSchema = z.object({
  nome: texto(3, 120, "Digite o seu nome."),
  email: z.string().trim().toLowerCase().email("Digite um e-mail válido, como nome@dominio.com.br.").max(160, "Use no máximo 160 caracteres."),
  telefone: z
    .string()
    .trim()
    .refine((v) => !v || (v.replace(/\D/g, "").length >= 10 && v.replace(/\D/g, "").length <= 13), "Digite um telefone com DDD, como (31) 90000-0000.")
    .transform((v) => v || null),
  assunto: z.string("Escolha o assunto.").refine((v) => ASSUNTOS_CONTATO.includes(v), "Escolha o assunto."),
  mensagem: z.string().trim().max(2000, "Use no máximo 2000 caracteres.").transform((v) => v || null),
  privacidade: z.literal("on", "Marque esta opção para enviar a mensagem."),
  [CAMPO_ARMADILHA]: z.string().optional(),
});

/** Zod → { campo: primeira mensagem }. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const i of erro.issues) saida[String(i.path[0] ?? "geral")] ??= i.message;
  return saida;
}

/** Só texto: o que volta para o formulário depois de um erro (nunca arquivos nem objetos). */
export function valoresDigitados(formData: FormData): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, valor] of formData.entries()) if (typeof valor === "string" && k !== CAMPO_ARMADILHA) v[k] = valor;
  return v;
}
