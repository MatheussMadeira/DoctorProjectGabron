"use server";

import { after } from "next/server";
import { updateTag } from "next/cache";
import { enviarERegistrar } from "@/lib/email/registro";
import type { EstadoFormulario } from "@/lib/formularios-tipos";
import { criarInscricaoSchema, errosPorCampo, idiomaDoFormulario, valoresDigitados } from "@/lib/formularios";
import { criarTradutor } from "@/lib/i18n/mensagens";
import { criarInscricao, InscricaoDuplicadaError, TurmaIndisponivelError } from "@/lib/inscricoes";
import { registrarDescarte } from "@/lib/descartes";
import { barrarEnvio } from "@/lib/protecao-formulario";
import { TAG_TURMAS, tagTurma } from "@/lib/turmas";

/**
 * Inscrição pelo site. Ordem: barreiras contra robô (campo escondido, carimbo de tempo, limite por visitante; lib/protecao-formulario.ts) → validação → transação no banco
 * (com a turma travada) → invalidação do cache → e-mails (depois de gravar, sem atrasar a resposta).
 * Todas as mensagens saem no idioma da página (campo `idioma`), que também é gravado na inscrição para os e-mails para a pessoa.
 */
export async function inscrever(slug: string, _anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const idioma = idiomaDoFormulario(formData);
  const t = criarTradutor(idioma, "Validacao");

  const barrado = await barrarEnvio("inscricao", formData, "inscricao", idioma);
  if (barrado) return barrado;

  const parsed = criarInscricaoSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    await registrarDescarte("inscricao", "VALIDACAO");
    const erros = errosPorCampo(parsed.error);
    return { erros, erroGeral: t("revise", { count: Object.keys(erros).length }), valores: valoresDigitados(formData) };
  }
  const d = parsed.data;

  let criada;
  try {
    criada = await criarInscricao({
      slug,
      nome: d.nome,
      email: d.email,
      telefone: d.telefone,
      profissao: d.profissao,
      conselho: d.conselho as "CRM" | "CRO" | "CRBM" | "CRF" | "Outro",
      registro: d.registro,
      querAvisos: d.avisos === "on",
      idioma,
    });
  } catch (e) {
    const valores = valoresDigitados(formData);
    if (e instanceof InscricaoDuplicadaError) return { erros: { email: t("emailDuplicado") }, erroGeral: t("revise", { count: 1 }), valores };
    if (e instanceof TurmaIndisponivelError) {
      const msg = { inexistente: t("turmaInexistente"), encerrada: t("turmaEncerrada"), "em-breve": t("turmaEmBreve") }[e.motivo];
      return { erroGeral: msg, valores };
    }
    console.error("[inscrição] erro ao gravar", e instanceof Error ? e.message : e);
    return { erroGeral: t("falhaInscricao"), valores };
  }

  // A contagem de vagas mudou: o site público não pode mostrar o número antigo.
  updateTag(tagTurma(slug));
  updateTag(TAG_TURMAS);

  // E-mails só depois de gravar. Falha de e-mail não derruba a inscrição: fica registrada, com "Reenviar" no painel.
  after(async () => {
    await enviarERegistrar("INSCRICAO_CONFIRMACAO", { inscricaoId: criada.id });
    await enviarERegistrar("INSCRICAO_AVISO", { inscricaoId: criada.id });
  });

  return { ok: true, listaEspera: criada.situacao === "LISTA_ESPERA" };
}
