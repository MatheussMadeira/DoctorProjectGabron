import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { siInstagram } from "simple-icons";
import { BrandIcon, Reveal, WhatsAppButton } from "@/components/atoms";
import { ContactItem, ItemList, MapPlaceholder } from "@/components/molecules";
import { ContatoForm, Hero } from "@/components/organisms";
import { MainAside, PublicTemplate, Section } from "@/components/templates";
import { ASSUNTOS_CONTATO } from "@/lib/dados-exemplo";
import { SITE } from "@/lib/site";
import styles from "../paginas.module.css";

export const metadata: Metadata = {
  title: "Contato",
  description: "Agende uma consulta ou tire dúvidas sobre as turmas de toxina botulínica.",
};

const icone = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export default function ContatoPage() {
  return (
    // O WhatsApp aparece dentro da página (coluna "Outros canais"), não flutuante.
    <PublicTemplate hideWhatsApp>
      <Hero
        eyebrow="Contato"
        title="Fale com a clínica"
        lead="Agende uma consulta ou tire suas dúvidas sobre as turmas de toxina botulínica. A equipe responde pelo canal que você preferir."
      />

      <Section id="formulario">
        <MainAside
          mainBasis={560}
          mainGrow={999}
          asideBasis={320}
          main={
            <Reveal>
              <ContatoForm assuntos={ASSUNTOS_CONTATO} />
            </Reveal>
          }
          aside={
            <Reveal delay={120}>
              <div className={styles.canais}>
                <p className="ap-eyebrow">Outros canais</p>
                <WhatsAppButton floating={false} phone={SITE.whatsapp} message="Olá! Gostaria de mais informações." label="Conversar no WhatsApp" />
                <ItemList>
                  <ContactItem icon={<Phone {...icone} />}>
                    <a href={SITE.telefoneHref}>{SITE.telefone}</a>
                  </ContactItem>
                  <ContactItem icon={<Mail {...icone} />}>
                    <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                  </ContactItem>
                  <ContactItem icon={<BrandIcon icon={siInstagram} />}>
                    <a href={`https://instagram.com/${SITE.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer">
                      {SITE.instagram}
                    </a>
                  </ContactItem>
                  <ContactItem icon={<MapPin {...icone} />}>
                    <span>
                      {SITE.enderecoLinhas[0]}
                      <br />
                      {SITE.enderecoLinhas[1]}
                    </span>
                  </ContactItem>
                  <ContactItem icon={<Clock {...icone} />}>
                    <span>{SITE.horario}</span>
                  </ContactItem>
                </ItemList>
                <MapPlaceholder />
              </div>
            </Reveal>
          }
        />
      </Section>
    </PublicTemplate>
  );
}
