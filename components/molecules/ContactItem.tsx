import type { ReactNode } from "react";
import styles from "./lists.module.css";

export interface ContactItemProps {
  icon: ReactNode;
  children: ReactNode;
}

/** Um canal de contato: ícone e link (ou texto). */
export function ContactItem({ icon, children }: ContactItemProps) {
  return (
    <div className={styles.contact}>
      <span className={styles.contactIcon}>{icon}</span>
      {children}
    </div>
  );
}
