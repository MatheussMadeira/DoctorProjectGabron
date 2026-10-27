import type { ReactNode } from "react";
import styles from "./lists.module.css";

export interface InfoCardProps {
  icon?: ReactNode;
  title: ReactNode;
  children: ReactNode;
}

/** Bloco de informação com fio no topo (endereço, horário, atendimento). */
export function InfoCard({ icon, title, children }: InfoCardProps) {
  return (
    <div className={styles.info}>
      {icon && <span className={styles.infoIcon}>{icon}</span>}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.text}>{children}</p>
    </div>
  );
}
