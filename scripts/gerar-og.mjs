// Gera a imagem de compartilhamento (Open Graph, 1200x630): public/og.png. Logo vertical (negativo) sobre azul-escuro. Lê components/atoms/logo-geo.json.
// Uso: node scripts/gerar-og.mjs
import { chromium } from "@playwright/test";
import { CORES, svgDoLogo } from "./lib-logo.mjs";

const { svg } = svgDoLogo("vertical", CORES.negativo, 760);
const html = `<!doctype html><html><body style="margin:0;width:1200px;height:630px;background:#28334f;display:flex;align-items:center;justify-content:center">${svg}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("ok: public/og.png 1200x630");
