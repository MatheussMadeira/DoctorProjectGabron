import { Button, Hr, Text } from "@react-email/components";
import { Base, Dado, cores, estilos, type ContextoEmail } from "./Base";

export interface InscricaoConfirmacaoProps {
  nome: string;
  turma: { titulo: string; periodo: string; horario: string; local: string };
  conselho: string;
  registro: string;
  listaEspera: boolean;
  /** Endereço absoluto da página da turma (com o prefixo do idioma). */
  link: string;
  contexto: ContextoEmail;
}

export function InscricaoConfirmacao({ nome, turma, conselho, registro, listaEspera, link, contexto }: InscricaoConfirmacaoProps) {
  const t = contexto.t;
  const primeiroNome = nome.trim().split(/\s+/)[0];
  const k = (chave: string, valores?: Record<string, string | number>) => t(`confirmacao.${chave}`, valores);
  return (
    <Base contexto={contexto} previa={listaEspera ? k("previaEspera", { turma: turma.titulo }) : k("previa", { turma: turma.titulo })}>
      <Text style={estilos.eyebrow}>{listaEspera ? k("eyebrowEspera") : k("eyebrow")}</Text>
      <Text style={estilos.titulo}>{listaEspera ? k("tituloEspera") : k("titulo")}</Text>

      <Text style={estilos.paragrafo}>{listaEspera ? k("introEspera", { nome: primeiroNome }) : k("intro", { nome: primeiroNome })}</Text>

      <div style={estilos.caixa}>
        <Dado rotulo={t("rotuloTurma")}>{turma.titulo}</Dado>
        <Dado rotulo={t("rotuloData")}>
          {turma.periodo} · {turma.horario}
        </Dado>
        <Dado rotulo={t("rotuloLocal")}>{turma.local}</Dado>
      </div>

      {!listaEspera && (
        <>
          <Text style={{ ...estilos.rotulo, margin: "0 0 8px" }}>{k("proximosPassos")}</Text>
          <Text style={estilos.paragrafo}>
            {k("passo1", { conselho, registro })}
            <br />
            {k("passo2")}
            <br />
            {k("passo3")}
          </Text>
          <Text style={estilos.suave}>{t("pagamento")}</Text>
        </>
      )}

      <Button href={link} style={{ backgroundColor: cores.azulEscuro, color: cores.creme, padding: "14px 24px", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
        {t("verTurma")}
      </Button>

      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>{k("respostas")}</Text>
    </Base>
  );
}

export default InscricaoConfirmacao;
