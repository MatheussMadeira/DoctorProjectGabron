import { expect, test, type APIRequestContext } from "@playwright/test";

/* Com SITE_PUBLICO ausente (como o servidor de teste sobe), nada pode ser indexado nem anunciado. */

async function jsonLd(request: APIRequestContext, caminho: string): Promise<Array<Record<string, unknown>>> {
  const html = await (await request.get(caminho)).text();
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1].replace(/\u003c/g, "<")));
}

test("site fora do ar: robots.txt bloqueia tudo e não anuncia o sitemap", async ({ request }) => {
  const texto = await (await request.get("/robots.txt")).text();
  expect(texto).toContain("Disallow: /");
  expect(texto).not.toMatch(/Sitemap:/i);
  expect(texto).not.toMatch(/^Allow:/im);
});

test("site fora do ar: o sitemap existe mas está vazio", async ({ request }) => {
  const resposta = await request.get("/sitemap.xml");
  expect(resposta.status()).toBe(200);
  expect(await resposta.text()).not.toContain("<url>");
});

test("site fora do ar: toda página manda noindex, no HTML e no cabeçalho", async ({ request }) => {
  for (const caminho of ["/", "/sobre-o-curso", "/agenda", "/contato", "/politica-de-privacidade", "/agenda/modulo-essencial-nov-2026"]) {
    const r = await request.get(caminho);
    expect(r.headers()["x-robots-tag"], caminho).toContain("noindex");
    expect(await r.text(), caminho).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  }
});

test("o painel é sempre noindex", async ({ request }) => {
  const r = await request.get("/admin/login");
  expect(r.headers()["x-robots-tag"]).toContain("noindex");
  expect(await r.text()).toMatch(/<meta name="robots" content="noindex/);
});

test("metadados: título, descrição, canonical, Open Graph com imagem absoluta", async ({ request }) => {
  const html = await (await request.get("/agenda/modulo-essencial-nov-2026")).text();
  expect(html).toMatch(/<title>[^<]*módulo essencial[^<]*· ReabToxin<\/title>/i);
  expect(html).toMatch(/<meta name="description" content="[^"]+"/);
  expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/agenda\/modulo-essencial-nov-2026"/);
  expect(html).toMatch(/<meta property="og:image" content="https?:\/\/[^"]+\/og\.png"/);
  expect(html).toMatch(/<meta property="og:title" content="Toxina botulínica — módulo essencial"/);
  expect(html).toMatch(/<meta property="og:locale" content="pt_BR"/);
  expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image"/);
  const og = await request.get("/og.png");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("dados estruturados: Organization (ReabToxin) no início e Course + EducationEvent nas turmas, sem nenhum placeholder", async ({ request }) => {
  const clinica = await jsonLd(request, "/");
  expect(clinica.map((d) => d["@type"])).toContain("Organization");
  expect(JSON.stringify(clinica)).not.toContain("Physician");
  expect(clinica.find((d) => d["@type"] === "Organization")!.name).toBe("ReabToxin");
  const turma = await jsonLd(request, "/agenda/modulo-essencial-nov-2026");
  expect(turma.map((d) => d["@type"])).toContain("Course");
  const evento = turma.find((d) => d["@type"] === "EducationEvent");
  expect(evento).toBeTruthy();
  expect(evento!.startDate).toBe("2026-11-21");
  expect(evento!.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode");
  for (const d of [...clinica, ...turma]) {
    const texto = JSON.stringify(d);
    expect(texto).not.toMatch(/00000|0000-0000|dominio\.com\.br/);
    expect(d["@context"]).toBe("https://schema.org");
  }
  expect(evento!.offers, "preço ainda é placeholder: sem Offer").toBeUndefined();
});

test("o logo do e-mail está no ar como PNG", async ({ request }) => {
  const r = await request.get("/logos/logo-horizontal-negativo-2x.png");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("image/png");
});
