import { Button, Hr, Text } from "@react-email/components";
import { Base, Dado, cores, estilos, type ContextoEmail } from "./Base";

export interface InscricaoAvisoProps {
  nome: string;
  email: string;
  telefone: string;
  profissao: string;
  conselho: string;
  registro: string;
  situacao: string;
  querAvisos: boolean;
  turma: { titulo: string; periodo: string };
  /** "9 de 12 vagas ocupadas" */
  vagas: string;
  /** Endereço absoluto da tela de inscrições da turma, no painel. */
  linkPainel: string;
  contexto: ContextoEmail;
}

/** Aviso interno: chega na caixa da equipe quando alguém se inscreve (sempre em português). */
export function InscricaoAviso(p: InscricaoAvisoProps) {
  const t = (chave: string, valores?: Record<string, string | number>) => p.contexto.ti(`inscricao.${chave}`, valores);
  return (
    <Base contexto={p.contexto} previa={t("previa", { nome: p.nome, turma: p.turma.titulo })}>
      <Text style={estilos.eyebrow}>{t("eyebrow")}</Text>
      <Text style={estilos.titulo}>{t("titulo")}</Text>
      <Text style={estilos.paragrafo}>{t("resumo", { nome: p.nome, turma: p.turma.titulo, periodo: p.turma.periodo })}</Text>

      <div style={estilos.caixa}>
        <Dado rotulo={t("situacao")}>{p.situacao}</Dado>
        <Dado rotulo={t("vagas")}>{p.vagas}</Dado>
      </div>

      <Dado rotulo={t("nome")}>{p.nome}</Dado>
      <Dado rotulo={t("email")}>{p.email}</Dado>
      <Dado rotulo={t("telefone")}>{p.telefone}</Dado>
      <Dado rotulo={t("profissao")}>{p.profissao}</Dado>
      <Dado rotulo={t("registro")}>
        {p.conselho} {p.registro}
      </Dado>
      <Dado rotulo={t("avisos")}>{p.querAvisos ? t("sim") : t("nao")}</Dado>

      <Text style={estilos.suave}>{t("lembrete")}</Text>
      <Button href={p.linkPainel} style={{ backgroundColor: cores.azulEscuro, color: cores.creme, padding: "14px 24px", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
        {t("abrir")}
      </Button>
      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>{t("responder")}</Text>
    </Base>
  );
}

export default InscricaoAviso;
