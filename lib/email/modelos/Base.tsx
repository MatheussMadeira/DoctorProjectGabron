import type { CSSProperties, ReactNode } from "react";
import { Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";

/* Identidade do design system, adaptada ao que os leitores de e-mail aceitam: cores e proporções dos tokens
   (azul-escuro, creme, azul-claro), cantos retos, títulos em caixa alta com espaçamento. Marcellus e Source Sans 3
   não são fontes de e-mail, então entram Georgia e Arial. O logo vai como PNG (SVG não funciona no Gmail), com
   endereço absoluto: public/logos/logo-horizontal-negativo-2x.png, gerado por scripts/gerar-logo-email.mjs. */

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

/** Dados que todo e-mail precisa e que vêm de fora (endereço do site e Configurações). */
export interface ContextoEmail {
  /** Endereço ABSOLUTO do logo em PNG (SITE_URL + /logos/...). Leitores de e-mail não abrem caminhos relativos. */
  logoUrl: string;
  /** "© 2026 ReabToxin · Formação em toxina botulínica · Belo Horizonte, MG" */
  legal: string;
}

export function Base({ previa, contexto, children }: { previa: string; contexto: ContextoEmail; children: ReactNode }) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{previa}</Preview>
      <Body style={estilos.corpo}>
        <Container style={estilos.recipiente}>
          <Section style={estilos.topo}>
            <Img src={contexto.logoUrl} width="168" alt="ReabToxin" style={{ display: "block", border: 0, color: cores.creme, fontFamily: SERIFA, fontSize: 18, textTransform: "uppercase" }} />
          </Section>
          <Section style={estilos.cartao}>{children}</Section>
          <Section style={estilos.rodape}>
            <Text style={{ margin: 0 }}>{contexto.legal}</Text>
            <Text style={{ margin: "6px 0 0" }}>Esta é uma mensagem automática enviada pelo site do ReabToxin.</Text>
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
