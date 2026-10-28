import { expect, test, type Page } from "@playwright/test";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "../db";
import { emailsEnvios, inscricoes, mensagensContato, turmas } from "../db/schema";
import { criarTradutor } from "../lib/i18n/mensagens";
import type { Locale } from "../lib/i18n/idiomas";

/* Formulários públicos em outros idiomas: a página abre no prefixo do idioma, o envio grava o `idioma`, as mensagens saem no idioma e o
   e-mail para a pessoa sai no idioma dela (registrado em emails_envios; o servidor de teste usa EMAIL_PROVIDER=console).
   Os textos esperados vêm de criarTradutor(): são os traduzidos quando a tradução existe e o português enquanto ela não existe (fallback),
   então o teste vale antes e depois de `yarn i18n:traduzir`. Os avisos internos para os ADMIN ficam em português em qualquer idioma. */

const marca = `${Date.now()}`;
const IDIOMAS_TESTADOS = ["en", "de"] as const satisfies readonly Locale[];
const slugs: string[] = [];
let contador = 0;

const caminho = (locale: Locale, rota: string) => `/${locale}${rota}`;
const emailDe = (locale: string, tipo: string) => `e2e-idioma-${marca}-${locale}-${tipo}@exemplo.invalid`;

async function comIp(page: Page, ultimo: number) {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.71.${Number(marca.slice(-3)) % 250}.${ultimo}` });
}

async function digitar(page: Page, seletor: string, valor: string) {
  const campo = page.locator(seletor);
  await expect(async () => {
    await campo.fill(valor);
    await page.waitForTimeout(120);
    await expect(campo).toHaveValue(valor);
  }).toPass();
}

async function esperarFormulario(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('input[name="carimbo_form"]')).not.toHaveValue("", { timeout: 15_000 });
  await page.waitForTimeout(2200); // tempo mínimo de página aberta
}

async function aceitar(page: Page) {
  await expect(async () => {
    await page.locator('input[name="privacidade"]').check({ force: true, timeout: 2000 });
  }).toPass();
}

async function novaTurma() {
  const n = ++contador;
  const slug = `teste-e2e-idioma-${marca}-${n}`;
  await db.insert(turmas).values({
    slug, titulo: `Turma idioma ${n}`, tituloCurto: `Idioma ${n}`, resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL", publicacao: "PUBLICADO",
    inicio: "2099-03-14", horario: "8h às 18h", cidade: "Belo Horizonte, MG", vagas: 5, fotoUrl: "/images/maos.webp", fotoAlt: "Teste",
  });
  slugs.push(slug);
  return { slug, titulo: `Turma idioma ${n}` };
}

test.afterAll(async () => {
  if (slugs.length) {
    const ts = await db.select({ id: turmas.id }).from(turmas).where(inArray(turmas.slug, slugs));
    const ids = ts.map((t) => t.id);
    if (ids.length) {
      await db.delete(inscricoes).where(inArray(inscricoes.turmaId, ids)); // e-mails saem junto (cascade)
      await db.delete(turmas).where(inArray(turmas.id, ids));
    }
  }
  const msgs = await db.select({ id: mensagensContato.id }).from(mensagensContato).where(like(mensagensContato.email, `e2e-idioma-${marca}-%`));
  if (msgs.length) await db.delete(mensagensContato).where(inArray(mensagensContato.id, msgs.map((m) => m.id)));
});

IDIOMAS_TESTADOS.forEach((locale, i) => {
  test(`contato em /${locale}: grava o idioma, mostra o sucesso no idioma e o aviso interno sai em português`, async ({ page }) => {
    await comIp(page, 10 + i);
    const t = criarTradutor(locale, "ContatoForm");
    await page.goto(caminho(locale, "/contato"));
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await esperarFormulario(page);
    await expect(page.locator('input[name="idioma"]')).toHaveValue(locale);

    const email = emailDe(locale, "contato");
    await digitar(page, 'input[name="nome"]', "Maria da Silva");
    await digitar(page, 'input[name="email"]', email);
    await page.locator('select[name="assunto"]').selectOption("Inscrições e turmas"); // o valor canônico é sempre o português
    await aceitar(page);
    await page.locator("form button[type=submit]").click();
    await expect(page.getByText(t("sucessoTitulo"), { exact: true })).toBeVisible();

    const [msg] = await db.select().from(mensagensContato).where(eq(mensagensContato.email, email));
    expect(msg.idioma).toBe(locale);
    expect(msg.assunto).toBe("Inscrições e turmas");

    // Aviso interno para a equipe: português, mesmo vindo de uma página em outro idioma.
    await expect
      .poll(async () => (await db.select().from(emailsEnvios).where(eq(emailsEnvios.mensagemId, msg.id))).map((e) => e.assunto), { timeout: 15_000 })
      .toEqual([criarTradutor("pt-BR", "EmailsInternos")("contato.assunto", { assunto: "Inscrições e turmas" })]);
  });

  test(`inscrição em /${locale}: grava o idioma, erros no idioma e o e-mail para a pessoa sai no idioma dela`, async ({ page }) => {
    await comIp(page, 20 + i);
    const { slug, titulo } = await novaTurma();
    const tForm = criarTradutor(locale, "Inscricao");
    const tValidacao = criarTradutor(locale, "Validacao");
    const tEmail = criarTradutor(locale, "Emails");

    await page.goto(caminho(locale, `/agenda/${slug}`));
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await esperarFormulario(page);

    // Enviar vazio: a mensagem geral e a do campo vêm no idioma.
    await page.locator("#inscricao form button[type=submit]").click();
    await expect(page.getByText(tValidacao("revise", { count: 7 }), { exact: true })).toBeVisible();
    await expect(page.getByText(tValidacao("profissao"), { exact: true }).first()).toBeVisible();

    const email = emailDe(locale, "inscricao");
    await digitar(page, 'input[name="nome"]', "Maria da Silva");
    await digitar(page, 'input[name="email"]', email);
    await digitar(page, 'input[name="telefone"]', "(31) 90000-0000");
    await page.locator('select[name="profissao"]').selectOption("Médico(a)"); // valor canônico em português
    await page.locator('select[name="conselho"]').selectOption("CRM");
    await digitar(page, 'input[name="registro"]', "00000 / MG");
    await aceitar(page);
    await page.locator("#inscricao form button[type=submit]").click();
    await expect(page.getByText(tForm("sucessoTitulo"), { exact: true })).toBeVisible();

    const [ins] = await db.select().from(inscricoes).where(eq(inscricoes.email, email));
    expect(ins.idioma).toBe(locale);
    expect(ins.profissao).toBe("Médico(a)");

    // E-mail para a pessoa: no idioma dela. Aviso interno: em português.
    await expect
      .poll(async () => (await db.select().from(emailsEnvios).where(eq(emailsEnvios.inscricaoId, ins.id))).map((e) => `${e.tipo}:${e.status}`).sort(), { timeout: 15_000 })
      .toEqual(["INSCRICAO_AVISO:ENVIADO", "INSCRICAO_CONFIRMACAO:ENVIADO"]);
    const registros = await db.select().from(emailsEnvios).where(eq(emailsEnvios.inscricaoId, ins.id));
    const confirmacao = registros.find((r) => r.tipo === "INSCRICAO_CONFIRMACAO")!;
    const aviso = registros.find((r) => r.tipo === "INSCRICAO_AVISO")!;
    expect(confirmacao.assunto).toBe(tEmail("confirmacao.assunto", { turma: titulo }));
    expect(aviso.assunto).toMatch(/^Nova inscrição: Maria da Silva/);
  });
});

test("idioma inválido no campo oculto vira pt-BR: nada é gravado com um código inventado", async ({ page }) => {
  await comIp(page, 30);
  await page.goto("/contato");
  await esperarFormulario(page);
  const email = emailDe("xx", "contato");
  await page.locator('input[name="idioma"]').evaluate((el: HTMLInputElement) => (el.value = "../../xx"));
  await digitar(page, 'input[name="nome"]', "Maria da Silva");
  await digitar(page, 'input[name="email"]', email);
  await page.locator('select[name="assunto"]').selectOption("Pagamento");
  await aceitar(page);
  await page.locator("form button[type=submit]").click();
  await expect(page.getByText(criarTradutor("pt-BR", "ContatoForm")("sucessoTitulo"), { exact: true })).toBeVisible();
  const [msg] = await db.select().from(mensagensContato).where(eq(mensagensContato.email, email));
  expect(msg.idioma).toBe("pt-BR");
});
