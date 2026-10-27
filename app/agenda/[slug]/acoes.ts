"use server";

import { after } from "next/server";
import { updateTag } from "next/cache";
import { enviarERegistrar } from "@/lib/email/registro";
import { CAMPO_ARMADILHA, type EstadoFormulario } from "@/lib/formularios-tipos";
import { errosPorCampo, inscricaoSchema, valoresDigitados } from "@/lib/formularios";
import { criarInscricao, InscricaoDuplicadaError, TurmaIndisponivelError } from "@/lib/inscricoes";
import { dentroDoLimite } from "@/lib/limite-taxa";
import { TAG_TURMAS, tagTurma } from "@/lib/turmas";

const plural = (n: number) => (n === 1 ? "1 campo" : `${n} campos`);

/**
 * Inscrição pelo site. Ordem: armadilha de robô → limite por visitante → validação → transação no banco
 * (com a turma travada) → invalidação do cache → e-mails (depois de gravar, sem atrasar a resposta).
 */
export async function inscrever(slug: string, _anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  // Campo escondido preenchido: é robô. Responde como se tivesse dado certo, sem gravar nada.
  if (String(formData.get(CAMPO_ARMADILHA) ?? "").trim()) return { ok: true };

  if (!(await dentroDoLimite("inscricao"))) {
    return { erroGeral: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.", valores: valoresDigitados(formData) };
  }

  const parsed = inscricaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const erros = errosPorCampo(parsed.error);
    return { erros, erroGeral: `Revise ${plural(Object.keys(erros).length)} antes de enviar`, valores: valoresDigitados(formData) };
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
    });
  } catch (e) {
    const valores = valoresDigitados(formData);
    if (e instanceof InscricaoDuplicadaError) return { erros: { email: "Já recebemos uma inscrição com este e-mail nesta turma." }, erroGeral: "Revise 1 campo antes de enviar", valores };
    if (e instanceof TurmaIndisponivelError) {
      const msg = { inexistente: "Esta turma não está mais disponível.", encerrada: "Esta turma já aconteceu.", "em-breve": "As inscrições desta turma ainda não abriram." }[e.motivo];
      return { erroGeral: msg, valores };
    }
    console.error("[inscrição] erro ao gravar", e instanceof Error ? e.message : e);
    return { erroGeral: "Não foi possível enviar a inscrição agora. Tente de novo em instantes.", valores };
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
