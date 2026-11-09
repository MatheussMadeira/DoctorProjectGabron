import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/* Assinatura do criador (CreatorCredit): gatilho no fim do site público e "Ficha técnica" em <dialog> nativo. */

const gatilho = (page: Page) => page.getByRole("button", { name: /Site desenvolvido por Matheus Madeira/ });
const ficha = (page: Page) => page.getByRole("dialog", { name: "Matheus Madeira" });

test("abre a ficha, Esc fecha e o foco volta ao gatilho", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const g = gatilho(page);
  await expect(g).toHaveAttribute("aria-expanded", "false");
  await g.scrollIntoViewIfNeeded();
  await g.click();

  const d = ficha(page);
  await expect(d).toBeVisible();
  await expect(g).toHaveAttribute("aria-expanded", "true");

  const linkedin = d.getByRole("link", { name: "Ver LinkedIn" });
  const github = d.getByRole("link", { name: "Ver GitHub" });
  const whatsapp = d.getByRole("link", { name: "Chamar no WhatsApp" });
  await expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/matheus-madeira22/");
  await expect(github).toHaveAttribute("href", "https://github.com/MatheussMadeira");
  expect(await whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5531996193940\?text=/);
  for (const a of [linkedin, github, whatsapp]) {
    await expect(a).toHaveAttribute("target", "_blank");
    await expect(a).toHaveAttribute("rel", /noopener/);
  }

  await page.keyboard.press("Escape");
  await expect(d).toBeHidden();
  await expect(g).toHaveAttribute("aria-expanded", "false");
  await expect(g).toBeFocused();
});

test("clicar fora fecha; o botão Fechar também", async ({ page }) => {
  await page.goto("/agenda");
  await page.waitForLoadState("networkidle");
  await gatilho(page).click();
  const d = ficha(page);
  await expect(d).toBeVisible();
  await page.mouse.click(4, 4); // sobre o fundo escurecido
  await expect(d).toBeHidden();

  await gatilho(page).click();
  await d.getByRole("button", { name: "Fechar" }).click();
  await expect(d).toBeHidden();
  await expect(gatilho(page)).toBeFocused();
});

test("celular: a ficha vira folha inferior, sem rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await gatilho(page).click();
  const d = ficha(page);
  await expect(d).toBeVisible();
  await page.waitForTimeout(500); // fim da entrada
  const box = (await d.boundingBox())!;
  expect(Math.round(box.width)).toBe(390);
  expect(Math.round(box.y + box.height)).toBe(800);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("aparece uma vez no site (também em /en) e não aparece no painel", async ({ page }) => {
  await page.goto("/");
  await expect(gatilho(page)).toHaveCount(1);
  await page.goto("/en");
  await expect(page.getByRole("button", { name: /Matheus Madeira/ })).toHaveCount(1);
  await page.goto("/admin/login");
  await expect(page.getByRole("button", { name: /Matheus Madeira/ })).toHaveCount(0);
});

for (const [nome, viewport] of [["desktop", { width: 1440, height: 900 }], ["celular", { width: 390, height: 844 }]] as const) {
  test.describe(nome, () => {
    test.use({ viewport, reducedMotion: "reduce" });
    test("sem violações do axe, com a ficha aberta", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await gatilho(page).click();
      await expect(ficha(page)).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const resumo = r.violations.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(resumo, resumo.join("\n")).toEqual([]);
    });
  });
}
