import { expect, test, type Page } from "@playwright/test";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { configuracoes, emailsEnvios, inscricoes, turmas, usuarios, type Papel } from "../db/schema";
import { gerarHash } from "../lib/senha";

/* Configurações (só ADMIN), e-mail de teste e e-mail de "vaga confirmada", contra o build de produção.
   Os dados da clínica são uma linha única: o teste guarda a original e a devolve no fim. Roda em série. */

test.describe.configure({ mode: "serial" });

const SENHA = "senha-de-teste-12345";
const marca = `${Date.now()}`;
const emailAdmin = `e2e-config-admin-${marca}@exemplo.invalid`;
const emailEquipe = `e2e-config-equipe-${marca}@exemplo.invalid`;
const slug = `teste-config-${marca}`;
const ids: { usuarios: string[]; turma?: string } = { usuarios: [] };
let linhaOriginal: typeof configuracoes.$inferSelect | undefined;

async function criarUsuario(email: string, papel: Papel) {
  const [u] = await db.insert(usuarios).values({ nome: `Teste ${papel}`, email, papel, ativo: true, senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  ids.usuarios.push(u.id);
}

async function entrar(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function digitar(page: Page, seletor: string, valor: string) {
  const campo = page.locator(seletor);
  await expect(async () => {
    await campo.fill(valor);
    await page.waitForTimeout(150);
    await expect(campo).toHaveValue(valor);
  }).toPass();
}

test.beforeAll(async () => {
  [linhaOriginal] = await db.select().from(configuracoes);
  await criarUsuario(emailAdmin, "ADMIN");
  await criarUsuario(emailEquipe, "EQUIPE");
});

test.afterAll(async () => {
  if (linhaOriginal) await db.update(configuracoes).set(linhaOriginal).where(eq(configuracoes.id, 1));
  else await db.delete(configuracoes);
  if (ids.turma) {
    await db.delete(inscricoes).where(eq(inscricoes.turmaId, ids.turma)); // os e-mails saem junto (cascade)
    await db.delete(turmas).where(eq(turmas.id, ids.turma));
  }
  await db.delete(usuarios).where(inArray(usuarios.id, ids.usuarios));
});

test("ADMIN salva os dados da clínica e o site público muda na hora (rodapé, WhatsApp, contato)", async ({ page }) => {
  await entrar(page, emailAdmin);
  await page.goto("/admin/configuracoes?aba=contato");
  await page.waitForLoadState("networkidle");

  await digitar(page, 'input[name="telefone"]', "(31) 91234-5678");
  await digitar(page, 'input[name="whatsapp"]', "5531912345678");
  await digitar(page, 'input[name="instagram"]', "@dra.teste");
  await page.getByRole("button", { name: "Salvar dados" }).click();
  await expect(page.getByText("O site já mostra os novos dados.")).toBeVisible();

  await page.goto("/contato");
  const rodape = page.locator("footer");
  await expect(rodape).toContainText("(31) 91234-5678");
  await expect(rodape).toContainText("© 2026 ReabToxin · Formação em toxina botulínica · Belo Horizonte, MG");
  await expect(rodape).not.toContainText(/CRM|RQE/);
  await expect(page.locator('a[href^="https://wa.me/5531912345678"]').first()).toBeAttached();
});

test("campo inválido volta com erro e não grava", async ({ page }) => {
  await entrar(page, emailAdmin);
  await page.goto("/admin/configuracoes?aba=contato");
  await page.waitForLoadState("networkidle");
  await digitar(page, 'input[name="whatsapp"]', "abc");
  await page.getByRole("button", { name: "Salvar dados" }).click();
  await expect(page.getByText("Revise os campos marcados e salve de novo.")).toBeVisible();
  const [linha] = await db.select().from(configuracoes);
  expect(linha.whatsapp).toBe("5531912345678");
});

test("EQUIPE não vê nem usa os dados da clínica", async ({ page }) => {
  await entrar(page, emailEquipe);
  await page.goto("/admin/configuracoes?aba=contato");
  await expect(page.getByRole("button", { name: "Salvar dados" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Enviar e-mail de teste/ })).toHaveCount(0);
});

test("botão de e-mail de teste manda para o ADMIN logado e registra o resultado na tela", async ({ page }) => {
  await entrar(page, emailAdmin);
  await page.goto("/admin/configuracoes?aba=contato");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Enviar e-mail de teste para ${emailAdmin}` }).click();
  await expect(page.getByText("Teste enviado", { exact: true })).toBeVisible();
  await expect(page.getByText(/provedor: console/)).toBeVisible();
});

test("mudar a situação para Confirmada envia o e-mail de vaga confirmada, uma vez só", async ({ page }) => {
  const [t] = await db
    .insert(turmas)
    .values({ slug, titulo: `Turma config ${marca}`, resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL", publicacao: "PUBLICADO", inicio: "2099-05-09", horario: "8h às 18h", cidade: "Belo Horizonte, MG", vagas: 5, fotoUrl: "/images/maos.webp", fotoAlt: "Teste" })
    .returning({ id: turmas.id });
  ids.turma = t.id;
  const [ins] = await db
    .insert(inscricoes)
    .values({ turmaId: t.id, nome: "Maria Teste", email: `pessoa-${marca}@exemplo.invalid`, telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "00000 / MG", aceitePrivacidadeEm: new Date() })
    .returning({ id: inscricoes.id });

  await entrar(page, emailAdmin);
  await page.goto(`/admin/inscricoes?turma=${t.id}`);
  await page.waitForLoadState("networkidle");
  const select = page.getByLabel("Situação de Maria Teste");
  await select.selectOption("CONFIRMADA");

  const buscar = () => db.select().from(emailsEnvios).where(and(eq(emailsEnvios.inscricaoId, ins.id), eq(emailsEnvios.tipo, "INSCRICAO_VAGA_CONFIRMADA")));
  await expect.poll(async () => (await buscar()).length, { timeout: 15_000 }).toBe(1);
  const [registro] = await buscar();
  expect(registro.destinatario).toBe(`pessoa-${marca}@exemplo.invalid`);
  await expect.poll(async () => (await buscar())[0].status).toBe("ENVIADO");

  // O painel mostra o e-mail na linha; recarregar a página não gera outro envio.
  await page.reload();
  await expect(page.getByText("Vaga confirmada").first()).toBeVisible();
  expect((await buscar()).length).toBe(1);
});

test("painel: só o ADMIN vê os envios barrados nos formulários; o rótulo do papel é neutro", async ({ page, browser }) => {
  await entrar(page, emailAdmin);
  await expect(page.getByRole("heading", { name: "Envios barrados nos formulários (7 dias)" })).toBeVisible();
  await expect(page.getByText("Parecem robô")).toBeVisible();
  await expect(page.getByText("Administração", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Administradora")).toHaveCount(0);

  const equipe = await (await browser.newContext()).newPage();
  await equipe.goto("/admin/login");
  await equipe.getByLabel("E-mail").fill(emailEquipe);
  await equipe.getByLabel("Senha").fill(SENHA);
  await equipe.getByRole("button", { name: "Entrar" }).click();
  await expect(equipe).toHaveURL(/\/admin$/);
  await expect(equipe.getByRole("heading", { name: /Envios barrados/ })).toHaveCount(0);
});
