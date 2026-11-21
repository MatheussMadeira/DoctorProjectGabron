import type { Metadata } from "next";
import { Reveal } from "@/components/atoms";
import { ChegadaViagem, Hero, LocalViagemCard, ViagemTabs } from "@/components/organisms";
import { PublicTemplate, Section } from "@/components/templates";
import { metadataDaPagina, prepararPagina } from "@/lib/i18n/pagina";
import { listarChegadaViagem, listarLocaisViagem } from "@/lib/viagem";
import type { CategoriaViagem } from "@/db/schema";
import styles from "@/components/organisms/viagem.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/viagem">): Promise<Metadata> {
  return metadataDaPagina((await params).locale, "Viagem", "/viagem");
}

export default async function ViagemPage({ params }: PageProps<"/[locale]/viagem">) {
  const { locale, tr } = await prepararPagina((await params).locale);
  const [locais, chegada] = await Promise.all([listarLocaisViagem(locale), listarChegadaViagem(locale)]);

  const vazio = <p className={styles.vazio}>{tr("Viagem.vazio")}</p>;
  const grade = (categoria: CategoriaViagem, umaColuna = false) =>
    locais[categoria].length ? (
      <div className={styles.grade} data-uma-coluna={umaColuna}>
        {locais[categoria].map((l) => (
          <LocalViagemCard key={l.id} local={l} locale={locale} tr={tr} />
        ))}
      </div>
    ) : (
      vazio
    );

  return (
    <PublicTemplate>
      <Hero eyebrow={tr("Viagem.heroEyebrow")} title={tr("Viagem.heroTitulo")} lead={tr("Viagem.heroLead")} />
      <Section id="guia">
        <Reveal>
          <ViagemTabs
            rotulo={tr("Viagem.rotuloAbas")}
            abas={[
              { value: "local", label: tr("Viagem.abaLocal") },
              { value: "chegar", label: tr("Viagem.abaChegar") },
              { value: "hoteis", label: tr("Viagem.abaHoteis"), count: locais.HOTEL.length || undefined },
              { value: "restaurantes", label: tr("Viagem.abaRestaurantes"), count: locais.RESTAURANTE.length || undefined },
              { value: "turismo", label: tr("Viagem.abaTurismo"), count: locais.TURISMO.length || undefined },
            ]}
            paineis={{
              local: grade("LOCAL"),
              chegar: chegada.length ? <ChegadaViagem itens={chegada} /> : vazio,
              hoteis: grade("HOTEL"),
              restaurantes: grade("RESTAURANTE"),
              turismo: grade("TURISMO"),
            }}
          />
        </Reveal>
      </Section>
    </PublicTemplate>
  );
}
