import { Children, type CSSProperties, type ReactNode } from "react";
import { Reveal } from "../atoms/Reveal";
import { cx } from "@/lib/cx";
import styles from "./lists.module.css";

export interface ItemListProps {
  /** `stack`: itens em coluna, com fio entre eles. `grid`: itens em colunas que se ajustam à largura. */
  variant?: "stack" | "grid";
  /** Lista numerada (`<ol>`), por exemplo etapas e linha do tempo. */
  ordered?: boolean;
  /** Largura mínima de cada coluna, em px, quando `variant="grid"`. */
  minWidth?: number;
  /** Intervalo da entrada escalonada, em ms (0 / 120 / 240… no máximo 4 passos). */
  step?: number;
  className?: string;
  children: ReactNode;
}

/** Lista de itens com fios finos (`line`) e entrada escalonada ao rolar. Cada filho vira um `<li>`. */
export function ItemList({ variant = "stack", ordered = false, minWidth = 320, step = 120, className, children }: ItemListProps) {
  const Tag = ordered ? "ol" : "ul";
  const style = variant === "grid" ? ({ "--item-min": `${minWidth}px` } as CSSProperties) : undefined;
  return (
    <Tag className={cx(styles.list, styles[variant], className)} style={style}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={i} as="li" delay={Math.min(i, 3) * step} className={styles.item}>
          {child}
        </Reveal>
      ))}
    </Tag>
  );
}
