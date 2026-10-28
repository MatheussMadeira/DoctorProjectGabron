"use server";

import { after } from "next/server";
import { db } from "@/db";
import { mensagensContato } from "@/db/schema";
import { enviarERegistrar } from "@/lib/email/registro";
import type { EstadoFormulario } from "@/lib/formularios-tipos";
import { criarContatoSchema, errosPorCampo, idiomaDoFormulario, valoresDigitados } from "@/lib/formularios";
import { registrarDescarte } from "@/lib/descartes";
import { criarTradutor } from "@/lib/i18n/mensagens";
import { barrarEnvio } from "@/lib/protecao-formulario";

/** Mensagem do formulário de contato: grava (com o idioma da página), e só depois avisa a equipe por e-mail (sempre em português). */
export async function enviarContato(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const idioma = idiomaDoFormulario(formData);
  const t = criarTradutor(idioma, "Validacao");

  const barrado = await barrarEnvio("contato", formData, "contato", idioma);
  if (barrado) return barrado;

  const parsed = criarContatoSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    await registrarDescarte("contato", "VALIDACAO");
    const erros = errosPorCampo(parsed.error);
    return { erros, erroGeral: t("revise", { count: Object.keys(erros).length }), valores: valoresDigitados(formData) };
  }
  const d = parsed.data;

  let id: string;
  try {
    const [linha] = await db
      .insert(mensagensContato)
      .values({ nome: d.nome, email: d.email, telefone: d.telefone, assunto: d.assunto, mensagem: d.mensagem, idioma, aceitePrivacidadeEm: new Date() })
      .returning({ id: mensagensContato.id });
    id = linha.id;
  } catch (e) {
    console.error("[contato] erro ao gravar", e instanceof Error ? e.message : e);
    return { erroGeral: t("falhaContato"), valores: valoresDigitados(formData) };
  }

  after(async () => {
    await enviarERegistrar("CONTATO_AVISO", { mensagemId: id });
  });

  return { ok: true };
}
