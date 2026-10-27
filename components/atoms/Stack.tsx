import type { CSSProperties, ElementType, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Stack.module.css";

type Space = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface StackProps {
  /** Espaço entre os filhos, em passos de `--space-N`. */
  gap?: Space;
  /** Espaço entre linhas, quando `row` quebra. Padrão: igual a `gap`. */
  rowGap?: Space;
  /** Em linha (flex-direction: row), em vez de coluna. */
  row?: boolean;
  wrap?: boolean;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/** Primitivo de layout: empilha (ou alinha em linha) os filhos com o espaçamento dos tokens. */
export function Stack({ gap = 4, rowGap, row = false, wrap = false, align, justify, as: Tag = "div", className, children }: StackProps) {
  const style = {
    "--stack-gap": `var(--space-${gap})`,
    "--stack-row-gap": `var(--space-${rowGap ?? gap})`,
  } as CSSProperties;
  return (
    <Tag
      className={cx(styles.stack, row && styles.row, wrap && styles.wrap, align && styles[`a-${align}`], justify && styles[`j-${justify}`], className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
