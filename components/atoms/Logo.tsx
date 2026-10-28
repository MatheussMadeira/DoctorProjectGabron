import { createElement, type CSSProperties, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import geoJson from "./logo-geo.json";

/* COMO TROCAR O LOGO: só os vetores. Ponha os SVGs novos em public/logos/web/ (mesmos nomes do kit) e rode
     node scripts/gerar-logo-geo.mjs && node scripts/gerar-logo-email.mjs && node scripts/gerar-og.mjs
   Os SVGs do kit têm camadas separadas: <g id="simbolo"> (pedra-1..3 e gota, com data-ordem), <g id="nome"> (reab, ponto, toxin)
   e, quando há, <g id="linha-de-apoio">. O gerador converte isso em logo-geo.json e este componente só desenha o JSON:
   quem usa <Logo> não muda. A cor vem do tema: `rt-nome` usa --rt-nome (= --logo-ink) e `rt-pedra` usa --rt-pedra (= --logo-stone),
   definidas em .ap-logo (bundle.css), então o logo recolore sozinho no tema claro e no escuro (e em `mono`). */

interface No {
  t: string;
  a: Record<string, string>;
  c?: No[];
}
interface Geo {
  vb: string;
  nos: No[];
}
const GEO = geoJson as unknown as Record<string, Geo>;

export type LogoVariant = "horizontal" | "compacta" | "vertical" | "selo" | "simbolo";

export interface LogoProps {
  /** "compacta" (sem linha de apoio) é a do Header e do painel; "horizontal" e "vertical" levam a linha de apoio. */
  variant?: LogoVariant;
  mono?: boolean;
  animated?: boolean;
  width?: number | string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/** Atributos do SVG → props do React. O `id` do arquivo vira `data-camada` (vários logos na mesma página não podem repetir id). */
function propsDe(a: Record<string, string>, chave: number): Record<string, unknown> {
  const p: Record<string, unknown> = { key: chave };
  for (const [k, v] of Object.entries(a)) {
    if (k === "id") p["data-camada"] = v;
    else if (k === "class") p.className = v;
    else if (k === "stroke-width") p.strokeWidth = v;
    else if (k === "data-ordem") {
      p["data-ordem"] = v;
      // As pedras caem de baixo para cima: pedra-1 primeiro, gota por último.
      p.style = { "--i": Number(v) - 1 } as CSSProperties;
    } else p[k] = v;
  }
  return p;
}

function desenhar(nos: No[]): ReactNode[] {
  return nos.map((n, i) => createElement(n.t, propsDe(n.a, i), ...(n.c ? desenhar(n.c) : [])));
}

export function Logo({ variant = "horizontal", mono = false, animated = false, width, className, style, title = "ReabToxin" }: LogoProps) {
  const g = GEO[variant] ?? GEO.horizontal;
  return (
    <svg
      className={cx("ap-logo", mono && "ap-logo-mono", animated && "ap-logo-intro", className)}
      viewBox={g.vb}
      width={width}
      style={style}
      role="img"
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {desenhar(g.nos)}
    </svg>
  );
}
