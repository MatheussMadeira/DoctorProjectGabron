/* Comparação de conteúdo que ignora a ordem das chaves: o jsonb do Postgres guarda as chaves de objeto em outra ordem que a do JS, então
   JSON.stringify direto dava "diferente" para conteúdos iguais. */
const canonico = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => [k, canonico(x)]));
  return v ?? null;
};

export const conteudoIgual = (a: unknown, b: unknown) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));
