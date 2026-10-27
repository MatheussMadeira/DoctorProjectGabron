// Capturas de detalhes que a página inteira não mostra: menu do celular, barra de inscrição fixa,
// formulários nos quatro estados. Uso: node scripts/capturas-detalhes.mjs <pasta> [url-prod] [url-dev]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const saida = process.argv[2] ?? "capturas";
const prod = process.argv[3] ?? "http://localhost:3107";
const dev = process.argv[4] ?? "http://localhost:3108";
mkdirSync(saida, { recursive: true });

const browser = await chromium.launch();
async function pagina(viewport, tema) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", locale: "pt-BR", colorScheme: tema === "escuro" ? "dark" : "light" });
  await ctx.addCookies([{ name: "ap-theme", value: tema, url: prod }, { name: "ap-theme", value: tema, url: dev }]);
  return ctx.newPage();
}

for (const tema of ["claro", "escuro"]) {
  const m = await pagina({ width: 390, height: 844 }, tema);

  await m.goto(prod + "/", { waitUntil: "networkidle" });
  await m.screenshot({ path: join(saida, `m-inicio-topo-${tema}.png`) });
  await m.getByRole("button", { name: "Abrir menu" }).click();
  await m.waitForTimeout(500);
  await m.screenshot({ path: join(saida, `m-inicio-menu-${tema}.png`) });

  await m.goto(prod + "/agenda/modulo-essencial-nov-2026", { waitUntil: "networkidle" });
  await m.screenshot({ path: join(saida, `m-turma-topo-${tema}.png`) });
  await m.evaluate(() => window.scrollTo(0, 2400));
  await m.waitForTimeout(400);
  await m.screenshot({ path: join(saida, `m-turma-barra-${tema}.png`) });
  await m.locator("#inscricao").scrollIntoViewIfNeeded();
  await m.waitForTimeout(400);
  await m.screenshot({ path: join(saida, `m-turma-inscricao-${tema}.png`) });

  await m.goto(prod + "/contato", { waitUntil: "networkidle" });
  await m.locator("#formulario").scrollIntoViewIfNeeded();
  await m.waitForTimeout(400);
  await m.screenshot({ path: join(saida, `m-contato-form-${tema}.png`) });
  await m.context().close();

  const d = await pagina({ width: 1440, height: 900 }, tema);
  await d.goto(prod + "/agenda/modulo-essencial-nov-2026", { waitUntil: "networkidle" });
  await d.evaluate(() => window.scrollTo(0, 1600));
  await d.waitForTimeout(400);
  await d.screenshot({ path: join(saida, `d-turma-resumo-fixo-${tema}.png`) });
  await d.context().close();
}

// Estados dos formulários (/dev/componentes só existe em desenvolvimento).
const f = await pagina({ width: 1440, height: 900 }, "claro");
await f.goto(dev + "/dev/componentes", { waitUntil: "networkidle" });
for (const [nome, rotulo] of [["normal", "InscricaoForm · normal"], ["erro", "InscricaoForm · erro"], ["esgotada", "InscricaoForm · esgotada"], ["enviada", "InscricaoForm · enviada"], ["contato", "ContatoForm"]]) {
  const bloco = f.locator("section", { has: f.getByText(rotulo, { exact: true }) });
  await bloco.scrollIntoViewIfNeeded();
  await f.waitForTimeout(300);
  await bloco.screenshot({ path: join(saida, `d-form-${nome}.png`) });
}
await browser.close();
console.log("ok", saida);
