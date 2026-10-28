"use server";

import { after } from "next/server";
import { db } from "@/db";
import { mensagensContato } from "@/db/schema";
import { enviarERegistrar } from "@/lib/email/registro";
import type { EstadoFormulario } from "@/lib/formularios-tipos";
import { contatoSchema, errosPorCampo, valoresDigitados } from "@/lib/formularios";
import { registrarDescarte } from "@/lib/descartes";
import { barrarEnvio } from "@/lib/protecao-formulario";

const plural = (n: number) => (n === 1 ? "1 campo" : `${n} campos`);

/** Mensagem do formulário de contato: grava, e só depois avisa a clínica por e-mail. */
export async function enviarContato(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const barrado = await barrarEnvio("contato", formData, "contato");
  if (barrado) return barrado;

  const parsed = contatoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    await registrarDescarte("contato", "VALIDACAO");
    const erros = errosPorCampo(parsed.error);
    return { erros, erroGeral: `Revise ${plural(Object.keys(erros).length)} antes de enviar`, valores: valoresDigitados(formData) };
  }
  const d = parsed.data;

  let id: string;
  try {
    const [linha] = await db
      .insert(mensagensContato)
      .values({ nome: d.nome, email: d.email, telefone: d.telefone, assunto: d.assunto, mensagem: d.mensagem, aceitePrivacidadeEm: new Date() })
      .returning({ id: mensagensContato.id });
    id = linha.id;
  } catch (e) {
    console.error("[contato] erro ao gravar", e instanceof Error ? e.message : e);
    return { erroGeral: "Não foi possível enviar a mensagem agora. Tente de novo em instantes.", valores: valoresDigitados(formData) };
  }

  after(async () => {
    await enviarERegistrar("CONTATO_AVISO", { mensagemId: id });
  });

  return { ok: true };
}
