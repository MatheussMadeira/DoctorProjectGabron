import { z } from "zod";
import { CATEGORIAS_VIAGEM, ICONES_CHEGADA } from "@/db/schema";
import { fotoValida } from "./turma-form";

/* Validação do cadastro da Travel info (admin). Mensagens em português, dizendo o que fazer. */

export interface EstadoViagem {
  ok?: boolean;
  erroGeral?: string;
  erros?: Record<string, string>;
  id?: string;
}

const texto = (min: number, max: number, vazio: string) => z.string().trim().min(min, vazio).max(max, `Use no máximo ${max} caracteres.`);

/** Endereço de site: vazio ou http(s). */
export const urlOpcional = z
  .string()
  .trim()
  .default("")
  .refine((v) => !v || /^https?:\/\/[^\s]+$/i.test(v), "Use um endereço completo, começando com https://.");

/** Número decimal com vírgula ou ponto; vazio vira null. */
export const coordenada = (min: number, max: number, rotulo: string) =>
  z
    .string()
    .trim()
    .default("")
    .transform((v) => v.replace(",", "."))
    .refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max), `${rotulo}: use um número entre ${min} e ${max}.`)
    .transform((v) => (v ? Number(v) : null));

export const localSchema = z.object({
  categoria: z.enum(CATEGORIAS_VIAGEM, "Escolha a categoria."),
  nome: texto(2, 120, "Digite o nome."),
  descricao: z.string().trim().max(600, "Use no máximo 600 caracteres.").default(""),
  endereco: z.string().trim().max(240, "Use no máximo 240 caracteres.").default(""),
  latitude: coordenada(-90, 90, "Latitude"),
  longitude: coordenada(-180, 180, "Longitude"),
  fotoUrl: z.string().trim().default("").refine((v) => !v || fotoValida(v), "Envie uma foto pelo botão “Enviar foto”."),
  fotoAlt: z.string().trim().max(200).default(""),
  site: urlOpcional,
  telefone: z.string().trim().max(40, "Use no máximo 40 caracteres.").default(""),
  faixaPreco: z
    .string()
    .default("")
    .refine((v) => !v || ["1", "2", "3", "4"].includes(v), "Escolha de $ a $$$$.")
    .transform((v) => (v ? Number(v) : null)),
  visivel: z.string().optional(),
});

export const chegadaSchema = z.object({
  icone: z.enum(ICONES_CHEGADA, "Escolha o ícone."),
  titulo: texto(2, 120, "Digite o título."),
  texto: texto(2, 2000, "Escreva o texto."),
  visivel: z.string().optional(),
});

export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const i of erro.issues) saida[String(i.path[0])] ??= i.message;
  return saida;
}
