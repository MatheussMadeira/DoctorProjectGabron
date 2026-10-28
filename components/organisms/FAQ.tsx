"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";

export interface FAQProps {
  items: Array<{ q: string; a: ReactNode }>;
  defaultOpen?: number;
}

export function FAQ({ items = [], defaultOpen = 0 }: FAQProps) {
  const [open, setOpen] = useState(defaultOpen);
  const base = useId().replace(/:/g, "");
  return (
    <div className="ap-faq">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={i} className={cx("ap-faq-item", on && "is-open")}>
            <h3 className="ap-faq-q">
              <button type="button" aria-expanded={on} aria-controls={`${base}-${i}`} onClick={() => setOpen(on ? -1 : i)}>
                <span>{it.q}</span>
                <ChevronDown {...ICON} />
              </button>
            </h3>
            <div id={`${base}-${i}`} className="ap-faq-a" role="region">
              <div>
                <p>{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
