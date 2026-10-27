"use client";

import { useRef, type CSSProperties } from "react";
import { Clock } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import { useReducedMotion, useScrollProgress } from "@/lib/motion";

export interface ScheduleItem {
  time?: string;
  title: string;
  description?: string;
  duration?: string;
}

export interface ScheduleProps {
  items: ScheduleItem[];
  title?: string;
}

/* Programação em linha do tempo. A linha vertical se preenche conforme a pessoa rola. */
export function Schedule({ items = [], title }: ScheduleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const p = useScrollProgress(ref);
  const still = useReducedMotion();
  return (
    <div ref={ref} className="ap-schedule" style={{ "--p": still ? 1 : p } as CSSProperties}>
      {title && <p className="ap-eyebrow ap-schedule-title">{title}</p>}
      <ol>
        {items.map((m, i) => {
          const on = still || p >= (i + 0.35) / items.length;
          return (
            <li key={i} className={cx("ap-schedule-item", on && "is-on")}>
              <span className="ap-schedule-dot" aria-hidden="true" />
              <span className="ap-schedule-when">{m.time || String(i + 1).padStart(2, "0")}</span>
              <div>
                <h4 className="ap-schedule-name">{m.title}</h4>
                {m.description && <p className="ap-schedule-desc">{m.description}</p>}
              </div>
              {m.duration && (
                <span className="ap-schedule-dur">
                  <Clock {...ICON} size={16} />
                  {m.duration}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
