import type { CSSProperties } from "react";
import Image from "@/components/atoms/ImagemSegura";
import { ArrowRight } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import { STATUS, type EventStatus } from "@/lib/agenda";
import { AppLink } from "../atoms/AppLink";
import { Badge } from "../atoms/Badge";
import { DateBlock } from "../atoms/DateBlock";
import { Logo } from "../atoms/Logo";
import { Skeleton } from "../atoms/Skeleton";
import { EventMeta } from "../molecules/EventMeta";

export interface EventCardProps {
  title?: string;
  href?: string;
  start?: string;
  end?: string;
  image?: string;
  imageAlt?: string;
  summary?: string;
  modality?: string;
  time?: string;
  city?: string;
  venue?: string;
  seats?: string;
  price?: string;
  status?: EventStatus;
  /** Texto do selo de status no idioma (sem ele, o rótulo em português de lib/agenda.ts: painel e /dev). */
  statusLabel?: string;
  /** Rótulo de exibição da modalidade (o valor lógico continua em `modality`). */
  modalityLabel?: string;
  cta?: string;
  /** "Lista de espera" e "Ver como foi", no idioma. */
  waitlistLabel?: string;
  pastLabel?: string;
  transitionName?: string;
  loading?: boolean;
}

/* Cartão de uma data da agenda: a data é o destaque. No hover sobe, a foto aproxima e aparece o resumo. */
export function EventCard({ title, start, end, image, imageAlt = "", summary, modality = "Presencial", modalityLabel, time, city, venue, seats, price, status = "aberto", statusLabel, href = "#", cta = "Ver detalhes", waitlistLabel = "Lista de espera", pastLabel = "Ver como foi", transitionName, loading = false }: EventCardProps) {
  if (loading) return <Skeleton variant="card" />;
  const s = STATUS[status] || STATUS.aberto;
  const off = status === "esgotado" || status === "encerrado";
  return (
    <article className={cx("ap-event", off && "is-off")}>
      <div className="ap-event-media" style={transitionName ? ({ viewTransitionName: transitionName } as CSSProperties) : undefined}>
        {image ? (
          <Image src={image} alt={imageAlt} width={1600} height={1000} sizes="(max-width: 900px) 100vw, 380px" />
        ) : (
          <div className="ap-event-ph">
            <Logo variant="simbolo" title="" />
          </div>
        )}
        <DateBlock start={start} end={end} className="ap-event-date" />
        <Badge tone={s.tone} className="ap-event-status">
          {statusLabel ?? s.label}
        </Badge>
      </div>
      <div className="ap-event-body">
        <p className="ap-eyebrow">{modalityLabel ?? modality}</p>
        <h3 className="ap-event-title">
          <AppLink href={href}>{title}</AppLink>
        </h3>
        <EventMeta time={time} city={city} venue={venue} modality={modality} seats={seats} />
        {summary && (
          <div className="ap-event-more">
            <p>{summary}</p>
          </div>
        )}
      </div>
      <div className="ap-event-foot">
        <span className="ap-price-main">{price}</span>
        <span className="ap-event-cta">
          {off ? (status === "esgotado" ? waitlistLabel : pastLabel) : cta}
          <ArrowRight {...ICON} size={18} />
        </span>
      </div>
    </article>
  );
}
