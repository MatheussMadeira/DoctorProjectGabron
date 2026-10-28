// Capturas dos formulários públicos nos quatro estados (vazio, com foco, preenchido e com erro), em 1440px e 390px.
// Não grava nada: o estado "preenchido" não é enviado, e o de erro envia dados inválidos.
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

  const abrir = async (caminho, seletor) => {
    await page.goto(base + caminho, { waitUntil: "networkidle" });
    const secao = page.locator(seletor);
    await secao.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('input[name="carimbo_form"]')?.value);
    await page.waitForTimeout(2300); // tempo mínimo de página aberta, para o envio com erro de validação passar pelas barreiras
    return secao;
  };

  // Inscrição: vazio → foco no Conselho → preenchido → erro.
  let secao = await abrir("/agenda/modulo-essencial-nov-2026", "#inscricao");
  await secao.screenshot({ path: join(saida, `inscricao-1-vazio-${vn}.png`) });
  await page.locator('select[name="conselho"]').focus();
  await page.waitForTimeout(400);
  await secao.screenshot({ path: join(saida, `inscricao-2-foco-${vn}.png`) });
  await page.locator('input[name="nome"]').fill("Maria da Silva");
  await page.locator('input[name="email"]').fill("maria@dominio.com.br");
  await page.locator('input[name="telefone"]').fill("(31) 91234-5678");
  await page.locator('select[name="profissao"]').selectOption("Médico(a)");
  await page.locator('select[name="conselho"]').selectOption("CRM");
  await page.locator('input[name="registro"]').fill("12345 / MG");
  await page.locator('input[name="nome"]').focus();
  await page.waitForTimeout(500);
  await secao.screenshot({ path: join(saida, `inscricao-3-preenchido-${vn}.png`) });
  await page.locator('input[name="email"]').fill("maria@dominio");
  await page.locator('select[name="profissao"]').selectOption({ index: 0 }).catch(() => {});
  await page.getByRole("button", { name: /Enviar inscrição|lista de espera/ }).click();
  await page.getByText(/Revise \d+ campos? antes de enviar/).waitFor();
  await page.waitForTimeout(500);
  await secao.screenshot({ path: join(saida, `inscricao-4-erro-${vn}.png`) });

  // Contato: vazio → preenchido → erro.
  secao = await abrir("/contato", "#formulario");
  await secao.screenshot({ path: join(saida, `contato-1-vazio-${vn}.png`) });
  await page.locator('input[name="nome"]').fill("Maria da Silva");
  await page.locator('select[name="assunto"]').selectOption({ index: 1 });
  await page.locator('input[name="nome"]').focus();
  await page.waitForTimeout(400);
  await secao.screenshot({ path: join(saida, `contato-3-preenchido-${vn}.png`) });
  await page.locator('select[name="assunto"]').focus();
  await page.waitForTimeout(300);
  await secao.screenshot({ path: join(saida, `contato-2-foco-${vn}.png`) });
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await page.getByText(/Revise \d+ campos? antes de enviar/).waitFor();
  await page.waitForTimeout(500);
  await secao.screenshot({ path: join(saida, `contato-4-erro-${vn}.png`) });
  await ctx.close();
}
await browser.close();
console.log("ok", saida);
