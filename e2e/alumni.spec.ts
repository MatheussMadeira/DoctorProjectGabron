import { expect, test, type Page } from "@playwright/test";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "../db";
import { alumni, alumniTurmas, depoimentos, inscricoes, turmas, usuarios } from "../db/schema";
import { criarTradutor } from "../lib/i18n/mensagens";
import { gerarHash } from "../lib/senha";

/* Alumni ReabToxin (/alumni-reabtoxin): mapa com pins (Brasil e mundo), lista alternativa, turmas realizadas, depoimentos com vídeo, cadastro e
   importação no painel. Aluno só aparece com a data da autorização; pendente de importação nunca aparece. */

test.describe.configure({ mode: "serial" });
test.use({ locale: "pt-BR", reducedMotion: "reduce" }); // sem rotação do globo nem animações: o teste fica estável

const SENHA = "senha-de-teste-12345";
const marca = `${Date.now()}`;
const emailAdmin = `e2e-alumni-${marca}@exemplo.invalid`;
const cidadeBr = `Recifeteste${marca}`;
const nomeAluno = `Aluna Mapa ${marca}`;
const nomeFora = `Aluno Lisboa ${marca}`;
const tituloTurma = `Turma Alumni ${marca}`;
const nomeFala = `Depoimento Alumni ${marca}`;
const slugAgenda = `teste-e2e-alumni-${marca}`;
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

/** O mapa só baixa os dados quando a seção aparece na tela: rola até ela. */
async function abrirMapa(page: Page) {
  await page.goto("/alumni-reabtoxin");
  // No centro da tela, para o cabeçalho fixo não ficar por cima dos pins.
  await page.getByRole("heading", { name: "Mapa dos alunos", level: 3 }).evaluate((el) => el.closest("[data-modo]")?.scrollIntoView({ block: "center" }));
}

test.beforeAll(async () => {
  const [u] = await db.insert(usuarios).values({ nome: "Teste alumni", email: emailAdmin, papel: "ADMIN", ativo: true, senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  adminId = u.id;
});

test.afterAll(async () => {
  await db.delete(alumni).where(like(alumni.nome, `%${marca}%`));
  await db.delete(alumniTurmas).where(like(alumniTurmas.titulo, `%${marca}%`));
  await db.delete(depoimentos).where(like(depoimentos.nome, `%${marca}%`));
  const ts = await db.select({ id: turmas.id }).from(turmas).where(eq(turmas.slug, slugAgenda));
  if (ts.length) {
    await db.delete(inscricoes).where(inArray(inscricoes.turmaId, ts.map((t) => t.id)));
    await db.delete(turmas).where(inArray(turmas.id, ts.map((t) => t.id)));
  }
  await db.delete(usuarios).where(eq(usuarios.id, adminId));
});

test("o ADMIN cadastra uma turma realizada e alunos; sem autorização o aluno não pode ficar visível", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/alumni");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Nova turma realizada" }).first().click();
  await digitar(page, 'input[name="titulo"]', tituloTurma);
  await digitar(page, 'input[name="dataInicio"]', "2026-02-07");
  await digitar(page, 'input[name="dataFim"]', "2026-02-08");
  await digitar(page, 'input[name="cidade"]', "Belo Horizonte, MG");
  await digitar(page, 'input[name="numeroAlunos"]', "13");
  await digitar(page, 'textarea[name="resumo"]', `Resumo da turma ${marca}.`);
  await digitar(page, 'input[name="videoUrl"]', "https://evil.example/video");
  await page.getByRole("button", { name: "Salvar turma" }).click();
  await expect(page.getByText(/Use um link do YouTube, do Vimeo/)).toBeVisible();
  expect(await db.select().from(alumniTurmas).where(eq(alumniTurmas.titulo, tituloTurma))).toHaveLength(0);
  await digitar(page, 'input[name="videoUrl"]', "https://youtu.be/jNQXAC9IVRw");
  await page.getByRole("button", { name: "Salvar turma" }).click();
  await expect(page.getByText("Turma salva", { exact: true })).toBeVisible();

  await page.goto("/admin/alumni?aba=alunos");
  await page.waitForLoadState("networkidle");

  // Visível sem a data da autorização: recusa.
  await page.getByRole("button", { name: "Novo aluno" }).first().click();
  await digitar(page, 'input[name="nome"]', nomeAluno);
  await digitar(page, 'input[name="profissao"]', "Dentista");
  await digitar(page, 'input[name="cidade"]', cidadeBr);
  await page.locator('select[name="uf"]').selectOption("AL");
  await digitar(page, 'input[name="latitude"]', "-9,6498");
  await digitar(page, 'input[name="longitude"]', "-35.7089");
  await page.getByLabel("Mostrar no site e no mapa").check({ force: true });
  await page.getByRole("button", { name: "Salvar aluno" }).click();
  await expect(page.getByText("Informe a data em que a autorização por escrito foi recebida")).toBeVisible();
  expect(await db.select().from(alumni).where(eq(alumni.nome, nomeAluno))).toHaveLength(0);

  // Com a data: salva e aparece.
  await digitar(page, 'input[name="autorizacaoRecebidaEm"]', "2026-10-01");
  await page.getByRole("button", { name: "Salvar aluno" }).click();
  await expect(page.getByText("Aluno salvo", { exact: true })).toBeVisible();
  const [a] = await db.select().from(alumni).where(eq(alumni.nome, nomeAluno));
  expect(a.visivel).toBe(true);
  expect(a.uf).toBe("AL");
  expect(a.latitude).toBeCloseTo(-9.6498, 4);

  // Um aluno de fora do Brasil (aparece só no globo).
  await page.getByRole("button", { name: "Novo aluno" }).first().click();
  await digitar(page, 'input[name="nome"]', nomeFora);
  await digitar(page, 'input[name="cidade"]', "Lisboa");
  await digitar(page, 'input[name="pais"]', "PT");
  await digitar(page, 'input[name="latitude"]', "38.7223");
  await digitar(page, 'input[name="longitude"]', "-9.1393");
  await digitar(page, 'input[name="autorizacaoRecebidaEm"]', "2026-10-02");
  await page.getByLabel("Mostrar no site e no mapa").check({ force: true });
  await page.getByRole("button", { name: "Salvar aluno" }).click();
  await expect(page.getByText("Aluno salvo", { exact: true })).toBeVisible();
});

test("o mapa do Brasil mostra o pin da cidade: passar o mouse, focar e tocar mostram quem é; Esc fecha", async ({ page }) => {
  await abrirMapa(page);
  const pin = page.locator(`[data-pin][aria-label*="${cidadeBr}"]`);
  await expect(pin).toBeVisible({ timeout: 20_000 });
  await expect(pin).toHaveAttribute("aria-label", new RegExp(`${cidadeBr}, AL: 1 aluno`));

  await pin.hover();
  const cartao = page.getByRole("dialog");
  await expect(cartao).toContainText(nomeAluno);
  await expect(cartao).toContainText("Dentista");
  await page.mouse.move(5, 5);
  await expect(cartao).toHaveCount(0);

  // Teclado: foco abre o cartão, Enter fixa, Esc fecha.
  await pin.focus();
  await expect(page.getByRole("dialog")).toContainText(nomeAluno);
  await page.keyboard.press("Enter");
  await expect(pin).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Toque/clique fixa o cartão e o botão fecha.
  await pin.click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Fechar" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // O aluno de fora do Brasil não aparece no mapa do Brasil.
  await expect(page.locator('[data-pin][aria-label*="Lisboa"]')).toHaveCount(0);
});

test("o globo mostra os alunos de fora do Brasil e os do Brasil", async ({ page }) => {
  await abrirMapa(page);
  await expect(page.locator(`[data-pin][aria-label*="${cidadeBr}"]`)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Mundo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mundo", exact: true })).toHaveAttribute("aria-pressed", "true");
  const lisboa = page.locator('[data-pin][aria-label*="Lisboa"]');
  await expect(lisboa).toBeVisible();
  await lisboa.hover();
  await expect(page.getByRole("dialog")).toContainText(nomeFora);
  await expect(page.getByText("Arraste para girar o globo.")).toBeVisible();
  await page.getByRole("button", { name: "Brasil", exact: true }).click();
  await expect(page.locator('[data-pin][aria-label*="Lisboa"]')).toHaveCount(0);
});

test("a lista por local repete o mapa para quem não usa mouse, e a turma realizada aparece com vídeo e alunos", async ({ page }) => {
  await page.goto("/alumni-reabtoxin");
  await page.getByText("Ver a lista por local").click();
  const lista = page.getByRole("list", { name: "Ver a lista por local" });
  await expect(lista).toContainText("Alagoas (AL)");
  await expect(lista).toContainText(nomeAluno);
  await expect(lista).toContainText("Portugal");

  const turma = page.locator("article", { hasText: tituloTurma });
  await expect(turma).toBeVisible();
  await expect(turma).toContainText("13 alunos");
  await expect(turma).toContainText("7 e 8 de fevereiro");
  await expect(turma.locator('iframe[src^="https://www.youtube-nocookie.com/embed/jNQXAC9IVRw"]')).toHaveAttribute("title", `Vídeo: ${tituloTurma}`);
});

test("depoimento com cidade, foto opcional e vídeo: aparece na Alumni (com o pin) e a Home leva até ele", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=curso");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo depoimento" }).click();
  await digitar(page, 'input[name="nome"]', nomeFala);
  await digitar(page, 'input[name="profissao"]', "Fisioterapeuta");
  await digitar(page, 'textarea[name="texto"]', `Texto do depoimento ${marca}.`);
  await digitar(page, 'input[name="cidade"]', `Cidadefala${marca}`);
  await page.locator('select[name="uf"]').selectOption("BA");
  await digitar(page, 'input[name="latitude"]', "-12.9714");
  await digitar(page, 'input[name="longitude"]', "-38.5014");
  await digitar(page, 'input[name="videoUrl"]', "https://vimeo.com/76979871");
  await digitar(page, 'input[name="autorizacaoRecebidaEm"]', "2026-10-01");
  await page.getByRole("button", { name: "Salvar depoimento" }).click();
  await expect(page.getByText("Depoimento salvo", { exact: true })).toBeVisible();
  const [d] = await db.select().from(depoimentos).where(eq(depoimentos.nome, nomeFala));
  expect(d.uf).toBe("BA");
  expect(d.videoUrl).toBe("https://vimeo.com/76979871");

  await abrirMapa(page);
  const cartao = page.locator(`#depoimento-${d.id}`);
  await expect(cartao).toContainText(`Texto do depoimento ${marca}.`);
  await expect(cartao.locator('iframe[src="https://player.vimeo.com/video/76979871"]')).toBeVisible();
  const pin = page.locator(`[data-pin][aria-label*="Cidadefala${marca}"]`);
  await expect(pin).toBeVisible({ timeout: 20_000 });
  await pin.hover();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Ler o depoimento" })).toHaveAttribute("href", `#depoimento-${d.id}`);

  // Home: no máximo 3 depoimentos, cada um com link para a Alumni.
  await page.goto("/");
  const cards = page.locator("#depoimentos figure");
  expect(await cards.count()).toBeLessThanOrEqual(3);
  const links = page.locator('#depoimentos a[href*="/alumni-reabtoxin#depoimento-"]');
  expect(await links.count()).toBe(await cards.count());
  await expect(page.locator("#depoimentos").getByRole("link", { name: "Conhecer a Alumni ReabToxin" })).toHaveAttribute("href", "/alumni-reabtoxin");
});

test("importar da agenda: a turma que passou vira página da Alumni e os alunos confirmados entram ocultos e sem autorização", async ({ page }) => {
  const [t] = await db
    .insert(turmas)
    .values({ slug: slugAgenda, titulo: `Turma Agenda ${marca}`, tituloCurto: `Agenda ${marca}`, resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL", publicacao: "PUBLICADO", inicio: "2026-01-10", fim: "2026-01-11", horario: "8h", cidade: "Belo Horizonte, MG", vagas: 10, fotoUrl: "/images/maos.webp", fotoAlt: "Teste" })
    .returning({ id: turmas.id });
  const base = { turmaId: t.id, telefone: "31999990000", profissao: "Médico(a)", conselho: "CRM" as const, registro: "12345 / MG", aceitePrivacidadeEm: new Date(), situacao: "CONFIRMADA" as const };
  await db.insert(inscricoes).values([
    { ...base, nome: `Importada Um ${marca}`, email: `e2e-alumni-1-${marca}@exemplo.invalid` },
    { ...base, nome: `Importada Dois ${marca}`, email: `e2e-alumni-2-${marca}@exemplo.invalid` },
    { ...base, nome: `Lista ${marca}`, email: `e2e-alumni-3-${marca}@exemplo.invalid`, situacao: "LISTA_ESPERA" as const },
  ]);

  await entrar(page);
  await page.goto("/admin/alumni");
  await page.waitForLoadState("networkidle");
  const aviso = page.locator("li", { hasText: `Agenda ${marca}` });
  await expect(aviso).toBeVisible();
  await aviso.getByRole("button", { name: "Adicionar à Alumni" }).click();
  await expect(page.locator("tr", { hasText: `Agenda ${marca}` })).toBeVisible();
  await expect(page.locator("li", { hasText: `Agenda ${marca}` })).toHaveCount(0);

  await page.getByRole("button", { name: `Editar Agenda ${marca}` }).click();
  await page.getByRole("button", { name: "Importar alunos confirmados desta turma" }).click();
  await expect(page.getByText("2 aluno(s) importado(s).")).toBeVisible();
  await page.getByRole("button", { name: "Importar alunos confirmados desta turma" }).click();
  await expect(page.getByText("Nenhum aluno novo para importar.")).toBeVisible();

  const importados = await db.select().from(alumni).where(like(alumni.nome, `Importada%${marca}`));
  expect(importados).toHaveLength(2);
  for (const i of importados) {
    expect(i.visivel).toBe(false);
    expect(i.autorizacaoRecebidaEm).toBeNull();
  }
  expect(await db.select().from(alumni).where(like(alumni.nome, `Lista%${marca}`))).toHaveLength(0);

  // Nunca aparecem no site enquanto não houver autorização.
  await page.goto("/alumni-reabtoxin");
  await page.getByText("Ver a lista por local").click();
  await expect(page.getByText(`Importada Um ${marca}`)).toHaveCount(0);
});

test("em outros idiomas a página traz o nome da marca intacto e os textos traduzidos; o menu leva até ela", async ({ page }) => {
  const t = criarTradutor("de", "Alumni");
  await page.goto("/de/alumni-reabtoxin");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Alumni ReabToxin/i);
  await expect(page.getByRole("heading", { name: t("turmasTitulo") })).toBeVisible();
  for (const locale of ["en", "es", "fr", "it", "de", "zh"]) {
    await page.goto(`/${locale}`);
    await expect(page.locator(`header a[href="/${locale}/alumni-reabtoxin"]`).first()).toHaveText("Alumni");
  }
});
