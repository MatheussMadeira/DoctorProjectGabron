import type { ReactNode } from "react";
import styles from "../admin.module.css";

/** Cartão de uma seção do painel, com título. */
export function AdminCard({ titulo, children }: { titulo?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.card}>
      {titulo && <h2 className={styles.titulo}>{titulo}</h2>}
      {children}
    </section>
  );
}

/** Indicador do painel: rótulo, número grande (Source Sans 3, nunca Marcellus) e nota. */
export function KpiCard({ rotulo, valor, nota }: { rotulo: string; valor: ReactNode; nota?: string }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiRotulo}>{rotulo}</span>
      <span className={styles.kpiValor}>{valor}</span>
      {nota && <span className={styles.nota}>{nota}</span>}
    </div>
  );
}
