import type { Conteudo, TipoSecao } from "./campos";

/* Conversa entre o editor e a prévia (o iframe), por postMessage. Só mensagens da mesma origem e da janela esperada são aceitas. */

/** Uma seção como o editor e a prévia a enxergam. */
export interface SecaoEstado {
  chave: string;
  tipo: TipoSecao;
  rotulo: string;
  visivel: boolean;
  conteudo: Conteudo;
}

export interface Selecao {
  chave: string;
  /** Caminho do campo dentro da seção ("pilares.1.titulo"); ausente = a seção inteira. */
  caminho?: string;
}

/** editor → prévia */
export type MsgDoEditor = { tipo: "estado"; secoes: SecaoEstado[]; selecionada: Selecao | null } | { tipo: "rolar"; chave: string };

/** prévia → editor */
export type MsgDaPrevia =
  | { tipo: "pronta" }
  | { tipo: "selecionar"; chave: string; caminho?: string }
  | { tipo: "texto-ao-vivo"; chave: string; caminho: string; valor: string }
  | { tipo: "texto-fim" }
  | { tipo: "trocar-foto"; chave: string; caminho: string };

const ETIQUETA = "rt-editor";

export const embrulhar = (msg: MsgDoEditor | MsgDaPrevia) => ({ etiqueta: ETIQUETA, msg });

/** Lê uma mensagem recebida; null se não é do mesmo site, da janela esperada ou do nosso protocolo. */
export function desembrulhar<T extends MsgDoEditor | MsgDaPrevia>(e: MessageEvent, esperada: Window | null): T | null {
  if (e.origin !== window.location.origin) return null;
  if (!esperada || e.source !== esperada) return null;
  const d = e.data as { etiqueta?: unknown; msg?: unknown } | null;
  if (!d || d.etiqueta !== ETIQUETA || typeof d.msg !== "object" || d.msg === null) return null;
  return d.msg as T;
}
