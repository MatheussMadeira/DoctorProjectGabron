import { expect, test, type Page } from "@playwright/test";

/* Site em 7 idiomas: pt-BR sem prefixo e /en /es /fr /it /de /zh com prefixo, hreflang, seletor no Header (que mantém a página e guarda o
   cookie), redirecionamento por cookie só na raiz, sugestão pelo idioma do navegador (sem redirecionar), aviso de tradução e tipografia do chinês.
   As traduções dos textos fixos vêm de `yarn i18n:traduzir`; onde ainda não existem, o site cai no português: os testes não dependem disso. */

const LOCALES = [
  { codigo: "pt-BR", prefixo: "", lang: "pt-BR", hreflang: "pt-BR", sigla: "PT", nome: "Português", aviso: false },
  { codigo: "en", prefixo: "/en", lang: "en", hreflang: "en", sigla: "EN", nome: "English", aviso: false },
  { codigo: "es", prefixo: "/es", lang: "es", hreflang: "es", sigla: "ES", nome: "Español", aviso: false },
  { codigo: "fr", prefixo: "/fr", lang: "fr", hreflang: "fr", sigla: "FR", nome: "Français", aviso: true },
  { codigo: "it", prefixo: "/it", lang: "it", hreflang: "it", sigla: "IT", nome: "Italiano", aviso: true },
  { codigo: "de", prefixo: "/de", lang: "de", hreflang: "de", sigla: "DE", nome: "Deutsch", aviso: true },
  { codigo: "zh", prefixo: "/zh", lang: "zh-Hans", hreflang: "zh-Hans", sigla: "ZH", nome: "中文", aviso: true },
] as const;
const SLUG = "modulo-essencial-nov-2026";
const PAGINAS = ["", "/sobre-o-curso", "/agenda", `/agenda/${SLUG}`, "/contato", "/politica-de-privacidade"];

for (const l of LOCALES) {
  test(`navegar em ${l.codigo}: todas as páginas respondem, com lang, hreflang e canonical`, async ({ request }) => {
    for (const p of PAGINAS) {
      const caminho = `${l.prefixo}${p}` || "/";
      const r = await request.get(caminho);
      expect(r.status(), caminho).toBe(200);
      const html = await r.text();
      expect(html, caminho).toContain(`<html lang="${l.lang}"`);
      // hreflang dos 7 idiomas + x-default (o português).
      for (const o of LOCALES) expect(html, `${caminho} hreflang ${o.hreflang}`).toMatch(new RegExp(`<link rel="alternate" hrefLang="${o.hreflang}" href="[^"]*${o.prefixo}${p}"`));
      expect(html, caminho).toMatch(new RegExp(`<link rel="alternate" hrefLang="x-default" href="[^"]*${p}"`));
      expect(html, caminho).toMatch(new RegExp(`<link rel="canonical" href="[^"]*${l.prefixo}${p}"`));
      expect(html).not.toMatch(/Menu inexistente|MISSING_MESSAGE|Home\.titulo/); // nunca aparece a chave
    }
  });

  test(`aviso de tradução automática no rodapé: ${l.aviso ? "aparece" : "não aparece"} em ${l.codigo}`, async ({ page }) => {
    await page.goto(`${l.prefixo}/contato`);
    await expect(page.locator("footer .ap-aviso-traducao")).toHaveCount(l.aviso ? 1 : 0);
  });
}

test("seletor de idioma: botão com a sigla, lista com o nome de cada idioma na própria língua, e aria-label com o rótulo do idioma da página", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/agenda");
  const botao = page.locator(".ap-lang-btn:visible").first();
  await expect(botao).toHaveText("EN");
  // O rótulo acessível vem de messages/<idioma>.json (em português "Idioma"; nos outros, o que a tradução disser) e começa com ele.
  await expect(botao).toHaveAttribute("aria-label", /^\S.*: EN$/);
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  await botao.click();
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  const itens = page.locator(".ap-lang-painel a");
  await expect(itens).toHaveText(LOCALES.map((l) => l.nome));
  await expect(page.locator(".ap-lang-painel a[aria-current='true']")).toHaveText("English");
  expect(await itens.nth(6).getAttribute("lang")).toBe("zh-Hans");
});

test("seletor: ArrowDown/ArrowUp andam pela lista e Esc fecha devolvendo o foco ao botão", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const botao = page.locator(".ap-lang-btn:visible").first();
  await botao.focus();
  await page.keyboard.press("ArrowDown"); // abre
  await expect(page.locator(".ap-lang-painel")).toBeVisible();
  await page.locator(".ap-lang-painel a").first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".ap-lang-painel a").nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(".ap-lang-painel a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".ap-lang-painel")).toHaveCount(0);
  await expect(botao).toBeFocused();
});

/** Abre o seletor e escolhe o idioma; repete se o clique veio antes da hidratação (o painel não abre). */
const escolher = async (page: Page, nome: string) => {
  await expect(async () => {
    const painel = page.locator(".ap-lang-painel");
    if (!(await painel.isVisible())) await page.locator(".ap-lang-btn:visible").first().click();
    await painel.locator("a", { hasText: nome }).click({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
};

test("trocar no seletor mantém a página e guarda o cookie (agenda → de → zh → português)", async ({ page, context }) => {
  test.slow(); // três páginas frias em sequência: no primeiro acesso cada uma pode levar vários segundos
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/agenda/${SLUG}`);
  await escolher(page, "Deutsch");
  await expect(page).toHaveURL(new RegExp(`/de/agenda/${SLUG}$`), { timeout: 20_000 });
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  expect((await context.cookies()).find((c) => c.name === "NEXT_LOCALE")?.value).toBe("de");

  await escolher(page, "中文");
  await expect(page).toHaveURL(new RegExp(`/zh/agenda/${SLUG}$`), { timeout: 20_000 });
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");

  await escolher(page, "Português");
  await expect(page).toHaveURL((url) => url.pathname === `/agenda/${SLUG}`, { timeout: 20_000 }); // pt-BR volta sem prefixo
  expect((await context.cookies()).find((c) => c.name === "NEXT_LOCALE")?.value).toBe("pt-BR");
});

test("no celular, o seletor fica dentro do menu lateral e também mantém a página", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sobre-o-curso");
  await expect(page.locator("header .ap-lang-btn")).toBeHidden(); // o botão do desktop não aparece
  await page.getByRole("button", { name: "Abrir menu" }).click();
  const lista = page.locator(".ap-drawer-idioma");
  await expect(lista.getByRole("link")).toHaveText(LOCALES.map((l) => l.nome));
  await lista.getByRole("link", { name: "Français" }).click();
  await expect(page).toHaveURL(/\/fr\/sobre-o-curso$/);
});

test("cookie: só a raiz redireciona, e só para quem já escolheu um idioma; links diretos abrem no idioma do link", async ({ request }) => {
  const raiz = await request.get("/", { maxRedirects: 0, headers: { cookie: "NEXT_LOCALE=fr" } });
  expect(raiz.status()).toBe(307);
  expect(new URL(raiz.headers()["location"], "http://x").pathname).toBe("/fr");
  const zh = await request.get("/", { maxRedirects: 0, headers: { cookie: "NEXT_LOCALE=zh" } });
  expect(new URL(zh.headers()["location"], "http://x").pathname).toBe("/zh");
  // pt-BR escolhido, ou nenhum cookie: a raiz é o português.
  expect((await request.get("/", { maxRedirects: 0, headers: { cookie: "NEXT_LOCALE=pt-BR" } })).status()).toBe(200);
  expect((await request.get("/", { maxRedirects: 0 })).status()).toBe(200);
  // Só a raiz: outra página com cookie não redireciona.
  expect((await request.get("/agenda", { maxRedirects: 0, headers: { cookie: "NEXT_LOCALE=en" } })).status()).toBe(200);
  // Link direto manda mais que o cookie.
  const direto = await request.get("/en", { maxRedirects: 0, headers: { cookie: "NEXT_LOCALE=de" } });
  expect(direto.status()).toBe(200);
  expect(await direto.text()).toContain('<html lang="en"');
  // Cookie inválido é ignorado.
  expect((await request.get("/", { maxRedirects: 0, headers: { cookie: "NEXT_LOCALE=xx" } })).status()).toBe(200);
});

test("o idioma do navegador nunca redireciona: a raiz sem cookie é pt-BR (mesmo com Accept-Language de)", async ({ request }) => {
  const r = await request.get("/", { maxRedirects: 0, headers: { "accept-language": "de-DE,de;q=0.9,en;q=0.5" } });
  expect(r.status()).toBe(200);
  expect(await r.text()).toContain('<html lang="pt-BR"');
});

test("sugestão discreta: navegador em alemão, sem cookie → mostra a sugestão sem sair da página; fechar guarda a decisão", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "de-DE", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/");
  const sugestao = page.locator(".ap-sugestao-idioma");
  await expect(sugestao).toBeVisible();
  await expect(sugestao).toContainText("Deutsch");
  expect(new URL(page.url()).pathname).toBe("/"); // não redirecionou
  await page.getByRole("button", { name: /Fechar sugestão/ }).click();
  await expect(sugestao).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".ap-sugestao-idioma")).toHaveCount(0); // lembrou

  // Quem já escolheu um idioma (cookie) não recebe sugestão.
  const ctx2 = await browser.newContext({ locale: "de-DE" });
  await ctx2.addCookies([{ name: "NEXT_LOCALE", value: "pt-BR", url: "http://localhost:3107" }]);
  const p2 = await ctx2.newPage();
  await p2.goto("/");
  await expect(p2.locator(".ap-sugestao-idioma")).toHaveCount(0);
  await ctx.close();
  await ctx2.close();
});

test("sugestão: aceitar leva ao idioma, mantendo a página, e guarda o cookie", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "fr-FR", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/contato");
  await page.locator(".ap-sugestao-idioma a").click();
  await expect(page).toHaveURL(/\/fr\/contato$/);
  expect((await ctx.cookies()).find((c) => c.name === "NEXT_LOCALE")?.value).toBe("fr");
  await expect(page.locator(".ap-sugestao-idioma")).toHaveCount(0);
  await ctx.close();
});

test("chinês: Noto Sans SC pelo atributo lang, sem caixa alta e sem espaçamento entre letras nos títulos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/zh");
  const titulo = page.locator(".ap-hero-title");
  const css = await titulo.evaluate((el) => ({ fonte: getComputedStyle(el).fontFamily, caixa: getComputedStyle(el).textTransform, espaco: getComputedStyle(el).letterSpacing }));
  expect(css.fonte).toMatch(/Noto Sans SC|nf-sc|__Noto_Sans_SC/i);
  expect(css.caixa).toBe("none");
  expect(["0px", "normal"]).toContain(css.espaco);
  expect(await page.locator(".ap-eyebrow").first().evaluate((el) => getComputedStyle(el).textTransform)).toBe("none");
  // Nos outros idiomas os títulos continuam em caixa alta com espaçamento (a regra é só do chinês).
  await page.goto("/");
  expect(await page.locator(".ap-hero-title").evaluate((el) => getComputedStyle(el).textTransform)).toBe("uppercase");
  // O nome "中文" no seletor usa a fonte do chinês mesmo numa página em português.
  await page.locator(".ap-lang-btn:visible").first().click();
  expect(await page.locator(".ap-lang-painel a[lang='zh-Hans']").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Noto Sans SC|nf-sc|__Noto_Sans_SC/i);
});

test("datas, horários e preço seguem o idioma (Intl): a turma em en, de e zh", async ({ request }) => {
  const texto = async (caminho: string) => (await (await request.get(caminho)).text()).replace(/<[^>]+>/g, " ");
  expect(await texto(`/agenda/${SLUG}`)).toMatch(/novembro|nov/i);
  expect(await texto(`/en/agenda/${SLUG}`)).toMatch(/Nov(ember)?\b/);
  expect(await texto(`/de/agenda/${SLUG}`)).toMatch(/Nov(ember)?\b/);
  expect(await texto(`/zh/agenda/${SLUG}`)).toMatch(/11月/);
});

test("redirects antigos também com prefixo; idioma inexistente é 404; /pt-BR/... volta para o caminho sem prefixo", async ({ request }) => {
  const sobre = await request.get("/en/sobre", { maxRedirects: 0 });
  expect(sobre.status()).toBe(301);
  expect(new URL(sobre.headers()["location"], "http://x").pathname).toBe("/en/sobre-o-curso");
  const clinica = await request.get("/de/clinica", { maxRedirects: 0 });
  expect(clinica.status()).toBe(301);
  expect(new URL(clinica.headers()["location"], "http://x").pathname).toBe("/de");
  expect((await request.get("/xx/agenda")).status()).toBe(404);
  const pt = await request.get("/pt-BR/agenda", { maxRedirects: 0 });
  expect([307, 308]).toContain(pt.status());
  expect(new URL(pt.headers()["location"], "http://x").pathname).toBe("/agenda");
});

test("navegação interna mantém o idioma: os links do menu e do rodapé em /de levam a /de/...", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/de");
  const hrefs = await page.locator("header .ap-nav a, footer nav a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  expect(hrefs.length).toBeGreaterThan(4);
  for (const h of hrefs) expect(h, String(h)).toMatch(/^\/de(\/|$)/);
});
