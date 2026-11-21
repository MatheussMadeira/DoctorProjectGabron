import { createHash } from "node:crypto";
import { del, put } from "@vercel/blob";
import { expect, test, type Page } from "@playwright/test";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "../db";
import { alunoComentarios, alunoMateriais, alunoModulos, alunoRedefinicoes, alunos, emailsEnvios, inscricoes, turmas, usuarios } from "../db/schema";
import { criarTradutor } from "../lib/i18n/mensagens";
import { gerarHash } from "../lib/senha";

/* Área do aluno (/sou-aluno): a confirmação no painel cria o acesso e manda o código; primeiro acesso, aviso de confidencialidade, painel com
   turmas e materiais (só publicados e das turmas do aluno), comentários, bloqueios, "esqueci minha senha", aluno recorrente e a entrega de
   arquivos só com sessão. O servidor de teste usa EMAIL_PROVIDER=console. */

test.describe.configure({ mode: "serial" });
test.use({ locale: "pt-BR" });

const marca = `${Date.now()}`;
const SENHA_ADMIN = "senha-de-teste-12345";
const SENHA = "senha-do-aluno-123";
const emailAdmin = `e2e-aluno-adm-${marca}@exemplo.invalid`;
const emailAluno = `e2e-aluno-${marca}@exemplo.invalid`;
const nomeAluno = `Aluna Teste ${marca}`;
const slug1 = `teste-e2e-aluno-1-${marca}`;
const slug2 = `teste-e2e-aluno-2-${marca}`;
let adminId = "";
let turma1 = "";
let turma2 = "";
let inscricao1 = "";
let inscricao2 = "";
let codigo = "";
const blobs: string[] = [];

const octeto = Number(marca.slice(-3)) % 250;
async function comIp(page: Page, ultimo: number) {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.73.${octeto}.${ultimo}` });
}

async function digitar(page: Page, seletor: string, valor: string) {
  const campo = page.locator(seletor);
  await expect(async () => {
    await campo.fill(valor);
    await page.waitForTimeout(100);
    await expect(campo).toHaveValue(valor);
  }).toPass();
}

async function entrarNoPainel(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(emailAdmin);
  await page.getByLabel("Senha").fill(SENHA_ADMIN);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function entrarComoAluno(page: Page, senha = SENHA) {
  await page.goto("/sou-aluno");
  await expect(page.locator('input[name="senha"]')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500); // hidratação do formulário
  await digitar(page, 'input[name="email"]', emailAluno);
  await digitar(page, 'input[name="senha"]', senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test.beforeAll(async () => {
  const [u] = await db.insert(usuarios).values({ nome: "Teste aluno", email: emailAdmin, papel: "ADMIN", ativo: true, senhaHash: await gerarHash(SENHA_ADMIN) }).returning({ id: usuarios.id });
  adminId = u.id;
  const base = { resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL" as const, publicacao: "PUBLICADO" as const, horario: "8h", cidade: "Belo Horizonte, MG", vagas: 10, fotoUrl: "/images/maos.webp", fotoAlt: "Teste" };
  const [a, b] = await db
    .insert(turmas)
    .values([
      { ...base, slug: slug1, titulo: `Turma Aluno Um ${marca}`, tituloCurto: `Aluno Um ${marca}`, inicio: "2099-03-14" },
      { ...base, slug: slug2, titulo: `Turma Aluno Dois ${marca}`, tituloCurto: `Aluno Dois ${marca}`, inicio: "2099-04-14" },
    ])
    .returning({ id: turmas.id });
  turma1 = a.id;
  turma2 = b.id;
  const comum = { nome: nomeAluno, email: emailAluno, telefone: "31999990000", profissao: "Médico(a)", conselho: "CRM" as const, registro: "1 / MG", aceitePrivacidadeEm: new Date(), idioma: "pt-BR", situacao: "AGUARDANDO_PAGAMENTO" as const };
  const linhas = await db.insert(inscricoes).values([{ ...comum, turmaId: turma1 }, { ...comum, turmaId: turma2 }]).returning({ id: inscricoes.id, turmaId: inscricoes.turmaId });
  inscricao1 = linhas.find((l) => l.turmaId === turma1)!.id;
  inscricao2 = linhas.find((l) => l.turmaId === turma2)!.id;
});

test.afterAll(async () => {
  for (const url of blobs) await del(url).catch(() => undefined);
  await db.delete(alunos).where(like(alunos.email, `%${marca}@exemplo.invalid`)); // comentários, redefinições e e-mails saem junto
  await db.delete(inscricoes).where(inArray(inscricoes.turmaId, [turma1, turma2]));
  await db.delete(turmas).where(inArray(turmas.id, [turma1, turma2])); // módulos e materiais saem junto
  await db.delete(usuarios).where(eq(usuarios.id, adminId));
});

test("confirmar a inscrição no painel cria o acesso do aluno e manda o código por e-mail", async ({ page }) => {
  await entrarNoPainel(page);
  await page.goto(`/admin/inscricoes?turma=${turma1}`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel(`Situação de ${nomeAluno}`).selectOption("CONFIRMADA");
  await expect.poll(async () => (await db.select().from(alunos).where(eq(alunos.email, emailAluno))).length, { timeout: 15_000 }).toBe(1);
  const [a] = await db.select().from(alunos).where(eq(alunos.email, emailAluno));
  expect(a.codigo).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  expect(a.ativadoEm).toBeNull();
  codigo = a.codigo!;
  await expect.poll(async () => (await db.select().from(emailsEnvios).where(eq(emailsEnvios.alunoId, a.id))).map((e) => `${e.tipo}:${e.status}`), { timeout: 15_000 }).toEqual(["ALUNO_CODIGO:ENVIADO"]);

  // No painel da área do aluno, ele aparece aguardando a criação da conta.
  await page.goto("/admin/alunos");
  await page.waitForLoadState("networkidle");
  const linha = page.locator("tr", { hasText: emailAluno });
  await expect(linha).toContainText("Aguardando criar a conta");
  await expect(linha.getByRole("button", { name: "Reenviar código" })).toBeVisible();
});

test("primeiro acesso: código errado dá a mesma mensagem de sempre; o certo cria a conta, pede o aceite e abre o painel", async ({ page }) => {
  await comIp(page, 1);
  const t = criarTradutor("pt-BR", "Aluno");
  await page.goto("/sou-aluno?aba=primeiro-acesso");
  await page.waitForLoadState("networkidle");
  await digitar(page, 'input[name="email"]', emailAluno);
  await digitar(page, 'input[name="codigo"]', "AAAA-AAAA");
  await digitar(page, 'input[name="senha"]', SENHA);
  await digitar(page, 'input[name="senhaConfirmar"]', SENHA);
  await page.getByRole("button", { name: t("criarConta") }).click();
  await expect(page.getByText(t("erroCredenciais"))).toBeVisible();

  // Senhas diferentes e senha curta: avisos nos campos, sem mexer no código.
  // Depois de um erro as senhas são limpas (de propósito); o e-mail e o código ficam.
  await digitar(page, 'input[name="codigo"]', codigo.toLowerCase());
  await digitar(page, 'input[name="senha"]', SENHA);
  await digitar(page, 'input[name="senhaConfirmar"]', "diferente-123456");
  await page.getByRole("button", { name: t("criarConta") }).click();
  await expect(page.getByText(t("erroSenhaDiferente"))).toBeVisible();
  await digitar(page, 'input[name="senha"]', "curta");
  await digitar(page, 'input[name="senhaConfirmar"]', "curta");
  await page.getByRole("button", { name: t("criarConta") }).click();
  await expect(page.getByText(t("erroSenhaCurta", { min: 10 }))).toBeVisible();
  expect((await db.select().from(alunos).where(eq(alunos.email, emailAluno)))[0].ativadoEm).toBeNull();

  await digitar(page, 'input[name="senha"]', SENHA);
  await digitar(page, 'input[name="senhaConfirmar"]', SENHA);
  await page.getByRole("button", { name: t("criarConta") }).click();
  await expect(page.getByRole("heading", { name: t("avisoTitulo") })).toBeVisible({ timeout: 15_000 });
  // Antes do aceite não há acesso ao painel nem aos materiais.
  await expect(page.getByText(t("painelOla", { nome: nomeAluno }))).toHaveCount(0);
  await page.getByRole("button", { name: t("avisoConcordo") }).click();
  await expect(page.getByText(t("painelOla", { nome: nomeAluno }))).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: `Aluno Um ${marca}` })).toBeVisible();

  const [a] = await db.select().from(alunos).where(eq(alunos.email, emailAluno));
  expect(a.codigo).toBeNull();
  expect(a.ativadoEm).not.toBeNull();
  expect(a.aceiteEm).not.toBeNull();
  expect(a.aceiteVersao).toBe(1);

  // Sair volta para a entrada.
  await page.getByRole("button", { name: t("sair") }).click();
  await expect(page.locator('input[name="senha"]')).toBeVisible();
});

test("a área só mostra material publicado das turmas do aluno; caso aceita comentário e o ADMIN pode ocultar", async ({ page }) => {
  await comIp(page, 2);
  const [mod] = await db.insert(alunoModulos).values({ turmaId: turma1, titulo: `Módulo Teste ${marca}`, ordem: 0 }).returning({ id: alunoModulos.id });
  const [modAlheio] = await db.insert(alunoModulos).values({ turmaId: turma2, titulo: `Módulo Dois ${marca}`, ordem: 0 }).returning({ id: alunoModulos.id });
  const url = "https://exemplo.public.blob.vercel-storage.com/aluno/nao-existe.pdf";
  const futuro = new Date(Date.now() + 5 * 24 * 3600 * 1000);
  const [pdf, caso, agendado, oculto] = await db
    .insert(alunoMateriais)
    .values([
      { moduloId: mod.id, tipo: "PDF", titulo: `PDF Publicado ${marca}`, arquivoUrl: url, arquivoNome: "x.pdf", ordem: 0 },
      { moduloId: mod.id, tipo: "CASO", titulo: `Caso Clínico ${marca}`, texto: `Primeiro parágrafo do caso ${marca}.\n\nSegundo parágrafo.`, imagens: [{ url, alt: "Radiografia de teste" }], ordem: 1 },
      { moduloId: mod.id, tipo: "PDF", titulo: `PDF Agendado ${marca}`, arquivoUrl: url, publicarEm: futuro, ordem: 2 },
      { moduloId: mod.id, tipo: "PDF", titulo: `PDF Oculto ${marca}`, arquivoUrl: url, visivel: false, ordem: 3 },
    ])
    .returning({ id: alunoMateriais.id });

  await entrarComoAluno(page);
  await expect(page.getByText(`PDF Publicado ${marca}`)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`Caso Clínico ${marca}`)).toBeVisible();
  await expect(page.getByText(`PDF Agendado ${marca}`)).toHaveCount(0);
  await expect(page.getByText(`PDF Oculto ${marca}`)).toHaveCount(0);
  await expect(page.getByText(`Módulo Teste ${marca}`)).toBeVisible();

  // O aluno ainda não tem a turma Dois confirmada: o conteúdo dela não aparece.
  await expect(page.getByText(`Módulo Dois ${marca}`)).toHaveCount(0);

  // Material agendado e oculto: nem pelo endereço direto.
  // (Com cacheComponents o status HTTP sai 200 junto com a casca; o que vale é a página "não encontrada".)
  for (const id of [agendado.id, oculto.id]) {
    await page.goto(`/sou-aluno/material/${id}`);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/PDF (Agendado|Oculto)/)).toHaveCount(0);
  }

  // Caso: texto, imagem (pelo site, sem mostrar o endereço) e comentário.
  await page.goto("/sou-aluno");
  await page.getByText(`Caso Clínico ${marca}`).click();
  await expect(page.getByRole("heading", { name: `Caso Clínico ${marca}` })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`Primeiro parágrafo do caso ${marca}.`)).toBeVisible();
  const imagem = page.getByAltText("Radiografia de teste");
  await expect(imagem).toHaveAttribute("src", new RegExp(`^/api/aluno/arquivo\\?tipo=imagem&id=${caso.id}&i=0$`));
  expect(await page.content()).not.toContain("blob.vercel-storage.com");
  await digitar(page, 'textarea[name="texto"]', `Comentário do aluno ${marca}`);
  await page.getByRole("button", { name: "Comentar" }).click();
  await expect(page.getByText(`Comentário do aluno ${marca}`)).toBeVisible({ timeout: 15_000 });

  // PDF não tem comentário.
  await page.goto(`/sou-aluno/material/${pdf.id}`);
  await expect(page.getByRole("heading", { name: `PDF Publicado ${marca}` })).toBeVisible();
  await expect(page.locator('textarea[name="texto"]')).toHaveCount(0);

  // O ADMIN oculta o comentário pelo painel.
  await entrarNoPainel(page);
  await page.goto("/admin/alunos?aba=comentarios");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Ocultar o comentário de ${nomeAluno}` }).click();
  await expect.poll(async () => (await db.select().from(alunoComentarios).where(like(alunoComentarios.texto, `%${marca}`)))[0]?.oculto).toBe(true);
  // A sessão do aluno continua no mesmo navegador (o cookie do painel é outro).
  await page.goto(`/sou-aluno/material/${caso.id}`);
  await expect(page.getByRole("heading", { name: `Caso Clínico ${marca}` })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`Comentário do aluno ${marca}`)).toHaveCount(0);
  void modAlheio;
});

test("arquivos: sem sessão é 404; com sessão o PDF e a imagem chegam pelo site, sem o endereço do Blob", async ({ page, request, baseURL }) => {
  test.skip(!process.env.BLOB_READ_WRITE_TOKEN, "precisa do BLOB_READ_WRITE_TOKEN");
  await comIp(page, 3);
  const pdf = await put(`aluno-teste/${marca}.pdf`, Buffer.from("%PDF-1.4\n% arquivo de teste\n"), { access: "public", contentType: "application/pdf", addRandomSuffix: true });
  blobs.push(pdf.url);
  const [mod] = await db.select().from(alunoModulos).where(like(alunoModulos.titulo, `Módulo Teste ${marca}`));
  const [m] = await db.insert(alunoMateriais).values({ moduloId: mod.id, tipo: "PDF", titulo: `PDF Real ${marca}`, arquivoUrl: pdf.url, arquivoNome: "aula.pdf", ordem: 9 }).returning({ id: alunoMateriais.id });
  const caminho = `/api/aluno/arquivo?tipo=material&id=${m.id}`;

  // Sem cookie de aluno: 404 (nem diz se o arquivo existe).
  const semSessao = await request.get(`${baseURL}${caminho}`);
  expect(semSessao.status()).toBe(404);

  await entrarComoAluno(page);
  await expect(page.getByText(`PDF Real ${marca}`)).toBeVisible({ timeout: 15_000 });
  const resposta = await page.request.get(caminho);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toContain("application/pdf");
  expect(resposta.headers()["cache-control"]).toContain("no-store");
  expect(resposta.headers()["x-robots-tag"]).toContain("noindex");
  expect(resposta.headers()["content-disposition"]).toContain("aula.pdf");
  expect((await resposta.body()).toString()).toContain("%PDF-1.4");

  // Id de outra turma que o aluno não tem, id inválido e tipo inventado: 404.
  const [modAlheio] = await db.select().from(alunoModulos).where(like(alunoModulos.titulo, `Módulo Dois ${marca}`));
  const [alheio] = await db.insert(alunoMateriais).values({ moduloId: modAlheio.id, tipo: "PDF", titulo: `PDF Alheio ${marca}`, arquivoUrl: pdf.url, arquivoNome: "alheio.pdf", ordem: 0 }).returning({ id: alunoMateriais.id });
  expect((await page.request.get(`/api/aluno/arquivo?tipo=material&id=${alheio.id}`)).status()).toBe(404);
  expect((await page.request.get("/api/aluno/arquivo?tipo=material&id=nao-e-um-id")).status()).toBe(404);
  expect((await page.request.get(`/api/aluno/arquivo?tipo=outro&id=${m.id}`)).status()).toBe(404);
});

test("login: 5 erros bloqueiam por 5 minutos; bloquear no painel derruba a sessão; a página nunca é indexada", async ({ page }) => {
  await comIp(page, 4);
  const t = criarTradutor("pt-BR", "Aluno");
  await page.goto("/sou-aluno");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.waitForLoadState("networkidle");
  const estado = async () => (await db.select({ falhas: alunos.falhas, ate: alunos.bloqueadoAte }).from(alunos).where(eq(alunos.email, emailAluno)))[0];
  for (let i = 0; i < 5; i++) {
    await digitar(page, 'input[name="email"]', emailAluno);
    await digitar(page, 'input[name="senha"]', `errada-${i}-123456`);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    // Espera o servidor contar este erro (o texto do erro anterior ainda está na tela, então ele não serve de sinal).
    if (i < 4) await expect.poll(async () => (await estado()).falhas, { timeout: 15_000 }).toBe(i + 1);
    else await expect.poll(async () => (await estado()).ate !== null, { timeout: 15_000 }).toBe(true);
  }
  await digitar(page, 'input[name="senha"]', SENHA);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText(/Muitas tentativas erradas\. Tente de novo em \d+ minutos?\./)).toBeVisible();
  await db.update(alunos).set({ bloqueadoAte: null, falhas: 0 }).where(eq(alunos.email, emailAluno));

  // Entra; o ADMIN bloqueia; a sessão cai na hora.
  await page.goto("/sou-aluno");
  await digitar(page, 'input[name="email"]', emailAluno);
  await digitar(page, 'input[name="senha"]', SENHA);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText(t("painelOla", { nome: nomeAluno }))).toBeVisible({ timeout: 15_000 });
  await db.update(alunos).set({ bloqueado: true }).where(eq(alunos.email, emailAluno));
  await page.reload();
  await expect(page.locator('input[name="senha"]')).toBeVisible();
  await digitar(page, 'input[name="email"]', emailAluno);
  await digitar(page, 'input[name="senha"]', SENHA);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText(t("erroBloqueado"))).toBeVisible();
  await db.update(alunos).set({ bloqueado: false }).where(eq(alunos.email, emailAluno));
});

test("aluno recorrente: confirmar a segunda turma não manda outro código e a turma nova aparece na mesma conta", async ({ page }) => {
  await comIp(page, 5);
  const [antes] = await db.select().from(alunos).where(eq(alunos.email, emailAluno));
  await entrarNoPainel(page);
  await page.goto(`/admin/inscricoes?turma=${turma2}`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel(`Situação de ${nomeAluno}`).selectOption("CONFIRMADA");
  await expect.poll(async () => (await db.select().from(inscricoes).where(eq(inscricoes.id, inscricao2)))[0].situacao).toBe("CONFIRMADA");
  await page.waitForTimeout(1500); // o gancho roda depois da resposta (after)
  const alunosDoEmail = await db.select().from(alunos).where(eq(alunos.email, emailAluno));
  expect(alunosDoEmail).toHaveLength(1);
  expect(alunosDoEmail[0].id).toBe(antes.id);
  expect(alunosDoEmail[0].codigo).toBeNull();
  expect(await db.select().from(emailsEnvios).where(and(eq(emailsEnvios.alunoId, antes.id), eq(emailsEnvios.tipo, "ALUNO_CODIGO")))).toHaveLength(1);

  await entrarComoAluno(page);
  await expect(page.getByRole("heading", { name: `Aluno Dois ${marca}` })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`Módulo Dois ${marca}`)).toBeVisible();
  void inscricao1;
});

test("esqueci minha senha: resposta igual para qualquer e-mail; o link troca a senha uma vez só", async ({ page }) => {
  await comIp(page, 6);
  const t = criarTradutor("pt-BR", "Aluno");
  await page.goto("/sou-aluno");
  await page.waitForLoadState("networkidle");
  for (const email of [emailAluno, `nao-existe-${marca}@exemplo.invalid`]) {
    await page.getByRole("button", { name: t("esqueci") }).click();
    await digitar(page, 'input[name="email"]', email);
    await page.getByRole("button", { name: t("esqueciEnviar") }).click();
    await expect(page.getByText(t("esqueciOk"))).toBeVisible();
    await page.getByRole("button", { name: t("voltar") }).click();
  }

  // O token real só existe no e-mail: aqui guardamos um conhecido (só o hash fica no banco, como no site).
  const [a] = await db.select().from(alunos).where(eq(alunos.email, emailAluno));
  const token = `token-de-teste-${marca}`;
  await db.insert(alunoRedefinicoes).values({ alunoId: a.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiraEm: new Date(Date.now() + 3600_000) });
  await page.goto(`/sou-aluno/redefinir?token=${token}`);
  await digitar(page, 'input[name="senha"]', "a-nova-senha-123");
  await digitar(page, 'input[name="senhaConfirmar"]', "a-nova-senha-123");
  await page.getByRole("button", { name: t("redefinirEnviar") }).click();
  await expect(page.getByText(t("redefinirOk"))).toBeVisible();

  await page.goto(`/sou-aluno/redefinir?token=${token}`);
  await expect(page.getByText(t("redefinirInvalido"))).toBeVisible();
  await page.goto("/sou-aluno/redefinir?token=lixo");
  await expect(page.getByText(t("redefinirInvalido"))).toBeVisible();

  await entrarComoAluno(page, SENHA);
  await expect(page.getByText(t("erroCredenciais"))).toBeVisible();
  await entrarComoAluno(page, "a-nova-senha-123");
  await expect(page.getByText(t("painelOla", { nome: nomeAluno }))).toBeVisible({ timeout: 15_000 });
});

test("o ADMIN cria módulo e material (caso agendado) pelo painel, bloqueia e libera o aluno", async ({ page }) => {
  await entrarNoPainel(page);
  await page.goto(`/admin/alunos?aba=materiais&turma=${turma1}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo módulo" }).click();
  await digitar(page, 'input[name="titulo"]', `Módulo Painel ${marca}`);
  await page.getByRole("button", { name: "Salvar módulo" }).click();
  await expect(page.getByText("Módulo salvo", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Novo material em “Módulo Painel ${marca}”` }).click();
  await page.locator('select[name="tipo"]').selectOption("CASO");
  await digitar(page, 'input[name="titulo"]', `Caso do Painel ${marca}`);
  await digitar(page, 'textarea[name="texto"]', `Texto do caso do painel ${marca}.`);
  await digitar(page, 'input[name="publicarEm"]', "2099-01-10T09:30");
  await page.getByRole("button", { name: "Salvar material" }).click();
  await expect(page.getByText("Material salvo", { exact: true })).toBeVisible();
  const [m] = await db.select().from(alunoMateriais).where(eq(alunoMateriais.titulo, `Caso do Painel ${marca}`));
  expect(m.tipo).toBe("CASO");
  expect(m.publicarEm?.toISOString()).toBe("2099-01-10T12:30:00.000Z"); // 09:30 de Brasília
  expect(m.notificadoEm).toBeNull(); // agendado: ainda não avisou
  await expect(page.locator("div", { hasText: `Caso do Painel ${marca}` }).getByText("Agendado", { exact: true }).first()).toBeVisible();

  // Sem texto, caso e vídeo exigem conteúdo; PDF exige o arquivo.
  await page.getByRole("button", { name: `Novo material em “Módulo Painel ${marca}”` }).click();
  await digitar(page, 'input[name="titulo"]', `PDF sem arquivo ${marca}`);
  await page.getByRole("button", { name: "Salvar material" }).click();
  await expect(page.getByText("Envie o arquivo PDF.")).toBeVisible();
  expect(await db.select().from(alunoMateriais).where(eq(alunoMateriais.titulo, `PDF sem arquivo ${marca}`))).toHaveLength(0);

  // Bloquear e liberar o aluno.
  await page.goto("/admin/alunos");
  await page.waitForLoadState("networkidle");
  const linha = page.locator("tr", { hasText: emailAluno });
  await expect(linha).toContainText("Conta criada");
  await linha.getByRole("button", { name: "Bloquear" }).click();
  await expect.poll(async () => (await db.select().from(alunos).where(eq(alunos.email, emailAluno)))[0].bloqueado).toBe(true);
  await expect(linha).toContainText("Bloqueado");
  await linha.getByRole("button", { name: "Liberar" }).click();
  await expect.poll(async () => (await db.select().from(alunos).where(eq(alunos.email, emailAluno)))[0].bloqueado).toBe(false);
});

test("sem sessão, o material leva de volta à entrada; em outros idiomas os textos vêm traduzidos e o menu tem 'Sou aluno'", async ({ page }) => {
  const [m] = await db.select().from(alunoMateriais).where(eq(alunoMateriais.titulo, `Caso Clínico ${marca}`));
  await page.goto(`/sou-aluno/material/${m.id}`);
  await expect(page).toHaveURL(/\/sou-aluno$/);
  await expect(page.locator('input[name="senha"]')).toBeVisible();

  const t = criarTradutor("de", "Aluno");
  await page.goto("/de/sou-aluno");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("tab", { name: t("abaPrimeiro") })).toBeVisible();
  for (const [locale, caminho] of [["en", "/en/sou-aluno"], ["fr", "/fr/sou-aluno"], ["zh", "/zh/sou-aluno"]] as const) {
    await page.goto(`/${locale}`);
    // O menu fica no botão lateral quando os rótulos do idioma não cabem na linha (ex.: francês): o link existe no cabeçalho de qualquer jeito.
    await expect(page.locator(`header a[href="${caminho}"]`).first()).toBeAttached();
  }
  await page.goto("/");
  await expect(page.locator('header a[href="/sou-aluno"]').first()).toHaveText("Sou aluno");
});

test("Ver como aluno: o ADMIN vê a área em modo leitura (por aluno e por turma); quem não é ADMIN volta para a entrada", async ({ page, browser, baseURL }) => {
  const [a] = await db.select().from(alunos).where(eq(alunos.email, emailAluno));
  const [caso] = await db.select().from(alunoMateriais).where(eq(alunoMateriais.titulo, `Caso Clínico ${marca}`));
  const [agendado] = await db.select().from(alunoMateriais).where(eq(alunoMateriais.titulo, `PDF Agendado ${marca}`));

  // Sem login de ADMIN: nada de prévia (volta para a entrada), nem pelos arquivos.
  const anonimo = await browser.newContext({ baseURL, locale: "pt-BR" });
  const p = await anonimo.newPage();
  await p.goto(`/sou-aluno/previa?aluno=${a.id}`);
  await expect(p).toHaveURL(/\/sou-aluno$/, { timeout: 15_000 });
  await expect(p.locator('input[name="senha"]')).toBeVisible();
  expect((await p.request.get(`/api/aluno/arquivo?tipo=imagem&id=${caso.id}&i=0&previa=aluno:${a.id}`)).status()).toBe(404);
  await anonimo.close();

  await entrarNoPainel(page);
  await page.goto("/admin/alunos");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("tr", { hasText: emailAluno }).getByRole("link", { name: "Ver como aluno" })).toHaveAttribute("href", `/sou-aluno/previa?aluno=${a.id}`);

  // Como o aluno X: aviso, as turmas e os materiais dele, sem formulário de comentário.
  await page.goto(`/sou-aluno/previa?aluno=${a.id}`);
  await expect(page.getByRole("note")).toContainText(`Prévia do ADMIN: você está vendo a área do aluno como ${nomeAluno}`, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: `Aluno Um ${marca}` })).toBeVisible();
  await expect(page.getByText(`Caso Clínico ${marca}`)).toBeVisible();
  await expect(page.getByText(`PDF Agendado ${marca}`)).toHaveCount(0);
  await page.getByText(`Caso Clínico ${marca}`).click();
  await expect(page.getByRole("heading", { name: `Caso Clínico ${marca}` })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("note")).toBeVisible();
  await expect(page.locator('textarea[name="texto"]')).toHaveCount(0); // só leitura: não comenta
  await expect(page.getByAltText("Radiografia de teste")).toHaveAttribute("src", new RegExp(`&previa=aluno:${a.id}$`));
  // Um material que o aluno não vê (agendado) também não aparece na prévia, com o motivo.
  await page.goto(`/sou-aluno/previa/material/${agendado.id}?aluno=${a.id}`);
  await expect(page.getByText(/não está visível para/)).toBeVisible({ timeout: 15_000 });

  // Como um aluno da turma: o conteúdo da turma, sem aluno de verdade (sem certificado).
  await page.goto(`/sou-aluno/previa?turma=${turma1}`);
  await expect(page.getByRole("note")).toContainText(`como um aluno da turma Aluno Um ${marca}`, { timeout: 15_000 });
  await expect(page.getByText(`Módulo Teste ${marca}`)).toBeVisible();
  await expect(page.getByText(`Módulo Dois ${marca}`)).toHaveCount(0);
  await page.goto(`/admin/alunos?aba=materiais&turma=${turma1}`);
  await expect(page.getByRole("link", { name: "Ver como aluno desta turma" })).toHaveAttribute("href", `/sou-aluno/previa?turma=${turma1}`);

  // Nada foi gravado: o aluno continua sem comentários novos e o aceite dele não mudou.
  const [depois] = await db.select().from(alunos).where(eq(alunos.id, a.id));
  expect(depois.aceiteVersao).toBe(a.aceiteVersao);
});

test("Ver como aluno: os arquivos chegam pela prévia só para o ADMIN", async ({ page, request, baseURL }) => {
  test.skip(!process.env.BLOB_READ_WRITE_TOKEN, "precisa do BLOB_READ_WRITE_TOKEN");
  const [a] = await db.select().from(alunos).where(eq(alunos.email, emailAluno));
  const [m] = await db.select().from(alunoMateriais).where(eq(alunoMateriais.titulo, `PDF Real ${marca}`));
  const via = `/api/aluno/arquivo?tipo=material&id=${m.id}&previa=aluno:${a.id}`;
  expect((await request.get(`${baseURL}${via}`)).status()).toBe(404);
  await entrarNoPainel(page);
  const r = await page.request.get(via);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("application/pdf");
  expect((await page.request.get(`/api/aluno/arquivo?tipo=material&id=${m.id}&previa=aluno:nao-e-um-id`)).status()).toBe(404);
});
