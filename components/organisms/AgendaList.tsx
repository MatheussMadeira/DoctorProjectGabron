"use client";

import { useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import { STATUS, parseDate, type EventStatus } from "@/lib/agenda";
import { mesEAno } from "@/lib/datas";
import { AppLink } from "../atoms/AppLink";
import { useIdioma } from "../atoms/IdiomaProvider";
import { Badge } from "../atoms/Badge";
import { DateBlock } from "../atoms/DateBlock";
import { Skeleton } from "../atoms/Skeleton";
import { EventMeta } from "../molecules/EventMeta";
import { Tabs } from "../molecules/Tabs";

export interface AgendaEvent {
  id?: string | number;
  title: string;
  start: string;
  end?: string;
  time?: string;
  city?: string;
  venue?: string;
  modality?: string;
  /** Rótulo de exibição da modalidade (filtro e linha); `modality` é o valor lógico. */
  modalityLabel?: string;
  status?: EventStatus;
  statusLabel?: string;
  href?: string;
  [k: string]: unknown;
}

export interface AgendaListProps {
  events: AgendaEvent[];
  filterBy?: string;
  allLabel?: string;
  emptyText?: string;
  /** Título do grupo de datas sem data. */
  noDateLabel?: string;
  /** Nome acessível do filtro (aria-label das abas). */
  filterLabel?: string;
  loading?: boolean;
}

type Group = { k: string; label: string; items: AgendaEvent[] };

/* A agenda: datas agrupadas por mês, com filtro. Ao filtrar, a lista entra de novo, escalonada. */
const TODOS = "__todos__";

export function AgendaList({ events = [], filterBy = "modality", allLabel = "Todos", emptyText = "Nenhuma data com este filtro. Novas turmas aparecem aqui assim que forem abertas.", noDateLabel = "Sem data", filterLabel = "Filtrar", loading = false }: AgendaListProps) {
  const locale = useIdioma();
  const opts = Array.from(new Set(events.map((e) => e[filterBy] as string | undefined).filter(Boolean))) as string[];
  const [f, setF] = useState(TODOS);
  const rotuloDe = (valor: string) => (events.find((e) => e[filterBy] === valor)?.[`${filterBy}Label`] as string | undefined) ?? valor;
  const list = events
    .filter((e) => f === TODOS || e[filterBy] === f)
    .slice()
    .sort((x, y) => String(x.start || "9").localeCompare(String(y.start || "9")));
  const groups: Group[] = [];
  list.forEach((e) => {
    const d = parseDate(e.start);
    const k = d ? `${d.y}-${d.m}` : "—";
    let g = groups.find((x) => x.k === k);
    if (!g) {
      g = { k, label: d ? mesEAno(d.y, d.m, locale) : noDateLabel, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  });
  let n = 0;
  return (
    <div className="ap-agenda">
      {opts.length > 1 && (
        <Tabs
          value={f}
          onChange={setF}
          label={filterLabel}
          items={[
            { value: TODOS, label: allLabel, count: events.length },
            ...opts.map((o) => ({ value: o, label: rotuloDe(o), count: events.filter((e) => e[filterBy] === o).length })),
          ]}
        />
      )}
      {loading ? (
        <div className="ap-agenda-list">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="row" />
          ))}
        </div>
      ) : (
        <div className="ap-agenda-list" key={f}>
          {!list.length && <p className="ap-agenda-empty">{emptyText}</p>}
          {groups.map((g) => (
            <section key={g.k} className="ap-agenda-month">
              <h2 className="ap-agenda-month-title">{g.label}</h2>
              {g.items.map((e, i) => {
                const s = STATUS[e.status as EventStatus] || STATUS.aberto;
                const d = n++;
                return (
                  <AppLink
                    key={e.id ?? i}
                    href={e.href || "#"}
                    className={cx("ap-agenda-row", (e.status === "esgotado" || e.status === "encerrado") && "is-off")}
                    style={{ "--d": Math.min(d, 6) * 70 + "ms" } as CSSProperties}
                  >
                    <DateBlock start={e.start} end={e.end} size="sm" />
                    <span className="ap-agenda-main">
                      <span className="ap-agenda-title">{e.title}</span>
                      <EventMeta time={e.time} city={e.city} venue={e.venue} modality={e.modality} />
                    </span>
                    <Badge tone={s.tone}>{e.statusLabel ?? s.label}</Badge>
                    <ArrowRight {...ICON} className="ap-agenda-arrow" />
                  </AppLink>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
