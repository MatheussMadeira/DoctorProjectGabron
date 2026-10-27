import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./lists.module.css";

export interface StepItemProps {
  /** Ano ou número da etapa ("2018", "01"). */
  marker: string;
  title: ReactNode;
  children?: ReactNode;
  /** `md` para anos (trajetória); `lg` para números de etapa. */
  size?: "md" | "lg";
}

export function StepItem({ marker, title, children, size = "md" }: StepItemProps) {
  return (
    <div className={styles.step}>
      <span className={cx(styles.marker, size === "lg" ? styles.markerLg : styles.markerMd)}>{marker}</span>
      <div className={styles.copy}>
        <h3 className={styles.title}>{title}</h3>
        {children && <p className={styles.text}>{children}</p>}
      </div>
    </div>
  );
}
