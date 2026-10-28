"use client";

import { cx } from "@/lib/cx";
import { parseDate } from "@/lib/agenda";
import { mesCurto } from "@/lib/datas";
import { useIdioma } from "./IdiomaProvider";

export interface DateBlockProps {
  start?: string;
  end?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/* A data é o destaque: dia, mês e ano em Source Sans 3, nunca em Marcellus. O mês vem do idioma da página. */
export function DateBlock({ start, end, size = "md", className }: DateBlockProps) {
  const locale = useIdioma();
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a) return null;
  const sameMonth = b && b.m === a.m;
  return (
    <span className={cx("ap-date", `ap-date-${size}`, className)}>
      <span className="ap-date-day">
        {String(a.d).padStart(2, "0")}
        {b && sameMonth ? `–${String(b.d).padStart(2, "0")}` : ""}
      </span>
      <span className="ap-date-month">
        {mesCurto(a.m, locale)}
        {b && !sameMonth ? ` – ${String(b.d).padStart(2, "0")} ${mesCurto(b.m, locale)}` : ""}
      </span>
      <span className="ap-date-year">{a.y}</span>
    </span>
  );
}
