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

/** Aviso interno: alguém escreveu pelo formulário de contato. */
export function ContatoAviso({ nome, email, telefone, assunto, mensagem, contexto }: ContatoAvisoProps) {
  return (
    <Base contexto={contexto} previa={`Contato pelo site: ${assunto}`}>
      <Text style={estilos.eyebrow}>Contato pelo site</Text>
      <Text style={estilos.titulo}>{assunto}</Text>
      <Dado rotulo="Nome">{nome}</Dado>
      <Dado rotulo="E-mail">{email}</Dado>
      <Dado rotulo="Telefone ou WhatsApp">{telefone || "Não informado"}</Dado>
      <Dado rotulo="Mensagem">{mensagem || "Sem mensagem. A pessoa pediu retorno pelo assunto acima."}</Dado>
      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>Responder este e-mail escreve direto para {nome}. Lembre que o formulário pede para não enviar informações de saúde.</Text>
    </Base>
  );
}

export default ContatoAviso;
