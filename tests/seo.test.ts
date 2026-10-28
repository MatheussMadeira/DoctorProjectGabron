import assert from "node:assert/strict";
import { test } from "node:test";
import { cursoLd, eventoLd, organizacaoLd } from "../lib/dados-estruturados";
import type { ProfessorPublico } from "../lib/professores";
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

const professor = (nome: string, extra: Partial<ProfessorPublico> = {}): ProfessorPublico => ({ id: nome, nome, funcao: "Médica Fisiatra", registro: "CRM-MG 12345 · RQE 6789", bio: "", fotoUrl: "/images/retrato-dra-ana-paula.webp", fotoAlt: null, ...extra });

test("Organization (ReabToxin): com placeholders, nenhum telefone, e-mail ou endereço sai, e ninguém aparece como fundador ou coordenador", () => {
  const ld = organizacaoLd(montarSite(null), BASE);
  assert.equal(ld["@type"], "Organization");
  assert.equal(ld.name, "ReabToxin");
  assert.equal(ld["@id"], `${BASE}/#organizacao`);
  assert.equal("founder" in ld, false, "sem coordenação nem responsável técnico nos dados estruturados");
  for (const campo of ["telephone", "email", "sameAs"]) assert.equal(campo in ld, false, campo);
  assert.ok(!JSON.stringify(ld).includes("00000"), "nenhum zero de placeholder");
  assert.ok(!JSON.stringify(ld).includes("Physician"), "sem Physician/clínica");
  assert.deepEqual(ld.address, { "@type": "PostalAddress", addressLocality: "Belo Horizonte", addressRegion: "MG", addressCountry: "BR" });
});

test("Organization: o que foi preenchido de verdade aparece", () => {
  const ld = organizacaoLd(montarSite({ telefone: "(31) 99999-9999", instagram: "@reabtoxin", enderecoLinha1: "Rua das Pedras, 10, sala 2", enderecoLinha2: "Belo Horizonte — MG · CEP 30000-000" }), BASE);
  assert.equal(ld.telephone, "(31) 99999-9999");
  assert.deepEqual(ld.sameAs, ["https://instagram.com/reabtoxin"]);
  assert.equal((ld.address as Record<string, string>).streetAddress, "Rua das Pedras, 10, sala 2");
});

test("Course: curso com CourseInstance (modo, datas, local e professores de verdade); provedor é o ReabToxin", () => {
  const ld = cursoLd(turma, [professor("Dra. Ana Paula Fonseca")], BASE);
  assert.equal(ld["@type"], "Course");
  assert.equal((ld.provider as Record<string, string>).name, "ReabToxin");
  const inst = ld.hasCourseInstance as Record<string, unknown>;
  assert.equal(inst["@type"], "CourseInstance");
  assert.equal(inst.courseMode, "onsite");
  assert.equal(inst.startDate, "2026-11-21");
  assert.equal((inst.instructor as Array<Record<string, string>>)[0].name, "Dra. Ana Paula Fonseca");
  const online = cursoLd({ ...turma, modalidade: "Online", cidade: "Ao vivo", local: undefined }, [], BASE);
  assert.equal((online.hasCourseInstance as Record<string, unknown>).courseMode, "online");
  assert.equal("instructor" in (online.hasCourseInstance as Record<string, unknown>), false, "sem professores, sem instructor");
});

test("professor de exemplo (\"Nome do professor\") não vai para o Google", () => {
  const ld = eventoLd(turma, [professor("Dra. Ana Paula Fonseca"), professor("Nome do professor", { funcao: "Especialidade a confirmar" }), professor("Nome da professora")], BASE);
  const nomes = (ld.performer as Array<Record<string, string>>).map((p) => p.name);
  assert.deepEqual(nomes, ["Dra. Ana Paula Fonseca"]);
  assert.ok(!JSON.stringify(ld).includes("00000"));
});

test("EducationEvent: datas, modo presencial, local e imagem absoluta; sem preço enquanto for placeholder", () => {
  const ld = eventoLd(turma, [], BASE);
  assert.equal(ld["@type"], "EducationEvent");
  assert.equal((ld.organizer as Record<string, string>).name, "ReabToxin");
  assert.equal(ld.startDate, "2026-11-21");
  assert.equal(ld.endDate, "2026-11-22");
  assert.equal(ld.eventAttendanceMode, "https://schema.org/OfflineEventAttendanceMode");
  assert.deepEqual(ld.image, [`${BASE}/images/maos.webp`]);
  assert.equal("offers" in ld, false, "preço de placeholder não vai para o Google");
  assert.equal("performer" in ld, false);
});

test("EducationEvent: preço real vira Offer; esgotada vira SoldOut; online vira VirtualLocation; em breve não leva oferta", () => {
  const real = eventoLd({ ...turma, precoCentavos: 150000 }, [], BASE);
  assert.deepEqual((real.offers as Record<string, string>).price, "1500.00");
  assert.equal((real.offers as Record<string, string>).priceCurrency, "BRL");
  const esgotada = eventoLd({ ...turma, precoCentavos: 150000, status: "esgotado" }, [], BASE);
  assert.equal((esgotada.offers as Record<string, string>).availability, "https://schema.org/SoldOut");
  const online = eventoLd({ ...turma, modalidade: "Online", cidade: "Ao vivo", local: undefined }, [], BASE);
  assert.equal(online.eventAttendanceMode, "https://schema.org/OnlineEventAttendanceMode");
  assert.equal((online.location as Record<string, string>)["@type"], "VirtualLocation");
  const emBreve = eventoLd({ ...turma, precoCentavos: 150000, status: "em-breve" }, [], BASE);
  assert.equal("offers" in emBreve, false);
});

test("frase de apoio dos professores segue o design: 'Três professores que conduzem juntos…'", async () => {
  const { leadDosProfessores } = await import("../lib/professores-texto");
  assert.equal(leadDosProfessores(3), "Três professores que conduzem juntos as aulas teóricas e acompanham a prática.");
  assert.equal(leadDosProfessores(2), "Dois professores que conduzem juntos as aulas teóricas e acompanham a prática.");
  assert.equal(leadDosProfessores(9), "Os professores que conduzem juntos as aulas teóricas e acompanham a prática.");
  assert.equal(leadDosProfessores(1), "O professor que conduz as aulas teóricas e acompanha a prática.");
});

test("seed: recusa sem SEED_PERMITIDO, em produção e quando o DATABASE_URL é o do banco de produção", async () => {
  const { motivoParaRecusar } = await import("../db/seed-guarda");
  assert.match(motivoParaRecusar({})!, /SEED_PERMITIDO/);
  assert.match(motivoParaRecusar({ SEED_PERMITIDO: "1", VERCEL_ENV: "production" })!, /produção/);
  assert.match(motivoParaRecusar({ SEED_PERMITIDO: "1", NODE_ENV: "production" })!, /produção/);
  assert.match(motivoParaRecusar({ SEED_PERMITIDO: "1", DATABASE_URL: "postgresql://u@ep-wild-shadow-b6wreahl-pooler.sa-east-1.aws.neon.tech/neondb" })!, /produção/);
  assert.match(motivoParaRecusar({ SEED_PERMITIDO: "1", DATABASE_URL: "postgresql://u@ep-flat-hat-xyz.neon.tech/neondb", DATABASE_URL_UNPOOLED: "postgresql://u@ep-wild-shadow-b6wreahl.neon.tech/neondb" })!, /produção/);
  assert.equal(motivoParaRecusar({ SEED_PERMITIDO: "1", DATABASE_URL: "postgresql://u@ep-flat-hat-xyz.neon.tech/neondb" }), null);
});
