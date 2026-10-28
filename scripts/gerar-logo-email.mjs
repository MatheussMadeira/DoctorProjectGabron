// Gera o logo horizontal em PNG (fundo transparente, 2x) para os e-mails: public/logos/logo-horizontal-negativo-2x.png.
// Versão "negativa": letras em creme e pedras em azul-claro, para o topo azul-escuro do e-mail.
// Uso: node scripts/gerar-logo-email.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const geo = JSON.parse(readFileSync("components/atoms/logo-geo.json", "utf8"))["logo-horizontal"];
const LARGURA = 168; // largura em que o e-mail mostra o logo (px CSS); o PNG sai com o dobro de pixels
const ALTURA = Math.round((LARGURA * geo.h) / geo.w);
const cores = { i: "#f5ebdf", s: "#9bacbe" }; // tokens logo-ink e logo-stone do tema escuro

const caminhos = geo.p.map(([r, d]) => `<path d="${d}" fill="${cores[r] ?? cores.i}"/>`).join("");
const html = `<!doctype html><html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geo.w} ${geo.h}" width="${LARGURA}" height="${ALTURA}">${caminhos}</svg></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: LARGURA, height: ALTURA }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.locator("svg").screenshot({ path: "public/logos/logo-horizontal-negativo-2x.png", omitBackground: true });
await browser.close();
console.log(`ok: ${LARGURA * 2}x${ALTURA * 2}px (exibido em ${LARGURA}x${ALTURA})`);
