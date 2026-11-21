"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { depoimentos } from "@/db/schema";
import type { EstadoFormulario } from "@/lib/formularios-tipos";
import { criarDepoimentoSchema, errosPorCampo, idiomaDoFormulario, valoresDigitados } from "@/lib/formularios";
import { registrarDescarte } from "@/lib/descartes";
import { criarTradutor } from "@/lib/i18n/mensagens";
import { barrarEnvio } from "@/lib/protecao-formulario";

/**
 * Depoimento enviado pelo site. Entra como PENDENTE (oculto, sem data de autorização): só um ADMIN aprova, em Configurações › Curso.
 * Nada vai para a DeepL agora; a tradução acontece quando o ADMIN aprova.
 */
export async function enviarDepoimento(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const idioma = idiomaDoFormulario(formData);
  const t = criarTradutor(idioma, "Validacao");

  const barrado = await barrarEnvio("depoimento", formData, "depoimento", idioma);
  if (barrado) return barrado;

  const parsed = criarDepoimentoSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    await registrarDescarte("depoimento", "VALIDACAO");
    const erros = errosPorCampo(parsed.error);
    return { erros, erroGeral: t("revise", { count: Object.keys(erros).length }), valores: valoresDigitados(formData) };
  }
  const d = parsed.data;

  try {
    const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${depoimentos.ordem}), -1) + 1` }).from(depoimentos);
    await db.insert(depoimentos).values({
      nome: d.nome,
      profissao: d.profissao,
      cidade: d.cidade,
      texto: d.texto,
      email: d.email,
      idioma,
      ordem: proxima,
      visivel: false,
      pendente: true,
      autorizacaoRecebidaEm: null,
      consentimentoEm: new Date(),
    });
  } catch (e) {
    console.error("[depoimento] erro ao gravar", e instanceof Error ? e.message : e);
    return { erroGeral: t("falhaDepoimento"), valores: valoresDigitados(formData) };
  }
  return { ok: true };
}
