import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface SectionHeadingProps {
  number?: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}

/* O fio curto em accent com número e rótulo é a assinatura das páginas do manual. */
export function SectionHeading({ number, eyebrow, title, lead, align = "left", as: H = "h2", className }: SectionHeadingProps) {
  return (
    <header className={cx("ap-sh", `ap-sh-${align}`, className)}>
      {(number || eyebrow) && (
        <div className="ap-sh-meta">
          {number && <span className="ap-sh-num">{number}</span>}
          <span className="ap-sh-rule" aria-hidden="true" />
          {eyebrow && <span className="ap-eyebrow">{eyebrow}</span>}
        </div>
      )}
      <H className="ap-sh-title">{title}</H>
      {lead && <p className="ap-lead">{lead}</p>}
    </header>
  );
}
