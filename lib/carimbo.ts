import { createHmac, timingSafeEqual } from "node:crypto";

/* Carimbo de tempo dos formulários públicos: a segunda proteção contra robôs, que não depende de nenhum campo.
   Quando a pessoa abre a página, o navegador pede ao servidor um carimbo ("<instante>.<assinatura>"). No envio, o servidor
   confere a assinatura e há quanto tempo o carimbo foi emitido. Robô que posta direto, sem abrir a página, não tem carimbo;
   o que envia em poucos instantes tem o carimbo recente demais. O instante vem do servidor e é assinado com o AUTH_SECRET:
   o navegador não consegue forjar nem adiantar. */

export const TEMPO_MINIMO_PADRAO_MS = 2000;
/** Carimbo mais velho que isso é recusado com um pedido de recarregar a página. */
export const IDADE_MAXIMA_MS = 12 * 60 * 60 * 1000;

export type ResultadoCarimbo = "ok" | "ausente" | "invalido" | "rapido" | "expirado";

const segredo = () => process.env.AUTH_SECRET || "segredo-de-desenvolvimento";
const assinar = (instante: string) => createHmac("sha256", segredo()).update(`carimbo|${instante}`).digest("hex").slice(0, 32);

export function tempoMinimoMs(env: Record<string, string | undefined> = process.env): number {
  const v = Number(env.FORM_TEMPO_MINIMO_MS);
  return Number.isFinite(v) && v >= 0 && env.FORM_TEMPO_MINIMO_MS?.trim() ? v : TEMPO_MINIMO_PADRAO_MS;
}

export function gerarCarimbo(agora = Date.now()): string {
  const instante = String(agora);
  return `${instante}.${assinar(instante)}`;
}

export function verificarCarimbo(valor: unknown, agora = Date.now(), minimoMs = tempoMinimoMs()): ResultadoCarimbo {
  if (typeof valor !== "string" || !valor.trim()) return "ausente";
  const [instante, assinatura, resto] = valor.split(".");
  if (!instante || !assinatura || resto !== undefined || !/^\d{10,16}$/.test(instante)) return "invalido";
  const esperada = Buffer.from(assinar(instante));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return "invalido";
  const idade = agora - Number(instante);
  if (idade < 0 || idade < minimoMs) return "rapido";
  if (idade > IDADE_MAXIMA_MS) return "expirado";
  return "ok";
}
