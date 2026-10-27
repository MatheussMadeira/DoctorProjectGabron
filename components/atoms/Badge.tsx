import type { ReactNode } from "react";
import { AlertTriangle, CircleAlert, CircleCheck } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import type { Tone } from "@/lib/agenda";

const BADGE_ICON = { success: CircleCheck, warning: AlertTriangle, danger: CircleAlert } as const;

export interface BadgeProps {
  tone?: Tone;
  icon?: boolean;
  children?: ReactNode;
  className?: string;
}

/* Status sempre com ícone e palavra juntos, nunca só pela cor. */
export function Badge({ tone = "neutral", icon, children, className }: BadgeProps) {
  const I = tone in BADGE_ICON ? BADGE_ICON[tone as keyof typeof BADGE_ICON] : null;
  return (
    <span className={cx("ap-badge", `ap-badge-${tone}`, className)}>
      {icon !== false && I && <I {...ICON} size={14} />}
      {children}
    </span>
  );
}
