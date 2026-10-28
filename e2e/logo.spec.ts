import { expect, test } from "@playwright/test";

/* Regras do logo do ReabToxin: tamanhos do Header e do Footer, símbolo com 24 px ou mais, linha de apoio só com letra legível,
   e pedras do Hero só à direita quando o Hero não tem imagem. */

const largura = (el: Element) => Math.round(el.getBoundingClientRect().width);

for (const [nome, viewport, header, rodape] of [["desktop", { width: 1440, height: 900 }, 180, 210], ["celular", { width: 390, height: 844 }, 140, 180]] as const) {
  test(`logo (${nome}): Header ${header}px com o símbolo de 24px ou mais; Footer ${rodape}px sem a linha de apoio`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const logoHeader = page.locator("header.ap-header .ap-header-logo svg");
    await expect(logoHeader).toBeVisible();
    expect(await logoHeader.evaluate(largura)).toBe(header);
    const simbolo = await logoHeader.locator('[data-camada="simbolo"]').boundingBox();
    expect(simbolo!.height).toBeGreaterThanOrEqual(23.9);
    await expect(logoHeader.locator('[data-camada="linha-de-apoio"]')).toHaveCount(0);

    const logoRodape = page.locator("footer .ap-footer-brand svg");
    await logoRodape.scrollIntoViewIfNeeded();
    expect(await logoRodape.evaluate(largura)).toBe(rodape);
    await expect(logoRodape.locator('[data-camada="linha-de-apoio"]')).toHaveCount(0); // letra de menos de 11 px: versão sem a linha
    await expect(logoRodape.locator('[data-camada="nome"]')).toHaveCount(1);
    expect((await logoRodape.locator('[data-camada="simbolo"]').boundingBox())!.height).toBeGreaterThanOrEqual(24);
  });
}

test("Hero sem imagem (Contato): pedras só à direita; Hero com imagem (início): pedras como antes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/contato");
  await expect(page.locator(".ap-hero .ap-pedras-right")).toHaveCount(1);
  await expect(page.locator(".ap-hero .ap-pedras-full")).toHaveCount(0);
  const pedras = await page.locator(".ap-hero .ap-pedras-svg").boundingBox();
  const titulo = await page.locator(".ap-hero h1").boundingBox();
  expect(pedras!.x).toBeGreaterThanOrEqual(titulo!.x + titulo!.width * 0.9); // começam depois do título

  await page.goto("/");
  await expect(page.locator(".ap-hero .ap-pedras-full")).toHaveCount(1);
  await expect(page.locator(".ap-hero .ap-pedras-right")).toHaveCount(0);
});
