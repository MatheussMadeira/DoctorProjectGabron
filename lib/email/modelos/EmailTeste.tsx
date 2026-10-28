import { Text } from "@react-email/components";
import { Base, Dado, estilos, type ContextoEmail } from "./Base";

export interface EmailTesteProps {
  quemPediu: string;
  provedor: string;
  remetente: string;
  contexto: ContextoEmail;
}

/** Enviado pelo botão "Enviar e-mail de teste" em Configurações: confirma que o envio funciona e mostra com que configuração. */
export function EmailTeste({ quemPediu, provedor, remetente, contexto }: EmailTesteProps) {
  return (
    <Base contexto={contexto} previa="Teste de envio do site do ReabToxin">
      <Text style={estilos.eyebrow}>Configurações</Text>
      <Text style={estilos.titulo}>E-mail de teste</Text>
      <Text style={estilos.paragrafo}>Se você está lendo esta mensagem, o envio de e-mails do site está funcionando.</Text>
      <Dado rotulo="Pedido por">{quemPediu}</Dado>
      <Dado rotulo="Provedor">{provedor}</Dado>
      <Dado rotulo="Remetente">{remetente}</Dado>
      <Text style={estilos.suave}>Os avisos de nova inscrição e de mensagem de contato chegam aos usuários ADMIN ativos.</Text>
    </Base>
  );
}

export default EmailTeste;
