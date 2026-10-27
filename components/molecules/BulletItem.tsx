import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import styles from "./lists.module.css";

export interface BulletItemProps {
  /** `dot`: ponto em `accent` (forma, não texto). `check`: marca em `accent-ink`. */
  variant?: "dot" | "check";
  children: ReactNode;
}

export function BulletItem({ variant = "dot", children }: BulletItemProps) {
  return (
    <div className={cx(styles.bullet, variant === "dot" && styles.dotRow)}>
      {variant === "dot" ? <span className={styles.dot} aria-hidden="true" /> : <Check {...ICON} className={styles.check} />}
      <span>{children}</span>
    </div>
  );
}
