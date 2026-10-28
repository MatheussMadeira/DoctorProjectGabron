// Gera a imagem de compartilhamento (Open Graph, 1200x630): public/og.png. Logo vertical em creme e azul-claro sobre azul-escuro.
// Uso: node scripts/gerar-og.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const geo = JSON.parse(readFileSync("components/atoms/logo-geo.json", "utf8"))["logo-vertical"];
const cores = { i: "#f5ebdf", s: "#9bacbe" };
const ALTURA_LOGO = 400;
const largura = Math.round((ALTURA_LOGO * geo.w) / geo.h);
const caminhos = geo.p.map(([r, d]) => `<path d="${d}" fill="${cores[r] ?? cores.i}"/>`).join("");
const html = `<!doctype html><html><body style="margin:0;width:1200px;height:630px;background:#28334f;display:flex;align-items:center;justify-content:center">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geo.w} ${geo.h}" width="${largura}" height="${ALTURA_LOGO}">${caminhos}</svg></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("ok: public/og.png 1200x630");
