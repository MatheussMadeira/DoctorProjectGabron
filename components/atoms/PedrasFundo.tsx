"use client";

import { useRef, type CSSProperties } from "react";
import { cx } from "@/lib/cx";
import { useScrollProgress } from "@/lib/motion";
import geoJson from "./logo-geo.json";

/* As pedras vêm do símbolo do logo (logo-geo.json, variante "simbolo"): pedra-1..3 e a gota, de baixo para cima (data-ordem). */
interface No {
  t: string;
  a: Record<string, string>;
  c?: No[];
}
const SIMBOLO = (geoJson as unknown as Record<string, { vb: string; nos: No[] }>).simbolo;
const achatar = (nos: No[]): No[] => nos.flatMap((n) => [n, ...achatar(n.c ?? [])]);
const PEDRAS = achatar(SIMBOLO.nos)
  .filter((n) => n.t === "path" && n.a["data-ordem"])
  .sort((x, y) => Number(x.a["data-ordem"]) - Number(y.a["data-ordem"]));

export interface PedrasFundoProps {
  side?: "full" | "right";
  animated?: boolean;
  intro?: boolean;
  parallax?: boolean;
  className?: string;
}

/* Grafismo da marca: o símbolo ampliado. As pedras caem e se assentam (intro), andam mais devagar ao rolar (parallax) e flutuam. */
export function PedrasFundo({ side = "full", animated = true, intro = true, parallax = true, className }: PedrasFundoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const p = useScrollProgress(ref, animated && parallax);
  return (
    <div
      ref={ref}
      className={cx("ap-pedras", `ap-pedras-${side}`, animated && "ap-pedras-anim", animated && intro && "ap-pedras-intro", className)}
      aria-hidden="true"
    >
      <svg
        className="ap-pedras-svg"
        viewBox={SIMBOLO.vb}
        preserveAspectRatio="xMidYMid meet"
        style={{ transform: `translate3d(0, ${(p * 10).toFixed(2)}%, 0)` }}
      >
        {PEDRAS.map((pedra, i) => (
          <g key={i} className="ap-pedra-g" style={{ "--i": i } as CSSProperties}>
            <path d={pedra.a.d} style={{ animationDelay: -i * 2.2 + "s" }} />
          </g>
        ))}
      </svg>
    </div>
  );
}
