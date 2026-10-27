import { expect, test, type Page } from "@playwright/test";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "../db";
import { emailsEnvios, inscricoes, mensagensContato, turmas, usuarios } from "../db/schema";
import { criarInscricao } from "../lib/inscricoes";
import { gerarHash } from "../lib/senha";

/* Inscrição e contato pelo site, e a tela de inscrições do painel, contra o build e o banco de desenvolvimento.
   O servidor roda com EMAIL_PROVIDER=console (ver playwright.config.ts): o e-mail "sai" de mentira, mas o registro
   em emails_envios é de verdade. Cada teste usa a sua turma e o seu IP (cabeçalho x-forwarded-for), para o limite de
   taxa de um não atrapalhar o outro. */

const marca = `${Date.now()}`;
const SENHA = "senha-de-teste-12345";
const emailAdmin = `e2e-insc-admin-${marca}@exemplo.invalid`;
const turmaIds: string[] = [];
let contador = 0;
let adminId = "";

async function novaTurma(vagas = 2) {
  const n = ++contador;
  const slug = `teste-e2e-insc-${marca}-${n}`;
  const [t] = await db
    .insert(turmas)
    .values({
      slug, titulo: `Turma e2e ${n}`, tituloCurto: `E2E ${n}`, resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL", publicacao: "PUBLICADO",
      inicio: "2099-03-14", horario: "8h às 18h", cidade: "Belo Horizonte, MG", vagas, fotoUrl: "/images/maos.webp", fotoAlt: "Teste",
    })
    .returning({ id: turmas.id });
  turmaIds.push(t.id);
  return { id: t.id, slug };
}

const emailDoTeste = (n: string) => `e2e-${marca}-${n}@exemplo.invalid`;

async function comIp(page: Page, ultimo: number) {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.88.${Number(marca.slice(-3)) % 250}.${ultimo}` });
}

/** Preenche e confirma que o valor ficou (antes da hidratação o React ainda pode apagar o que foi digitado). */
async function digitar(page: Page, seletor: string, valor: string) {
  const campo = page.locator(seletor);
  await expect(async () => {
    await campo.fill(valor);
    await page.waitForTimeout(120);
    await expect(campo).toHaveValue(valor);
  }).toPass();
}

async function preencherInscricao(page: Page, email: string, nome = "Maria da Silva") {
  await digitar(page, 'input[name="nome"]', nome);
  await digitar(page, 'input[name="email"]', email);
  await digitar(page, 'input[name="telefone"]', "(31) 90000-0000");
  await page.locator('select[name="profissao"]').selectOption("Médico(a)");
  await page.locator('select[name="conselho"]').selectOption("CRM");
  await digitar(page, 'input[name="registro"]', "00000 / MG");
  await page.getByLabel(/Li e aceito a Política de Privacidade/).check({ force: true });
}

async function abrirTurma(page: Page, slug: string) {
  await page.goto(`/agenda/${slug}`);
  await page.waitForLoadState("networkidle");
}

test.beforeAll(async () => {
  const [u] = await db.insert(usuarios).values({ nome: "Teste Insc", email: emailAdmin, papel: "ADMIN", senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  adminId = u.id;
});

test.afterAll(async () => {
  if (turmaIds.length) {
    await db.delete(inscricoes).where(inArray(inscricoes.turmaId, turmaIds)); // os e-mails saem junto (cascade)
    await db.delete(turmas).where(inArray(turmas.id, turmaIds));
  }
  const msgs = await db.select({ id: mensagensContato.id }).from(mensagensContato).where(like(mensagensContato.email, `e2e-${marca}-%`));
  if (msgs.length) await db.delete(mensagensContato).where(inArray(mensagensContato.id, msgs.map((m) => m.id)));
  await db.delete(usuarios).where(eq(usuarios.id, adminId));
});

test("a inscrição grava, mostra a confirmação, atualiza as vagas na hora e registra os dois e-mails", async ({ page }) => {
  await comIp(page, 1);
  const { id, slug } = await novaTurma(2);
  await abrirTurma(page, slug);
  await expect(page.getByText("2 de 2 disponíveis")).toBeVisible();

  const email = emailDoTeste("a");
  await preencherInscricao(page, email);
  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await expect(page.getByText("Enviamos os próximos passos para o seu e-mail")).toBeVisible();

  const [ins] = await db.select().from(inscricoes).where(eq(inscricoes.email, email));
  expect(ins.situacao).toBe("AGUARDANDO_PAGAMENTO");
  expect(ins.turmaId).toBe(id);
  expect(ins.aceitePrivacidadeEm).toBeTruthy();

  // Os e-mails saem depois de gravar; o registro de cada um aparece em seguida.
  await expect
    .poll(async () => (await db.select().from(emailsEnvios).where(eq(emailsEnvios.inscricaoId, ins.id))).map((e) => `${e.tipo}:${e.status}`).sort(), { timeout: 15_000 })
    .toEqual(["INSCRICAO_AVISO:ENVIADO", "INSCRICAO_CONFIRMACAO:ENVIADO"]);

  // A contagem de vagas já mudou no site público (tags de cache).
  await page.goto(`/agenda/${slug}`);
  await expect(page.getByText("1 de 2 disponíveis")).toBeVisible();
});

test("campos inválidos: mostra o que fazer em cada um e não apaga o que a pessoa digitou", async ({ page }) => {
  await comIp(page, 2);
  const { slug } = await novaTurma();
  await abrirTurma(page, slug);

  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await expect(page.getByText("Revise 7 campos antes de enviar")).toBeVisible();

  await digitar(page, 'input[name="nome"]', "Maria da Silva");
  await digitar(page, 'input[name="email"]', "maria@dominio");
  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await expect(page.getByText("Digite um e-mail válido, como nome@dominio.com.br.")).toBeVisible();
  await expect(page.locator('input[name="nome"]')).toHaveValue("Maria da Silva"); // não foi apagado
  await expect(page.locator('input[name="email"]')).toHaveValue("maria@dominio");
  await expect(page.getByText("Marque esta opção para enviar a inscrição.")).toBeVisible();
});

test("o campo escondido de robô: parece que deu certo, mas nada é gravado", async ({ page }) => {
  await comIp(page, 3);
  const { slug } = await novaTurma();
  await abrirTurma(page, slug);
  const email = emailDoTeste("robo");
  await preencherInscricao(page, email);
  await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "http://spam.invalid"));
  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await expect(page.getByText("Enviamos os próximos passos para o seu e-mail")).toBeVisible();
  expect(await db.select().from(inscricoes).where(eq(inscricoes.email, email))).toHaveLength(0);
});

test("limite por visitante: depois de 5 envios em 10 minutos, o sexto é barrado", async ({ page }) => {
  await comIp(page, 4);
  const { slug } = await novaTurma();
  await abrirTurma(page, slug);
  for (let i = 1; i <= 5; i++) {
    await page.getByRole("button", { name: "Enviar inscrição" }).click();
    await expect(page.getByText("Revise 7 campos antes de enviar")).toBeVisible();
  }
  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await expect(page.getByText("Muitas tentativas em pouco tempo")).toBeVisible();
});

test("a mesma pessoa não se inscreve duas vezes na mesma turma", async ({ page }) => {
  await comIp(page, 5);
  const { id, slug } = await novaTurma(5);
  const email = emailDoTeste("dup");
  await criarInscricao({ slug, nome: "Maria da Silva", email, telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "1 / MG", querAvisos: false });
  await abrirTurma(page, slug);
  await preencherInscricao(page, email.toUpperCase());
  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await expect(page.getByText("Já recebemos uma inscrição com este e-mail nesta turma.")).toBeVisible();
  expect(await db.select().from(inscricoes).where(eq(inscricoes.turmaId, id))).toHaveLength(1);
});

test("turma lotada: a inscrição entra na lista de espera", async ({ page }) => {
  await comIp(page, 6);
  const { slug } = await novaTurma(1);
  await criarInscricao({ slug, nome: "Primeira Pessoa", email: emailDoTeste("p1"), telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "1 / MG", querAvisos: false });
  await abrirTurma(page, slug);
  await expect(page.getByRole("heading", { name: "Lista de espera" })).toBeVisible();
  const email = emailDoTeste("espera");
  await preencherInscricao(page, email);
  await page.getByRole("button", { name: "Entrar na lista de espera" }).click();
  await expect(page.getByText("Você entrou na lista de espera")).toBeVisible();
  const [ins] = await db.select().from(inscricoes).where(eq(inscricoes.email, email));
  expect(ins.situacao).toBe("LISTA_ESPERA");
});

test("contato: grava a mensagem e registra o aviso à clínica", async ({ page }) => {
  await comIp(page, 7);
  await page.goto("/contato");
  await page.waitForLoadState("networkidle");
  const email = emailDoTeste("contato");
  await digitar(page, 'input[name="nome"]', "Maria da Silva");
  await digitar(page, 'input[name="email"]', email);
  await page.locator('select[name="assunto"]').selectOption("Consulta na clínica");
  await digitar(page, 'textarea[name="mensagem"]', "Gostaria de agendar uma consulta.");
  await page.getByLabel(/Li e aceito a Política de Privacidade/).check({ force: true });
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada")).toBeVisible();

  const [msg] = await db.select().from(mensagensContato).where(eq(mensagensContato.email, email));
  expect(msg.assunto).toBe("Consulta na clínica");
  await expect
    .poll(async () => (await db.select().from(emailsEnvios).where(eq(emailsEnvios.mensagemId, msg.id))).map((e) => `${e.tipo}:${e.status}`), { timeout: 15_000 })
    .toEqual(["CONTATO_AVISO:ENVIADO"]);
});

async function entrarNoPainel(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(emailAdmin);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("painel: a situação muda na linha e o site público acompanha na hora", async ({ page }) => {
  const { id, slug } = await novaTurma(2);
  const ins = await criarInscricao({ slug, nome: "Pessoa do Painel", email: emailDoTeste("painel"), telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "9 / MG", querAvisos: false });
  await entrarNoPainel(page);
  await page.goto(`/admin/inscricoes?turma=${id}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Pessoa do Painel")).toBeVisible();
  await expect(page.getByText("1 de 2 vagas preenchidas")).toBeVisible();

  await page.getByLabel("Situação de Pessoa do Painel").selectOption("CANCELADA");
  await expect(page.getByText("0 de 2 vagas preenchidas")).toBeVisible();
  const [depois] = await db.select().from(inscricoes).where(eq(inscricoes.id, ins.id));
  expect(depois.situacao).toBe("CANCELADA");

  await page.goto(`/agenda/${slug}`); // contagem do site já voltou a 2 livres
  await expect(page.getByText("2 de 2 disponíveis")).toBeVisible();
});

test("painel: não deixa passar da lista de espera para confirmada sem vaga livre", async ({ page }) => {
  const { id, slug } = await novaTurma(1);
  await criarInscricao({ slug, nome: "Primeira Pessoa", email: emailDoTeste("c1"), telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "1 / MG", querAvisos: false });
  await criarInscricao({ slug, nome: "Pessoa na Espera", email: emailDoTeste("c2"), telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "2 / MG", querAvisos: false });
  await entrarNoPainel(page);
  await page.goto(`/admin/inscricoes?turma=${id}`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Situação de Pessoa na Espera").selectOption("CONFIRMADA");
  await expect(page.getByText("Não há vagas livres nesta turma")).toBeVisible();
});

test("painel: e-mail que falhou aparece como Falhou e o botão Reenviar refaz o envio", async ({ page }) => {
  const { id, slug } = await novaTurma(3);
  const ins = await criarInscricao({ slug, nome: "Pessoa do Reenvio", email: emailDoTeste("reenvio"), telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "3 / MG", querAvisos: false });
  const [falho] = await db
    .insert(emailsEnvios)
    .values({ tipo: "INSCRICAO_CONFIRMACAO", status: "FALHOU", destinatario: emailDoTeste("reenvio"), assunto: "x", inscricaoId: ins.id, tentativas: 1, erro: "Falha simulada pelo teste" })
    .returning({ id: emailsEnvios.id });

  await entrarNoPainel(page);
  await page.goto(`/admin/inscricoes?turma=${id}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Falha simulada pelo teste")).toBeVisible();
  await expect(page.getByText("Falhou")).toBeVisible();

  await page.getByRole("button", { name: "Reenviar" }).first().click();
  await expect(page.getByText("Falha simulada pelo teste")).toHaveCount(0);
  const [depois] = await db.select().from(emailsEnvios).where(eq(emailsEnvios.id, falho.id));
  expect(depois.status).toBe("ENVIADO");
  expect(depois.tentativas).toBe(2);
});

test("painel: exportar planilha só para quem tem sessão, com proteção contra fórmula", async ({ page, playwright, baseURL }) => {
  const { id, slug } = await novaTurma(3);
  await criarInscricao({ slug, nome: "=HYPERLINK(\"http://x.invalid\")", email: emailDoTeste("csv"), telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "4 / MG", querAvisos: true });

  const anonimo = await playwright.request.newContext({ baseURL });
  const semSessao = await anonimo.get(`/admin/inscricoes/exportar?turma=${id}`, { maxRedirects: 0 });
  expect(semSessao.status()).toBe(307); // o proxy manda para o login
  await anonimo.dispose();

  await entrarNoPainel(page);
  const r = await page.request.get(`/admin/inscricoes/exportar?turma=${id}`);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("text/csv");
  expect(r.headers()["content-disposition"]).toContain(`inscricoes-${slug}.csv`);
  const corpo = await r.text();
  expect(corpo.startsWith("﻿")).toBe(true);
  expect(corpo).toContain(emailDoTeste("csv"));
  expect(corpo).toContain(`"'=HYPERLINK(`); // apóstrofo na frente: a planilha não executa como fórmula
});
