// Roda o Lighthouse nas páginas públicas (celular e desktop) e imprime as notas e o que mais pesa.
// O site precisa estar no ar. Para a nota de SEO valer, suba o build com SITE_PUBLICO=true (senão o noindex derruba "indexável").
// Uso: node scripts/lighthouse.mjs [url-base] [pasta-de-saida]
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3107";
const saida = process.argv[3] ?? "capturas/lighthouse";
mkdirSync(saida, { recursive: true });

const paginas = ["/", "/sobre-o-curso", "/agenda", "/agenda/modulo-essencial-nov-2026", "/contato"];
const categorias = ["performance", "accessibility", "best-practices", "seo"];
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox"] });

const desktop = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "desktop",
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
  },
};

const linhas = [];
try {
  for (const modo of ["mobile", "desktop"]) {
    for (const caminho of paginas) {
      const r = await lighthouse(base + caminho, { port: chrome.port, output: "json", onlyCategories: categorias, logLevel: "error" }, modo === "desktop" ? desktop : undefined);
      const lhr = r.lhr;
      const notas = Object.fromEntries(categorias.map((c) => [c, Math.round((lhr.categories[c].score ?? 0) * 100)]));
      const m = lhr.audits;
      linhas.push({ modo, caminho, perf: notas.performance, a11y: notas.accessibility, boas: notas["best-practices"], seo: notas.seo, LCP: m["largest-contentful-paint"].displayValue, CLS: m["cumulative-layout-shift"].displayValue, TBT: m["total-blocking-time"].displayValue });
      const ruins = Object.values(lhr.audits)
        .filter((a) => a.score !== null && a.score < 0.9 && !["informative", "notApplicable", "manual"].includes(a.scoreDisplayMode))
        .map((a) => `${a.id} (${Math.round(a.score * 100)})`);
      writeFileSync(join(saida, `${modo}-${caminho.replace(/\W+/g, "_") || "inicio"}.json`), JSON.stringify({ notas, ruins }, null, 2));
      if (ruins.length) console.log(`  ${modo} ${caminho}: ${ruins.join(", ")}`);
    }
  }
} finally {
  await chrome.kill();
}
console.table(linhas);
