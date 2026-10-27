// Capturas dos formulários públicos com erros de validação (1440px e 390px). Não grava nada: só envia dados inválidos.
// Uso: node scripts/capturas-formularios.mjs <pasta> [url-base]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const saida = process.argv[2] ?? "capturas/formularios";
const base = process.argv[3] ?? "http://localhost:3107";
mkdirSync(saida, { recursive: true });

const browser = await chromium.launch();
for (const [vn, viewport] of [["1440", { width: 1440, height: 900 }], ["390", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", locale: "pt-BR", extraHTTPHeaders: { "x-forwarded-for": `10.55.${Math.floor(Math.random() * 250)}.${vn === "1440" ? 1 : 2}` } });
  const page = await ctx.newPage();

  await page.goto(base + "/agenda/modulo-essencial-nov-2026", { waitUntil: "networkidle" });
  const secao = page.locator("#inscricao");
  await secao.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await secao.screenshot({ path: join(saida, `inscricao-normal-${vn}.png`) });
  await page.locator('input[name="nome"]').fill("Maria da Silva");
  await page.locator('input[name="email"]').fill("maria@dominio");
  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await page.getByText(/Revise \d+ campos? antes de enviar/).waitFor();
  await page.waitForTimeout(400);
  await secao.screenshot({ path: join(saida, `inscricao-erro-${vn}.png`) });

  await page.goto(base + "/contato", { waitUntil: "networkidle" });
  await page.locator("#formulario").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await page.getByText(/Revise \d+ campos? antes de enviar/).waitFor();
  await page.waitForTimeout(400);
  await page.locator("#formulario").screenshot({ path: join(saida, `contato-erro-${vn}.png`) });
  await ctx.close();
}
await browser.close();
console.log("ok", saida);
