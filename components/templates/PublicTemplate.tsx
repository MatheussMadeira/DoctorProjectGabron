import type { ReactNode } from "react";
import { obterSite } from "@/lib/configuracoes";
import { footerDe } from "@/lib/site";
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

/** Moldura das páginas públicas: Header, conteúdo, Footer e WhatsApp flutuante. Os dados de contato vêm de Configurações. */
export async function PublicTemplate({ hideWhatsApp = false, withBar = false, whatsAppMessage, children }: PublicTemplateProps) {
  const site = await obterSite();
  return (
    <div className={withBar ? "ap-com-barra" : undefined}>
      <a className="ap-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <SiteHeader contato={{ telefone: site.telefone, telefoneHref: site.telefoneHref, whatsapp: site.whatsapp }} />
      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>
      <Footer {...footerDe(site)} />
      {!hideWhatsApp && <WhatsAppButton phone={site.whatsapp} message={whatsAppMessage} />}
    </div>
  );
}
