import { expect, test, type Page } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { del, put } from "@vercel/blob";
import sharp from "sharp";
import { db } from "../db";
import { turmas, usuarios } from "../db/schema";
import { gerarHash } from "../lib/senha";

/* Foto da turma: escolher, enquadrar (moldura fixa, zoom, teclado), preparar no navegador e enviar.
   O preparo (recorte, redução para 2000 de largura, WebP, sem metadados) é conferido nos bytes que saem do navegador:
   o envio ao Blob é interceptado e respondido de mentira, então estes testes não dependem do armazenamento.
   O último teste usa o Blob de verdade e só roda se o store do BLOB_READ_WRITE_TOKEN aceitar acesso público. */

const SENHA = "senha-de-teste-12345";
const marca = `${Date.now()}`;
const email = `e2e-foto-${marca}@exemplo.invalid`;
const blobsCriados: string[] = [];
let usuarioId = "";

/** JPEG sintético (gradiente, sem rosto nem paciente), com metadados de propósito (descrição e localização) para provar que somem. */
async function jpeg(largura: number, altura: number, comMetadados = false) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c2b3a"/><stop offset="1" stop-color="#c9a36a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${largura / 3}" cy="${altura / 2}" r="${altura / 5}" fill="#fff"/></svg>`;
  let img = sharp(Buffer.from(svg));
  if (comMetadados) img = img.withExif({ IFD0: { ImageDescription: "segredo-do-exif" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "19/1 55/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "43/1 56/1 0/1" } });
  return img.jpeg({ quality: 85 }).toBuffer();
}

async function digitar(page: Page, seletor: string, valor: string) {
  const campo = page.locator(seletor);
  await expect(async () => {
    await campo.fill(valor);
    await page.waitForTimeout(150);
    await expect(campo).toHaveValue(valor);
  }).toPass();
}

async function entrar(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function abrirDialogo(page: Page) {
  await entrar(page);
  await page.goto("/admin/agenda/nova");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Trocar foto" }).click();
  return page.getByRole("dialog");
}

/** Responde de mentira ao envio para o Blob e guarda os bytes que o navegador mandou. */
async function interceptarEnvio(page: Page) {
  const enviados: Buffer[] = [];
  await page.route(/vercel\.com\/api\/blob/, async (route) => {
    const req = route.request();
    if (req.method() !== "PUT") return route.continue();
    enviados.push(req.postDataBuffer() ?? Buffer.alloc(0));
    const nome = `turma-${Date.now()}.webp`;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: `https://teste.public.blob.vercel-storage.com/${nome}`, downloadUrl: `https://teste.public.blob.vercel-storage.com/${nome}?download=1`, pathname: nome, contentType: "image/webp", contentDisposition: "inline" }),
    });
  });
  return enviados;
}

test.beforeAll(async () => {
  const [u] = await db.insert(usuarios).values({ nome: "Teste foto", email, papel: "ADMIN", ativo: true, senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  usuarioId = u.id;
});

test.afterAll(async () => {
  if (blobsCriados.length) await del(blobsCriados);
  await db.delete(turmas).where(like(turmas.slug, "teste-foto-%"));
  if (usuarioId) await db.delete(usuarios).where(eq(usuarios.id, usuarioId));
});

test("foto grande de celular (com GPS): recorte 16:10, WebP até 2000 de largura, sem metadados, só esse arquivo é enviado", async ({ page }) => {
  const enviados = await interceptarEnvio(page);
  const dialogo = await abrirDialogo(page);
  await expect(dialogo.getByText("Escolha uma foto e ajuste o enquadramento.")).toBeVisible();

  const original = await jpeg(4000, 3000, true);
  expect((await sharp(original).metadata()).exif).toBeTruthy(); // o original tem EXIF e GPS
  await dialogo.locator('input[type="file"]').setInputFiles({ name: "IMG_1234.jpg", mimeType: "image/jpeg", buffer: original });

  await expect(dialogo.getByTestId("recorte")).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Usar este enquadramento" })).toBeEnabled();
  await dialogo.getByRole("button", { name: "Usar este enquadramento" }).click();

  await expect(dialogo.getByText("Foto enviada")).toBeVisible({ timeout: 30_000 });
  expect(enviados).toHaveLength(1);
  const final = enviados[0];
  expect(final.subarray(0, 4).toString()).toBe("RIFF");
  expect(final.subarray(8, 12).toString()).toBe("WEBP");
  expect(final.length).toBeLessThanOrEqual(2 * 1024 * 1024);
  const meta = await sharp(final).metadata();
  expect(meta.format).toBe("webp");
  expect(meta.width).toBeLessThanOrEqual(2000);
  expect(meta.width).toBe(2000); // 4000 de largura é reduzida
  expect(Math.abs(meta.width! / meta.height! - 1.6)).toBeLessThan(0.01);
  expect(meta.exif).toBeUndefined();
  expect(final.includes(Buffer.from("segredo-do-exif"))).toBe(false);
  expect(final.includes(Buffer.from("EXIF"))).toBe(false);
  await expect(dialogo.getByRole("button", { name: "Usar esta foto" })).toBeEnabled();
});

test("foto pequena: aviso que não bloqueia; só vai depois de 'Usar mesmo assim'", async ({ page }) => {
  const enviados = await interceptarEnvio(page);
  const dialogo = await abrirDialogo(page);
  await dialogo.locator('input[type="file"]').setInputFiles({ name: "pequena.jpg", mimeType: "image/jpeg", buffer: await jpeg(1000, 700) });
  await expect(dialogo.getByTestId("recorte")).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Usar este enquadramento" })).toBeEnabled();
  await dialogo.getByRole("button", { name: "Usar este enquadramento" }).click();

  await expect(dialogo.getByText("Esta foto é pequena e pode ficar borrada em telas grandes. Usar mesmo assim?")).toBeVisible();
  expect(enviados).toHaveLength(0); // ainda nada saiu do navegador
  await dialogo.getByRole("button", { name: "Usar mesmo assim" }).click();
  await expect(dialogo.getByText("Foto enviada")).toBeVisible({ timeout: 30_000 });
  expect(enviados).toHaveLength(1);
  const meta = await sharp(enviados[0]).metadata();
  expect(meta.width).toBeLessThanOrEqual(1000); // não é ampliada
});

test("PNG é aceito e vira WebP; zoom e setas do teclado funcionam", async ({ page }) => {
  const enviados = await interceptarEnvio(page);
  const dialogo = await abrirDialogo(page);
  const png = await sharp(await jpeg(2400, 1800)).png().toBuffer();
  await dialogo.locator('input[type="file"]').setInputFiles({ name: "captura.png", mimeType: "image/png", buffer: png });
  await expect(dialogo.getByTestId("recorte")).toBeVisible();

  const zoom = dialogo.getByLabel("Aproximar");
  await expect(zoom).toHaveValue("1");
  await zoom.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  expect(Number(await zoom.inputValue())).toBeGreaterThan(1);

  // O recorte entra na ordem de tabulação e responde às setas.
  const area = dialogo.getByTestId("recorte").locator('[tabindex="0"]').first();
  await area.focus();
  await page.keyboard.press("ArrowLeft");
  await dialogo.getByRole("button", { name: "Usar este enquadramento" }).click();
  await expect(dialogo.getByText("Foto enviada")).toBeVisible({ timeout: 30_000 });
  expect((await sharp(enviados[0]).metadata()).format).toBe("webp");
});

test("erros em linguagem simples: tipo errado, arquivo enorme e arquivo que não abre", async ({ page }) => {
  const dialogo = await abrirDialogo(page);
  const arquivo = dialogo.locator('input[type="file"]');

  await arquivo.setInputFiles({ name: "contrato.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await expect(dialogo.getByText("Este tipo de arquivo não serve. Escolha uma foto do celular ou do computador (JPG, PNG ou HEIC).")).toBeVisible();

  await arquivo.setInputFiles({ name: "gigante.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(26 * 1024 * 1024) });
  await expect(dialogo.getByText("Este arquivo é grande demais. Escolha outra foto ou tire um print dela.")).toBeVisible();

  await arquivo.setInputFiles({ name: "quebrada.jpg", mimeType: "image/jpeg", buffer: Buffer.from("isto não é uma imagem") });
  await expect(dialogo.getByText("Não foi possível abrir esta foto. Tente outra ou tire um print dela.")).toBeVisible();
  await expect(dialogo.getByText(/16:10|\bpx\b|\bMB\b/)).toHaveCount(0);
});

test("servidor: só aceita WebP de até 2 MB e só para quem tem sessão", async ({ request }) => {
  const semSessao = await request.post("/api/admin/foto", { data: { type: "blob.generate-client-token", payload: { pathname: "x.webp", callbackUrl: "http://localhost", clientPayload: null, multipart: false } } });
  expect(semSessao.status()).toBe(400);
});

test("Blob de verdade: envia, salva a turma e a foto aparece no site (só roda com store público)", async ({ page }) => {
  test.skip(!process.env.BLOB_READ_WRITE_TOKEN, "sem BLOB_READ_WRITE_TOKEN");
  try {
    const teste = await put(`teste-diag/${marca}.txt`, "ok", { access: "public", addRandomSuffix: true });
    await del(teste.url);
  } catch (e) {
    test.skip(true, `o Blob store não aceita acesso público (${e instanceof Error ? e.message : e})`);
  }

  await entrar(page);
  await page.goto("/admin/agenda/nova");
  await page.waitForLoadState("networkidle");
  const titulo = `Teste foto ${marca}`;
  await digitar(page, 'input[name="titulo"]', titulo);
  await digitar(page, 'input[name="tituloCurto"]', `teste-foto-${marca}`);
  await digitar(page, 'textarea[name="resumo"]', "Resumo do teste de foto.");
  await digitar(page, 'textarea[name="descricao"]', "Descrição do teste de foto.");
  await digitar(page, 'input[name="inicio"]', "2099-04-18");
  await digitar(page, 'input[name="horario"]', "8h às 18h");
  await digitar(page, 'input[name="vagas"]', "10");
  await page.getByRole("button", { name: "Trocar foto" }).click();
  const dialogo = page.getByRole("dialog");

  await dialogo.locator('input[type="file"]').setInputFiles({ name: "turma.jpg", mimeType: "image/jpeg", buffer: await jpeg(3200, 2400, true) });
  await dialogo.getByRole("button", { name: "Usar este enquadramento" }).click();
  await expect(dialogo.getByText("Foto enviada")).toBeVisible({ timeout: 60_000 });
  await dialogo.getByRole("button", { name: "Usar esta foto" }).click();

  const url = await page.locator('input[name="fotoUrl"]').inputValue();
  expect(url).toMatch(/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//);
  blobsCriados.push(url);
  const r = await page.request.get(url);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("image/webp");

  await page.getByRole("button", { name: "Salvar e publicar" }).click();
  await expect(page.getByText("Data salva e publicada.")).toBeVisible();
  await page.goto(`/agenda/teste-foto-${marca}-abr-2099`);
  const hero = page.locator(".ap-hero-media img");
  await expect(hero).toHaveAttribute("src", /_next\/image\?url=https?%3A%2F%2F.*blob\.vercel-storage\.com/);
  await expect.poll(() => hero.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
});
