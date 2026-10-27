import { cx } from "@/lib/cx";
import { MESES, parseDate } from "@/lib/agenda";

export interface DateBlockProps {
  start?: string;
  end?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/* A data é o destaque: dia, mês e ano em Source Sans 3, nunca em Marcellus. */
export function DateBlock({ start, end, size = "md", className }: DateBlockProps) {
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
        {MESES[a.m]}
        {b && !sameMonth ? ` – ${String(b.d).padStart(2, "0")} ${MESES[b.m]}` : ""}
      </span>
      <span className="ap-date-year">{a.y}</span>
    </span>
  );
}
