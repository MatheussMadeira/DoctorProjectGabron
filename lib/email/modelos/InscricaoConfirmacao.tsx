import { Button, Hr, Text } from "@react-email/components";
import { Base, Dado, cores, estilos } from "./Base";
import { PAGAMENTO_PLACEHOLDER } from "../textos";

export interface InscricaoConfirmacaoProps {
  nome: string;
  turma: { titulo: string; periodo: string; horario: string; local: string };
  conselho: string;
  registro: string;
  listaEspera: boolean;
  /** Endereço absoluto da página da turma. */
  link: string;
}

export function InscricaoConfirmacao({ nome, turma, conselho, registro, listaEspera, link }: InscricaoConfirmacaoProps) {
  const primeiroNome = nome.trim().split(/\s+/)[0];
  return (
    <Base previa={listaEspera ? `Você está na lista de espera: ${turma.titulo}` : `Recebemos a sua inscrição: ${turma.titulo}`}>
      <Text style={estilos.eyebrow}>{listaEspera ? "Lista de espera" : "Inscrição"}</Text>
      <Text style={estilos.titulo}>{listaEspera ? "Você está na lista de espera" : "Inscrição recebida"}</Text>

      <Text style={estilos.paragrafo}>
        {listaEspera
          ? `Olá, ${primeiroNome}. As vagas da turma abaixo foram preenchidas. Avisamos por e-mail se abrir uma vaga ou uma nova data.`
          : `Olá, ${primeiroNome}. Recebemos a sua inscrição na turma abaixo.`}
      </Text>

      <div style={estilos.caixa}>
        <Dado rotulo="Turma">{turma.titulo}</Dado>
        <Dado rotulo="Data">
          {turma.periodo} · {turma.horario}
        </Dado>
        <Dado rotulo="Local">{turma.local}</Dado>
      </div>

      {!listaEspera && (
        <>
          <Text style={{ ...estilos.rotulo, margin: "0 0 8px" }}>Próximos passos</Text>
          <Text style={estilos.paragrafo}>
            1. Conferimos o seu registro no conselho ({conselho} {registro}).
            <br />
            2. Você recebe as formas de pagamento por e-mail.
            <br />
            3. A vaga é confirmada depois do pagamento.
          </Text>
          <Text style={estilos.suave}>{PAGAMENTO_PLACEHOLDER}</Text>
        </>
      )}

      <Button href={link} style={{ backgroundColor: cores.azulEscuro, color: cores.creme, padding: "14px 24px", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
        Ver a página da turma
      </Button>

      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>Se alguma informação estiver errada, responda este e-mail. A equipe da clínica lê as respostas.</Text>
    </Base>
  );
}

export default InscricaoConfirmacao;
