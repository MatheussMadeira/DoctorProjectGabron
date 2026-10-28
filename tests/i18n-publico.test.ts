import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { duracaoPorExtenso, formatPeriodo, mesCurto, mesEAno } from "../lib/datas";
import { comPrefixo, LOCALES } from "../lib/i18n/idiomas";
import { entradasDoSitemapDoIdioma } from "../lib/i18n/seo";
import { formatarPreco } from "../lib/preco";
import { footerDe, menuDoHeader, montarSite } from "../lib/site";

const BASE = "https://www.exemplo.invalid";
const mensagens = JSON.parse(readFileSync("messages/pt-BR.json", "utf8")) as Record<string, unknown>;

/** Tradutor mínimo sobre messages/pt-BR.json (chaves completas, com {parâmetros} simples). */
const tr = (chave: string, valores: Record<string, string | number> = {}) => {
  const valor = chave.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], mensagens);
  assert.equal(typeof valor, "string", `chave ausente: ${chave}`);
  return (valor as string).replace(/\{(\w+)\}/g, (_, k) => String(valores[k] ?? `{${k}}`));
};

test("períodos em português ficam como sempre; nos outros idiomas vêm do Intl", () => {
  assert.equal(formatPeriodo("2026-11-21", "2026-11-22"), "21 e 22 de novembro");
  assert.equal(formatPeriodo("2026-12-05"), "5 de dezembro");
  assert.equal(formatPeriodo("2026-11-30", "2026-12-02"), "30 de novembro a 2 de dezembro");
  assert.match(formatPeriodo("2026-11-21", "2026-11-22", "en"), /November\s21\s?[–-]\s?22/);
  assert.match(formatPeriodo("2026-11-21", "2026-11-22", "de"), /21\.\s?[–-]\s?22\. November/);
  assert.equal(formatPeriodo("2026-11-21", "2026-11-22", "zh"), "11月21日至22日");
  assert.equal(formatPeriodo("2026-11-30", "2026-12-02", "zh"), "11月30日至12月2日");
  assert.match(formatPeriodo("2026-12-05", undefined, "fr"), /5 décembre/);
});

test("mês curto e título do mês na agenda por idioma", () => {
  assert.equal(mesCurto(10), "nov");
  assert.equal(mesEAno(2026, 10), "Novembro 2026");
  assert.equal(mesCurto(10, "en").toLowerCase(), "nov");
  assert.equal(mesEAno(2026, 10, "en"), "November 2026");
  assert.match(mesEAno(2026, 10, "zh"), /2026/);
  assert.ok(!mesCurto(0, "fr").endsWith("."), "sem o ponto final do Intl");
});

test("duração por extenso e preço usam o idioma", () => {
  assert.equal(duracaoPorExtenso("2026-11-21", "2026-11-22"), "Dois dias");
  assert.equal(duracaoPorExtenso("2026-11-21", "2026-11-23", (chave, v) => `${chave}:${v?.n}`), "Datas.dias:3");
  assert.equal(formatarPreco(null, "en"), "R$ 0.000", "placeholder igual em todos os idiomas");
  assert.match(formatarPreco(150000, "pt-BR"), /R\$\s?1\.500/);
  assert.match(formatarPreco(150000, "en"), /R\$1,500/);
  assert.match(formatarPreco(150050, "de"), /1\.500,50/);
});

test("menu e rodapé saem de messages; sem tradutor ficam em português", () => {
  const menu = menuDoHeader(tr);
  assert.deepEqual(menu.links.map((l) => l.label), ["Início", "Sobre o curso", "Agenda de cursos", "Contato"]);
  assert.deepEqual(menu.links.map((l) => l.href), ["/", "/sobre-o-curso", "/agenda", "/contato"]);
  const site = montarSite(null, 2026);
  assert.equal(footerDe(site, tr).legal, "© 2026 ReabToxin · Formação em toxina botulínica · Belo Horizonte, MG");
  assert.equal(footerDe(site, tr).address, "Local das turmas, Belo Horizonte — MG", "endereço ainda no placeholder: texto traduzível");
  assert.equal(footerDe(site).legal, site.legal);
});

test("sitemap por idioma: URL do idioma, hreflang de todos e x-default em português; vazio enquanto o site não é público", () => {
  assert.deepEqual(entradasDoSitemapDoIdioma(false, BASE, "en", []), []);
  const entradas = entradasDoSitemapDoIdioma(true, BASE, "zh", [{ slug: "modulo-a", atualizadaEm: "2026-10-01T00:00:00Z" }]);
  const turma = entradas.find((e) => e.url.endsWith("/agenda/modulo-a"))!;
  assert.equal(turma.url, `${BASE}/zh/agenda/modulo-a`);
  const langs = turma.alternates!.languages as Record<string, string>;
  assert.equal(Object.keys(langs).length, LOCALES.length + 1);
  assert.equal(langs["zh-Hans"], `${BASE}/zh/agenda/modulo-a`);
  assert.equal(langs["pt-BR"], `${BASE}/agenda/modulo-a`);
  assert.equal(langs["x-default"], `${BASE}/agenda/modulo-a`);
  assert.equal(entradasDoSitemapDoIdioma(true, BASE, "pt-BR", []).find((e) => e.url === BASE)?.url, BASE, "a raiz em português não leva barra nem prefixo");
  assert.equal(comPrefixo("en", "/"), "/en");
});
