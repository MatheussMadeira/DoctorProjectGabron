import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import { AppLink } from "./AppLink";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  href?: string;
  arrow?: boolean;
  icon?: ReactNode;
  full?: boolean;
}

export function Button({ variant = "primary", size = "md", href, arrow = false, icon, full = false, className, children, ...rest }: ButtonProps) {
  const cls = cx("ap-btn", `ap-btn-${variant}`, `ap-btn-${size}`, full && "ap-btn-full", className);
  const inner = (
    <>
      {icon && <span className="ap-btn-icon">{icon}</span>}
      <span className="ap-btn-label">{children}</span>
      {arrow && <ArrowRight {...ICON} size={18} className="ap-btn-arrow" />}
    </>
  );
  if (href) {
    return (
      <AppLink href={href} className={cls}>
        {inner}
      </AppLink>
    );
  }
  return (
    <button {...rest} type={rest.type || "button"} className={cls}>
      {inner}
    </button>
  );
}
