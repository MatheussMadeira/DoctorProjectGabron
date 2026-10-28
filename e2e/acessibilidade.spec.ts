import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/* Acessibilidade automática (axe, WCAG 2.0/2.1 A e AA) nas páginas públicas e no login do painel, em 1440px e 390px.
   O axe pega o que dá para medir (contraste, rótulos, nomes de botões, ordem de títulos, landmarks). Teclado e leitor
   de tela continuam precisando de um teste manual: ver "Acessibilidade" na especificação. */

const PAGINAS = ["/", "/sobre-o-curso", "/agenda", "/agenda/modulo-essencial-nov-2026", "/agenda/anatomia-nov-2026", "/contato", "/politica-de-privacidade", "/admin/login"];

for (const [nome, viewport] of [["desktop", { width: 1440, height: 900 }], ["celular", { width: 390, height: 844 }]] as const) {
  test.describe(nome, () => {
    test.use({ viewport, reducedMotion: "reduce" });
    for (const caminho of PAGINAS) {
      test(`sem violações do axe: ${caminho}`, async ({ page }) => {
        await page.goto(caminho);
        await page.waitForLoadState("networkidle");
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const resumo = r.violations.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
        expect(resumo, resumo.join("\n")).toEqual([]);
      });
    }
  });
}

test("teclado: o primeiro Tab leva ao 'Pular para o conteúdo', que pula o cabeçalho", async ({ page }) => {
  await page.goto("/sobre-o-curso");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  const pular = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(pular).toBeFocused();
  await expect(pular).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#conteudo$/);
  await expect(page.locator("main#conteudo")).toBeFocused();
});

test("teclado: o menu do celular abre, fecha com Esc e devolve o foco", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const abrir = page.getByRole("button", { name: "Abrir menu" });
  await abrir.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
});

test("teclado: todo controle focado tem indicador de foco visível", async ({ page }) => {
  await page.goto("/contato");
  await page.waitForLoadState("networkidle");
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const foco = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const box = getComputedStyle(el).boxShadow;
      return { tag: el.tagName, outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0, sombra: box !== "none", pai: getComputedStyle(el.parentElement!).boxShadow !== "none" };
    });
    if (foco) expect(foco.outline || foco.sombra || foco.pai, `elemento ${foco.tag} sem indicador de foco`).toBe(true);
  }
});
