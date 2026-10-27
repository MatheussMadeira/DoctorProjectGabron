import { cx } from "@/lib/cx";

export interface SkeletonProps {
  variant?: "text" | "card" | "row";
  lines?: number;
  className?: string;
}

/* Blocos de espera nas cores da marca, enquanto as datas carregam. */
export function Skeleton({ variant = "text", lines = 3, className }: SkeletonProps) {
  if (variant === "card")
    return (
      <div className={cx("ap-skel-card", className)} aria-busy="true" aria-label="Carregando">
        <span className="ap-skel ap-skel-media" />
        <div className="ap-skel-pad">
          <span className="ap-skel ap-skel-line" style={{ width: "30%" }} />
          <span className="ap-skel ap-skel-title" />
          <span className="ap-skel ap-skel-line" />
          <span className="ap-skel ap-skel-line" style={{ width: "60%" }} />
        </div>
      </div>
    );
  if (variant === "row")
    return (
      <div className={cx("ap-skel-row", className)} aria-busy="true" aria-label="Carregando">
        <span className="ap-skel ap-skel-date" />
        <div>
          <span className="ap-skel ap-skel-title" style={{ width: "55%" }} />
          <span className="ap-skel ap-skel-line" style={{ width: "35%" }} />
        </div>
      </div>
    );
  return (
    <div className={cx("ap-skel-text", className)} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="ap-skel ap-skel-line" style={{ width: i === lines - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}
