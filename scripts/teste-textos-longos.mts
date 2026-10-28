// Teste de texto longo (alemão e francês) em 1440px e 390px, sem depender de ter as traduções reais.
// Cria versões "esticadas" de messages/de.json e messages/fr.json (textos curtos viram uma palavra comprida, como os compostos do alemão;
// textos longos ficam ~45% maiores), faz o build, olha o menu, os botões, os títulos do Hero, os cartões de turma e os formulários, e
// DEVOLVE os arquivos de messages como estavam. Depois rode `yarn build` de novo para voltar ao build normal.
// Uso: node --env-file=.env.local --import tsx scripts/teste-textos-longos.mts
import { spawnSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { aplicarTraduzidos, definir, extrairTraduziveis, folhas } from "../lib/i18n/icu";

const PORTA = 3107;
const base = `http://localhost:${PORTA}`;
const idiomas = [
  { locale: "de", arquivo: "messages/de.json", sufixo: "ung", palavras: ["Verwaltungsangelegenheiten", "Teilnahmebedingungen", "Anmeldeinformationen"] },
  { locale: "fr", arquivo: "messages/fr.json", sufixo: "ent", palavras: ["professionnellement", "particulièrement", "développement"] },
];

/** Estica um texto de forma plausível: palavras longas ganham 3 letras (~30% mais comprido, como o alemão e o francês em relação ao português); textos longos ganham ~20% de palavras. */
function esticar(texto: string, palavras: string[], sufixo: string): string {
  const alongar = (p: string) => (p.replace(/[^\p{L}]/gu, "").length > 4 ? p + sufixo : p);
  const partes = texto.trim().split(/\s+/).map(alongar);
  if (partes.length < 6) return partes.join(" ");
  const extra = partes.slice(0, Math.ceil(partes.length * 0.2)).map((p, i) => (i % 4 === 0 ? palavras[i % palavras.length] : p));
  return `${partes.join(" ")} ${extra.join(" ")}`;
}

const pt = JSON.parse(readFileSync("messages/pt-BR.json", "utf8"));
const originais = new Map<string, string | null>();
for (const l of idiomas) {
  originais.set(l.arquivo, existsSync(l.arquivo) ? readFileSync(l.arquivo, "utf8") : null);
  const saida: Record<string, unknown> = {};
  for (const [chave, msg] of folhas(pt)) {
    if (chave.startsWith("EmailsInternos") || chave.startsWith("Emails.")) continue;
    const trechos = extrairTraduziveis(msg).map((t) => esticar(t, l.palavras, l.sufixo));
    definir(saida, chave, aplicarTraduzidos(msg, trechos));
  }
  writeFileSync(l.arquivo, JSON.stringify(saida, null, 2));
}

let servidor: ReturnType<typeof spawn> | null = null;
const problemas: string[] = [];
try {
  const build = spawnSync("yarn", ["-s", "build"], { stdio: "inherit", shell: true });
  if (build.status !== 0) throw new Error("build falhou");
  servidor = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORTA)], { env: { ...process.env, EMAIL_PROVIDER: "console" }, stdio: "ignore" });
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }

  const browser = await chromium.launch();
  const slug = "modulo-essencial-nov-2026";
  for (const { locale } of idiomas) {
    for (const [nome, viewport] of [["1440", { width: 1440, height: 900 }], ["390", { width: 390, height: 844 }]] as const) {
      const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", locale });
      await ctx.addInitScript("window.__name = (f) => f;"); // o tsx injeta __name nas funções passadas ao evaluate
      const page = await ctx.newPage();
      for (const caminho of ["", "/sobre-o-curso", "/agenda", `/agenda/${slug}`, "/contato"]) {
        await page.goto(`${base}/${locale}${caminho}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        if (nome === "390") {
          await page.getByRole("button", { name: /Menu|menu/ }).first().click().catch(() => {});
          await page.waitForTimeout(400);
        }
        const achados = await page.evaluate(() => {
          const out: string[] = [];
          const w = document.documentElement.clientWidth;
          if (document.documentElement.scrollWidth > w + 1) out.push(`rolagem horizontal da página (${document.documentElement.scrollWidth} > ${w})`);
          const rotulo = (el: Element) => `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 40)} "${(el.textContent ?? "").trim().slice(0, 40)}"`;
          for (const el of Array.from(document.querySelectorAll("body *"))) {
            const r = el.getBoundingClientRect();
            const css = getComputedStyle(el);
            if (r.width === 0 || css.visibility === "hidden" || css.display === "none" || el.closest("[aria-hidden='true']:not(.ap-drawer)") ) continue;
            if (r.right > w + 1 && !el.closest(".ap-pedras, .ap-marquee, .ap-tabs, svg")) out.push(`passa da tela: ${rotulo(el)} (direita ${Math.round(r.right)})`);
            const corta = css.overflow !== "visible" || css.overflowX !== "visible";
            const texto = (el.textContent ?? "").trim().length > 0 && el.children.length === 0;
            // Cortes de propósito: resumo do cartão (limite de linhas), rótulo do WhatsApp no celular e a barra de abas, que rola na horizontal.
            const truncadoDeProposito = !!el.closest(".ap-wa, .ap-event, .ap-tabs");
            if (corta && texto && !truncadoDeProposito && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2) && css.overflow !== "auto") out.push(`texto cortado: ${rotulo(el)}`);
          }
          // Cabeçalho (desktop): logo, menu, seletor e botão não podem se sobrepor.
          const cab = document.querySelector("header.ap-header");
          if (cab) {
            const itens = Array.from(cab.querySelectorAll(".ap-header-logo, .ap-nav a, .ap-lang-btn, .ap-header-cta")).map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width > 0);
            for (let i = 0; i < itens.length; i++)
              for (let j = i + 1; j < itens.length; j++) {
                const a = itens[i].r, b = itens[j].r;
                if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`cabeçalho sobreposto: ${rotulo(itens[i].e)} × ${rotulo(itens[j].e)}`);
              }
            if (cab.getBoundingClientRect().height > 110) out.push(`cabeçalho alto demais (${Math.round(cab.getBoundingClientRect().height)}px)`);
          }
          // Botões: texto em mais de 3 linhas é sinal de botão estourado.
          for (const b of Array.from(document.querySelectorAll(".ap-btn, button.ap-lang-btn"))) {
            const lh = parseFloat(getComputedStyle(b).lineHeight) || 20;
            if (b.getBoundingClientRect().height > lh * 3.6 + 24) out.push(`botão com texto em linhas demais: ${rotulo(b)}`);
          }
          return [...new Set(out)].slice(0, 12);
        });
        for (const a of achados) problemas.push(`${locale} ${nome}px /${locale}${caminho}: ${a}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
} finally {
  servidor?.kill();
  for (const [arquivo, conteudo] of originais) {
    if (conteudo === null) writeFileSync(arquivo, "{}\n");
    else writeFileSync(arquivo, conteudo);
  }
}
console.log(problemas.length ? `\n${problemas.length} problema(s):\n${problemas.join("\n")}` : "\nSem problemas de texto longo em de e fr (1440px e 390px).");
process.exit(problemas.length ? 1 : 0);
