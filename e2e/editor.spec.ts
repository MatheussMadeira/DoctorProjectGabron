import { expect, test, type Page } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { siteAuditoria, siteReservas, siteSecoes, usuarios } from "../db/schema";
import { gerarHash } from "../lib/senha";

/* Editor visual (/admin/editor): a prévia é a página real com o rascunho; editar no painel ou no próprio texto atualiza a prévia, salva sozinho
   e NÃO vai ao ar até publicar; ordem e visibilidade valem no rascunho; uma pessoa por vez em cada página. Cada teste desfaz o que mexeu
   (volta as seções ao estado em que estavam) para não deixar o site de desenvolvimento alterado. */

test.describe.configure({ mode: "serial" });
test.use({ locale: "pt-BR", reducedMotion: "reduce" });

const SENHA = "senha-de-teste-12345";
const marca = `${Date.now()}`;
const email = `e2e-editor-${marca}@exemplo.invalid`;
const email2 = `e2e-editor2-${marca}@exemplo.invalid`;
let adminId = "";
let admin2Id = "";
let original: Array<typeof siteSecoes.$inferSelect> = [];

async function entrar(page: Page, qual = email) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(qual);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

const previa = (page: Page) => page.frameLocator('iframe[title^="Prévia"]');

async function abrirEditor(page: Page, pagina = "inicio") {
  await page.goto(`/admin/editor?pagina=${pagina}`);
  await expect(previa(page).locator("[data-editor-section]").first()).toBeAttached({ timeout: 30_000 });
  await page.waitForTimeout(800); // a prévia terminou de anotar o que é editável
}

async function digitar(page: Page, rotulo: string, valor: string) {
  const campo = page.getByLabel(rotulo, { exact: true }).first();
  await expect(async () => {
    await campo.fill(valor);
    await page.waitForTimeout(100);
    await expect(campo).toHaveValue(valor);
  }).toPass();
}

test.beforeAll(async () => {
  const [a, b] = await db
    .insert(usuarios)
    .values([
      { nome: "Teste editor", email, papel: "ADMIN", ativo: true, senhaHash: await gerarHash(SENHA) },
      { nome: "Outra pessoa", email: email2, papel: "ADMIN", ativo: true, senhaHash: await gerarHash(SENHA) },
    ])
    .returning({ id: usuarios.id });
  adminId = a.id;
  admin2Id = (await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email2)))[0].id;
  void b;
  original = await db.select().from(siteSecoes);
});

test.afterAll(async () => {
  // Volta as seções ao que eram antes dos testes (ou apaga as que os testes criaram).
  const antes = new Map(original.map((s) => [s.id, s]));
  for (const s of await db.select().from(siteSecoes)) {
    const o = antes.get(s.id);
    if (!o) await db.delete(siteSecoes).where(eq(siteSecoes.id, s.id));
    else await db.update(siteSecoes).set({ rascunho: o.rascunho, publicado: o.publicado, ordem: o.ordem, visivel: o.visivel, ordemPublicada: o.ordemPublicada, visivelPublicada: o.visivelPublicada }).where(eq(siteSecoes.id, s.id));
  }
  await db.delete(siteAuditoria).where(inArray(siteAuditoria.usuarioId, [adminId, admin2Id]));
  await db.delete(siteReservas).where(inArray(siteReservas.usuarioId, [adminId, admin2Id]));
  await db.delete(usuarios).where(inArray(usuarios.id, [adminId, admin2Id]));
});

// A reserva do teste anterior só vence em 45 s (soltar ao fechar a aba depende de uma chamada que pode não terminar): cada teste começa livre.
test.beforeEach(async () => {
  if (adminId) await db.delete(siteReservas).where(inArray(siteReservas.usuarioId, [adminId, admin2Id]));
});

test("sem sessão, o editor e a prévia mandam para o login", async ({ page }) => {
  await page.goto("/admin/editor");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin/editor/preview/inicio");
  await expect(page).toHaveURL(/\/admin\/login/);
});

const lista = (page: Page) => page.getByRole("navigation", { name: "Seções da página" });
const secao = (page: Page, nome: string) => lista(page).getByRole("button", { name: nome, exact: true });
const rascunhoDe = async (pagina: string, chave: string) => (await db.select().from(siteSecoes).where(eq(siteSecoes.pagina, pagina))).find((x) => x.chave === chave)!;

test("o ADMIN abre o editor: prévia real com a página inteira, lista de seções e campos", async ({ page }) => {
  await entrar(page);
  await abrirEditor(page);
  await expect(secao(page, "Topo da página")).toBeVisible();
  const f = previa(page);
  await expect(f.locator("h1")).toHaveText(/ReabToxin/i);
  await expect(f.locator('[data-editor-section="curso"]')).toContainText("Como é a formação");
  await expect(f.locator("[data-edit-path]").first()).toBeAttached();

  await secao(page, "Como é a formação").click();
  await expect(page.getByLabel("Título", { exact: true }).first()).toHaveValue("Como é a formação");
  // Seções com dados vivos aparecem na prévia (turmas, professores…) e só o cabeçalho delas é editável.
  await expect(f.locator('[data-editor-section="turmas"]')).toContainText("Próximas turmas");
});

test("editar no painel aparece na prévia, salva sozinho e NÃO vai ao ar", async ({ page, request }) => {
  await entrar(page);
  await abrirEditor(page);
  await secao(page, "Como é a formação").click();
  await digitar(page, "Título", `Como é a formação ${marca}`);
  await expect(previa(page).locator('[data-editor-section="curso"]')).toContainText(`Como é a formação ${marca}`);
  await expect.poll(async () => (await rascunhoDe("inicio", "curso")).rascunho.titulo, { timeout: 15_000 }).toBe(`Como é a formação ${marca}`);
  await expect(page.locator("header").getByRole("status")).toContainText("1 seção com alteração não publicada");
  // O site continua como estava.
  const publico = await (await request.get("/")).text();
  expect(publico).not.toContain(`Como é a formação ${marca}`);
});

test("campo vazio ou acima do limite: erro no painel e nada inválido é salvo", async ({ page }) => {
  await entrar(page);
  await abrirEditor(page);
  await secao(page, "Como é a formação").click();
  const salvo = (await rascunhoDe("inicio", "curso")).rascunho.titulo;
  await digitar(page, "Título", "");
  await expect(page.getByText("Título: preencha o campo.")).toBeVisible({ timeout: 15_000 });
  expect((await rascunhoDe("inicio", "curso")).rascunho.titulo).toBe(salvo);
  await digitar(page, "Título", "x".repeat(200));
  await expect(page.getByText("Título: no máximo 120 caracteres.")).toBeVisible({ timeout: 15_000 });
  expect((await rascunhoDe("inicio", "curso")).rascunho.titulo).toBe(salvo);
  await digitar(page, "Título", `Título de novo ${marca}`);
  await expect.poll(async () => (await rascunhoDe("inicio", "curso")).rascunho.titulo, { timeout: 15_000 }).toBe(`Título de novo ${marca}`);
});

test("edição no lugar: clicar no texto da prévia edita ali mesmo; o painel e o rascunho acompanham", async ({ page }) => {
  await entrar(page);
  await abrirEditor(page);
  const titulo = previa(page).locator('[data-editor-section="topo"] h1');
  await expect(titulo).toHaveAttribute("data-edit-path", "titulo");
  await titulo.click();
  await expect(titulo).toHaveAttribute("contenteditable", /plaintext-only|true/);
  await page.keyboard.press("Control+A");
  await page.keyboard.type(`Título no lugar ${marca}`);
  await expect(page.getByLabel("Título", { exact: true }).first()).toHaveValue(`Título no lugar ${marca}`);
  await page.keyboard.press("Enter"); // termina a edição
  await expect(titulo).not.toHaveAttribute("contenteditable", /.+/);
  await expect.poll(async () => (await rascunhoDe("inicio", "topo")).rascunho.titulo, { timeout: 15_000 }).toBe(`Título no lugar ${marca}`);
});

test("desfazer e refazer; descartar alterações volta ao publicado", async ({ page }) => {
  await entrar(page);
  await abrirEditor(page);
  await secao(page, "O curso em números").click();
  const antes = await page.getByLabel("Título", { exact: true }).first().inputValue();
  await digitar(page, "Título", `Números ${marca}`);
  await expect(previa(page).locator('[data-editor-section="numeros"]')).toContainText(`Números ${marca}`);
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByLabel("Título", { exact: true }).first()).toHaveValue(antes);
  await page.getByRole("button", { name: "Refazer" }).click();
  await expect(page.getByLabel("Título", { exact: true }).first()).toHaveValue(`Números ${marca}`);
  await expect.poll(async () => (await rascunhoDe("inicio", "numeros")).rascunho.titulo, { timeout: 15_000 }).toBe(`Números ${marca}`);

  await page.getByRole("button", { name: "Descartar alterações" }).click();
  await expect(page.locator("header").getByRole("status")).toContainText("Tudo publicado", { timeout: 15_000 });
  await expect(previa(page).locator('[data-editor-section="numeros"]')).not.toContainText(`Números ${marca}`);
  expect((await rascunhoDe("inicio", "numeros")).rascunho.titulo).toBe(antes);
});

test("esconder e reordenar seções valem no rascunho, não no ar", async ({ page, request }) => {
  await entrar(page);
  await abrirEditor(page);
  await page.getByRole("button", { name: "Esconder a seção O curso em números" }).click();
  await expect(previa(page).locator('[data-editor-section="numeros"]')).toContainText("Seção oculta");
  await page.getByRole("button", { name: "Subir a seção Professores" }).click();
  await expect.poll(async () => (await rascunhoDe("inicio", "numeros")).visivel, { timeout: 15_000 }).toBe(false);
  expect((await rascunhoDe("inicio", "professores")).ordem).toBeLessThan((await rascunhoDe("inicio", "turmas")).ordem);
  const publico = await (await request.get("/")).text();
  expect(publico).toContain("O curso em números"); // no ar, a seção continua
  await page.getByRole("button", { name: "Descartar alterações" }).click();
  await expect(page.locator("header").getByRole("status")).toContainText("Tudo publicado", { timeout: 15_000 });
});

test("trocar foto: clicar na foto da prévia abre o diálogo, escolher da biblioteca troca na prévia e no rascunho", async ({ page }) => {
  await entrar(page);
  await abrirEditor(page);
  const foto = previa(page).locator('[data-editor-section="topo"] [data-edit-kind="image"]');
  await expect(foto).toBeAttached();
  const antes = ((await rascunhoDe("inicio", "topo")).rascunho.foto as { url: string }).url;
  await foto.click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  await dialogo.locator('button[aria-pressed="false"]').first().click();
  await dialogo.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(dialogo).toBeHidden();
  await expect.poll(async () => ((await rascunhoDe("inicio", "topo")).rascunho.foto as { url: string }).url, { timeout: 15_000 }).not.toBe(antes);
  const depois = (await rascunhoDe("inicio", "topo")).rascunho.foto as { url: string; alt: string };
  expect(depois.url).toMatch(/^\/images\//);
  expect(depois.alt.length).toBeGreaterThan(2);
  await expect(previa(page).locator('[data-editor-section="topo"] img').first()).toHaveAttribute("src", expect.stringContaining(encodeURIComponent(depois.url)));
  await page.getByRole("button", { name: "Descartar alterações" }).click();
  await expect(page.locator("header").getByRole("status")).toContainText("Tudo publicado", { timeout: 15_000 });
});

test("tamanho de tela: celular estreita a prévia para 390px", async ({ page }) => {
  await entrar(page);
  await abrirEditor(page);
  const moldura = page.locator('iframe[title^="Prévia"]');
  await page.getByRole("button", { name: "Celular" }).click();
  await expect.poll(async () => (await moldura.boundingBox())!.width).toBeLessThanOrEqual(391);
  await page.getByRole("button", { name: "Computador" }).click();
  await expect.poll(async () => (await moldura.boundingBox())!.width).toBeGreaterThan(500);
});

test("publicar leva o rascunho ao ar (com tradução) e zera o contador; depois volta ao original", async ({ page, request }) => {
  await entrar(page);
  await abrirEditor(page);
  await secao(page, "Como é a formação").click();
  const original = String((await rascunhoDe("inicio", "curso")).publicado?.titulo ?? "Como é a formação");
  await digitar(page, "Título", `Formação publicada ${marca}`);
  await expect.poll(async () => (await rascunhoDe("inicio", "curso")).rascunho.titulo, { timeout: 15_000 }).toBe(`Formação publicada ${marca}`);
  await page.getByRole("button", { name: "Publicar alterações" }).click();
  await expect(page.getByText("Alterações publicadas. Já estão no site")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("header").getByRole("status")).toContainText("Tudo publicado");

  const linha = await rascunhoDe("inicio", "curso");
  expect(linha.publicado?.titulo).toBe(`Formação publicada ${marca}`);
  expect((await db.select().from(siteAuditoria).where(eq(siteAuditoria.usuarioId, adminId))).length).toBeGreaterThan(0);
  expect(await (await request.get("/")).text()).toContain(`Formação publicada ${marca}`);
  // Em outro idioma, a tradução (provedor falso dos testes: "[en] texto") vem do que foi publicado.
  expect(await (await request.get("/en")).text()).toContain(`[en] Formação publicada ${marca}`);

  // Volta ao título original e publica de novo (deixa o site como estava).
  await digitar(page, "Título", original);
  await expect.poll(async () => (await rascunhoDe("inicio", "curso")).rascunho.titulo, { timeout: 15_000 }).toBe(original);
  await page.getByRole("button", { name: "Publicar alterações" }).click();
  await expect(page.locator("header").getByRole("status")).toContainText("Tudo publicado", { timeout: 30_000 });
  await expect.poll(async () => (await request.get("/")).text(), { timeout: 15_000 }).not.toContain(`Formação publicada ${marca}`);
});

test("uma pessoa por vez em cada página; a mesma pessoa em outra aba assume e a antiga pausa", async ({ page, browser, baseURL }) => {
  await entrar(page);
  await abrirEditor(page, "sobre-o-curso");
  const secundaria = await browser.newContext({ baseURL, locale: "pt-BR" });
  const p2 = await secundaria.newPage();
  await entrar(p2, email2);
  await p2.goto("/admin/editor?pagina=sobre-o-curso");
  await expect(p2.getByRole("heading", { name: "Esta página está sendo editada" })).toBeVisible({ timeout: 20_000 });
  await expect(p2.getByText("Teste editor está com Sobre o curso aberta")).toBeVisible();
  // Outra página continua livre para a segunda pessoa.
  await p2.goto("/admin/editor?pagina=inicio");
  await expect(p2.locator('iframe[title^="Prévia"]')).toBeVisible({ timeout: 20_000 });
  await secundaria.close();

  // A mesma pessoa em outra aba assume; a aba antiga, ao salvar, descobre e pausa.
  const aba2 = await page.context().newPage();
  await abrirEditor(aba2, "sobre-o-curso");
  await secao(page, "Valores").click();
  await digitar(page, "Título", `Pausa ${marca}`);
  await expect(page.getByText("Edição pausada").first()).toBeVisible({ timeout: 20_000 });
  expect((await rascunhoDe("sobre-o-curso", "valores")).rascunho.titulo).not.toBe(`Pausa ${marca}`);
  await aba2.close();
});
