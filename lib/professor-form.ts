import { z } from "zod";
import { fotoValida } from "./turma-form";

/* Validação de professores e da galeria no servidor. Mensagens em português, dizendo o que fazer. */

export interface EstadoProfessor {
  ok?: boolean;
  erroGeral?: string;
  erros?: Record<string, string>;
  /** Id do professor salvo (para o formulário seguir nele). */
  id?: string;
}

const texto = (min: number, max: number, vazio: string) => z.string().trim().min(min, vazio).max(max, `Use no máximo ${max} caracteres.`);

/** Professor médico sempre mostra CRM e RQE (regra do CFM): quem tem CRM no registro precisa ter RQE também. */
export const registroMedicoCompleto = (registro: string) => !/\bCRM\b/i.test(registro) || /\bRQE\b/i.test(registro);

export const professorSchema = z.object({
  nome: texto(2, 120, "Digite o nome do professor."),
  funcao: texto(2, 120, "Digite a especialidade."),
  registro: texto(3, 120, "Digite o registro profissional.").refine(registroMedicoCompleto, "Médicos precisam mostrar CRM e RQE, como CRM-MG 12345 · RQE 6789."),
  bio: z.string().trim().max(600, "Use no máximo 600 caracteres.").default(""),
  fotoUrl: z.string().trim().default("").refine((v) => !v || fotoValida(v), "Envie uma foto pelo botão “Trocar foto”."),
  fotoAlt: z.string().trim().max(200).default(""),
  visivel: z.string().optional(),
});

export type DadosProfessor = z.infer<typeof professorSchema>;

export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const i of erro.issues) saida[String(i.path[0])] ??= i.message;
  return saida;
}

/** Galeria: lista de { url, alt }; toda foto precisa de descrição (para leitor de tela). */
export const galeriaSchema = z
  .array(
    z.object({
      id: z.string().uuid().optional(),
      url: z.string().trim().refine(fotoValida, "Foto inválida: envie de novo."),
      alt: z.string().trim().min(3, "Descreva a foto.").max(200, "Use no máximo 200 caracteres."),
    }),
  )
  .max(40, "A galeria aceita até 40 fotos.");
