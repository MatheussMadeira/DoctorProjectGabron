import type { ReactNode } from "react";
import { FOOTER, SITE } from "@/lib/site";
import { WhatsAppButton } from "../atoms/WhatsAppButton";
import { Footer } from "../organisms/Footer";
import { SiteHeader } from "./SiteHeader";

export interface PublicTemplateProps {
  /** Esconde o botão flutuante (em /contato ele aparece dentro da página). */
  hideWhatsApp?: boolean;
  /** A página tem a barra de inscrição fixa no rodapé do celular: o WhatsApp sobe para não cobri-la. */
  withBar?: boolean;
  /** Mensagem inicial do WhatsApp, quando a página tem um assunto próprio. */
  whatsAppMessage?: string;
  children: ReactNode;
}

/** Moldura das páginas públicas: Header, conteúdo, Footer e WhatsApp flutuante. */
export function PublicTemplate({ hideWhatsApp = false, withBar = false, whatsAppMessage, children }: PublicTemplateProps) {
  return (
    <div className={withBar ? "ap-com-barra" : undefined}>
      <SiteHeader />
      <main>{children}</main>
      <Footer {...FOOTER} />
      {!hideWhatsApp && <WhatsAppButton phone={SITE.whatsapp} message={whatsAppMessage} />}
    </div>
  );
}
