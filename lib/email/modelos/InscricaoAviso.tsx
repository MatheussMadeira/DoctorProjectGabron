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

/** Aviso interno: chega na caixa da clínica quando alguém se inscreve. */
export function InscricaoAviso(p: InscricaoAvisoProps) {
  return (
    <Base contexto={p.contexto} previa={`Nova inscrição: ${p.nome} · ${p.turma.titulo}`}>
      <Text style={estilos.eyebrow}>Aviso interno</Text>
      <Text style={estilos.titulo}>Nova inscrição</Text>
      <Text style={estilos.paragrafo}>
        {p.nome} se inscreveu em {p.turma.titulo} ({p.turma.periodo}).
      </Text>

      <div style={estilos.caixa}>
        <Dado rotulo="Situação">{p.situacao}</Dado>
        <Dado rotulo="Vagas">{p.vagas}</Dado>
      </div>

      <Dado rotulo="Nome">{p.nome}</Dado>
      <Dado rotulo="E-mail">{p.email}</Dado>
      <Dado rotulo="Telefone ou WhatsApp">{p.telefone}</Dado>
      <Dado rotulo="Profissão">{p.profissao}</Dado>
      <Dado rotulo="Registro no conselho">
        {p.conselho} {p.registro}
      </Dado>
      <Dado rotulo="Quer avisos de novas turmas">{p.querAvisos ? "Sim" : "Não"}</Dado>

      <Text style={estilos.suave}>Confira o registro no conselho antes de confirmar a vaga.</Text>
      <Button href={p.linkPainel} style={{ backgroundColor: cores.azulEscuro, color: cores.creme, padding: "14px 24px", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
        Abrir no painel
      </Button>
      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>Responder este e-mail escreve direto para a pessoa inscrita.</Text>
    </Base>
  );
}

export default InscricaoAviso;
