import { z } from "zod";
import { CAMPO_ARMADILHA, CAMPO_CARIMBO, CAMPO_IDIOMA } from "./formularios-tipos";
import { ehLocale, LOCALE_PADRAO, type Locale } from "./i18n/idiomas";
import { criarTradutor, type Tradutor } from "./i18n/mensagens";
import { VALORES_ASSUNTOS, VALORES_CONSELHOS, VALORES_PROFISSOES } from "./i18n/opcoes";

/* Validação no servidor dos formulários públicos. As mensagens dizem o que fazer, no idioma da pessoa (namespace "Validacao"). */

/** O idioma que o formulário diz ser o da pessoa: só vale um dos 7; qualquer outra coisa vira pt-BR. */
export function idiomaDoFormulario(formData: FormData): Locale {
  const v = formData.get(CAMPO_IDIOMA);
  return ehLocale(v) ? v : LOCALE_PADRAO;
}

const texto = (t: Tradutor, min: number, max: number, mensagem: string) => z.string().trim().min(min, mensagem).max(max, t("maximo", { max }));
const email = (t: Tradutor) => z.string().trim().toLowerCase().email(t("email")).max(160, t("maximo", { max: 160 }));

export function criarInscricaoSchema(t: Tradutor) {
  return z.object({
    nome: texto(t, 5, 120, t("nomeCompleto")),
    email: email(t),
    telefone: z
      .string()
      .trim()
      .refine((v) => {
        const digitos = v.replace(/\D/g, "").length;
        return digitos >= 10 && digitos <= 13;
      }, t("telefone")),
    profissao: z.string(t("profissao")).refine((v) => VALORES_PROFISSOES.includes(v), t("profissao")),
    conselho: z.enum(VALORES_CONSELHOS as [string, ...string[]], t("conselho")),
    registro: texto(t, 3, 40, t("registro")),
    privacidade: z.literal("on", t("privacidadeInscricao")),
    avisos: z.string().optional(),
    [CAMPO_ARMADILHA]: z.string().optional(),
    [CAMPO_CARIMBO]: z.string().optional(),
    [CAMPO_IDIOMA]: z.string().optional(),
  });
}

export function criarContatoSchema(t: Tradutor) {
  return z.object({
    nome: texto(t, 3, 120, t("nome")),
    email: email(t),
    telefone: z
      .string()
      .trim()
      .refine((v) => !v || (v.replace(/\D/g, "").length >= 10 && v.replace(/\D/g, "").length <= 13), t("telefone"))
      .transform((v) => v || null),
    assunto: z.string(t("assunto")).refine((v) => VALORES_ASSUNTOS.includes(v), t("assunto")),
    mensagem: z.string().trim().max(2000, t("maximo", { max: 2000 })).transform((v) => v || null),
    privacidade: z.literal("on", t("privacidadeContato")),
    [CAMPO_ARMADILHA]: z.string().optional(),
    [CAMPO_CARIMBO]: z.string().optional(),
    [CAMPO_IDIOMA]: z.string().optional(),
  });
}

/** Os schemas em pt-BR (testes e quem não tem idioma à mão). */
export const inscricaoSchema = criarInscricaoSchema(criarTradutor(LOCALE_PADRAO, "Validacao"));
export const contatoSchema = criarContatoSchema(criarTradutor(LOCALE_PADRAO, "Validacao"));

/** Zod → { campo: primeira mensagem }. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const i of erro.issues) saida[String(i.path[0] ?? "geral")] ??= i.message;
  return saida;
}

/** Só texto: o que volta para o formulário depois de um erro (nunca arquivos nem objetos). */
export function valoresDigitados(formData: FormData): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, valor] of formData.entries()) if (typeof valor === "string" && k !== CAMPO_ARMADILHA && k !== CAMPO_CARIMBO && k !== CAMPO_IDIOMA) v[k] = valor;
  return v;
}
