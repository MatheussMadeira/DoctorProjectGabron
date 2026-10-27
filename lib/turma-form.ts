import { z } from "zod";

/* Validação da turma no servidor (Server Actions). Mensagens em português, dizendo o que fazer. */

export const FOTO_BLOB = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;
export const fotoValida = (url: string) => url.startsWith("/images/") || FOTO_BLOB.test(url);

/** "R$ 1.500", "1.500,50", "1500" → centavos. Vazio → null (o site mostra o placeholder "R$ 0.000"). */
export function precoParaCentavos(texto: string): number | null | "invalido" {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (!limpo) return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(limpo) ? limpo.replace(/\./g, "") : limpo;
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return "invalido";
  return Math.round(parseFloat(normal) * 100);
}

export const centavosParaPreco = (c: number | null) => (c == null ? "" : (c / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }));

/** Gera o slug: título curto (ou título) + mês e ano. "Módulo essencial", 2026-11-21 → "modulo-essencial-nov-2026". */
export function gerarSlug(titulo: string, inicio: string): string {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [ano, mes] = inicio.split("-").map(Number);
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base}-${meses[mes - 1]}-${ano}`;
}

const base = (rotulo: string, max: number) => z.string().trim().max(max, `${rotulo}: use no máximo ${max} caracteres.`);
const texto = (rotulo: string, max: number) => base(rotulo, max).min(1, `Preencha ${rotulo.toLowerCase()}.`);
/** Campo opcional: vazio vira null. */
const textoOpc = (rotulo: string, max: number) => base(rotulo, max).transform((v) => v || null);

const linhas = z
  .string()
  .transform((v) => v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));

/** Linhas em branco do editor (atividade ou pergunta sem texto) são ignoradas, não viram erro. */
const semLinhasVazias = (valor: unknown): unknown => {
  if (!Array.isArray(valor)) return valor;
  return valor
    .map((x) => (x && typeof x === "object" && Array.isArray((x as { itens?: unknown }).itens) ? { ...x, itens: (x as { itens: Array<{ title?: string }> }).itens.filter((i) => i?.title?.trim()) } : x))
    .filter((x) => {
      const o = x as { itens?: unknown[]; q?: string; a?: string };
      if (Array.isArray(o.itens)) return o.itens.length > 0;
      if ("q" in o || "a" in o) return !!(o.q?.trim() || o.a?.trim());
      return true;
    });
};

const json = <T extends z.ZodType>(schema: T, rotulo: string) =>
  z.string().transform((v, ctx) => {
    try {
      return schema.parse(semLinhasVazias(JSON.parse(v || "[]"))) as z.output<T>;
    } catch {
      ctx.addIssue({ code: "custom", message: `${rotulo}: confira os campos (há algum item incompleto).` });
      return z.NEVER;
    }
  });

const item = z.object({
  time: z.string().trim().max(20).optional().transform((v) => v || undefined),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional().transform((v) => v || undefined),
  duration: z.string().trim().max(20).optional().transform((v) => v || undefined),
});
const dia = z.object({ titulo: z.string().trim().min(1).max(120), itens: z.array(item).max(30) });
const pergunta = z.object({ q: z.string().trim().min(1).max(200), a: z.string().trim().min(1).max(1000) });

const data = (rotulo: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${rotulo}: escolha uma data.`);

export const turmaSchema = z
  .object({
    titulo: texto("Título", 120),
    tituloCurto: textoOpc("Título curto", 40),
    resumo: texto("Resumo", 200),
    descricao: texto("Descrição", 4000),
    modalidade: z.enum(["PRESENCIAL", "ONLINE"], "Escolha a modalidade."),
    publicacao: z.enum(["RASCUNHO", "EM_BREVE", "PUBLICADO"], "Escolha a publicação."),
    inicio: data("Início"),
    fim: z.string().trim().transform((v) => v || null).pipe(data("Fim").nullable()),
    horario: texto("Horário", 60),
    cidade: texto("Cidade", 80),
    local: textoOpc("Local", 120),
    vagas: z.coerce.number("Informe o número de vagas.").int("Use um número inteiro.").min(0, "Use zero ou mais.").max(500, "Use no máximo 500."),
    preco: z.string().trim().transform((v, ctx) => {
      const c = precoParaCentavos(v);
      if (c === "invalido") {
        ctx.addIssue({ code: "custom", message: "Digite o preço como R$ 1.500 ou 1500,00." });
        return z.NEVER;
      }
      return c;
    }),
    parcelamento: textoOpc("Parcelamento", 80),
    fotoUrl: z.string().trim().refine(fotoValida, "Escolha uma foto da biblioteca ou envie uma nova."),
    fotoAlt: texto("Texto alternativo da foto", 200),
    publicoAlvo: linhas,
    aprendizados: linhas,
    programacao: json(z.array(dia).max(10), "Programação"),
    faq: json(z.array(pergunta).max(20), "Perguntas frequentes"),
  })
  .refine((t) => !t.fim || t.fim >= t.inicio, { path: ["fim"], message: "O fim não pode ser antes do início." });

export type TurmaForm = z.output<typeof turmaSchema>;

export interface EstadoTurma {
  ok?: boolean;
  erroGeral?: string;
  erros?: Record<string, string>;
}

/** Zod → { campo: primeira mensagem }. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const i of erro.issues) {
    const campo = String(i.path[0] ?? "geral");
    saida[campo] ??= i.message;
  }
  return saida;
}
