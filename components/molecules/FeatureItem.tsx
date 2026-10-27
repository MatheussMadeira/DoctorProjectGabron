import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./lists.module.css";

export interface FeatureItemProps {
  /** Ícone Lucide (traço 1,5), decorativo. */
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  /** Menos respiro vertical, para listas sem ícone. */
  compact?: boolean;
}

export function FeatureItem({ icon, title, children, compact = false }: FeatureItemProps) {
  return (
    <div className={cx(styles.feature, compact && styles.compact)}>
      {icon && <span className={styles.featureIcon}>{icon}</span>}
      <div className={styles.copy}>
        <h3 className={styles.title}>{title}</h3>
        {children && <p className={styles.text}>{children}</p>}
      </div>
    </div>
  );
}
