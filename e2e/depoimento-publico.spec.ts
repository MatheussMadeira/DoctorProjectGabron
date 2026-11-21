import { expect, test, type Page } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { db } from "../db";
import { depoimentos, usuarios } from "../db/schema";
import { gerarHash } from "../lib/senha";

/* Depoimento enviado pelo site: entra PENDENTE (nunca aparece), o ADMIN vê na aba Pendentes e só aprova com a data da autorização.
   Depois de aprovado aparece na home e ganha os rascunhos de tradução (provedor falso dos testes). */

test.describe.configure({ mode: "serial" });
// Navegador em português: com outro idioma, a barra de sugestão de idioma fica sobre o fim do formulário e um clique forçado cairia nela.
test.use({ locale: "pt-BR" });

const SENHA = "senha-de-teste-12345";
const marca = `${Date.now()}`;
const emailAdmin = `e2e-depo-${marca}@exemplo.invalid`;
const emailPessoa = `e2e-depo-pessoa-${marca}@exemplo.invalid`;
const nome = `Aluna Teste ${marca}`;
const texto = `Depoimento enviado pelo site para o teste ${marca}, com mais de trinta caracteres.`;
let adminId = "";

async function digitar(page: Page, seletor: string, valor: string) {
  const campo = page.locator(seletor);
  await expect(async () => {
    await campo.fill(valor);
    await page.waitForTimeout(120);
    await expect(campo).toHaveValue(valor);
  }).toPass();
}

test.beforeAll(async () => {
  const [u] = await db.insert(usuarios).values({ nome: "Teste depoimento", email: emailAdmin, papel: "ADMIN", ativo: true, senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  adminId = u.id;
});

test.afterAll(async () => {
  await db.delete(depoimentos).where(like(depoimentos.nome, `%${marca}%`));
  await db.delete(usuarios).where(eq(usuarios.id, adminId));
});

test("o formulário público grava o depoimento como pendente e ele não aparece no site", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.72.${Number(marca.slice(-3)) % 250}.1` });
  await page.goto("/depoimento");
  await page.waitForLoadState("networkidle");
  await expect(page.locator('input[name="carimbo_form"]')).not.toHaveValue("", { timeout: 15_000 });
  await page.waitForTimeout(2200);

  // Sem marcar a autorização, não envia e nada é gravado.
  await digitar(page, 'input[name="nome"]', nome);
  await digitar(page, 'input[name="profissao"]', "Fisioterapeuta");
  await digitar(page, 'input[name="cidade"]', "Belo Horizonte");
  await digitar(page, 'input[name="email"]', emailPessoa);
  await digitar(page, 'textarea[name="texto"]', texto);
  await expect(async () => {
    await page.locator('input[name="privacidade"]').check({ force: true, timeout: 2000 });
  }).toPass();
  await page.locator("form button[type=submit]").click();
  await expect(page.getByText("Marque esta opção para autorizar a publicação.")).toBeVisible();
  expect(await db.select().from(depoimentos).where(eq(depoimentos.nome, nome))).toHaveLength(0);

  await expect(async () => {
    await page.locator('input[name="consentimento"]').check({ force: true, timeout: 2000 });
  }).toPass();
  await page.locator("form button[type=submit]").click();
  await expect(page.getByText("Depoimento enviado", { exact: true })).toBeVisible();

  const [d] = await db.select().from(depoimentos).where(eq(depoimentos.nome, nome));
  expect(d.pendente).toBe(true);
  expect(d.visivel).toBe(false);
  expect(d.autorizacaoRecebidaEm).toBeNull();
  expect(d.consentimentoEm).not.toBeNull();
  expect(d.email).toBe(emailPessoa);
  expect(d.idioma).toBe("pt-BR");

  // Mesmo que alguém marque como visível pelo banco, pendente nunca aparece.
  await db.update(depoimentos).set({ visivel: true, autorizacaoRecebidaEm: "2026-10-01" }).where(eq(depoimentos.nome, nome));
  await page.goto("/");
  await expect(page.getByText(texto)).toHaveCount(0);
  await db.update(depoimentos).set({ visivel: false, autorizacaoRecebidaEm: null }).where(eq(depoimentos.nome, nome));
});

test("o ADMIN vê em Pendentes e só publica ao aprovar com a data da autorização", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(emailAdmin);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/configuracoes?aba=curso");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: /Pendentes/ }).click();
  await expect(page.getByText("Aguardando aprovação").first()).toBeVisible();
  await page.getByRole("button", { name: `Editar o depoimento de ${nome}` }).click();
  await expect(page.getByText("Enviado pelo site, aguardando aprovação")).toBeVisible();

  // A data da autorização vem preenchida com o dia do aceite; sem ela, não aprova.
  const data = page.locator('input[name="autorizacaoRecebidaEm"]');
  await expect(data).not.toHaveValue("");
  await digitar(page, 'input[name="autorizacaoRecebidaEm"]', "");
  await page.getByRole("button", { name: "Aprovar e publicar" }).click();
  await expect(page.getByText("Informe a data em que a autorização por escrito foi recebida")).toBeVisible();
  expect((await db.select().from(depoimentos).where(eq(depoimentos.nome, nome)))[0].pendente).toBe(true);

  // Salvar sem aprovar continua pendente e oculto.
  await digitar(page, 'input[name="autorizacaoRecebidaEm"]', "2026-10-02");
  await page.getByRole("button", { name: "Salvar sem aprovar" }).click();
  await expect(page.getByText("Rascunho salvo")).toBeVisible();
  const [salvo] = await db.select().from(depoimentos).where(eq(depoimentos.nome, nome));
  expect(salvo.pendente).toBe(true);
  expect(salvo.visivel).toBe(false);

  await page.getByRole("button", { name: "Aprovar e publicar" }).click();
  await expect(page.getByText("Depoimento aprovado e publicado")).toBeVisible();
  const [aprovado] = await db.select().from(depoimentos).where(eq(depoimentos.nome, nome));
  expect(aprovado.pendente).toBe(false);
  expect(aprovado.visivel).toBe(true);
  expect(aprovado.autorizacaoRecebidaEm).toBe("2026-10-02");

  // A Home mostra só os 3 primeiros; todos os depoimentos ficam na página Alumni.
  await page.goto("/alumni-reabtoxin");
  await expect(page.getByText(texto)).toBeVisible();
  await page.goto("/en/alumni-reabtoxin");
  await expect(page.getByText(`[en] ${texto}`)).toBeVisible();
});

test("recusar um depoimento pendente o apaga", async ({ page }) => {
  const [novo] = await db
    .insert(depoimentos)
    .values({ nome: `Recusada ${marca}`, profissao: "Dentista", cidade: "BH", texto: "x".repeat(40), email: emailPessoa, idioma: "pt-BR", pendente: true, visivel: false, consentimentoEm: new Date() })
    .returning({ id: depoimentos.id });
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(emailAdmin);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/configuracoes?aba=curso");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: /Pendentes/ }).click();
  await page.getByRole("button", { name: `Recusar o depoimento de Recusada ${marca}` }).click();
  await page.getByRole("button", { name: "Confirmar recusa" }).click();
  await expect.poll(async () => (await db.select().from(depoimentos).where(eq(depoimentos.id, novo.id))).length).toBe(0);
});
