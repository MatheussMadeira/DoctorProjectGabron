"use client";

import { useRef, type ReactNode } from "react";
import { STATUS, type EventStatus } from "@/lib/agenda";
import { useInView } from "@/lib/motion";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { DateBlock } from "../atoms/DateBlock";
import { EventMeta } from "../molecules/EventMeta";

/** Textos do resumo e da barra do celular. O padrão é o português (painel e /dev); o site passa os de messages ("Turma.*"). */
export interface EventSummaryRotulos {
  aria: string;
  vagas: string;
  esgotado: string;
  /** Modelo com {livres} e {total} (texto, não função: este objeto atravessa servidor → cliente). */
  disponiveis: string;
  progresso: string;
  entrarListaDeEspera: string;
  listaDeEspera: string;
  verAgenda: string;
  inscrever: string;
}

export const ROTULOS_RESUMO_PT: EventSummaryRotulos = {
  aria: "Resumo da turma",
  vagas: "Vagas",
  esgotado: "Esgotado",
  disponiveis: "{livres} de {total} disponíveis",
  progresso: "Vagas preenchidas",
  entrarListaDeEspera: "Entrar na lista de espera",
  listaDeEspera: "Lista de espera",
  verAgenda: "Ver agenda",
  inscrever: "Inscrever",
};

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
  statusLabel?: string;
  modalityLabel?: string;
  rotulos?: EventSummaryRotulos;
  action?: { label: string; href: string };
  secondary?: ReactNode;
  /** Barra fixa no rodapé da tela, só no celular. */
  bar?: boolean;
}

/* Resumo da data, fixo na lateral da página da turma; no celular vira uma barra no rodapé. */
export function EventSummary({ start, end, time, city, venue, modality = "Presencial", seatsTotal, seatsTaken, price, installment, status = "aberto", statusLabel, rotulos = ROTULOS_RESUMO_PT, action = { label: "Quero me inscrever", href: "#inscricao" }, secondary, bar = true }: EventSummaryProps) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, 0.3);
  const s = STATUS[status] || STATUS.aberto;
  const off = status === "esgotado" || status === "encerrado";
  const pct = seatsTotal ? Math.min(100, Math.round(((seatsTaken || 0) / seatsTotal) * 100)) : null;
  const left = seatsTotal ? Math.max(0, seatsTotal - (seatsTaken || 0)) : null;
  return (
    <>
      <aside ref={ref} className="ap-summary" aria-label={rotulos.aria}>
        <div className="ap-summary-top">
          <DateBlock start={start} end={end} size="lg" />
          <Badge tone={s.tone}>{statusLabel ?? s.label}</Badge>
        </div>
        <EventMeta time={time} city={city} venue={venue} modality={modality} />
        {pct != null && (
          <div className="ap-seats">
            <div className="ap-seats-row">
              <span>{rotulos.vagas}</span>
              <strong>{left === 0 ? rotulos.esgotado : rotulos.disponiveis.replace("{livres}", String(left ?? 0)).replace("{total}", String(seatsTotal ?? 0))}</strong>
            </div>
            <div className="ap-seats-track" role="progressbar" aria-valuemin={0} aria-valuemax={seatsTotal} aria-valuenow={seatsTaken || 0} aria-label={rotulos.progresso}>
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
          {status === "esgotado" ? rotulos.entrarListaDeEspera : action.label}
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
            {status === "esgotado" ? rotulos.listaDeEspera : status === "encerrado" ? rotulos.verAgenda : rotulos.inscrever}
          </Button>
        </div>
      )}
    </>
  );
}
