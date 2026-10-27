import type { ReactNode } from "react";
import { AlertTriangle, CircleAlert, CircleCheck, Info } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";

const ALERT_ICON = { info: Info, success: CircleCheck, warning: AlertTriangle, danger: CircleAlert } as const;

export interface AlertProps {
  tone?: "info" | "success" | "warning" | "danger";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const I = ALERT_ICON[tone] || Info;
  return (
    <div className={cx("ap-alert", `ap-alert-${tone}`, className)} role={tone === "danger" ? "alert" : "status"}>
      <I {...ICON} />
      <div>
        {title && <p className="ap-alert-title">{title}</p>}
        {children && <div className="ap-alert-body">{children}</div>}
      </div>
    </div>
  );
}
