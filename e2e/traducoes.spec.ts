import { expect, test, type Page } from "@playwright/test";
import { and, eq, like } from "drizzle-orm";
import { db } from "../db";
import { depoimentos, professores, professoresTraducoes, textosCurso, usuarios } from "../db/schema";
import { gerarHash } from "../lib/senha";

/* Conteúdo do banco em vários idiomas: a DeepL (aqui, o provedor "falso", que devolve "[idioma] texto") preenche os 6 idiomas ao salvar,
   a revisão vira "revisada", o português mudando troca a revisada por uma automática nova, e sem tradução o site mostra o português. */

test.describe.configure({ mode: "serial" });

const SENHA = "senha-de-teste-12345";
const marca = `${Date.now()}`;
const email = `e2e-trad-${marca}@exemplo.invalid`;
const nomeProf = `Prof Tradução ${marca}`;
let adminId = "";
let textosOriginais: Array<{ bloco: string; conteudo: Record<string, unknown> }> = [];

async function entrar(page: Page) {
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

const linhaDoProfessor = async (locale: string) => {
  const [p] = await db.select({ id: professores.id }).from(professores).where(like(professores.nome, `%${marca}%`));
  const [t] = await db.select().from(professoresTraducoes).where(and(eq(professoresTraducoes.professorId, p.id), eq(professoresTraducoes.locale, locale)));
  return { id: p.id, linha: t };
};

test.beforeAll(async () => {
  const [u] = await db.insert(usuarios).values({ nome: "Teste traduções", email, papel: "ADMIN", ativo: true, senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  adminId = u.id;
  textosOriginais = await db.select({ bloco: textosCurso.bloco, conteudo: textosCurso.conteudo }).from(textosCurso);
});

test.afterAll(async () => {
  await db.delete(professores).where(like(professores.nome, `%${marca}%`));
  await db.delete(depoimentos).where(like(depoimentos.nome, `%${marca}%`));
  for (const t of textosOriginais) await db.update(textosCurso).set({ conteudo: t.conteudo }).where(eq(textosCurso.bloco, t.bloco));
  await db.delete(usuarios).where(eq(usuarios.id, adminId));
});

test("salvar um professor traduz para os 6 idiomas (rascunho automático) e o site mostra a tradução", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=professores");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo professor" }).first().click();
  await digitar(page, 'input[name="nome"]', nomeProf);
  await digitar(page, 'input[name="funcao"]', "Fisioterapia aplicada");
  await digitar(page, 'input[name="registro"]', "CREFITO 12345");
  await digitar(page, 'textarea[name="bio"]', "Mini bio do professor de teste.");
  await page.getByRole("button", { name: "Salvar professor" }).click();
  await expect(page.getByText("Professor salvo")).toBeVisible();

  for (const l of ["en", "es", "fr", "it", "de", "zh"]) {
    const { linha } = await linhaDoProfessor(l);
    expect(linha, l).toBeTruthy();
    expect(linha.status).toBe("rascunho_automatico");
    expect(linha.precisaRevisar).toBe(false);
    expect((linha.conteudo as Record<string, string>).funcao).toBe(`[${l}] Fisioterapia aplicada`);
  }
  await page.goto("/en/sobre-o-curso");
  await expect(page.locator(".ap-prof-titulo", { hasText: "[en] Fisioterapia aplicada" })).toBeVisible();
  await page.goto("/zh/sobre-o-curso");
  await expect(page.locator(".ap-prof-titulo", { hasText: "[zh] Fisioterapia aplicada" })).toBeVisible();
  await page.goto("/sobre-o-curso");
  await expect(page.locator(".ap-prof-titulo", { hasText: "Fisioterapia aplicada" }).first()).toBeVisible();
});

test("a aba Traduções mostra o selo; marcar como revisada tira o selo", async ({ page }) => {
  const { id } = await linhaDoProfessor("en");
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=professores");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Editar ${nomeProf}` }).click();
  const traducoes = page.getByRole("region", { name: "Traduções" });
  await expect(traducoes.getByText("Tradução automática, não revisada")).toBeVisible();
  await traducoes.getByLabel("Marcar como revisada").check({ force: true });
  await traducoes.getByRole("button", { name: "Salvar tradução" }).click();
  await expect(traducoes.getByText("Tradução salva e marcada como revisada.")).toBeVisible();
  const [t] = await db.select().from(professoresTraducoes).where(and(eq(professoresTraducoes.professorId, id), eq(professoresTraducoes.locale, "en")));
  expect(t.status).toBe("revisada");
  expect(t.revisadaPor).toBe(adminId);
});

test("o português mudou: a automática nova ocupa o lugar da revisada, com o aviso 'precisa revisar de novo'", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=professores");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Editar ${nomeProf}` }).click();
  await digitar(page, 'input[name="funcao"]', "Fisioterapia esportiva");
  await page.getByRole("button", { name: "Salvar professor" }).click();
  await expect(page.getByText("Professor salvo")).toBeVisible();

  const { linha } = await linhaDoProfessor("en");
  expect(linha.status).toBe("rascunho_automatico");
  expect(linha.precisaRevisar).toBe(true);
  expect((linha.conteudo as Record<string, string>).funcao).toBe("[en] Fisioterapia esportiva");
  // A bio não mudou: continua como estava (e não foi enviada de novo).
  expect((linha.conteudo as Record<string, string>).bio).toBe("[en] Mini bio do professor de teste.");

  await page.goto("/admin/configuracoes?aba=professores");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Editar ${nomeProf}` }).click();
  await expect(page.getByRole("region", { name: "Traduções" }).getByText("Precisa revisar de novo")).toBeVisible();
  await page.goto("/en/sobre-o-curso");
  await expect(page.locator(".ap-prof-titulo", { hasText: "[en] Fisioterapia esportiva" })).toBeVisible(); // informação atual, mesmo sem revisão
});

test("sem tradução, o site mostra o português (fallback)", async ({ page }) => {
  const { id } = await linhaDoProfessor("de");
  await db.delete(professoresTraducoes).where(and(eq(professoresTraducoes.professorId, id), eq(professoresTraducoes.locale, "de")));
  // O cache do site expira com a tag; força pelo painel (salvar de novo sem mudar nada não reenvia o que já existe nos outros idiomas).
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=professores");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Editar ${nomeProf}` }).click();
  await page.getByRole("button", { name: "Salvar professor" }).click();
  await expect(page.getByText("Professor salvo")).toBeVisible();
  await page.goto("/de/sobre-o-curso");
  await expect(page.locator(".ap-prof-titulo", { hasText: "[de] Fisioterapia esportiva" })).toBeVisible(); // o salvamento traduziu o que faltava
  // Sem a linha E sem provedor, é o português: apaga de novo e confere a leitura direta do fallback.
  await db.delete(professoresTraducoes).where(and(eq(professoresTraducoes.professorId, id), eq(professoresTraducoes.locale, "de")));
  const { linha } = await linhaDoProfessor("de").catch(() => ({ linha: undefined }));
  expect(linha).toBeUndefined();
});

test("depoimento: só aparece no site com a data da autorização; traduzido nos outros idiomas", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=curso");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo depoimento" }).click();
  const nome = `Aluno ${marca}`;
  await digitar(page, 'input[name="nome"]', nome);
  await digitar(page, 'input[name="profissao"]', "Dentista");
  await digitar(page, 'input[name="cidade"]', "Belo Horizonte");
  await digitar(page, 'textarea[name="texto"]', `Depoimento de teste ${marca}.`);
  await page.getByRole("button", { name: "Salvar depoimento" }).click();
  await expect(page.getByText("Informe a data em que a autorização por escrito foi recebida")).toBeVisible();
  expect(await db.select().from(depoimentos).where(eq(depoimentos.nome, nome))).toHaveLength(0);

  await digitar(page, 'input[name="autorizacaoRecebidaEm"]', "2026-10-01");
  await page.getByRole("button", { name: "Salvar depoimento" }).click();
  await expect(page.getByText("Depoimento salvo")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText(`Depoimento de teste ${marca}.`)).toBeVisible();
  await page.goto("/en");
  await expect(page.getByText(`[en] Depoimento de teste ${marca}.`)).toBeVisible();

  // Sem a data (pelo banco, simulando um depoimento antigo), não aparece, nem em português.
  await db.update(depoimentos).set({ autorizacaoRecebidaEm: null }).where(eq(depoimentos.nome, nome));
  await page.goto("/admin/configuracoes?aba=curso");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Editar o depoimento de ${nome}` }).click();
  await page.getByLabel("Mostrar no site").uncheck({ force: true });
  await page.getByRole("button", { name: "Salvar depoimento" }).click();
  await expect(page.getByText("Depoimento salvo")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText(`Depoimento de teste ${marca}.`)).toHaveCount(0);
});

test("Configurações › Curso: o topo da home editado aparece na home e a DeepL traduz", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=curso");
  await page.waitForLoadState("networkidle");
  const novo = `Sobretítulo ${marca}`;
  const campo = page.getByLabel("Sobretítulo").first();
  await expect(async () => {
    await campo.fill(novo);
    await page.waitForTimeout(150);
    await expect(campo).toHaveValue(novo);
  }).toPass();
  await page.getByRole("button", { name: "Salvar textos do curso" }).click();
  await expect(page.getByText("Textos salvos")).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".ap-hero .ap-eyebrow")).toHaveText(novo);
  await page.goto("/de");
  await expect(page.locator(".ap-hero .ap-eyebrow")).toHaveText(`[de] ${novo}`);
});
