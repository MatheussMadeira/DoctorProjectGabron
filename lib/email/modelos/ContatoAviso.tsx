import { Hr, Text } from "@react-email/components";
import { Base, Dado, estilos, type ContextoEmail } from "./Base";

export interface ContatoAvisoProps {
  nome: string;
  email: string;
  telefone: string | null;
  assunto: string;
  mensagem: string | null;
  contexto: ContextoEmail;
}

/** Aviso interno: alguém escreveu pelo formulário de contato (sempre em português). */
export function ContatoAviso({ nome, email, telefone, assunto, mensagem, contexto }: ContatoAvisoProps) {
  const t = (chave: string, valores?: Record<string, string | number>) => contexto.ti(`contato.${chave}`, valores);
  return (
    <Base contexto={contexto} previa={t("previa", { assunto })}>
      <Text style={estilos.eyebrow}>{t("eyebrow")}</Text>
      <Text style={estilos.titulo}>{assunto}</Text>
      <Dado rotulo={t("nome")}>{nome}</Dado>
      <Dado rotulo={t("email")}>{email}</Dado>
      <Dado rotulo={t("telefone")}>{telefone || t("naoInformado")}</Dado>
      <Dado rotulo={t("mensagem")}>{mensagem || t("semMensagem")}</Dado>
      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>{t("responder", { nome })}</Text>
    </Base>
  );
}

export default ContatoAviso;
