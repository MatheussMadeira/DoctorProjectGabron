import type { CSSProperties, ReactNode } from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

/* Identidade do design system, adaptada ao que os leitores de e-mail aceitam: cores e proporções dos tokens
   (azul-escuro, creme, azul-claro), cantos retos, títulos em caixa alta com espaçamento. Marcellus e Source Sans 3
   não são fontes de e-mail, então entram Georgia e Arial. O logo não vai como imagem: ainda não há domínio para
   hospedá-la, e SVG não funciona no Gmail. */

export const cores = {
  azulEscuro: "#28334f",
  azulPedra: "#4a5872",
  azulClaro: "#9bacbe",
  creme: "#f5ebdf",
  cremeClaro: "#fbf6ef",
  areia: "#ede1d1",
  linha: "#ddd0bf",
  sucesso: "#2f6b4f",
  alerta: "#8a5a14",
};

const SERIFA = "Georgia, 'Times New Roman', serif";
const SANS = "'Source Sans 3', 'Segoe UI', Arial, Helvetica, sans-serif";

export const estilos: Record<string, CSSProperties> = {
  corpo: { margin: 0, padding: "32px 12px", backgroundColor: cores.creme, fontFamily: SANS, color: cores.azulEscuro },
  recipiente: { maxWidth: 600, margin: "0 auto" },
  topo: { backgroundColor: cores.azulEscuro, padding: "28px 32px" },
  marca: { margin: 0, fontFamily: SERIFA, fontSize: 20, letterSpacing: "0.08em", textTransform: "uppercase", color: cores.creme },
  marcaSub: { margin: "6px 0 0", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: cores.azulClaro },
  cartao: { backgroundColor: cores.cremeClaro, padding: "36px 32px" },
  titulo: { margin: "0 0 16px", fontFamily: SERIFA, fontSize: 26, lineHeight: "34px", fontWeight: 400, letterSpacing: "0.05em", textTransform: "uppercase", color: cores.azulEscuro },
  eyebrow: { margin: "0 0 8px", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, color: cores.azulPedra },
  paragrafo: { margin: "0 0 16px", fontSize: 16, lineHeight: "26px", color: cores.azulEscuro },
  suave: { margin: "0 0 16px", fontSize: 14, lineHeight: "22px", color: cores.azulPedra },
  rotulo: { margin: 0, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: cores.azulPedra },
  valor: { margin: "2px 0 14px", fontSize: 16, lineHeight: "24px", color: cores.azulEscuro },
  caixa: { backgroundColor: cores.areia, padding: "16px 20px", margin: "0 0 20px" },
  linha: { borderColor: cores.linha, margin: "24px 0" },
  rodape: { padding: "20px 32px", fontSize: 12, lineHeight: "18px", color: cores.azulPedra },
};

export function Base({ previa, children }: { previa: string; children: ReactNode }) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{previa}</Preview>
      <Body style={estilos.corpo}>
        <Container style={estilos.recipiente}>
          <Section style={estilos.topo}>
            <Text style={estilos.marca}>Dra. Ana Paula Fonseca</Text>
            <Text style={estilos.marcaSub}>Médica Fisiatra</Text>
          </Section>
          <Section style={estilos.cartao}>{children}</Section>
          <Section style={estilos.rodape}>
            <Text style={{ margin: 0 }}>Dra. Ana Paula Fonseca · Médica Fisiatra · CRM-MG 00000 · RQE 00000</Text>
            <Text style={{ margin: "6px 0 0" }}>Esta é uma mensagem automática enviada pelo site da clínica.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Par rótulo + valor, para os dados da inscrição e da mensagem. */
export function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{children}</Text>
    </>
  );
}

export { Heading, Hr, Text };
