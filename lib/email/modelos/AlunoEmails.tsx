import { Button, Hr, Text } from "@react-email/components";
import { Base, cores, estilos, type ContextoEmail } from "./Base";

/* E-mails da área do aluno, no idioma do aluno: código de primeiro acesso, nova senha e aviso de material novo. */

const botao = { backgroundColor: cores.azulEscuro, color: cores.creme, padding: "14px 24px", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" } as const;
const primeiro = (nome: string) => nome.trim().split(/\s+/)[0];

export function AlunoCodigo({ nome, codigo, link, contexto }: { nome: string; codigo: string; link: string; contexto: ContextoEmail }) {
  const k = (chave: string, valores?: Record<string, string | number>) => contexto.t(`alunoCodigo.${chave}`, valores);
  return (
    <Base contexto={contexto} previa={k("previa")}>
      <Text style={estilos.eyebrow}>{k("eyebrow")}</Text>
      <Text style={estilos.titulo}>{k("titulo")}</Text>
      <Text style={estilos.paragrafo}>{k("intro", { nome: primeiro(nome) })}</Text>
      <div style={estilos.caixa}>
        <Text style={{ ...estilos.suave, margin: 0 }}>{k("codigoRotulo")}</Text>
        <Text style={{ fontSize: 30, letterSpacing: "0.18em", fontWeight: 700, color: cores.azulEscuro, margin: "6px 0 0" }}>{codigo}</Text>
      </div>
      <Text style={estilos.paragrafo}>{k("passos")}</Text>
      <Button href={link} style={botao}>
        {k("botao")}
      </Button>
      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>{k("aviso")}</Text>
    </Base>
  );
}

export function AlunoRedefinir({ nome, link, contexto }: { nome: string; link: string; contexto: ContextoEmail }) {
  const k = (chave: string, valores?: Record<string, string | number>) => contexto.t(`alunoRedefinir.${chave}`, valores);
  return (
    <Base contexto={contexto} previa={k("previa")}>
      <Text style={estilos.eyebrow}>{k("eyebrow")}</Text>
      <Text style={estilos.titulo}>{k("titulo")}</Text>
      <Text style={estilos.paragrafo}>{k("intro", { nome: primeiro(nome) })}</Text>
      <Button href={link} style={botao}>
        {k("botao")}
      </Button>
      <Hr style={estilos.linha} />
      <Text style={estilos.suave}>{k("validade")}</Text>
    </Base>
  );
}

export function AlunoNovoMaterial({ nome, titulo, modulo, turma, link, contexto }: { nome: string; titulo: string; modulo: string; turma: string; link: string; contexto: ContextoEmail }) {
  const k = (chave: string, valores?: Record<string, string | number>) => contexto.t(`alunoNovoMaterial.${chave}`, valores);
  return (
    <Base contexto={contexto} previa={k("previa", { titulo })}>
      <Text style={estilos.eyebrow}>{k("eyebrow")}</Text>
      <Text style={estilos.titulo}>{k("titulo")}</Text>
      <Text style={estilos.paragrafo}>{k("intro", { nome: primeiro(nome), modulo, turma })}</Text>
      <div style={estilos.caixa}>
        <Text style={{ fontSize: 17, fontWeight: 600, color: cores.azulEscuro, margin: 0 }}>{titulo}</Text>
      </div>
      <Button href={link} style={botao}>
        {k("botao")}
      </Button>
    </Base>
  );
}
