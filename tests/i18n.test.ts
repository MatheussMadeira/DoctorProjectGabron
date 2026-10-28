import assert from "node:assert/strict";
import { test } from "node:test";
import { protegerMarca, provedorDeTraducao, restaurarMarca, urlDaDeepl, provedorFalso } from "../lib/i18n/deepl";
import { aplicarTextos, camposParaTraduzir, extrairTextos, hashDe, sobrepor } from "../lib/i18n/estrutura";
import { aplicarTraduzidos, extrairTraduziveis, folhas } from "../lib/i18n/icu";
import { comPrefixo, IDIOMAS, IDIOMAS_TRADUZIDOS, LOCALES } from "../lib/i18n/idiomas";

test("idiomas: 7 códigos, pt-BR sem prefixo, zh com hreflang zh-Hans e DeepL ZH-HANS, EN-US para o inglês", () => {
  assert.deepEqual([...LOCALES], ["pt-BR", "en", "es", "fr", "it", "de", "zh"]);
  assert.equal(IDIOMAS_TRADUZIDOS.length, 6);
  assert.equal(comPrefixo("pt-BR", "/agenda"), "/agenda");
  assert.equal(comPrefixo("en", "/agenda"), "/en/agenda");
  assert.equal(comPrefixo("zh", "/"), "/zh");
  assert.equal(comPrefixo("pt-BR", "/"), "/");
  assert.equal(IDIOMAS.zh.hreflang, "zh-Hans");
  assert.equal(IDIOMAS.zh.deepl, "ZH-HANS");
  assert.equal(IDIOMAS.en.deepl, "EN-US");
  assert.deepEqual(LOCALES.filter((l) => IDIOMAS[l].avisoDeTraducao), ["fr", "it", "de", "zh"]);
  assert.deepEqual(LOCALES.map((l) => IDIOMAS[l].nome), ["Português", "English", "Español", "Français", "Italiano", "Deutsch", "中文"]);
});

test("DeepL: a chave que termina em :fx usa o plano Free; outra chave, o Pro", () => {
  assert.equal(urlDaDeepl("abc-123:fx"), "https://api-free.deepl.com");
  assert.equal(urlDaDeepl("abc-123"), "https://api.deepl.com");
  assert.equal(provedorDeTraducao({}), null);
  assert.equal(provedorDeTraducao({ DEEPL_API_KEY: "x:fx" })?.nome, "deepl");
  assert.equal(provedorDeTraducao({ I18N_PROVEDOR: "falso", TESTE_E2E: "1" })?.nome, "falso");
  assert.equal(provedorDeTraducao({ I18N_PROVEDOR: "falso" }), null); // fora dos testes o falso não existe: sem chave, nada é traduzido
  assert.equal(provedorDeTraducao({ I18N_PROVEDOR: "falso", DEEPL_API_KEY: "x:fx" })?.nome, "deepl");
});

test("DeepL: a marca ReabToxin é protegida e o texto é escapado e restaurado", () => {
  const t = "O ReabToxin & cia <b>";
  const enviado = protegerMarca(t);
  assert.equal(enviado, "O <x>ReabToxin</x> &amp; cia &lt;b&gt;");
  assert.equal(restaurarMarca(enviado), t);
});

test("DeepL: envia em lotes, com origem PT, destino por idioma e o plano certo (fetch simulado)", async () => {
  const chamadas: Array<{ url: string; corpo: Record<string, unknown> }> = [];
  const falso = (async (url: string, init: { body: string }) => {
    const corpo = JSON.parse(init.body);
    chamadas.push({ url, corpo });
    return { ok: true, status: 200, json: async () => ({ translations: (corpo.text as string[]).map((x) => ({ text: `EN:${x}` })) }) };
  }) as unknown as typeof fetch;
  const { deepl } = await import("../lib/i18n/deepl");
  const saida = await deepl("k:fx", falso).traduzir(Array.from({ length: 95 }, (_, i) => `texto ${i}`), "zh");
  assert.equal(saida.length, 95);
  assert.equal(chamadas.length, 3); // 40 + 40 + 15
  assert.equal(chamadas[0].url, "https://api-free.deepl.com/v2/translate");
  assert.equal(chamadas[0].corpo.source_lang, "PT");
  assert.equal(chamadas[0].corpo.target_lang, "ZH-HANS");
  assert.equal((await provedorFalso.traduzir(["a"], "de"))[0], "[de] a");
});

test("ICU: traduz só o texto e preserva {variáveis}, plural e tags", () => {
  const m = "Faltam {n, plural, one {# vaga} other {# vagas}} em {cidade}. <b>Garanta</b> a sua!";
  const trechos = extrairTraduziveis(m);
  assert.deepEqual(trechos, ["Faltam ", "# vaga", "# vagas", " em ", "Garanta", " a sua!"]); // ". " só tem pontuação: não vai à DeepL
  const novo = aplicarTraduzidos(m, trechos.map((t) => t.toUpperCase()));
  assert.equal(novo, "FALTAM {n, plural, one {# VAGA} other {# VAGAS}} EM {cidade}. <b>GARANTA</b> A SUA!");
  assert.equal(aplicarTraduzidos("Olá, {nome}", ["Hello,"]), "Hello, {nome}");
  assert.deepEqual(extrairTraduziveis("{ano}"), []);
  assert.deepEqual(extrairTraduziveis("© {ano} ReabToxin"), [" ReabToxin"].map((x) => x));
  assert.deepEqual(folhas({ A: { b: "x", c: { d: "y" } }, e: "z" }), [["A.b", "x"], ["A.c.d", "y"], ["e", "z"]]);
});

test("estrutura: extrai e remonta textos de JSON (programação, perguntas); horas e durações não são traduzidas", () => {
  const prog = [{ titulo: "Dia 1", itens: [{ time: "08:00", title: "Abertura", description: "Boas-vindas", duration: "1h" }] }];
  assert.deepEqual(extrairTextos(prog), ["Dia 1", "Abertura", "Boas-vindas"]);
  const novo = aplicarTextos(prog, ["Day 1", "Opening", "Welcome"]) as typeof prog;
  assert.deepEqual(novo, [{ titulo: "Day 1", itens: [{ time: "08:00", title: "Opening", description: "Welcome", duration: "1h" }] }]);
  assert.deepEqual(extrairTextos([{ q: "Pergunta?", a: "Resposta." }]), ["Pergunta?", "Resposta."]);
  assert.deepEqual(extrairTextos(["a", "b", ""]), ["a", "b"]);
  assert.deepEqual(extrairTextos([{ valor: "12", rotulo: "Turmas" }]), ["Turmas"]);
});

test("sobrepor: tradução por cima do português campo a campo; vazio ou ausente cai no português", () => {
  const base = { titulo: "Título", resumo: "Resumo", faq: [{ q: "a", a: "b" }] };
  assert.deepEqual(sobrepor(base, { titulo: "Title", resumo: "", faq: [] }, ["titulo", "resumo", "faq"]), base.titulo === "" ? base : { titulo: "Title", resumo: "Resumo", faq: [{ q: "a", a: "b" }] });
  assert.deepEqual(sobrepor(base, null, ["titulo"]), base);
  assert.deepEqual(sobrepor(base, undefined, ["titulo"]), base);
});

test("o que traduzir: campo novo ou que mudou em português; em dia não vai de novo; forçar traduz tudo", () => {
  const origem = { titulo: "A", resumo: "B", vazio: "", lista: [] };
  assert.deepEqual(camposParaTraduzir(origem, undefined), ["titulo", "resumo"]);
  const linha = { origem: { titulo: hashDe("A"), resumo: hashDe("antigo") }, conteudo: { titulo: "A-en", resumo: "B-en" } };
  assert.deepEqual(camposParaTraduzir(origem, linha), ["resumo"]); // o português do resumo mudou
  assert.deepEqual(camposParaTraduzir({ titulo: "A", resumo: "B" }, { origem: { titulo: hashDe("A"), resumo: hashDe("B") }, conteudo: { titulo: "x", resumo: "y" } }), []);
  assert.deepEqual(camposParaTraduzir({ titulo: "A", resumo: "B" }, { origem: { titulo: hashDe("A"), resumo: hashDe("B") }, conteudo: { titulo: "x", resumo: "y" } }, true), ["titulo", "resumo"]);
});
