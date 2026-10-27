import type { CSSProperties, ReactNode } from "react";
import styles from "./Grid.module.css";

export interface GridProps {
  /** Largura mínima de cada coluna, em px. As colunas se ajustam sozinhas à largura disponível. */
  minWidth?: number;
  gap?: 4 | 5 | 6 | 7;
  children: ReactNode;
}

/** Grade responsiva (cartões, depoimentos, blocos de informação). */
export function Grid({ minWidth = 320, gap = 6, children }: GridProps) {
  const style = { "--grid-min": `${minWidth}px`, "--grid-gap": `var(--space-${gap})` } as CSSProperties;
  return (
    <div className={styles.grid} style={style}>
      {children}
    </div>
  );
}
