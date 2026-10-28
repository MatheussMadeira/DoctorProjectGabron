import { expect, test, type Page } from "@playwright/test";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "../db";
import { loginTentativas, turmas, usuarios, type Papel } from "../db/schema";
import { gerarHash } from "../lib/senha";

/* Fluxos do painel contra o build de produção e o banco de desenvolvimento.
   Cria usuários e turmas de teste (e-mail @exemplo.invalid, slug "teste-e2e-…") e remove tudo no fim. */

const SENHA = "senha-de-teste-12345";
const marca = `${Date.now()}`;
const emails = { admin: `e2e-admin-${marca}@exemplo.invalid`, equipe: `e2e-equipe-${marca}@exemplo.invalid`, bloqueio: `e2e-bloqueio-${marca}@exemplo.invalid`, inativo: `e2e-inativo-${marca}@exemplo.invalid` };

async function criarUsuario(email: string, papel: Papel, ativo = true) {
  const [u] = await db.insert(usuarios).values({ nome: `Teste ${papel}`, email, papel, ativo, senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  return u.id;
}

async function entrar(page: Page, email: string, senha = SENHA, esperaEntrar = false) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Login que deve dar certo: espera o painel abrir (e o cookie ser gravado) antes de seguir.
  if (esperaEntrar) await expect(page).toHaveURL(/\/admin$/);
}

/** Preenche e confirma que o valor ficou: antes da hidratação o React ainda pode apagar o que foi digitado. */
async function digitar(page: Page, seletor: string, valor: string) {
  const campo = page.locator(seletor);
  await expect(async () => {
    await campo.fill(valor);
    await page.waitForTimeout(150);
    await expect(campo).toHaveValue(valor);
  }).toPass();
}

const ids: Record<string, string> = {};

test.beforeAll(async () => {
  ids.admin = await criarUsuario(emails.admin, "ADMIN");
  ids.equipe = await criarUsuario(emails.equipe, "EQUIPE");
  ids.bloqueio = await criarUsuario(emails.bloqueio, "EQUIPE");
  ids.inativo = await criarUsuario(emails.inativo, "EQUIPE", false);
});

test.afterAll(async () => {
  await db.delete(turmas).where(like(turmas.slug, "teste-admin-%"));
  await db.delete(loginTentativas).where(like(loginTentativas.email, `e2e-%-${marca}@exemplo.invalid`));
  await db.delete(usuarios).where(inArray(usuarios.id, Object.values(ids)));
});

test("sem sessão, /admin leva ao login e guarda o destino", async ({ page }) => {
  await page.goto("/admin/agenda");
  await expect(page).toHaveURL(/\/admin\/login\?de=%2Fadmin%2Fagenda/);
  await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
});

test("senha errada mostra o erro; depois de 5 tentativas o acesso fica bloqueado, mesmo com a senha certa", async ({ page }) => {
  for (let i = 0; i < 4; i++) {
    await entrar(page, emails.bloqueio, "errada-errada-123");
    await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible();
  }
  await entrar(page, emails.bloqueio, "errada-errada-123");
  await expect(page.getByText("Acesso bloqueado por 15 minutos")).toBeVisible();

  await entrar(page, emails.bloqueio, SENHA); // senha certa, mas bloqueado
  await expect(page.getByText("Acesso bloqueado por 15 minutos")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("usuário desativado não entra", async ({ page }) => {
  await entrar(page, emails.inativo);
  await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible();
});

test("ADMIN vê Excluir e Usuários; EQUIPE não", async ({ page, browser }) => {
  await entrar(page, emails.admin, SENHA, true);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/agenda");
  await page.getByRole("button", { name: /^Excluir:/ }).first().click();
  await expect(page.getByRole("button", { name: "Excluir data" })).toBeVisible();
  await page.goto("/admin/configuracoes?aba=usuarios");
  await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();

  const contexto = await browser.newContext();
  const equipe = await contexto.newPage();
  await entrar(equipe, emails.equipe, SENHA, true);
  await expect(equipe).toHaveURL(/\/admin$/);
  await equipe.goto("/admin/agenda");
  await equipe.getByRole("button", { name: /^Mudar para rascunho:/ }).first().click();
  await expect(equipe.getByRole("button", { name: "Excluir data" })).toHaveCount(0);
  await expect(equipe.getByRole("button", { name: "Mudar para rascunho", exact: true })).toBeVisible();
  await equipe.goto("/admin/configuracoes");
  await expect(equipe.getByRole("heading", { name: "Minha senha" })).toBeVisible();
  await expect(equipe.getByRole("heading", { name: "Usuários" })).toHaveCount(0);
  await contexto.close();
});

test("o papel vale o do banco, não o do cookie: rebaixar o ADMIN tira o Excluir na hora", async ({ page }) => {
  const email = `e2e-rebaixa-${marca}@exemplo.invalid`;
  ids.rebaixa = await criarUsuario(email, "ADMIN");
  await entrar(page, email, SENHA, true);
  await page.goto("/admin/agenda");
  await expect(page.getByRole("button", { name: /^Excluir:/ }).first()).toBeVisible();

  await db.update(usuarios).set({ papel: "EQUIPE" }).where(eq(usuarios.id, ids.rebaixa)); // o cookie ainda diz ADMIN
  await page.reload();
  await expect(page.getByRole("button", { name: /^Excluir:/ })).toHaveCount(0);

  await db.update(usuarios).set({ ativo: false }).where(eq(usuarios.id, ids.rebaixa)); // desativada: perde o acesso
  await page.goto("/admin/agenda");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("criar, editar e excluir uma data: o site público acompanha na hora (tags de cache)", async ({ page }) => {
  await entrar(page, emails.admin, SENHA, true);
  await page.goto("/admin/agenda/nova");
  await page.waitForLoadState("networkidle"); // espera a hidratação: antes dela o React ainda apagaria o que o teste digitar

  const titulo = `Teste e2e ${marca}`;
  await digitar(page, 'input[name="titulo"]', titulo);
  await digitar(page, 'input[name="tituloCurto"]', `teste-admin-${marca}`);
  await digitar(page, 'textarea[name="resumo"]', "Resumo do teste.");
  await digitar(page, 'textarea[name="descricao"]', "Descrição do teste.");
  await digitar(page, 'input[name="inicio"]', "2099-03-14");
  await digitar(page, 'input[name="horario"]', "8h às 18h");
  await digitar(page, 'input[name="vagas"]', "12");
  await page.getByRole("button", { name: "Salvar e publicar" }).click();
  await expect(page.getByText("Data salva e publicada.")).toBeVisible();

  // Site público: a turma já aparece.
  const slug = `teste-admin-${marca}-mar-2099`;
  await page.goto(`/agenda/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  await expect(page.getByText("12 de 12 disponíveis")).toBeVisible();

  // Edita as vagas: a página pública mostra o novo número sem esperar o cache vencer.
  const [t] = await db.select({ id: turmas.id }).from(turmas).where(eq(turmas.slug, slug));
  await page.goto(`/admin/agenda/${t.id}`);
  await page.waitForLoadState("networkidle");
  await digitar(page, 'input[name="vagas"]', "20");
  await page.getByRole("button", { name: "Salvar e publicar" }).click();
  await expect(page.getByText("Data salva e publicada.")).toBeVisible();
  await page.goto(`/agenda/${slug}`);
  await expect(page.getByText("20 de 20 disponíveis")).toBeVisible();

  // Excluir (ADMIN): sai do site.
  await page.goto("/admin/agenda");
  await page.getByRole("button", { name: new RegExp(`^Excluir: ${titulo}`) }).click();
  await page.getByRole("button", { name: "Excluir data" }).click();
  await expect(page.getByText("Data excluída.")).toBeVisible();
  await page.goto(`/agenda/${slug}`);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
});

test("validação no servidor: título vazio e fim antes do início", async ({ page }) => {
  await entrar(page, emails.equipe, SENHA, true);
  await page.goto("/admin/agenda/nova");
  await page.waitForLoadState("networkidle"); // espera a hidratação: antes dela o React ainda apagaria o que o teste digitar
  await digitar(page, 'input[name="inicio"]', "2099-03-14");
  await digitar(page, 'input[name="fim"]', "2099-03-10");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Revise os campos marcados e salve de novo.")).toBeVisible();
  await expect(page.getByText("O fim não pode ser antes do início.")).toBeVisible();
});
