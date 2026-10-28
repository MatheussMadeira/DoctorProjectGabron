import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { emailsEnvios, type TipoEmail } from "@/db/schema";
import { enviarEmail } from "./index";
import { montarEmail, type OrigemEmail } from "./montar";

/* O envio sempre vem DEPOIS de a inscrição ou a mensagem estar gravada no banco, e cada tentativa fica registrada
   em `emails_envios`: o registro nasce PENDENTE, vira ENVIADO ou FALHOU (com o motivo, sem credenciais) e conta as
   tentativas. Nada aqui lança erro para quem chamou: se o e-mail falhar, a inscrição continua valendo e a equipe
   vê "Falhou" com o botão "Reenviar" na tela de inscrições. */

export interface ResultadoRegistro {
  emailId: string | null;
  ok: boolean;
  erro?: string;
}

/** Tenta enviar o e-mail de um registro existente e grava o resultado. */
async function executar(emailId: string): Promise<ResultadoRegistro> {
  const [reg] = await db.select().from(emailsEnvios).where(eq(emailsEnvios.id, emailId));
  if (!reg) return { emailId, ok: false, erro: "Registro de e-mail não encontrado." };

  const mensagem = await montarEmail(reg.tipo, { inscricaoId: reg.inscricaoId, mensagemId: reg.mensagemId });
  const resultado = mensagem
    ? await enviarEmail(mensagem)
    : ({ ok: false, provedor: "-", erro: "A inscrição ou a mensagem deste e-mail não existe mais." } as const);

  await db
    .update(emailsEnvios)
    .set({
      status: resultado.ok ? "ENVIADO" : "FALHOU",
      erro: resultado.ok ? null : resultado.erro,
      provedor: resultado.provedor,
      destinatario: mensagem ? mensagem.para.join(", ") : reg.destinatario,
      assunto: mensagem?.assunto ?? reg.assunto,
      enviadoEm: resultado.ok ? new Date() : reg.enviadoEm,
      tentativas: sql`${emailsEnvios.tentativas} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(emailsEnvios.id, emailId));

  return { emailId, ok: resultado.ok, erro: resultado.ok ? undefined : resultado.erro };
}

/** Cria o registro (PENDENTE) e tenta enviar. Nunca lança. */
export async function enviarERegistrar(tipo: TipoEmail, origem: OrigemEmail): Promise<ResultadoRegistro> {
  try {
    const mensagem = await montarEmail(tipo, origem);
    if (!mensagem) return { emailId: null, ok: false, erro: "Origem do e-mail não encontrada." };
    const [reg] = await db
      .insert(emailsEnvios)
      .values({ tipo, destinatario: mensagem.para.join(", "), assunto: mensagem.assunto, inscricaoId: origem.inscricaoId ?? null, mensagemId: origem.mensagemId ?? null })
      .returning({ id: emailsEnvios.id });
    return await executar(reg.id);
  } catch (e) {
    console.error("[e-mail] falha ao registrar/enviar", tipo, e instanceof Error ? e.message : e);
    return { emailId: null, ok: false, erro: "Erro interno ao enviar o e-mail." };
  }
}

/** "Reenviar": nova tentativa no mesmo registro, com o e-mail remontado a partir dos dados atuais. */
export async function reenviar(emailId: string): Promise<ResultadoRegistro> {
  try {
    return await executar(emailId);
  } catch (e) {
    console.error("[e-mail] falha ao reenviar", emailId, e instanceof Error ? e.message : e);
    return { emailId, ok: false, erro: "Erro interno ao reenviar o e-mail." };
  }
}
