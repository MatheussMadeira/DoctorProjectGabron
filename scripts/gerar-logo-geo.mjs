// Gera components/atoms/logo-geo.json a partir dos SVGs em camadas de public/logos/web/ (o kit do logo).
// TROCAR O LOGO = colocar os SVGs novos em public/logos/web/ (mesmos nomes) e rodar:
//   node scripts/gerar-logo-geo.mjs && node scripts/gerar-logo-email.mjs && node scripts/gerar-og.mjs
// Convenção dos SVGs (ver public/logos/LEIA-ME.md): <g id="simbolo"> (pedra-1..3 e gota, com data-ordem), <g id="nome"> e,
// quando existe, <g id="linha-de-apoio">. Classes: rt-nome (texto), rt-nome-traco (anéis do selo) e rt-pedra (pedras e ponto).
// O componente <Logo> só desenha o que está no JSON e recolore pelas variáveis --rt-nome e --rt-pedra (tema claro/escuro).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pasta = "public/logos/web";
const VARIANTES = { horizontal: "reabtoxin-horizontal", compacta: "reabtoxin-horizontal-compacta", vertical: "reabtoxin-vertical", selo: "reabtoxin-selo", simbolo: "reabtoxin-simbolo" };

function atributos(texto) {
  const a = {};
  for (const m of texto.matchAll(/([\w:-]+)="([^"]*)"/g)) a[m[1]] = m[2];
  return a;
}

/** Lê o SVG (só g, path e circle, sem texto) e devolve { vb, nos } com a árvore de elementos. */
function ler(svg) {
  const semEstilo = svg.replace(/<style>[\s\S]*?<\/style>/g, "");
  const raiz = semEstilo.match(/<svg([^>]*)>/);
  const vb = atributos(raiz[1]).viewBox;
  const corpo = semEstilo.slice(raiz.index + raiz[0].length, semEstilo.lastIndexOf("</svg>"));
  const pilha = [{ c: [] }];
  for (const m of corpo.matchAll(/<(\/?)(\w+)([^>]*?)(\/?)>/g)) {
    const [, fecha, tag, resto, autoFecha] = m;
    if (fecha) {
      pilha.pop();
      continue;
    }
    const no = { t: tag, a: atributos(resto) };
    const topo = pilha[pilha.length - 1];
    (topo.c ??= []).push(no);
    if (!autoFecha) pilha.push(no);
  }
  return { vb, nos: pilha[0].c };
}

const saida = {};
for (const [chave, arquivo] of Object.entries(VARIANTES)) {
  saida[chave] = ler(readFileSync(join(pasta, `${arquivo}.svg`), "utf8"));
}
const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".svg"));
writeFileSync("components/atoms/logo-geo.json", JSON.stringify(saida));
console.log(`ok: ${Object.keys(saida).join(", ")} (de ${arquivos.length} SVGs em ${pasta})`);
