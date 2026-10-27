// Tira capturas de todas as rotas em 1440px e 390px, nos temas claro e escuro.
// Uso: node scripts/capturas.mjs <pasta-de-saida> [url-base]   (o site precisa estar no ar)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const saida = process.argv[2] ?? "capturas";
const base = process.argv[3] ?? "http://localhost:3107";

const rotas = [
  ["inicio", "/"],
  ["sobre", "/sobre"],
  ["clinica", "/clinica"],
  ["agenda", "/agenda"],
  ["turma-aberta", "/agenda/modulo-essencial-nov-2026"],
  ["turma-esgotada", "/agenda/anatomia-nov-2026"],
  ["turma-em-breve", "/agenda/modulo-essencial-dez-2026"],
  ["contato", "/contato"],
  ["privacidade", "/politica-de-privacidade"],
  ...(process.env.COM_DEV ? [["dev-componentes", "/dev/componentes"]] : []),
];
const viewports = [
  ["1440", { width: 1440, height: 900 }],
  ["390", { width: 390, height: 844 }],
];
const temas = ["claro"]; // o site tem só o tema claro

mkdirSync(saida, { recursive: true });
const browser = await chromium.launch();
for (const [vn, viewport] of viewports) {
  for (const tema of temas) {
    // reducedMotion: sem animação de entrada, para a página inteira aparecer na captura estática.
    const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", locale: "pt-BR", colorScheme: tema === "escuro" ? "dark" : "light" });
    await ctx.addCookies([{ name: "ap-theme", value: tema, url: base }]);
    const page = await ctx.newPage();
    for (const [nome, rota] of rotas) {
      await page.goto(base + rota, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(saida, `${nome}-${vn}-${tema}.png`), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) console.log(`ROLAGEM HORIZONTAL em ${rota} (${vn}, ${tema}): +${overflow}px`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log("ok", saida);
