import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { siInstagram } from "simple-icons";
import { BrandIcon, Reveal, WhatsAppButton } from "@/components/atoms";
import { ContactItem, ItemList, MapPlaceholder } from "@/components/molecules";
import { ContatoForm, Hero } from "@/components/organisms";
import { MainAside, PublicTemplate, Section } from "@/components/templates";
import { obterSite } from "@/lib/configuracoes";
import { metadataDaPagina, prepararPagina } from "@/lib/i18n/pagina";
import { enviarContato } from "./acoes";
import styles from "../paginas.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/contato">): Promise<Metadata> {
  return metadataDaPagina((await params).locale, "Contato", "/contato");
}

const icone = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export default async function ContatoPage({ params }: PageProps<"/[locale]/contato">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  const site = await obterSite(locale);
  return (
    // O WhatsApp aparece dentro da página (coluna "Outros canais"), não flutuante.
    <PublicTemplate hideWhatsApp>
      <Hero eyebrow={tr("Contato.heroEyebrow")} title={tr("Contato.heroTitulo")} lead={tr("Contato.heroLead")} />

      <Section id="formulario">
        <MainAside
          mainBasis={560}
          mainGrow={999}
          asideBasis={320}
          main={
            <Reveal>
              <ContatoForm acao={enviarContato} />
            </Reveal>
          }
          aside={
            <Reveal delay={120}>
              <div className={styles.canais}>
                <p className="ap-eyebrow">{tr("Contato.outrosCanais")}</p>
                <WhatsAppButton floating={false} phone={site.whatsapp} message={tr("Contato.whatsappMensagem")} label={tr("Contato.whatsappLabel")} />
                <ItemList>
                  <ContactItem icon={<Phone {...icone} />}>
                    <a href={site.telefoneHref}>{site.telefone}</a>
                  </ContactItem>
                  <ContactItem icon={<Mail {...icone} />}>
                    <a href={`mailto:${site.email}`}>{site.email}</a>
                  </ContactItem>
                  <ContactItem icon={<BrandIcon icon={siInstagram} />}>
                    <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer">
                      {site.instagram}
                    </a>
                  </ContactItem>
                  <ContactItem icon={<MapPin {...icone} />}>
                    <span>
                      {site.enderecoLinhas[0]}
                      <br />
                      {site.enderecoLinhas[1]}
                    </span>
                  </ContactItem>
                  <ContactItem icon={<Clock {...icone} />}>
                    <span>{site.horario}</span>
                  </ContactItem>
                </ItemList>
                <MapPlaceholder label={tr("Contato.mapa")} ariaLabel={tr("Contato.mapaAria")} />
              </div>
            </Reveal>
          }
        />
      </Section>
    </PublicTemplate>
  );
}
