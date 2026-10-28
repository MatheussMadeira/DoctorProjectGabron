// Capturas do logo no Header (desktop e celular, com o menu aberto) e no Footer, em 1440px e 390px.
// Uso: node scripts/capturas-marca.mjs <pasta> [url-base]   (o site precisa estar no ar)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const saida = process.argv[2] ?? "capturas/marca";
const base = process.argv[3] ?? "http://localhost:3107";
mkdirSync(saida, { recursive: true });

const browser = await chromium.launch();
for (const [vn, viewport] of [["1440", { width: 1440, height: 900 }], ["390", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", locale: "pt-BR" });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("header.ap-header").screenshot({ path: join(saida, `header-${vn}.png`) });
  if (vn === "390") {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(saida, `header-menu-aberto-${vn}.png`) });
    await page.getByRole("button", { name: "Fechar menu" }).click();
  }
  const rodape = page.locator("footer");
  await rodape.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await rodape.screenshot({ path: join(saida, `footer-${vn}.png`) });
  await ctx.close();
}
await browser.close();
console.log("ok", saida);
