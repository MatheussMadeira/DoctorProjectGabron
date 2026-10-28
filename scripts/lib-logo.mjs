// Ajuda dos scripts de imagem: monta o SVG de uma variante do logo (a partir de components/atoms/logo-geo.json) com as cores dadas.
import { readFileSync } from "node:fs";

const GEO = JSON.parse(readFileSync("components/atoms/logo-geo.json", "utf8"));

/** Cores do tema escuro (tokens logo-ink e logo-stone do tema escuro) e do claro. */
export const CORES = {
  negativo: { nome: "#f5ebdf", pedra: "#9bacbe" },
  colorido: { nome: "#28334f", pedra: "#9bacbe" },
};

function serializar(no, cores) {
  const a = { ...no.a };
  const cls = a.class;
  delete a.class;
  delete a["data-ordem"];
  if (cls === "rt-nome") a.fill = cores.nome;
  if (cls === "rt-pedra") a.fill = cores.pedra;
  if (cls === "rt-nome-traco") a.stroke = cores.nome;
  const attrs = Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join("");
  const filhos = (no.c ?? []).map((n) => serializar(n, cores)).join("");
  return filhos ? `<${no.t}${attrs}>${filhos}</${no.t}>` : `<${no.t}${attrs}/>`;
}

/** { svg, w, h }: o SVG pronto (fundo transparente) e a proporção da variante. */
export function svgDoLogo(variante, cores, largura) {
  const g = GEO[variante];
  const [, , w, h] = g.vb.split(" ").map(Number);
  const altura = largura ? Math.round((largura * h) / w) : h;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${g.vb}" width="${largura ?? w}" height="${altura}">${g.nos.map((n) => serializar(n, cores)).join("")}</svg>`;
  return { svg, w, h, largura: largura ?? w, altura };
}
