import assert from "node:assert/strict";
import { test } from "node:test";
import { eventoLd, medicoLd } from "../lib/dados-estruturados";
import { cabecalhosDeIndexacao, entradasDoSitemap, PAGINAS_PUBLICAS, regrasDoRobots, robotsDaPagina, sitePublico, urlDoSite } from "../lib/seo";
import { montarSite } from "../lib/site";
import type { Turma } from "../lib/turmas";

const BASE = "https://www.exemplo.invalid";

test("SITE_PUBLICO: só o texto exato 'true' liga", () => {
  assert.equal(sitePublico({ SITE_PUBLICO: "true" }), true);
  for (const v of [undefined, "", "false", "TRUE", "1", "sim", " true"]) assert.equal(sitePublico({ SITE_PUBLICO: v }), false, String(v));
});

test("fora do ar: robots.txt bloqueia tudo e não anuncia o sitemap", () => {
  const r = regrasDoRobots(false, BASE);
  assert.deepEqual(r.rules, { userAgent: "*", disallow: "/" });
  assert.equal(r.sitemap, undefined);
});

test("público: libera as páginas, bloqueia admin, api e dev, e anuncia o sitemap", () => {
  const r = regrasDoRobots(true, BASE);
  assert.deepEqual(r.rules, { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/dev"] });
  assert.equal(r.sitemap, `${BASE}/sitemap.xml`);
});

test("noindex em todas as páginas enquanto não for público, index quando for", () => {
  assert.deepEqual(robotsDaPagina(false), { index: false, follow: false });
  assert.deepEqual(robotsDaPagina(true), { index: true, follow: true });
  assert.deepEqual(cabecalhosDeIndexacao(false), [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]);
  assert.deepEqual(cabecalhosDeIndexacao(true), []);
});

test("sitemap vazio fora do ar; público lista as páginas e as turmas, e nunca o admin", () => {
  assert.deepEqual(entradasDoSitemap(false, BASE, [{ slug: "x", atualizadaEm: "2026-01-01T00:00:00Z" }]), []);
  const lista = entradasDoSitemap(true, BASE, [{ slug: "modulo-essencial-nov-2026", atualizadaEm: "2026-10-01T12:00:00Z" }]);
  const urls = lista.map((e) => e.url);
  assert.ok(urls.includes(BASE), "início sem barra no fim");
  assert.ok(urls.includes(`${BASE}/agenda/modulo-essencial-nov-2026`));
  for (const p of PAGINAS_PUBLICAS) assert.ok(urls.includes(p.caminho === "/" ? BASE : `${BASE}${p.caminho}`), p.caminho);
  assert.ok(!urls.some((u) => /\/admin|\/api|\/dev|\/login/.test(u)), "nada de admin, api ou dev");
});

test("endereço do site: SITE_URL, depois o domínio da Vercel, depois localhost", () => {
  assert.equal(urlDoSite({ SITE_URL: "https://www.clinica.com.br/" }), "https://www.clinica.com.br");
  assert.equal(urlDoSite({ VERCEL_PROJECT_PRODUCTION_URL: "meu-projeto.vercel.app", VERCEL_URL: "preview.vercel.app" }), "https://meu-projeto.vercel.app");
  assert.equal(urlDoSite({ VERCEL_URL: "preview.vercel.app" }), "https://preview.vercel.app");
  assert.equal(urlDoSite({}), "http://localhost:3000");
});

const turma: Turma = {
  id: "1", slug: "modulo-essencial-nov-2026", titulo: "Toxina botulínica — módulo essencial", tituloCurto: "Módulo essencial", resumo: "Fundamentos e prática.", descricao: [], modalidade: "Presencial",
  publicacao: "PUBLICADO", inicio: "2026-11-21", fim: "2026-11-22", horario: "8h às 18h", cidade: "Belo Horizonte, MG", local: "Local a definir", vagas: 12, ocupadas: 5, vagasLivres: 7,
  preco: "R$ 0.000", precoCentavos: null, atualizadaEm: "2026-10-01T00:00:00Z", fotoUrl: "/images/maos.webp", fotoAlt: "x", publicoAlvo: [], aprendizados: [], programacao: [], faq: [], status: "aberto",
};

test("dados estruturados da Dra.: com placeholders, nenhum CRM, telefone, e-mail ou endereço sai", () => {
  const ld = medicoLd(montarSite(null), BASE);
  assert.equal(ld["@type"], "Physician");
  assert.equal(ld.name, "Dra. Ana Paula Fonseca");
  for (const campo of ["telephone", "email", "identifier", "sameAs"]) assert.equal(campo in ld, false, campo);
  assert.ok(!JSON.stringify(ld).includes("00000"), "nenhum zero de placeholder");
  assert.deepEqual(ld.address, { "@type": "PostalAddress", addressLocality: "Belo Horizonte", addressRegion: "MG", addressCountry: "BR" });
});

test("dados estruturados da Dra.: o que foi preenchido de verdade aparece", () => {
  const ld = medicoLd(montarSite({ telefone: "(31) 99999-9999", crm: "CRM-MG 12345", rqe: "RQE 6789", instagram: "@dra.ana", enderecoLinha1: "Rua das Pedras, 10, sala 2", enderecoLinha2: "Belo Horizonte — MG · CEP 30000-000" }), BASE);
  assert.equal(ld.telephone, "(31) 99999-9999");
  assert.deepEqual(ld.sameAs, ["https://instagram.com/dra.ana"]);
  assert.equal((ld.identifier as unknown[]).length, 2);
  assert.equal((ld.address as Record<string, string>).streetAddress, "Rua das Pedras, 10, sala 2");
});

test("Event: datas, modo presencial, local e imagem absoluta; sem preço enquanto for placeholder", () => {
  const ld = eventoLd(turma, montarSite(null), BASE);
  assert.equal(ld["@type"], "Event");
  assert.equal(ld.startDate, "2026-11-21");
  assert.equal(ld.endDate, "2026-11-22");
  assert.equal(ld.eventAttendanceMode, "https://schema.org/OfflineEventAttendanceMode");
  assert.deepEqual(ld.image, [`${BASE}/images/maos.webp`]);
  assert.equal("offers" in ld, false, "preço de placeholder não vai para o Google");
});

test("Event: preço real vira Offer; esgotada vira SoldOut; online vira VirtualLocation; em breve não leva oferta", () => {
  const real = eventoLd({ ...turma, precoCentavos: 150000 }, montarSite(null), BASE);
  assert.deepEqual((real.offers as Record<string, string>).price, "1500.00");
  assert.equal((real.offers as Record<string, string>).priceCurrency, "BRL");
  const esgotada = eventoLd({ ...turma, precoCentavos: 150000, status: "esgotado" }, montarSite(null), BASE);
  assert.equal((esgotada.offers as Record<string, string>).availability, "https://schema.org/SoldOut");
  const online = eventoLd({ ...turma, modalidade: "Online", cidade: "Ao vivo", local: undefined }, montarSite(null), BASE);
  assert.equal(online.eventAttendanceMode, "https://schema.org/OnlineEventAttendanceMode");
  assert.equal((online.location as Record<string, string>)["@type"], "VirtualLocation");
  const emBreve = eventoLd({ ...turma, precoCentavos: 150000, status: "em-breve" }, montarSite(null), BASE);
  assert.equal("offers" in emBreve, false);
});
