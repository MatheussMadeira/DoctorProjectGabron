/* Configuração do envio de e-mail, toda lida de variáveis de ambiente. Trocar de provedor (Gmail/SMTP → Resend)
   é só mudar EMAIL_PROVIDER e as variáveis do provedor; nenhum outro arquivo do site precisa mudar.

   smtp (padrão)  EMAIL_TESTE (o Gmail do site) e SENHA_TESTE (senha de app do Google).
                  Opcionais: EMAIL_SMTP_HOST (padrão smtp.gmail.com), EMAIL_SMTP_PORT (padrão 465).
   resend         RESEND_API_KEY e EMAIL_REMETENTE (endereço de um domínio verificado no Resend).
   console        não envia: imprime no terminal. Para desenvolvimento e testes automáticos.

   Comuns         EMAIL_REMETENTE_NOME (padrão "Dra. Ana Paula Fonseca"); EMAIL_EQUIPE (quem recebe os avisos
                  internos; padrão = o próprio remetente). */

export type Provedor = "smtp" | "resend" | "console";

export const REMETENTE_NOME_PADRAO = "Dra. Ana Paula Fonseca";

export type ConfigEmail =
  | {
      ok: true;
      provedor: Provedor;
      remetente: { nome: string; email: string };
      /** Caixa que recebe os avisos internos (nova inscrição, mensagem de contato). */
      equipe: string;
      smtp?: { host: string; port: number; usuario: string; senha: string };
      resendApiKey?: string;
    }
  | { ok: false; provedor: Provedor; erro: string };

const limpar = (v: string | undefined) => v?.trim() || undefined;

export function lerConfig(env: Record<string, string | undefined> = process.env): ConfigEmail {
  const provedor = (limpar(env.EMAIL_PROVIDER) ?? "smtp") as Provedor;
  const nome = limpar(env.EMAIL_REMETENTE_NOME) ?? REMETENTE_NOME_PADRAO;

  if (provedor === "smtp") {
    const usuario = limpar(env.EMAIL_TESTE);
    // A senha de app do Google costuma vir com espaços ("abcd efgh ijkl mnop"); o SMTP quer sem eles.
    const senha = limpar(env.SENHA_TESTE)?.replace(/\s+/g, "");
    if (!usuario || !senha) return { ok: false, provedor, erro: "E-mail não configurado: defina EMAIL_TESTE e SENHA_TESTE." };
    return {
      ok: true,
      provedor,
      remetente: { nome, email: usuario }, // o Gmail sempre envia como a conta autenticada
      equipe: limpar(env.EMAIL_EQUIPE) ?? usuario,
      smtp: { host: limpar(env.EMAIL_SMTP_HOST) ?? "smtp.gmail.com", port: Number(env.EMAIL_SMTP_PORT) || 465, usuario, senha },
    };
  }

  if (provedor === "resend") {
    const chave = limpar(env.RESEND_API_KEY);
    const de = limpar(env.EMAIL_REMETENTE);
    if (!chave || !de) return { ok: false, provedor, erro: "E-mail não configurado: defina RESEND_API_KEY e EMAIL_REMETENTE." };
    return { ok: true, provedor, remetente: { nome, email: de }, equipe: limpar(env.EMAIL_EQUIPE) ?? de, resendApiKey: chave };
  }

  if (provedor === "console") {
    const de = limpar(env.EMAIL_TESTE) ?? "site@exemplo.invalid";
    return { ok: true, provedor, remetente: { nome, email: de }, equipe: limpar(env.EMAIL_EQUIPE) ?? de };
  }

  return { ok: false, provedor, erro: `EMAIL_PROVIDER inválido: "${provedor}". Use smtp, resend ou console.` };
}
