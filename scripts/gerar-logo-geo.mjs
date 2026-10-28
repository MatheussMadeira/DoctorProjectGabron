// Gera components/atoms/logo-geo.json a partir dos SVGs em camadas de public/logos/web/ (o kit do logo).
// TROCAR O LOGO = colocar os SVGs novos em public/logos/web/ (mesmos nomes) e rodar:
//   node scripts/gerar-logo-geo.mjs && node scripts/gerar-logo-email.mjs && node scripts/gerar-og.mjs
// Convenção dos SVGs (ver public/logos/LEIA-ME.md): <g id="simbolo"> (pedra-1..3 e gota, com data-ordem), <g id="nome"> e,
// quando existe, <g id="linha-de-apoio">. Classes: rt-nome (texto), rt-nome-traco (anéis do selo) e rt-pedra (pedras e ponto).
// O componente <Logo> só desenha o que está no JSON e recolore pelas variáveis --rt-nome e --rt-pedra (tema claro/escuro).
//
// Além dos desenhos, o gerador mede o logo no navegador e grava no JSON o que o componente precisa para aplicar as regras do kit:
//   - simboloAltura: altura do símbolo em unidades do viewBox (regra: símbolo com no mínimo 24 px de altura);
//   - linha: { cap, vbSem?, fallback? } nas variantes com linha de apoio: altura da letra maiúscula da linha (unidades) e como
//     ficar sem ela (viewBox sem a linha, ou outra variante). O <Logo> só mostra a linha quando a letra fica com 11 px ou mais.
//   - A variante "compacta" é ajustada aqui: o símbolo é ampliado (sem distorcer) até ter 24 px de altura na menor largura de uso
//     (140 px, o Header no celular), e o nome é deslocado na mesma medida. As pedras não se reposicionam entre si.
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pasta = "public/logos/web";
const VARIANTES = { horizontal: "reabtoxin-horizontal", compacta: "reabtoxin-horizontal-compacta", vertical: "reabtoxin-vertical", selo: "reabtoxin-selo", simbolo: "reabtoxin-simbolo" };

/** Regras do kit usadas aqui. */
const ALTURA_MIN_SIMBOLO_PX = 24;
const LARGURA_MIN_COMPACTA_PX = 140;

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
for (const [chave, arquivo] of Object.entries(VARIANTES)) saida[chave] = ler(readFileSync(join(pasta, `${arquivo}.svg`), "utf8"));

const serializar = (n, pintar = "#000") => {
  const a = Object.entries(n.a).filter(([k]) => k !== "class" && k !== "data-ordem").map(([k, v]) => ` ${k}="${v}"`).join("");
  const f = (n.c ?? []).map((c) => serializar(c, pintar)).join("");
  return f ? `<${n.t}${a}>${f}</${n.t}>` : `<${n.t}${a}/>`;
};
const svgDe = (v, nos, vb, escala = 4) => {
  const [, , w, h] = vb.split(" ").map(Number);
  return `<body style="margin:0;background:#fff"><svg id="s" xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w * escala}" height="${h * escala}"><g fill="#000" stroke="#000">${nos.map((n) => serializar(n)).join("")}</g></svg></body>`;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 3000, height: 1600 } });

/** Caixas dos grupos (símbolo, nome, linha) em unidades do viewBox, relativas ao canto do SVG. */
async function medirGrupos(nos, vb) {
  await page.setContent(svgDe("", nos, vb));
  return page.evaluate(() => {
    const s = document.getElementById("s").getBoundingClientRect();
    const esc = s.width / Number(document.getElementById("s").getAttribute("viewBox").split(" ")[2]);
    const saida = {};
    for (const id of ["simbolo", "nome", "linha-de-apoio"]) {
      const g = document.getElementById(id);
      if (!g) continue;
      const b = g.getBoundingClientRect();
      saida[id] = { x: (b.left - s.left) / esc, y: (b.top - s.top) / esc, w: b.width / esc, h: b.height / esc };
    }
    return saida;
  });
}

/** Altura da letra maiúscula da linha de apoio (sem os acentos), por varredura de linhas de pixels a 4x. */
async function alturaDaLetraDaLinha(nos, vb) {
  const linha = nos.flatMap(function achatar(n) { return [n, ...(n.c ?? []).flatMap(achatar)]; }).find((n) => n.a.id === "linha-de-apoio");
  // Desenha só a linha, com as transformações dos grupos pais.
  const caminho = [];
  (function achar(lista, pais) {
    for (const n of lista) {
      if (n === linha) caminho.push([...pais, n]);
      else if (n.c) achar(n.c, [...pais, n]);
    }
  })(nos, []);
  const cadeia = caminho[0];
  const embrulhado = cadeia.reduceRight((dentro, n) => ({ ...n, c: dentro ? [dentro] : n.c }), null);
  await page.setContent(svgDe("", [embrulhado], vb));
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: Number(vb.split(" ")[2]) * 4, height: Number(vb.split(" ")[3]) * 4 } });
  const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  const linhas = [];
  for (let y = 0; y < info.height; y++) {
    let c = 0;
    for (let x = 0; x < info.width; x++) if (data[y * info.width + x] < 128) c++;
    linhas.push(c);
  }
  const max = Math.max(...linhas);
  const cap = linhas.map((c, y) => [c, y]).filter(([c]) => c > max * 0.25).map(([, y]) => y);
  return (cap.at(-1) - cap[0] + 1) / 4;
}

// --- Variante compacta: símbolo com pelo menos 24 px de altura na menor largura de uso ---
{
  const sim = await medirGrupos(saida.simbolo.nos, saida.simbolo.vb);
  const local = sim.simbolo; // caixa do símbolo no próprio viewBox da variante "simbolo" (relativa ao canto)
  const [vx, vy] = saida.simbolo.vb.split(" ").map(Number);
  const loc = { x: vx + local.x, y: vy + local.y, w: local.w, h: local.h }; // em coordenadas locais do desenho

  const c = saida.compacta;
  const [cx, cy, cw, ch] = c.vb.split(" ").map(Number);
  const gSim = c.nos[0];
  const gNome = c.nos[1];
  const t = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/.exec(gSim.a.transform);
  const [tx0, ty0, k0] = [Number(t[1]), Number(t[2]), Number(t[3])];
  const nome = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(gNome.a.transform);
  const [nx0, ny0] = [Number(nome[1]), Number(nome[2])];

  const esq = tx0 + loc.x * k0;
  const topo0 = ty0 + loc.y * k0;
  const alt0 = loc.h * k0;
  const larg0 = loc.w * k0;
  const centro = topo0 + alt0 / 2;
  const margemTopo = topo0 - cy;
  const margemBase = cy + ch - (topo0 + alt0);

  let f = 1;
  const pxDoSimbolo = (fator) => ((alt0 * fator) / (cw + larg0 * (fator - 1))) * LARGURA_MIN_COMPACTA_PX;
  while (pxDoSimbolo(f) < ALTURA_MIN_SIMBOLO_PX && f < 3) f += 0.005;
  if (f > 1) {
    const k = k0 * f;
    const alt = alt0 * f;
    const dx = larg0 * (f - 1);
    const topo = centro - alt / 2;
    const f2 = (n) => Number(n.toFixed(2));
    gSim.a.transform = `translate(${f2(esq - loc.x * k)} ${f2(topo - loc.y * k)}) scale(${f2(k)})`;
    gNome.a.transform = `translate(${f2(nx0 + dx)} ${f2(ny0)})`;
    c.vb = `${cx} ${f2(topo - margemTopo)} ${f2(cw + dx)} ${f2(alt + margemTopo + margemBase)}`;
    console.log(`compacta: símbolo ampliado ${(f * 100 - 100).toFixed(1)}% (24 px de altura a ${LARGURA_MIN_COMPACTA_PX} px de largura)`);
  } else {
    console.log("compacta: o símbolo já tem 24 px ou mais a 140 px; nada a ajustar");
  }
}

// --- Medidas de cada variante ---
for (const [chave, v] of Object.entries(saida)) {
  const grupos = await medirGrupos(v.nos, v.vb);
  v.simboloAltura = Number(grupos.simbolo.h.toFixed(2));
  // O selo tem a linha de apoio no anel (texto em arco): não entra na regra.
  if (grupos["linha-de-apoio"] && chave !== "selo") {
    const cap = await alturaDaLetraDaLinha(v.nos, v.vb);
    const [vx, vy, vw] = v.vb.split(" ").map(Number);
    const resto = ["simbolo", "nome", "aneis"].map((id) => grupos[id]).filter(Boolean);
    const base = Math.max(...resto.map((g) => g.y + g.h));
    const margem = Math.min(...resto.map((g) => g.y));
    v.linha = { cap: Number(cap.toFixed(2)) };
    if (chave === "horizontal") v.linha.fallback = "compacta";
    else v.linha.vbSem = `${vx} ${vy} ${vw} ${Number((base + margem).toFixed(2))}`;
  }
}
await browser.close();

const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".svg"));
writeFileSync("components/atoms/logo-geo.json", JSON.stringify(saida));
for (const [k, v] of Object.entries(saida)) console.log(k.padEnd(10), v.vb.padEnd(28), `símbolo ${v.simboloAltura}`, v.linha ? `| linha: letra ${v.linha.cap}${v.linha.vbSem ? `, sem linha ${v.linha.vbSem}` : ""}${v.linha.fallback ? `, sem linha = ${v.linha.fallback}` : ""}` : "");
console.log(`ok (de ${arquivos.length} SVGs em ${pasta})`);
