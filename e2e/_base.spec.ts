import { test } from "@playwright/test";
import { writeFileSync } from "node:fs";

const PASTA = "C:/Users/ADMINI~1/AppData/Local/Temp/claude/d979600b0d4ec1ba/887ff523-ca20-41f4-b426-471c8e37d178/scratchpad";
test.use({ locale: "pt-BR", reducedMotion: "reduce" });
const alvo = process.env.FOTO_NOME ?? "base";
test("fotografia das páginas", async ({ page }) => {
  const saida: Record<string, unknown> = {};
  for (const loc of ["", "/en", "/de"]) {
    for (const caminho of ["/", "/sobre-o-curso"]) {
      await page.goto(`${loc}${caminho}`);
      await page.waitForLoadState("load");
      await page.waitForTimeout(500);
      saida[`${loc || "pt"}${caminho}`] = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        const secoes = [...main.querySelectorAll("section")].map((s) => ({ id: s.id, tema: s.getAttribute("data-theme"), classe: s.className, texto: (s as HTMLElement).innerText.replace(/\s+/g, " ").trim(), links: [...s.querySelectorAll("a")].map((a) => a.getAttribute("href")), imagens: [...s.querySelectorAll("img")].map((i) => `${i.getAttribute("alt")}|${i.getAttribute("src")?.slice(0, 60)}`) }));
        return secoes;
      });
    }
  }
  writeFileSync(`${PASTA}/${alvo}.json`, JSON.stringify(saida, null, 1));
});
