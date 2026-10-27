import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import geoJson from "./logo-geo.json";

type Geo = { w: number; h: number; p: Array<[string, string]> };
const GEO = geoJson as unknown as Record<string, Geo>;

const GEO_KEY = {
  horizontal: "logo-horizontal",
  vertical: "logo-vertical",
  selo: "logo-selo",
  simbolo: "simbolo-azul-claro",
} as const;

/* Ordem de baixo para cima das pedras no arquivo do símbolo: 0 = base, 2 = terceira, 1 = segunda, 3 = topo. */
const STACK_ORDER = [0, 2, 1, 3];
export const stoneStep = (k: number) => STACK_ORDER.indexOf(k % 4);

export interface LogoProps {
  variant?: keyof typeof GEO_KEY;
  mono?: boolean;
  animated?: boolean;
  width?: number | string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function Logo({
  variant = "horizontal",
  mono = false,
  animated = false,
  width,
  className,
  style,
  title = "Dra. Ana Paula Fonseca — Médica Fisiatra",
}: LogoProps) {
  const g = GEO[GEO_KEY[variant]] || GEO["logo-horizontal"];
  /* Índice de cada pedra ("s") entre as pedras, para escalonar a animação. */
  const stoneIndex = g.p.map(([r], i) => (r === "s" ? g.p.slice(0, i).filter(([x]) => x === "s").length : -1));
  return (
    <svg
      className={cx("ap-logo", mono && "ap-logo-mono", animated && "ap-logo-intro", className)}
      viewBox={`0 0 ${g.w} ${g.h}`}
      width={width}
      style={style}
      role="img"
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {g.p.map(([r, d], i) => {
        if (r === "s") {
          return <path key={i} className="ap-logo-s" d={d} style={{ "--i": stoneStep(stoneIndex[i]) } as CSSProperties} />;
        }
        return <path key={i} className="ap-logo-i" d={d} />;
      })}
    </svg>
  );
}
