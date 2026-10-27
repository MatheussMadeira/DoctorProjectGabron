import { Children, type CSSProperties, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./layouts.module.css";

export interface SplitLayoutProps {
  /** Dois filhos: as duas colunas, na ordem em que aparecem no desktop. */
  children: ReactNode;
  /** Alinhamento vertical das colunas. */
  align?: "center" | "start";
  /** No celular, a segunda coluna sobe acima da primeira (foto antes do texto). */
  reverse?: boolean;
  /** Largura de partida de cada coluna, em px. A coluna de texto costuma ter 440 e a da foto 400. */
  basis?: [number, number];
}

/** Duas colunas que se empilham quando faltam 440px: texto de um lado, foto ou lista do outro. */
export function SplitLayout({ children, align = "center", reverse = false, basis = [440, 400] }: SplitLayoutProps) {
  const cols = Children.toArray(children);
  return (
    <div className={cx(styles.split, align === "start" && styles.start, reverse && styles.reverse)}>
      {cols.map((c, i) => (
        <div key={i} className={styles.col} style={{ "--basis": `${basis[i] ?? basis[0]}px` } as CSSProperties}>
          {c}
        </div>
      ))}
    </div>
  );
}
