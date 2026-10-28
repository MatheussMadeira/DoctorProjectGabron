import { tempoMinimoMs, verificarCarimbo } from "./carimbo";
import { registrarDescarte, type FormularioPublico } from "./descartes";
import { CAMPO_ARMADILHA, CAMPO_CARIMBO, type EstadoFormulario } from "./formularios-tipos";
import { valoresDigitados } from "./formularios";
import { dentroDoLimite, type RotaLimitada } from "./limite-taxa";

/**
 * As três barreiras dos formulários públicos, nesta ordem, antes de validar ou gravar qualquer coisa.
 * Devolve a resposta quando barrou o envio, ou null quando pode seguir.
 *  1. Campo escondido preenchido: é robô. Responde como se tivesse dado certo (não dá pista), sem gravar.
 *  2. Carimbo de tempo assinado pelo servidor: ausente, falso ou recente demais: a pessoa vê um aviso de verdade. Vencido (mais de 12 h):
 *     sem erro, o formulário renova o carimbo e reenvia sozinho (`renovarCarimbo`).
 *  3. Limite por visitante. Também um aviso de verdade: nunca um falso sucesso para quem pode ser uma pessoa real.
 * Todo descarte é registrado (terminal em desenvolvimento, log sem dado pessoal e contador diário no painel).
 */
export async function barrarEnvio(formulario: FormularioPublico, formData: FormData, rota: RotaLimitada): Promise<EstadoFormulario | null> {
  const valores = () => valoresDigitados(formData);

  if (String(formData.get(CAMPO_ARMADILHA) ?? "").trim()) {
    await registrarDescarte(formulario, "ARMADILHA");
    return { ok: true };
  }

  const carimbo = verificarCarimbo(formData.get(CAMPO_CARIMBO));
  if (carimbo === "rapido") {
    await registrarDescarte(formulario, "TEMPO");
    return { erroGeral: "Você enviou rápido demais. Aguarde um instante e envie de novo.", valores: valores() };
  }
  if (carimbo === "expirado") {
    // Aba aberta de um dia para o outro: não é erro da pessoa. O formulário renova o carimbo e reenvia sozinho.
    if (process.env.NODE_ENV !== "production") console.warn(`[descarte] ${formulario}: carimbo vencido, o formulário vai renovar e reenviar`);
    return { renovarCarimbo: tempoMinimoMs() + 150, valores: valores() };
  }
  if (carimbo !== "ok") {
    await registrarDescarte(formulario, "CARIMBO");
    return { erroGeral: "Não foi possível validar o envio. Recarregue a página e tente de novo.", valores: valores() };
  }

  if (!(await dentroDoLimite(rota))) {
    await registrarDescarte(formulario, "LIMITE");
    return { erroGeral: "Muitas tentativas, tente de novo em alguns minutos.", valores: valores() };
  }
  return null;
}
