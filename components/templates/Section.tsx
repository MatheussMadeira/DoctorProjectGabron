import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { PedrasFundo } from "../atoms/PedrasFundo";

export interface SectionProps {
  /** Força o tema da seção (seções de marca em azul-escuro dentro do tema claro). */
  theme?: "claro" | "escuro";
  background?: "surface" | "sunken" | "raised";
  pedras?: boolean;
  /** Container estreito (760px) para texto longo, formulários e FAQ. */
  narrow?: boolean;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function Section({ theme, background = "surface", pedras = false, narrow = false, id, className, children }: SectionProps) {
  return (
    <section id={id} data-theme={theme} className={cx("ap-section", `ap-bg-${background}`, className)}>
      {pedras && <PedrasFundo side="right" />}
      <div className={cx("ap-container", narrow && "ap-container-narrow")}>{children}</div>
    </section>
  );
}
