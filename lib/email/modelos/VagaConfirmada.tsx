import { Button, Hr, Text } from "@react-email/components";
import { Base, Dado, cores, estilos, type ContextoEmail } from "./Base";

export interface VagaConfirmadaProps {
  nome: string;
  turma: { titulo: string; periodo: string; horario: string; local: string };
  /** Endereço absoluto da página da turma (com o prefixo do idioma). */
  link: string;
  contexto: ContextoEmail;
}

/** Enviado quando a equipe muda a situação da inscrição para CONFIRMADA, no idioma da pessoa. */
export function VagaConfirmada({ nome, turma, link, contexto }: VagaConfirmadaProps) {
  const t = contexto.t;
  const primeiroNome = nome.trim().split(/\s+/)[0];
  const k = (chave: string, valores?: Record<string, string | number>) => t(`vagaConfirmada.${chave}`, valores);
  return (
    <Base contexto={contexto} previa={k("previa", { turma: turma.titulo })}>
      <Text style={estilos.eyebrow}>{k("eyebrow")}</Text>
      <Text style={estilos.titulo}>{k("titulo")}</Text>
      <Text style={estilos.paragrafo}>{k("intro", { nome: primeiroNome })}</Text>

      <div style={estilos.caixa}>
        <Dado rotulo={t("rotuloTurma")}>{turma.titulo}</Dado>
        <Dado rotulo={t("rotuloData")}>
          {turma.periodo} · {turma.horario}
        </Dado>
        <Dado rotulo={t("rotuloLocal")}>{turma.local}</Dado>
      </div>

      <Text style={estilos.paragrafo}>{k("guarde")}</Text>

      <Button href={link} style={{ backgroundColor: cores.azulEscuro, color: cores.creme, padding: "14px 24px", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
        {t("verTurma")}
      </Button>
      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>{k("ate")}</Text>
    </Base>
  );
}

export default VagaConfirmada;
