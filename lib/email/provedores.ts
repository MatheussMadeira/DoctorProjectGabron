import nodemailer from "nodemailer";
import type { ConfigEmail } from "./config";

/** O que todo provedor recebe: e-mail já pronto (HTML e texto). Quem chama não sabe qual provedor está por trás. */
export interface EmailPronto {
  de: { nome: string; email: string };
  para: string[];
  assunto: string;
  html: string;
  texto: string;
  responderPara?: string;
}

export type Enviar = (e: EmailPronto) => Promise<{ idExterno?: string }>;

type ConfigOk = Extract<ConfigEmail, { ok: true }>;

const formatarDe = (d: EmailPronto["de"]) => `"${d.nome.replace(/"/g, "")}" <${d.email}>`;

/** Gmail (ou qualquer SMTP) com Nodemailer. */
function smtp(cfg: ConfigOk): Enviar {
  const s = cfg.smtp!;
  const transporte = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.port === 465,
    auth: { user: s.usuario, pass: s.senha },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return async (e) => {
    const r = await transporte.sendMail({ from: formatarDe(e.de), to: e.para.join(", "), subject: e.assunto, html: e.html, text: e.texto, replyTo: e.responderPara });
    return { idExterno: r.messageId };
  };
}

/** Resend pela API HTTP (sem SDK). Fica pronto para quando houver domínio; ainda não foi testado com uma chave real. */
function resend(cfg: ConfigOk): Enviar {
  return async (e) => {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: formatarDe(e.de), to: e.para, subject: e.assunto, html: e.html, text: e.texto, reply_to: e.responderPara }),
      signal: AbortSignal.timeout(15_000),
    });
    const corpo = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!r.ok) throw new Error(`Resend respondeu ${r.status}: ${corpo.message ?? "erro sem detalhe"}`);
    return { idExterno: corpo.id };
  };
}

/** Não envia: imprime. Para desenvolvimento e testes automáticos. */
function consola(): Enviar {
  return async (e) => {
    console.log(`[e-mail:console] para=${e.para.join(",")} assunto="${e.assunto}" (${e.texto.length} caracteres de texto)`);
    return { idExterno: `console-${Date.now()}` };
  };
}

export function criarProvedor(cfg: ConfigOk): Enviar {
  if (cfg.provedor === "resend") return resend(cfg);
  if (cfg.provedor === "console") return consola();
  return smtp(cfg);
}
