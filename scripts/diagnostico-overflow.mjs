// Lista os elementos que passam da largura do celular. Uso: node scripts/diagnostico-overflow.mjs <rota> [url-base]
import { chromium } from "@playwright/test";

const rota = process.argv[2] ?? "/sobre-o-curso";
const base = process.argv[3] ?? "http://localhost:3107";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await ctx.addCookies([{ name: "ap-theme", value: process.argv[4] ?? "claro", url: base }]);
const page = await ctx.newPage();
await page.goto(base + rota, { waitUntil: "networkidle" });
const achados = await page.evaluate(() => {
  const w = document.documentElement.clientWidth;
  return [...document.querySelectorAll("body *")]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.right > w + 1 && r.width > 0)
    .slice(0, 15)
    .map(({ el, r }) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
});
console.log(achados.join("\n") || "sem elementos fora da tela");
await browser.close();
