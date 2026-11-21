import { expect, test, type Page } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { db } from "../db";
import { usuarios, viagemChegada, viagemLocais } from "../db/schema";
import { criarTradutor } from "../lib/i18n/mensagens";
import { distanciaKm, linkDoMapa, mapaEmbutido } from "../lib/viagem-geo";
import { gerarHash } from "../lib/senha";

/* Travel info (/viagem): abas do guia, cartões com distância até o local do curso, mapa embutido, link do Maps, tradução e cadastro no painel. */

test.describe.configure({ mode: "serial" });
test.use({ locale: "pt-BR" });

const SENHA = "senha-de-teste-12345";
const marca = `${Date.now()}`;
const emailAdmin = `e2e-viagem-${marca}@exemplo.invalid`;
const nomeSede = `Sede Teste ${marca}`;
const nomeHotel = `Hotel Teste ${marca}`;
const tituloChegada = `Chegada Teste ${marca}`;
let adminId = "";

async function digitar(page: Page, seletor: string, valor: string) {
  const campo = page.locator(seletor);
  await expect(async () => {
    await campo.fill(valor);
    await page.waitForTimeout(120);
    await expect(campo).toHaveValue(valor);
  }).toPass();
}

async function entrar(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(emailAdmin);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.beforeAll(async () => {
  const [u] = await db.insert(usuarios).values({ nome: "Teste viagem", email: emailAdmin, papel: "ADMIN", ativo: true, senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  adminId = u.id;
});

test.afterAll(async () => {
  await db.delete(viagemLocais).where(like(viagemLocais.nome, `%${marca}%`));
  await db.delete(viagemChegada).where(like(viagemChegada.titulo, `%${marca}%`));
  await db.delete(usuarios).where(eq(usuarios.id, adminId));
});

test("funções de mapa: distância, link do Maps e mapa embutido sem chave", () => {
  const ufmg = { latitude: -19.8697, longitude: -43.9645 };
  const praca = { latitude: -19.9319, longitude: -43.9378 };
  expect(distanciaKm(ufmg, ufmg)).toBe(0);
  expect(distanciaKm(ufmg, praca)).toBeGreaterThan(6);
  expect(distanciaKm(ufmg, praca)).toBeLessThan(8);
  expect(linkDoMapa({ nome: "X", endereco: "Rua Y", latitude: -19.5, longitude: -43.5 })).toBe("https://www.google.com/maps/search/?api=1&query=-19.5%2C-43.5");
  expect(linkDoMapa({ nome: "Hotel X", endereco: "Rua Y, 1", latitude: null, longitude: null })).toContain("query=Hotel%20X%2C%20Rua%20Y%2C%201");
  expect(mapaEmbutido(ufmg)).toMatch(/^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?bbox=.*&marker=-19\.86970%2C-43\.96450$/);
});

test("o ADMIN cadastra um local e um item de 'Como chegar' e o site mostra, com mapa e distância", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/viagem");
  await page.waitForLoadState("networkidle");

  // Local do curso (sede), com coordenadas.
  await page.getByRole("button", { name: "Novo local" }).first().click();
  await page.locator('select[name="categoria"]').selectOption("LOCAL");
  await digitar(page, 'input[name="nome"]', nomeSede);
  await digitar(page, 'textarea[name="descricao"]', `Descrição da sede ${marca}.`);
  await digitar(page, 'input[name="endereco"]', "Av. Pres. Antônio Carlos, 6627, Belo Horizonte");
  await digitar(page, 'input[name="latitude"]', "-19,8697");
  await digitar(page, 'input[name="longitude"]', "-43.9645");
  await page.getByRole("button", { name: "Salvar local" }).click();
  await expect(page.getByText("Local salvo", { exact: true })).toBeVisible();

  // Só latitude: recusa.
  await page.getByRole("button", { name: "Novo local" }).first().click();
  await digitar(page, 'input[name="nome"]', `Sem longitude ${marca}`);
  await digitar(page, 'input[name="latitude"]', "-19.9");
  await page.getByRole("button", { name: "Salvar local" }).click();
  await expect(page.getByText("Preencha latitude e longitude, ou deixe as duas vazias.")).toBeVisible();
  expect(await db.select().from(viagemLocais).where(eq(viagemLocais.nome, `Sem longitude ${marca}`))).toHaveLength(0);

  // Hotel perto da sede.
  await page.getByRole("button", { name: "Novo local" }).first().click();
  await page.locator('select[name="categoria"]').selectOption("HOTEL");
  await digitar(page, 'input[name="nome"]', nomeHotel);
  await digitar(page, 'textarea[name="descricao"]', `Descrição do hotel ${marca}.`);
  await digitar(page, 'input[name="latitude"]', "-19.9208");
  await digitar(page, 'input[name="longitude"]', "-43.9456");
  await digitar(page, 'input[name="site"]', "https://www.exemplo.invalid/hotel");
  await page.locator('select[name="faixaPreco"]').selectOption("3");
  await page.getByRole("button", { name: "Salvar local" }).click();
  await expect(page.getByText("Local salvo", { exact: true })).toBeVisible();

  // Como chegar.
  await page.goto("/admin/viagem?aba=chegada");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo item" }).first().click();
  await digitar(page, 'input[name="titulo"]', tituloChegada);
  await digitar(page, 'textarea[name="texto"]', `Primeiro parágrafo ${marca}.\n\nSegundo parágrafo.`);
  await page.getByRole("button", { name: "Salvar item" }).click();
  await expect(page.getByText("Item salvo", { exact: true })).toBeVisible();

  const [hotel] = await db.select().from(viagemLocais).where(eq(viagemLocais.nome, nomeHotel));
  expect(hotel.faixaPreco).toBe(3);
  expect(hotel.latitude).toBeCloseTo(-19.9208, 4);
});

test("a página /viagem mostra as abas, o mapa da sede, a distância e o link do Maps", async ({ page }) => {
  await page.goto("/viagem");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const abas = page.getByRole("tablist");
  // Local do curso é a primeira aba, com o mapa embutido (sem chave de API).
  await expect(page.getByRole("tab", { name: "Local do curso" })).toHaveAttribute("aria-selected", "true");
  const painelLocal = page.getByRole("tabpanel", { name: "Local do curso" });
  await expect(painelLocal.getByRole("heading", { name: nomeSede })).toBeVisible();
  await expect(painelLocal.locator(`iframe[title="Mapa: ${nomeSede}"]`)).toHaveAttribute("src", /^https:\/\/www\.openstreetmap\.org\/export\/embed\.html/);

  // Hotéis: o cartão do hotel mostra a distância até a sede e o preço, e o link abre o Maps.
  await abas.getByRole("tab", { name: /Hotéis/ }).click();
  const painelHoteis = page.getByRole("tabpanel", { name: "Hotéis" });
  const cartao = painelHoteis.locator("article", { hasText: nomeHotel });
  await expect(cartao).toBeVisible();
  await expect(cartao.getByText(new RegExp(`km de ${nomeSede}`))).toBeVisible();
  await expect(cartao.getByRole("img", { name: "Faixa de preço: 3 de 4" })).toBeVisible();
  await expect(cartao.getByRole("link", { name: /Abrir no Google Maps/ })).toHaveAttribute("href", /google\.com\/maps\/search\/\?api=1&query=-19\.9208%2C-43\.9456/);
  await expect(cartao.getByRole("link", { name: /exemplo\.invalid/ })).toHaveAttribute("target", "_blank");
  await expect(cartao.getByText(/Atualizado em/)).toBeVisible();

  // Como chegar: sanfona nativa (details) que abre com o teclado.
  await abas.getByRole("tab", { name: "Como chegar" }).click();
  const sanfona = page.locator("details", { hasText: tituloChegada });
  await expect(sanfona).toBeVisible();
  await sanfona.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(sanfona.getByText(`Primeiro parágrafo ${marca}.`)).toBeVisible();
  await expect(sanfona.getByText("Segundo parágrafo.")).toBeVisible();
});

test("em outros idiomas: abas e textos traduzidos, a descrição vem da tradução e a distância usa o formato do idioma", async ({ page }) => {
  const t = criarTradutor("de", "Viagem");
  await page.goto("/de/viagem");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("tab", { name: t("abaChegar") })).toBeVisible();
  await page.getByRole("tab", { name: new RegExp(t("abaHoteis")) }).click();
  const cartao = page.locator("article", { hasText: nomeHotel });
  await expect(cartao).toBeVisible();
  // O provedor falso dos testes devolve "[de] texto" na descrição; o nome não é traduzido.
  await expect(cartao.getByText(`[de] Descrição do hotel ${marca}.`)).toBeVisible();
  // A frase da distância vem traduzida ("A … km von …"), com o número no formato do idioma.
  await expect(cartao.getByText(new RegExp(`km von ${nomeSede}`))).toBeVisible();
});

test("local oculto no painel some do site e o menu leva à página nos 7 idiomas", async ({ page }) => {
  // Pelo painel (e não direto no banco): é o painel que expira o cache do site.
  await entrar(page);
  await page.goto("/admin/viagem");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Editar ${nomeHotel}` }).click();
  await page.getByLabel("Mostrar no site").uncheck({ force: true });
  await page.getByRole("button", { name: "Salvar local" }).click();
  await expect(page.getByText("Local salvo", { exact: true })).toBeVisible();

  await page.goto("/viagem");
  await page.getByRole("tab", { name: /Hotéis|Hotéis/ }).click();
  await expect(page.locator("article", { hasText: nomeHotel })).toHaveCount(0);

  for (const locale of ["en", "es", "fr", "it", "de", "zh"]) {
    await page.goto(`/${locale}`);
    await expect(page.locator(`header a[href="/${locale}/viagem"]`).first()).toBeAttached();
  }
  await page.goto("/");
  await expect(page.locator('header a[href="/viagem"]').first()).toBeVisible();
});
