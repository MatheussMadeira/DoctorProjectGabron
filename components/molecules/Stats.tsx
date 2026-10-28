"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cx } from "@/lib/cx";
import { reducedMotion, useInView } from "@/lib/motion";
import { IDIOMAS } from "@/lib/i18n/idiomas";
import { useIdioma } from "../atoms/IdiomaProvider";

const PARTS = /^(\D*)(\d[\d.]*)(.*)$/;

/* Conta de 0 até o valor quando aparece. Mantém prefixo/sufixo ("+300", "15 anos") e zeros à esquerda ("00"). */
function CountUp({ value, run, duration = 1600 }: { value: string; run: boolean; duration?: number }) {
  const locale = useIdioma();
  const [k, setK] = useState(0); // progresso de 0 a 1, atualizado só dentro do requestAnimationFrame
  const m = value.match(PARTS);

  useEffect(() => {
    if (!run || !m) return;
    const ms = reducedMotion() ? 0 : duration;
    let raf = 0;
    let t0 = 0;
    const step = (t: number) => {
      t0 = t0 || t;
      const p = ms ? Math.min(1, (t - t0) / ms) : 1;
      setK(1 - Math.pow(1 - p, 4));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, value, duration, m]);

  if (!m) return <>{value}</>;
  const [, pre, num, post] = m;
  const digits = num.replace(/\./g, "");
  const n = Math.round(parseInt(digits, 10) * k);
  const text = n >= 1000 ? n.toLocaleString(IDIOMAS[locale].intl) : String(n).padStart(digits.length, "0");
  return <>{pre + text + post}</>;
}

export interface StatsProps {
  items: Array<{ value: string; label: string }>;
  animated?: boolean;
}

export function Stats({ items = [], animated = true }: StatsProps) {
  const ref = useRef<HTMLDListElement>(null);
  const seen = useInView(ref, 0.4);
  return (
    <dl ref={ref} className={cx("ap-stats", seen && "is-in")}>
      {items.map((s, i) => (
        <div key={i} className="ap-stat" style={{ "--d": i * 120 + "ms" } as CSSProperties}>
          <dt>{s.label}</dt>
          <dd>{animated ? <CountUp value={s.value} run={seen} /> : s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
