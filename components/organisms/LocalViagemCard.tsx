import { ExternalLink, Globe, MapPin, Phone } from "lucide-react";
import { ICON } from "@/lib/icon";
import { IDIOMAS, type Locale } from "@/lib/i18n/idiomas";
import type { Tradutor } from "@/lib/i18n/tradutor";
import type { LocalViagem } from "@/lib/viagem";
import { linkDoMapa, mapaEmbutido } from "@/lib/viagem-geo";
import { Photo } from "../atoms/Photo";
import styles from "./viagem.module.css";

/* Cartão de um local da Travel info: foto, nome, descrição, distância até o local do curso, preço, links e (no local do curso) o mapa. */
export function LocalViagemCard({ local, locale, tr }: { local: LocalViagem; locale: Locale; tr: Tradutor }) {
  const intl = IDIOMAS[locale].intl;
  const km = new Intl.NumberFormat(intl, { maximumFractionDigits: 1, minimumFractionDigits: 0 });
  const data = new Intl.DateTimeFormat(intl, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${local.atualizadoEm}T12:00:00Z`));
  const comMapa = local.categoria === "LOCAL" && local.latitude != null && local.longitude != null;
  const site = local.site ? new URL(local.site).hostname.replace(/^www\./, "") : null;

  return (
    <article className={styles.card} data-categoria={local.categoria}>
      {local.fotoUrl && (
        <div className={styles.foto}>
          <Photo src={local.fotoUrl} alt={local.fotoAlt ?? local.nome} ratio="16/10" sizes="(max-width: 900px) 100vw, 560px" />
        </div>
      )}
      <div className={styles.corpo}>
        <div className={styles.topo}>
          <h3 className={styles.nome}>{local.nome}</h3>
          {local.faixaPreco != null && (
            <span className={styles.preco} role="img" aria-label={tr("Viagem.faixaPreco", { n: local.faixaPreco })}>
              <span aria-hidden="true">{"$".repeat(local.faixaPreco)}</span>
              <span className={styles.precoApagado} aria-hidden="true">
                {"$".repeat(4 - local.faixaPreco)}
              </span>
            </span>
          )}
        </div>
        {local.descricao && <p className={styles.descricao}>{local.descricao}</p>}
        {local.endereco && (
          <p className={styles.linha}>
            <MapPin {...ICON} size={18} aria-hidden="true" />
            <span>{local.endereco}</span>
          </p>
        )}
        {local.distancias.length > 0 && (
          <ul className={styles.distancias}>
            {local.distancias.map((d) => (
              <li key={d.nome}>{tr("Viagem.distancia", { km: km.format(d.km), nome: d.nome })}</li>
            ))}
          </ul>
        )}
        <ul className={styles.links}>
          <li>
            <a href={linkDoMapa(local)} target="_blank" rel="noopener noreferrer">
              <ExternalLink {...ICON} size={16} aria-hidden="true" /> {tr("Viagem.abrirMapa")}
              <span className={styles.somenteLeitor}> {tr("Viagem.novaAba")}</span>
            </a>
          </li>
          {local.site && site && (
            <li>
              <a href={local.site} target="_blank" rel="noopener noreferrer">
                <Globe {...ICON} size={16} aria-hidden="true" /> {site}
                <span className={styles.somenteLeitor}> {tr("Viagem.novaAba")}</span>
              </a>
            </li>
          )}
          {local.telefone && (
            <li>
              <a href={`tel:${local.telefone.replace(/[^\d+]/g, "")}`}>
                <Phone {...ICON} size={16} aria-hidden="true" /> {local.telefone}
              </a>
            </li>
          )}
        </ul>
        {comMapa && (
          <iframe
            className={styles.mapa}
            src={mapaEmbutido({ latitude: local.latitude!, longitude: local.longitude! })}
            title={tr("Viagem.mapaTitulo", { nome: local.nome })}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        <p className={styles.atualizado}>{tr("Viagem.atualizadoEm", { data })}</p>
      </div>
    </article>
  );
}
