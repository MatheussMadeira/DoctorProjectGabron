"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { useInView } from "@/lib/motion";

export interface RevealProps {
  delay?: number;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/* Bloco que entra ao rolar: fade + 24px. Escalone grades com 0 / 120 / 240ms. */
export function Reveal({ delay = 0, as: Tag = "div", className, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const shown = useInView(ref, 0.15);
  return (
    <Tag ref={ref} className={cx("ap-reveal", shown && "is-in", className)} style={{ transitionDelay: delay + "ms" }}>
      {children}
    </Tag>
  );
}
