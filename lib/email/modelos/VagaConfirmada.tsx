import { Button, Hr, Text } from "@react-email/components";
import { Base, Dado, cores, estilos, type ContextoEmail } from "./Base";

export interface VagaConfirmadaProps {
  nome: string;
  turma: { titulo: string; periodo: string; horario: string; local: string };
  /** Endereço absoluto da página da turma. */
  link: string;
  contexto: ContextoEmail;
}

/** Enviado quando a equipe muda a situação da inscrição para CONFIRMADA. */
export function VagaConfirmada({ nome, turma, link, contexto }: VagaConfirmadaProps) {
  const primeiroNome = nome.trim().split(/\s+/)[0];
  return (
    <Base contexto={contexto} previa={`Vaga confirmada: ${turma.titulo}`}>
      <Text style={estilos.eyebrow}>Inscrição</Text>
      <Text style={estilos.titulo}>Vaga confirmada</Text>
      <Text style={estilos.paragrafo}>Olá, {primeiroNome}. A sua vaga na turma abaixo está confirmada.</Text>

      <div style={estilos.caixa}>
        <Dado rotulo="Turma">{turma.titulo}</Dado>
        <Dado rotulo="Data">
          {turma.periodo} · {turma.horario}
        </Dado>
        <Dado rotulo="Local">{turma.local}</Dado>
      </div>

      <Text style={estilos.paragrafo}>Guarde este e-mail. Se precisar alterar algum dado ou tiver dúvidas, responda esta mensagem.</Text>

      <Button href={link} style={{ backgroundColor: cores.azulEscuro, color: cores.creme, padding: "14px 24px", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
        Ver a página da turma
      </Button>
      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>Até lá.</Text>
    </Base>
  );
}

export default VagaConfirmada;
