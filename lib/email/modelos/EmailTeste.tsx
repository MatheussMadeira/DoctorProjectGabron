import { Text } from "@react-email/components";
import { Base, Dado, estilos, type ContextoEmail } from "./Base";

export interface EmailTesteProps {
  quemPediu: string;
  provedor: string;
  remetente: string;
  contexto: ContextoEmail;
}

/** Enviado pelo botão "Enviar e-mail de teste" em Configurações (interno: sempre em português): confirma que o envio funciona e mostra com que configuração. */
export function EmailTeste({ quemPediu, provedor, remetente, contexto }: EmailTesteProps) {
  const t = (chave: string) => contexto.ti(`teste.${chave}`);
  return (
    <Base contexto={contexto} previa={t("previa")}>
      <Text style={estilos.eyebrow}>{t("eyebrow")}</Text>
      <Text style={estilos.titulo}>{t("titulo")}</Text>
      <Text style={estilos.paragrafo}>{t("texto")}</Text>
      <Dado rotulo={t("pedidoPor")}>{quemPediu}</Dado>
      <Dado rotulo={t("provedor")}>{provedor}</Dado>
      <Dado rotulo={t("remetente")}>{remetente}</Dado>
      <Text style={estilos.suave}>{t("nota")}</Text>
    </Base>
  );
}

export default EmailTeste;
