import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { obterSite } from "@/lib/configuracoes";
import type { Locale } from "@/lib/i18n/idiomas";
import { footerDe } from "@/lib/site";
import { IdiomaProvider } from "../atoms/IdiomaProvider";
import { WhatsAppButton } from "../atoms/WhatsAppButton";
import { AvisoDeTraducao } from "../organisms/AvisoDeTraducao";
import { Footer } from "../organisms/Footer";
import { SugestaoDeIdioma } from "../organisms/SugestaoDeIdioma";
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

/** Moldura das páginas públicas: Header, conteúdo, Footer e WhatsApp flutuante, no idioma da página (a página chama setRequestLocale antes).
    Os dados de contato vêm de Configurações. */
export async function PublicTemplate({ hideWhatsApp = false, withBar = false, whatsAppMessage, children }: PublicTemplateProps) {
  const locale = (await getLocale()) as Locale;
  const [t, site] = await Promise.all([getTranslations({ locale }), obterSite(locale)]);
  return (
    <IdiomaProvider locale={locale}>
      <div className={withBar ? "ap-com-barra" : undefined}>
        <a className="ap-skip" href="#conteudo">
          {t("Comum.pularParaConteudo")}
        </a>
        <SiteHeader contato={{ telefone: site.telefone, telefoneHref: site.telefoneHref, whatsapp: site.whatsapp }} />
        <main id="conteudo" tabIndex={-1}>
          {children}
        </main>
        <Footer {...footerDe(site, t)} aviso={<AvisoDeTraducao />} />
        {!hideWhatsApp && <WhatsAppButton phone={site.whatsapp} message={whatsAppMessage ?? t("Comum.whatsappMensagem")} label={t("Comum.whatsappLabel")} />}
        <SugestaoDeIdioma />
      </div>
    </IdiomaProvider>
  );
}
