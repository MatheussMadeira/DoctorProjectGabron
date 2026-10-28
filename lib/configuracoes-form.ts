import { z } from "zod";

/* Validação dos dados da clínica (Configurações). Campo vazio vale "sem valor": o site volta a mostrar o placeholder. */

const vazioViraNulo = (v: string) => v.trim() || null;
const opcional = (rotulo: string, max: number) => z.string().trim().max(max, `${rotulo}: use no máximo ${max} caracteres.`).transform(vazioViraNulo);

const soDigitos = (v: string) => v.replace(/\D/g, "");

export const configuracoesSchema = z.object({
  telefone: z
    .string()
    .trim()
    .refine((v) => !v || [10, 11, 12, 13].includes(soDigitos(v).length), "Digite um telefone com DDD, como (31) 99999-9999.")
    .transform(vazioViraNulo),
  whatsapp: z
    .string()
    .trim()
    .refine((v) => !v || (/^55/.test(soDigitos(v)) && [12, 13].includes(soDigitos(v).length)), "Use o número com 55 e DDD, como 5531999999999.")
    .transform((v) => soDigitos(v) || null),
  instagram: z
    .string()
    .trim()
    .refine((v) => !v || /^@?[A-Za-z0-9._]{1,30}$/.test(v), "Digite o perfil como @perfil, só com letras, números, ponto e sublinhado.")
    .transform((v) => (v ? (v.startsWith("@") ? v : `@${v}`) : null)),
  email: z
    .string()
    .trim()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Digite um e-mail válido, como nome@dominio.com.br.")
    .transform(vazioViraNulo),
  enderecoLinha1: opcional("Endereço", 120),
  enderecoLinha2: opcional("Cidade e CEP", 120),
  horario: opcional("Horário", 80),
});

export type ConfiguracoesForm = z.output<typeof configuracoesSchema>;

export interface EstadoConfiguracoes {
  ok?: boolean;
  erro?: string;
  erros?: Record<string, string>;
  /** Resultado do envio de teste. */
  teste?: { ok: boolean; mensagem: string };
}
