import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./layouts.module.css";

export interface MainAsideProps {
  main: ReactNode;
  aside: ReactNode;
  mainBasis?: number;
  asideBasis?: number;
  /** Quanto a coluna principal cresce em relação à lateral (999 = ocupa quase todo o espaço). */
  mainGrow?: number;
  /** A lateral acompanha a rolagem (resumo da turma). */
  sticky?: boolean;
}

/** Conteúdo principal com uma lateral. No celular a lateral vai para baixo. */
export function MainAside({ main, aside, mainBasis = 560, asideBasis = 380, mainGrow = 1, sticky = false }: MainAsideProps) {
  const style = { "--main-basis": `${mainBasis}px`, "--aside-basis": `${asideBasis}px`, "--main-grow": mainGrow } as CSSProperties;
  return (
    <div className={styles.mainAside} style={style}>
      <div className={styles.main}>{main}</div>
      <aside className={cx(styles.aside, sticky && styles.sticky)}>{aside}</aside>
    </div>
  );
}
