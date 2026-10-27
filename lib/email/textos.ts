/** Conteúdo ainda não definido pela clínica: fica como placeholder explícito (ver CLAUDE.md). */
export const PAGAMENTO_PLACEHOLDER = "Formas de pagamento: a confirmar com a clínica.";

/** Endereço público do site, para links dentro dos e-mails. SITE_URL tem prioridade; na Vercel cai no domínio do projeto. */
export function urlDoSite(): string {
  const definida = process.env.SITE_URL?.trim();
  if (definida) return definida.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
