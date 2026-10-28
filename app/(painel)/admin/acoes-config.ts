"use server";

import { createElement } from "react";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { configuracoes } from "@/db/schema";
import { enviarEmail } from "@/lib/email";
import { lerConfig } from "@/lib/email/config";
import { contextoDoEmail } from "@/lib/email/montar";
import { EmailTeste } from "@/lib/email/modelos/EmailTeste";
import { TAG_CONFIGURACOES } from "@/lib/configuracoes";
import { configuracoesSchema, type EstadoConfiguracoes } from "@/lib/configuracoes-form";
import { traduzirNaHora } from "@/lib/i18n/traduzir";
import { autorizar } from "@/lib/sessao";

const CAMPOS = ["telefone", "whatsapp", "instagram", "email", "enderecoLinha1", "enderecoLinha2", "horario"] as const;

/** Só o ADMIN edita os dados da clínica. Vale para o Header, o Footer, o WhatsApp, a página de contato e os e-mails. */
export async function salvarConfiguracoes(_anterior: EstadoConfiguracoes, formData: FormData): Promise<EstadoConfiguracoes> {
  const auth = await autorizar("configuracao:editar");
  if (!auth.ok) return { erro: auth.erro };

  const bruto = Object.fromEntries(CAMPOS.map((c) => [c, String(formData.get(c) ?? "")]));
  const parsed = configuracoesSchema.safeParse(bruto);
  if (!parsed.success) {
    const erros: Record<string, string> = {};
    for (const i of parsed.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erro: "Revise os campos marcados e salve de novo.", erros };
  }

  await db
    .insert(configuracoes)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({ target: configuracoes.id, set: { ...parsed.data, updatedAt: new Date() } });

  // As páginas públicas leem estes dados em cache: expira na hora, para o rodapé e o contato mudarem já.
  await traduzirNaHora("config", 1);
  updateTag(TAG_CONFIGURACOES);
  return { ok: true };
}

/** "Enviar e-mail de teste": manda uma mensagem para o ADMIN logado e diz se o envio funcionou, e com qual configuração. */
export async function enviarEmailDeTeste(): Promise<EstadoConfiguracoes> {
  const auth = await autorizar("configuracao:editar");
  if (!auth.ok) return { erro: auth.erro };

  const cfg = lerConfig();
  const r = await enviarEmail({
    para: [auth.usuario.email],
    assunto: "Teste de envio do site do ReabToxin",
    react: createElement(EmailTeste, {
      quemPediu: `${auth.usuario.nome} (${auth.usuario.email})`,
      provedor: cfg.provedor,
      remetente: cfg.ok ? `${cfg.remetente.nome} <${cfg.remetente.email}>` : "não configurado",
      contexto: await contextoDoEmail(),
    }),
  });
  return r.ok
    ? { teste: { ok: true, mensagem: `E-mail de teste enviado para ${auth.usuario.email} (provedor: ${r.provedor}). Confira a caixa de entrada e o spam.` } }
    : { teste: { ok: false, mensagem: `O envio falhou (provedor: ${r.provedor}): ${r.erro}` } };
}
