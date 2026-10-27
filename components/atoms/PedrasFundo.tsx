"use client";

import { useRef, type CSSProperties } from "react";
import { cx } from "@/lib/cx";
import { useScrollProgress } from "@/lib/motion";
import geoJson from "./logo-geo.json";
import { stoneStep } from "./Logo";

type Geo = { w: number; h: number; p: Array<[string, string]> };
const STONES = (geoJson as unknown as Record<string, Geo>)["simbolo-azul-claro"];

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
        viewBox={`0 0 ${STONES.w} ${STONES.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ transform: `translate3d(0, ${(p * 10).toFixed(2)}%, 0)` }}
      >
        {STONES.p.map(([, d], i) => (
          <g key={i} className="ap-pedra-g" style={{ "--i": stoneStep(i) } as CSSProperties}>
            <path d={d} style={{ animationDelay: -i * 2.2 + "s" }} />
          </g>
        ))}
      </svg>
    </div>
  );
}
