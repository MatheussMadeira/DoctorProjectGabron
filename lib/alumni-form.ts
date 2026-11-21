import { z } from "zod";
import { SIGLAS_UF } from "./brasil";
import { coordenada } from "./viagem-form";
import { fotoValida } from "./turma-form";
import { interpretarVideo, legendaValida } from "./video";

/* Validação do cadastro da Alumni (admin): turmas realizadas e alunos do mapa. Mensagens em português, dizendo o que fazer. */

export interface EstadoAlumni {
  ok?: boolean;
  erroGeral?: string;
  erros?: Record<string, string>;
  id?: string;
  /** Quantos alunos foram importados (ação "Importar alunos da turma"). */
  importados?: number;
}

const texto = (min: number, max: number, vazio: string) => z.string().trim().min(min, vazio).max(max, `Use no máximo ${max} caracteres.`);
const data = z
  .string()
  .trim()
  .default("")
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a data no formato AAAA-MM-DD.")
  .transform((v) => v || null);
const uuidOuVazio = z
  .string()
  .trim()
  .default("")
  .refine((v) => !v || z.string().uuid().safeParse(v).success, "Escolha uma opção da lista.")
  .transform((v) => v || null);

/** Campos de foto, vídeo e legenda, iguais nos formulários de turma realizada, aluno e depoimento. */
export const camposDeMidia = {
  fotoUrl: z.string().trim().default("").refine((v) => !v || fotoValida(v), "Envie uma foto pelo botão “Enviar foto”."),
  fotoAlt: z.string().trim().max(200).default(""),
  videoUrl: z
    .string()
    .trim()
    .default("")
    .refine((v) => !v || interpretarVideo(v) !== null, "Use um link do YouTube, do Vimeo ou de um arquivo de vídeo (MP4), começando com https://."),
  videoLegendaUrl: z.string().trim().default("").refine(legendaValida, "A legenda precisa ser um arquivo .vtt, com endereço https://."),
};

/** Cidade, estado, país e coordenadas. */
export const camposDeLocalizacao = {
  cidade: z.string().trim().max(120, "Use no máximo 120 caracteres.").default(""),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .default("")
    .refine((v) => !v || SIGLAS_UF.includes(v), "Use a sigla do estado, como MG.")
    .transform((v) => v || null),
  pais: z
    .string()
    .trim()
    .toUpperCase()
    .default("BR")
    .refine((v) => /^[A-Z]{2}$/.test(v || "BR"), "Use o código do país com duas letras, como BR.")
    .transform((v) => v || "BR"),
  latitude: coordenada(-90, 90, "Latitude"),
  longitude: coordenada(-180, 180, "Longitude"),
};

export const alumniTurmaSchema = z.object({
  titulo: texto(2, 120, "Digite o nome da turma."),
  dataInicio: data,
  dataFim: data,
  cidade: z.string().trim().max(120, "Use no máximo 120 caracteres.").default(""),
  resumo: z.string().trim().max(600, "Use no máximo 600 caracteres.").default(""),
  numeroAlunos: z
    .string()
    .trim()
    .default("")
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) <= 1000), "Digite um número de 0 a 1000.")
    .transform((v) => (v ? Number(v) : null)),
  turmaId: uuidOuVazio,
  ...camposDeMidia,
  visivel: z.string().optional(),
});

export const alumniSchema = z.object({
  nome: texto(2, 120, "Digite o nome."),
  profissao: z.string().trim().max(120, "Use no máximo 120 caracteres.").default(""),
  alumniTurmaId: uuidOuVazio,
  autorizacaoRecebidaEm: data,
  ...camposDeLocalizacao,
  fotoUrl: camposDeMidia.fotoUrl,
  fotoAlt: camposDeMidia.fotoAlt,
  visivel: z.string().optional(),
});

export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const i of erro.issues) saida[String(i.path[0])] ??= i.message;
  return saida;
}
