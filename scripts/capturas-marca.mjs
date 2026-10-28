// Capturas do logo no Header (desktop e celular, com o menu aberto), no Footer e do topo do Contato (Hero sem imagem),
// em 1440px e 390px, nos temas claro e escuro. O site só tem o tema claro: o "escuro" aqui força data-theme="escuro" na página
// só para conferir que o logo e as pedras recolorem pelos tokens.
// Uso: node scripts/capturas-marca.mjs <pasta> [url-base]   (o site precisa estar no ar)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const saida = process.argv[2] ?? "capturas/marca";
const base = process.argv[3] ?? "http://localhost:3107";
mkdirSync(saida, { recursive: true });

const browser = await chromium.launch();
for (const [vn, viewport] of [["1440", { width: 1440, height: 900 }], ["390", { width: 390, height: 844 }]]) {
  for (const tema of ["claro", "escuro"]) {
    const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", locale: "pt-BR" });
    const page = await ctx.newPage();
    const forcarTema = () => page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
    const nome = (x) => join(saida, `${x}-${vn}-${tema}.png`);

    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await forcarTema();
    await page.locator("header.ap-header").screenshot({ path: nome("header") });
    if (vn === "390") {
      await page.getByRole("button", { name: "Abrir menu" }).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: nome("header-menu-aberto") });
      await page.getByRole("button", { name: "Fechar menu" }).click();
    }
    const rodape = page.locator("footer");
    await rodape.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await rodape.screenshot({ path: nome("footer") });

    await page.goto(base + "/contato", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await forcarTema();
    await page.waitForTimeout(300);
    await page.screenshot({ path: nome("contato-topo") });
    await ctx.close();
  }
}
await browser.close();
console.log("ok", saida);
