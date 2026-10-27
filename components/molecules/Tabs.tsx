"use client";

import { useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { useIsoLayoutEffect } from "@/lib/motion";

export type TabItem = string | { value: string; label: string; count?: number };

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
}

/* Abas com indicador que desliza até a aba ativa. */
export function Tabs({ items = [], value, onChange, label = "Filtrar", className }: TabsProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ left: 0, width: 0 });
  useIsoLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, items.length]);
  return (
    <div ref={wrap} className={cx("ap-tabs", className)} role="tablist" aria-label={label}>
      {items.map((it) => {
        const v = typeof it === "string" ? it : it.value;
        const l = typeof it === "string" ? it : it.label;
        const count = typeof it === "string" ? undefined : it.count;
        return (
          <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange?.(v)}>
            {l}
            {count != null && <span className="ap-tabs-count">{count}</span>}
          </button>
        );
      })}
      <span className="ap-tabs-bar" style={{ transform: `translateX(${bar.left}px)`, width: bar.width }} aria-hidden="true" />
    </div>
  );
}
