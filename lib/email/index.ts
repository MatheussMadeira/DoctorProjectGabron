import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { lerConfig } from "./config";
import { criarProvedor } from "./provedores";

/* Camada de e-mail do site. O resto do código só conhece `enviarEmail`: nada de Nodemailer, Gmail ou Resend fora
   desta pasta. Nunca lança erro: devolve { ok: false, erro } para quem chamou registrar a falha. */

export interface MensagemEmail {
  para: string[];
  assunto: string;
  /** Modelo em React Email. */
  react: ReactElement;
  responderPara?: string;
}

export type ResultadoEnvio = { ok: true; provedor: string; idExterno?: string } | { ok: false; provedor: string; erro: string };

/** Mensagem de erro curta e sem credenciais (a senha nunca pode parar no banco, no log ou na tela). */
function descrever(e: unknown, segredos: Array<string | undefined>): string {
  let texto = e instanceof Error ? e.message : String(e);
  for (const s of segredos) if (s && s.length > 3) texto = texto.split(s).join("***");
  return texto.replace(/\s+/g, " ").slice(0, 300);
}

export async function enviarEmail(mensagem: MensagemEmail): Promise<ResultadoEnvio> {
  const cfg = lerConfig();
  if (!cfg.ok) return { ok: false, provedor: cfg.provedor, erro: cfg.erro };
  if (!mensagem.para.length) return { ok: false, provedor: cfg.provedor, erro: "Destinatário não configurado." };

  try {
    const [html, texto] = await Promise.all([render(mensagem.react), render(mensagem.react, { plainText: true })]);
    const r = await criarProvedor(cfg)({
      de: cfg.remetente,
      para: mensagem.para,
      assunto: mensagem.assunto,
      html,
      texto,
      responderPara: mensagem.responderPara,
    });
    return { ok: true, provedor: cfg.provedor, idExterno: r.idExterno };
  } catch (e) {
    return { ok: false, provedor: cfg.provedor, erro: descrever(e, [cfg.smtp?.senha, cfg.resendApiKey]) };
  }
}

export { lerConfig } from "./config";
