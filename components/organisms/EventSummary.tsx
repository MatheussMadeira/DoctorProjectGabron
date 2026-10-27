"use client";

import { useRef, type ReactNode } from "react";
import { STATUS, type EventStatus } from "@/lib/agenda";
import { useInView } from "@/lib/motion";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { DateBlock } from "../atoms/DateBlock";
import { EventMeta } from "../molecules/EventMeta";

export interface EventSummaryProps {
  start: string;
  end?: string;
  time?: string;
  city?: string;
  venue?: string;
  modality?: string;
  seatsTotal?: number;
  seatsTaken?: number;
  price?: string;
  installment?: string;
  status?: EventStatus;
  action?: { label: string; href: string };
  secondary?: ReactNode;
  /** Barra fixa no rodapé da tela, só no celular. */
  bar?: boolean;
}

/* Resumo da data, fixo na lateral da página da turma; no celular vira uma barra no rodapé. */
export function EventSummary({ start, end, time, city, venue, modality = "Presencial", seatsTotal, seatsTaken, price, installment, status = "aberto", action = { label: "Quero me inscrever", href: "#inscricao" }, secondary, bar = true }: EventSummaryProps) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, 0.3);
  const s = STATUS[status] || STATUS.aberto;
  const off = status === "esgotado" || status === "encerrado";
  const pct = seatsTotal ? Math.min(100, Math.round(((seatsTaken || 0) / seatsTotal) * 100)) : null;
  const left = seatsTotal ? Math.max(0, seatsTotal - (seatsTaken || 0)) : null;
  return (
    <>
      <aside ref={ref} className="ap-summary" aria-label="Resumo da turma">
        <div className="ap-summary-top">
          <DateBlock start={start} end={end} size="lg" />
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>
        <EventMeta time={time} city={city} venue={venue} modality={modality} />
        {pct != null && (
          <div className="ap-seats">
            <div className="ap-seats-row">
              <span>Vagas</span>
              <strong>{left === 0 ? "Esgotado" : `${left} de ${seatsTotal} disponíveis`}</strong>
            </div>
            <div className="ap-seats-track" role="progressbar" aria-valuemin={0} aria-valuemax={seatsTotal} aria-valuenow={seatsTaken || 0} aria-label="Vagas preenchidas">
              <span style={{ transform: `scaleX(${seen ? pct / 100 : 0})` }} />
            </div>
          </div>
        )}
        {price && (
          <div className="ap-price">
            <span className="ap-price-main">{price}</span>
            {installment && <span className="ap-price-sub">{installment}</span>}
          </div>
        )}
        <Button full size="lg" href={action.href} arrow={!off} variant={off ? "secondary" : "primary"}>
          {status === "esgotado" ? "Entrar na lista de espera" : action.label}
        </Button>
        {secondary}
      </aside>
      {bar && (
        <div className="ap-summary-bar" data-theme="escuro">
          <span className="ap-summary-bar-info">
            <DateBlock start={start} end={end} size="sm" />
            {price && <span className="ap-price-main">{price}</span>}
          </span>
          <Button size="sm" href={action.href} arrow={!off}>
            {status === "esgotado" ? "Lista de espera" : status === "encerrado" ? "Ver agenda" : "Inscrever"}
          </Button>
        </div>
      )}
    </>
  );
}
