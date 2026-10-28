/* Travas do seed, além do SEED_PERMITIDO=1: o seed nunca deve tocar o banco de produção. */

/** Pedaços do endereço do(s) banco(s) de produção. Se o DATABASE_URL tiver um deles, o seed recusa. */
export const HOSTS_PROTEGIDOS = ["ep-wild-shadow"];

export function motivoParaRecusar(env: Record<string, string | undefined>): string | null {
  if (env.SEED_PERMITIDO !== "1") return "Seed bloqueado. Rode com SEED_PERMITIDO=1, e só em banco de desenvolvimento ou preview.";
  if (env.VERCEL_ENV === "production" || env.NODE_ENV === "production") return "Seed recusado: ambiente de produção.";
  const url = `${env.DATABASE_URL ?? ""} ${env.DATABASE_URL_UNPOOLED ?? ""}`;
  const protegido = HOSTS_PROTEGIDOS.find((h) => url.includes(h));
  if (protegido) return `Seed recusado: o DATABASE_URL aponta para o banco de produção (${protegido}).`;
  return null;
}
