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
  /** Altura do símbolo em unidades do viewBox (medida pelo gerador). */
  simboloAltura: number;
  /** Só nas variantes com linha de apoio: altura da letra maiúscula da linha e como ficar sem ela. */
  linha?: { cap: number; vbSem?: string; fallback?: LogoVariant };
}
const GEO = geoJson as unknown as Record<string, Geo>;

export type LogoVariant = "horizontal" | "compacta" | "vertical" | "selo" | "simbolo";

/** Regras do kit, valem em todo lugar onde o logo aparece:
    - a linha de apoio ("Toxina botulínica na reabilitação") só é desenhada quando a letra dela fica com 11 px ou mais de altura;
      abaixo disso o logo sai sem a linha (a horizontal vira a compacta; a vertical perde a linha e o espaço dela);
    - o símbolo precisa ter pelo menos 24 px de altura (a variante compacta é ajustada no gerador para isso, a partir de 140 px). */
export const ALTURA_MINIMA_DA_LETRA_DA_LINHA_PX = 11;
export const ALTURA_MINIMA_DO_SIMBOLO_PX = 24;

const larguraDoViewBox = (vb: string) => Number(vb.split(" ")[2]);

/** Largura (px) a partir da qual a linha de apoio da variante tem letra legível. Infinity se a variante não tem linha. */
export function larguraMinimaDaLinha(variant: LogoVariant): number {
  const g = GEO[variant];
  if (!g?.linha) return Infinity;
  return (ALTURA_MINIMA_DA_LETRA_DA_LINHA_PX * larguraDoViewBox(g.vb)) / g.linha.cap;
}

/** Altura (px) do símbolo da variante quando o logo tem a largura dada. */
export function alturaDoSimboloPx(variant: LogoVariant, largura: number): number {
  const g = GEO[variant];
  return (g.simboloAltura * largura) / larguraDoViewBox(g.vb);
}

/** Qual desenho usar: a variante pedida ou, sem espaço para a linha de apoio, a versão sem ela. Sem largura em número (tamanho por CSS), mantém a pedida. */
export function resolverLogo(variant: LogoVariant, largura?: number | string): { variant: LogoVariant; vb: string; semLinha: boolean } {
  const g = GEO[variant] ?? GEO.horizontal;
  const numero = typeof largura === "number" ? largura : undefined;
  if (g.linha && numero !== undefined && numero < larguraMinimaDaLinha(variant)) {
    if (g.linha.fallback) return { variant: g.linha.fallback, vb: GEO[g.linha.fallback].vb, semLinha: true };
    if (g.linha.vbSem) return { variant, vb: g.linha.vbSem, semLinha: true };
  }
  return { variant, vb: g.vb, semLinha: false };
}

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

function desenhar(nos: No[], semLinha = false): ReactNode[] {
  return nos
    .filter((n) => !(semLinha && n.a.id === "linha-de-apoio"))
    .map((n, i) => createElement(n.t, propsDe(n.a, i), ...(n.c ? desenhar(n.c, semLinha) : [])));
}

export function Logo({ variant = "horizontal", mono = false, animated = false, width, className, style, title = "ReabToxin" }: LogoProps) {
  const r = resolverLogo(variant, width);
  const g = GEO[r.variant] ?? GEO.horizontal;
  return (
    <svg
      className={cx("ap-logo", mono && "ap-logo-mono", animated && "ap-logo-intro", className)}
      viewBox={r.vb}
      width={width}
      style={style}
      role="img"
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {desenhar(g.nos, r.semLinha)}
    </svg>
  );
}
