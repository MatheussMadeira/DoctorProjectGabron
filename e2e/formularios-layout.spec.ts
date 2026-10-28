import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { turmas } from "../db/schema";

/* Campos dos formulários públicos: Select com rótulo dentro (floating) igual ao TextField (mesma altura, mesma linha),
   linhas de dois campos alinhadas pelo topo e, no celular, um campo embaixo do outro. */

const marca = `${Date.now()}`;
const slug = `teste-layout-${marca}`;
let contador = 0;

test.beforeAll(async () => {
  await db.insert(turmas).values({
    slug, titulo: "Turma layout", resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL", publicacao: "PUBLICADO",
    inicio: "2099-07-11", horario: "8h às 18h", cidade: "Belo Horizonte, MG", vagas: 5, fotoUrl: "/images/maos.webp", fotoAlt: "Teste",
  });
});
test.afterAll(async () => {
  await db.delete(turmas).where(eq(turmas.slug, slug));
});

async function caixa(page: Page, seletor: string) {
  const b = await page.locator(seletor).boundingBox();
  expect(b, seletor).toBeTruthy();
  return b!;
}

async function esperar(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('input[name="carimbo_form"]')).not.toHaveValue("", { timeout: 15_000 });
}

test("inscrição (desktop): Conselho e Registro com a mesma altura e alinhados pelo topo, mesmo com a dica embaixo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/agenda/${slug}`);
  await esperar(page);
  const [conselho, registro, profissao, nome] = await Promise.all([caixa(page, 'select[name="conselho"]'), caixa(page, 'input[name="registro"]'), caixa(page, 'select[name="profissao"]'), caixa(page, 'input[name="nome"]')]);
  expect(conselho.height).toBe(registro.height);
  expect(conselho.y).toBe(registro.y);
  // Profissão tem a mesma altura de qualquer outro campo.
  expect(profissao.height).toBe(nome.height);
  expect(conselho.height).toBe(nome.height);
});

test("inscrição (celular): os campos ficam um embaixo do outro, com a mesma largura", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/agenda/${slug}`);
  await esperar(page);
  for (const [a, b] of [['select[name="conselho"]', 'input[name="registro"]'], ['input[name="email"]', 'input[name="telefone"]']] as const) {
    const [ba, bb] = await Promise.all([caixa(page, a), caixa(page, b)]);
    expect(bb.y).toBeGreaterThan(ba.y + ba.height - 1);
    expect(Math.abs(ba.x - bb.x)).toBeLessThan(1);
    expect(Math.abs(ba.width - bb.width)).toBeLessThan(1);
  }
});

test("Select floating é acessível: rótulo ligado ao select, sem 'Selecione', required e aria-invalid no erro", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.66.${Number(marca.slice(-3)) % 250}.${++contador}` });
  await page.goto(`/agenda/${slug}`);
  await esperar(page);
  await expect(page.getByLabel("Profissão")).toBeVisible(); // o rótulo está ligado ao select
  await expect(page.locator('select[name="profissao"]')).toHaveAttribute("required", "");
  await expect(page.locator("#inscricao").getByText("Selecione", { exact: true })).toHaveCount(0);
  expect(await page.locator('select[name="profissao"]').evaluate((s: HTMLSelectElement) => s.selectedOptions[0].textContent)).toBe("");

  // Rótulo sobe com a escolha (mesma regra do TextField).
  const rotulo = page.locator('select[name="profissao"] + label');
  const antes = await rotulo.evaluate((l) => getComputedStyle(l).transform);
  await page.locator('select[name="profissao"]').selectOption("Médico(a)");
  await expect.poll(() => rotulo.evaluate((l) => getComputedStyle(l).transform)).not.toBe(antes);

  // Erro: só o conselho fica sem escolha → aria-invalid e mensagem ligada.
  await page.waitForTimeout(2300);
  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await expect(page.getByText(/Revise \d+ campos? antes de enviar/)).toBeVisible();
  const conselho = page.locator('select[name="conselho"]');
  await expect(conselho).toHaveAttribute("aria-invalid", "true");
  await expect(conselho).toHaveAttribute("aria-describedby", /-msg$/);
  await expect(page.getByText("Escolha o conselho.")).toBeVisible();
});

test("contato: o Assunto tem a mesma altura dos outros campos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/contato");
  await esperar(page);
  const [assunto, nome] = await Promise.all([caixa(page, 'select[name="assunto"]'), caixa(page, 'input[name="nome"]')]);
  expect(assunto.height).toBe(nome.height);
  const [email, telefone] = await Promise.all([caixa(page, 'input[name="email"]'), caixa(page, 'input[name="telefone"]')]);
  expect(email.y).toBe(telefone.y);
});
