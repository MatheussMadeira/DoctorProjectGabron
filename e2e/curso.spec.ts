import { expect, test, type Page } from "@playwright/test";
import { eq, inArray, like } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../db";
import { fotosGaleria, professores, turmaProfessores, turmas, usuarios } from "../db/schema";
import { gerarHash } from "../lib/senha";

/* O site é do curso ReabToxin: rotas novas e redirecionamentos, professores (cadastro, CRM e RQE, turma, site) e galeria.
   Cria o próprio ADMIN, os professores e a turma, e devolve a galeria como estava. O envio ao Blob é interceptado. */

test.describe.configure({ mode: "serial" });

const SENHA = "senha-de-teste-12345";
const marca = `${Date.now()}`;
const emailAdmin = `e2e-curso-admin-${marca}@exemplo.invalid`;
const slug = `teste-curso-${marca}`;
const nomeProf = `Prof Teste ${marca}`;
let adminId = "";
let turmaId = "";
let galeriaOriginal: Array<{ url: string; alt: string; ordem: number }> = [];

async function entrar(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(emailAdmin);
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

async function imagem(largura: number, altura: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}"><rect width="100%" height="100%" fill="#28334f"/><circle cx="${largura / 2}" cy="${altura / 2}" r="${Math.min(largura, altura) / 4}" fill="#f5ebdf"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

/** Responde de mentira ao envio para o Blob e guarda os bytes mandados pelo navegador. */
async function interceptarEnvio(page: Page) {
  const enviados: Buffer[] = [];
  await page.route(/vercel\.com\/api\/blob/, async (route) => {
    const req = route.request();
    if (req.method() !== "PUT") return route.continue();
    enviados.push(req.postDataBuffer() ?? Buffer.alloc(0));
    const nome = `curso-${marca}-${enviados.length}.webp`;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: `https://teste.public.blob.vercel-storage.com/${nome}`, downloadUrl: `https://teste.public.blob.vercel-storage.com/${nome}?download=1`, pathname: nome, contentType: "image/webp", contentDisposition: "inline" }),
    });
  });
  return enviados;
}

test.beforeAll(async () => {
  const [u] = await db.insert(usuarios).values({ nome: "Teste curso", email: emailAdmin, papel: "ADMIN", ativo: true, senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  adminId = u.id;
  const [t] = await db
    .insert(turmas)
    .values({ slug, titulo: `Turma curso ${marca}`, tituloCurto: "Curso", resumo: "Resumo do teste.", descricao: "Descrição do teste.", modalidade: "PRESENCIAL", publicacao: "PUBLICADO", inicio: "2099-08-15", horario: "8h às 18h", cidade: "Belo Horizonte, MG", vagas: 8, fotoUrl: "/images/maos.webp", fotoAlt: "Teste" })
    .returning({ id: turmas.id });
  turmaId = t.id;
  galeriaOriginal = await db.select({ url: fotosGaleria.url, alt: fotosGaleria.alt, ordem: fotosGaleria.ordem }).from(fotosGaleria);
});

test.afterAll(async () => {
  await db.delete(turmas).where(eq(turmas.id, turmaId)); // turma_professores sai junto (cascata)
  await db.delete(professores).where(like(professores.nome, `%${marca}%`));
  await db.delete(fotosGaleria);
  if (galeriaOriginal.length) await db.insert(fotosGaleria).values(galeriaOriginal);
  await db.delete(usuarios).where(eq(usuarios.id, adminId));
});

test("/sobre e /clinica saem do ar com redirecionamento 301", async ({ request }) => {
  const sobre = await request.get("/sobre", { maxRedirects: 0 });
  expect(sobre.status()).toBe(301);
  expect(sobre.headers()["location"]).toMatch(/\/sobre-o-curso$/);
  const clinica = await request.get("/clinica", { maxRedirects: 0 });
  expect(clinica.status()).toBe(301);
  expect(new URL(clinica.headers()["location"], "http://localhost").pathname).toBe("/");
  expect((await request.get("/sobre-o-curso")).status()).toBe(200);
});

test("menu e rodapé: Sobre o curso no lugar de Sobre a Dra. e Clínica; rodapé legal do ReabToxin", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const menu = page.getByRole("banner").getByRole("navigation");
  await expect(menu.getByRole("link", { name: "Sobre o curso" })).toHaveAttribute("href", "/sobre-o-curso");
  await expect(menu.getByRole("link", { name: "Clínica" })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Sobre a Dra." })).toHaveCount(0);
  const rodape = page.locator("footer");
  await expect(rodape).toContainText("© 2026 ReabToxin · Formação em toxina botulínica · Belo Horizonte, MG");
  await expect(rodape).not.toContainText(/CRM|RQE|Coordenação|responsabilidade técnica/);
  await expect(rodape.getByRole("link", { name: "Sobre o curso" })).toBeVisible();
  await expect(page).toHaveTitle(/ReabToxin/);
  await expect(page.getByRole("heading", { level: 1, name: "ReabToxin" })).toBeVisible();
});

test("contato: assuntos do curso", async ({ page }) => {
  await page.goto("/contato");
  const opcoes = await page.locator('select[name="assunto"] option').allTextContents();
  expect(opcoes.filter(Boolean)).toEqual(["Inscrições e turmas", "Pagamento", "Turma para grupo ou instituição", "Outro assunto"]);
});

test("Contato do site não tem mais CRM nem RQE", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=contato");
  await expect(page.getByRole("button", { name: "Salvar dados" })).toBeVisible();
  await expect(page.locator('input[name="crm"]')).toHaveCount(0);
  await expect(page.locator('input[name="rqe"]')).toHaveCount(0);
});

test("não existe coordenação: o cadastro não tem o campo e Sobre o curso mostra todos iguais, na ordem do admin", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=professores");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo professor" }).first().click();
  await expect(page.getByLabel("Coordenação do curso")).toHaveCount(0);
  await expect(page.getByText(/Coordenação/)).toHaveCount(0);

  await page.goto("/sobre-o-curso");
  await expect(page.locator(".ap-about")).toHaveCount(0); // sem destaque (AboutDoctor)
  await expect(page.getByText(/Coordenação/)).toHaveCount(0);
  const cartoes = page.locator("#professores article.ap-prof");
  expect(await cartoes.count()).toBeGreaterThanOrEqual(2);
  const nomesNaPagina = await cartoes.locator("h3").allTextContents();
  const nomesNoBanco = (await db.select({ nome: professores.nome }).from(professores).where(eq(professores.visivel, true)).orderBy(professores.ordem, professores.nome)).map((p) => p.nome);
  expect(nomesNaPagina).toEqual(nomesNoBanco);
  // Todos com o mesmo formato de cartão (foto 4:5 em cima).
  const larguras = await cartoes.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  expect(new Set(larguras).size).toBe(1);
});

test("telas do design: frase dos professores, especialidade e cartões na grade de Sobre o curso", async ({ page }) => {
  const visiveis = (await db.select({ id: professores.id }).from(professores).where(eq(professores.visivel, true))).length;
  const frase = visiveis === 3 ? "Três professores que conduzem juntos as aulas teóricas e acompanham a prática." : /professores que conduzem juntos/;
  await page.goto("/");
  await expect(page.locator("#professores").getByText(frase)).toBeVisible();
  await page.goto("/sobre-o-curso");
  await expect(page.locator("#professores").getByText(frase)).toBeVisible();
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=professores");
  await expect(page.getByText("A ordem da lista é a ordem em que os professores aparecem no site.")).toBeVisible();
  await page.getByRole("button", { name: "Novo professor" }).first().click();
  await expect(page.getByLabel("Especialidade")).toBeVisible();
  await expect(page.getByLabel(/Função/)).toHaveCount(0);
});

test("professor médico precisa mostrar CRM e RQE; salvo, aparece em Sobre o curso na hora", async ({ page }) => {
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=professores");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo professor" }).first().click();

  const form = page.getByRole("form", { name: "Novo professor" });
  await digitar(page, 'input[name="nome"]', nomeProf);
  await digitar(page, 'input[name="funcao"]', "Fisiatria");
  await digitar(page, 'input[name="registro"]', "CRM-MG 12345");
  await form.getByRole("button", { name: "Salvar professor" }).click();
  await expect(page.getByText("Médicos precisam mostrar CRM e RQE, como CRM-MG 12345 · RQE 6789.")).toBeVisible();
  expect(await db.select().from(professores).where(like(professores.nome, `%${marca}%`))).toHaveLength(0);

  await digitar(page, 'input[name="registro"]', "CRM-MG 12345 · RQE 6789");
  await digitar(page, 'textarea[name="bio"]', "Mini bio do professor de teste.");
  await form.getByRole("button", { name: "Salvar professor" }).click();
  await expect(page.getByText("Professor salvo")).toBeVisible();

  await page.goto("/sobre-o-curso");
  await expect(page.getByRole("heading", { level: 3, name: nomeProf })).toBeVisible();
  await expect(page.getByText("CRM-MG 12345 · RQE 6789")).toBeVisible();
  await expect(page.getByText("Mini bio do professor de teste.")).toBeVisible();
});

test("professor oculto some do site; reaparece ao mostrar", async ({ page }) => {
  await entrar(page);
  const [p] = await db.select().from(professores).where(like(professores.nome, `%${marca}%`));
  expect(p.visivel).toBe(true);
  // Pelo painel, para passar pelas tags (updateTag): abre, desmarca "Mostrar no site" e salva.
  await page.goto("/admin/configuracoes?aba=professores");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: `Editar ${nomeProf}` }).click();
  const form = page.getByRole("form", { name: `Editar ${nomeProf}` });
  await form.getByLabel("Mostrar no site").uncheck({ force: true });
  await form.getByRole("button", { name: "Salvar professor" }).click();
  await expect(page.getByText("Professor salvo")).toBeVisible();
  await page.goto("/sobre-o-curso");
  await expect(page.getByRole("heading", { level: 3, name: nomeProf })).toHaveCount(0);
});

test("professores desta turma: escolher e ordenar no editar turma, e aparecem na página da turma", async ({ page }) => {
  const [p] = await db.select().from(professores).where(like(professores.nome, `%${marca}%`));
  await db.update(professores).set({ visivel: true }).where(eq(professores.id, p.id));
  await entrar(page);
  await page.goto(`/admin/agenda/${turmaId}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Professores desta turma" })).toBeVisible();
  // O item sobe para a lista de marcados (e é recriado): clica uma vez em vez de usar check().
  await page.getByRole("checkbox", { name: new RegExp(nomeProf) }).click({ force: true });
  await expect(page.locator('input[name="professorId"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Salvar e publicar" }).click();
  await expect(page).toHaveURL(/\/admin\/agenda\?salvo=/);
  const ligados = await db.select().from(turmaProfessores).where(eq(turmaProfessores.turmaId, turmaId));
  expect(ligados.map((l) => l.professorId)).toEqual([p.id]);

  await page.goto(`/agenda/${slug}`);
  await expect(page.getByRole("heading", { name: "Quem conduz esta turma" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: nomeProf })).toBeVisible();
  await expect(page.getByText("CRM-MG 12345 · RQE 6789")).toBeVisible();
  // Dados estruturados da turma: Course e EducationEvent, com o professor.
  const html = await page.content();
  expect(html).toContain('"@type":"EducationEvent"');
  expect(html).toContain('"@type":"Course"');
  expect(html).toContain(nomeProf);
});

test("foto do professor: recorte em retrato 4:5, WebP de até 1200 de largura", async ({ page }) => {
  const enviados = await interceptarEnvio(page);
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=professores");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo professor" }).first().click();
  await page.getByRole("button", { name: /Enviar foto|Trocar foto/ }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Foto do professor")).toBeVisible();
  await expect(dialogo.getByText("Ou escolha da biblioteca da marca")).toHaveCount(0); // sem biblioteca no retrato

  await dialogo.locator('input[type="file"]').setInputFiles({ name: "retrato.jpg", mimeType: "image/jpeg", buffer: await imagem(3000, 3000) });
  await expect(dialogo.getByTestId("recorte")).toBeVisible();
  await dialogo.getByRole("button", { name: "Usar este enquadramento" }).click();
  await expect(dialogo.getByText("Foto enviada")).toBeVisible({ timeout: 30_000 });
  const meta = await sharp(enviados[0]).metadata();
  expect(meta.format).toBe("webp");
  expect(meta.width).toBeLessThanOrEqual(1200);
  expect(Math.abs(meta.width! / meta.height! - 0.8)).toBeLessThan(0.01);
  expect(meta.exif).toBeUndefined();
});

test("galeria: várias fotos de uma vez, descrição obrigatória, ordem e remoção; o site acompanha", async ({ page }) => {
  const enviados = await interceptarEnvio(page);
  await entrar(page);
  await page.goto("/admin/configuracoes?aba=galeria");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/regra do CFM/)).toBeVisible();

  // Começa do zero: remove as fotos que já existem (o teste devolve a galeria no fim).
  while ((await page.getByRole("button", { name: "Remover" }).count()) > 0) await page.getByRole("button", { name: "Remover" }).first().click();

  await page.locator('input[type="file"]').setInputFiles([
    { name: "um.jpg", mimeType: "image/jpeg", buffer: await imagem(2400, 1600) },
    { name: "dois.jpg", mimeType: "image/jpeg", buffer: await imagem(2000, 1500) },
  ]);
  await expect(page.getByLabel("Descrição da foto")).toHaveCount(2, { timeout: 30_000 });
  expect(enviados).toHaveLength(2);
  for (const b of enviados) expect((await sharp(b).metadata()).format).toBe("webp");

  const salvar = page.getByRole("button", { name: "Salvar galeria" });
  await expect(salvar).toBeDisabled(); // sem descrição não salva
  await expect(page.getByText("Faltam descrever 2 fotos.")).toBeVisible();
  const campos = page.getByLabel("Descrição da foto");
  await campos.nth(0).fill(`Primeira foto ${marca}`);
  await campos.nth(1).fill(`Segunda foto ${marca}`);
  await expect(salvar).toBeEnabled();

  // Ordem: desce a primeira.
  await page.getByRole("button", { name: "Descer" }).first().click();
  await expect(page.getByLabel("Descrição da foto").nth(0)).toHaveValue(`Segunda foto ${marca}`);
  await salvar.click();
  await expect(page.getByText("Galeria salva")).toBeVisible();

  const gravadas = await db.select().from(fotosGaleria).orderBy(fotosGaleria.ordem);
  expect(gravadas.map((g) => g.alt)).toEqual([`Segunda foto ${marca}`, `Primeira foto ${marca}`]);

  await page.goto("/sobre-o-curso");
  await expect(page.getByRole("img", { name: `Segunda foto ${marca}` })).toBeAttached();
  await expect(page.getByRole("img", { name: `Primeira foto ${marca}` })).toBeAttached();
});

test("galeria e professores são só para ADMIN: EQUIPE não vê as abas", async ({ page }) => {
  const [u] = await db.insert(usuarios).values({ nome: "Equipe curso", email: `e2e-curso-equipe-${marca}@exemplo.invalid`, papel: "EQUIPE", ativo: true, senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  try {
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill(`e2e-curso-equipe-${marca}@exemplo.invalid`);
    await page.getByLabel("Senha").fill(SENHA);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/configuracoes?aba=galeria");
    await expect(page.getByRole("tab", { name: /Galeria/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Salvar galeria" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Minha senha" })).toBeVisible();
  } finally {
    await db.delete(usuarios).where(inArray(usuarios.id, [u.id]));
  }
});
