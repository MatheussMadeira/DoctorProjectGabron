import { expect, test } from "@playwright/test";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { turmas } from "../db/schema";

/* Hero da página da turma: foto em paisagem (16:10) e sobretítulo certo (online não mostra cidade).
   Home e Sobre continuam com o retrato 4:5. As turmas são criadas aqui, sem depender do seed. */

const marca = `${Date.now()}`;
const base = { resumo: "Teste", descricao: "Teste", publicacao: "PUBLICADO" as const, inicio: "2099-06-13", horario: "8h às 18h", vagas: 5, fotoUrl: "/images/maos.webp", fotoAlt: "Teste" };
const slugs = { presencial: `teste-hero-${marca}-p`, online: `teste-hero-${marca}-o` };

test.beforeAll(async () => {
  await db.insert(turmas).values([
    { ...base, slug: slugs.presencial, titulo: "Turma hero presencial", modalidade: "PRESENCIAL", cidade: "Belo Horizonte, MG" },
    { ...base, slug: slugs.online, titulo: "Turma hero online", modalidade: "ONLINE", cidade: "Belo Horizonte, MG" },
  ]);
});

test.afterAll(async () => {
  await db.delete(turmas).where(inArray(turmas.slug, Object.values(slugs)));
});

const proporcao = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width / r.height;
};

for (const [nome, viewport] of [["desktop", { width: 1440, height: 900 }], ["celular", { width: 390, height: 844 }]] as const) {
  test(`turma presencial (${nome}): foto 16:10, centralizada, sobretítulo com a cidade`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`/agenda/${slugs.presencial}`);
    const hero = page.locator(".ap-hero");
    await expect(hero.locator(".ap-eyebrow")).toHaveText("Presencial · Belo Horizonte");
    const figura = hero.locator(".ap-hero-media");
    await expect(figura).toBeVisible(); // a página pode chegar em partes (streaming): só mede depois de visível
    await expect(figura).toHaveClass(/ap-hero-media-paisagem/);
    expect(await figura.evaluate(proporcao)).toBeCloseTo(1.6, 1);
    await expect(figura.locator("img")).toHaveCSS("object-position", "50% 50%");
    await expect(figura).toHaveCSS("view-transition-name", slugs.presencial);
  });
}

test("turma online: 'Online · Ao vivo', sem a cidade, e a foto em 16:10", async ({ page }) => {
  await page.goto(`/agenda/${slugs.online}`);
  const eyebrow = page.locator(".ap-hero .ap-eyebrow");
  await expect(eyebrow).toHaveText("Online · Ao vivo");
  await expect(eyebrow).not.toContainText("Belo Horizonte");
  await expect(page.locator(".ap-hero-media")).toBeVisible();
  expect(await page.locator(".ap-hero-media").evaluate(proporcao)).toBeCloseTo(1.6, 1);
  // No formulário de inscrição a linha de apoio também não leva a cidade.
  await expect(page.getByText(/· Ao vivo/).last()).toBeVisible();
});

test("desktop: no Hero da turma, texto e foto dividem a largura em colunas iguais", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/agenda/${slugs.presencial}`);
  await expect(page.locator(".ap-hero-media")).toBeVisible();
  const [copia, figura] = await Promise.all([page.locator(".ap-hero-copy").boundingBox(), page.locator(".ap-hero-media").boundingBox()]);
  expect(Math.abs(copia!.width - figura!.width)).toBeLessThan(4);
});

test("home e Sobre o curso mantêm o 4:5", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const caminho of ["/", "/sobre-o-curso"]) {
    await page.goto(caminho);
    const figura = page.locator(".ap-hero-media");
    await expect(figura).toBeVisible();
    await expect(figura).not.toHaveClass(/paisagem/);
    expect(await figura.evaluate(proporcao)).toBeCloseTo(0.8, 1);
  }
});
