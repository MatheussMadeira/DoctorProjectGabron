import assert from "node:assert/strict";
import { test } from "node:test";
import { gerarCarimbo, IDADE_MAXIMA_MS, tempoMinimoMs, verificarCarimbo } from "../lib/carimbo";
import { CAMPO_ARMADILHA } from "../lib/formularios-tipos";

const T0 = 1_800_000_000_000;

test("carimbo: recente demais é 'rapido'; depois do mínimo é 'ok'; velho demais expira", () => {
  const c = gerarCarimbo(T0);
  assert.equal(verificarCarimbo(c, T0 + 500, 2000), "rapido");
  assert.equal(verificarCarimbo(c, T0 + 1999, 2000), "rapido");
  assert.equal(verificarCarimbo(c, T0 + 2000, 2000), "ok");
  assert.equal(verificarCarimbo(c, T0 + IDADE_MAXIMA_MS + 1, 2000), "expirado");
});

test("carimbo: ausente, adulterado e vindo do futuro são recusados", () => {
  assert.equal(verificarCarimbo(undefined, T0), "ausente");
  assert.equal(verificarCarimbo("", T0), "ausente");
  assert.equal(verificarCarimbo("lixo", T0), "invalido");
  const [instante, assinatura] = gerarCarimbo(T0).split(".");
  // Adiantar o instante para parecer que a página abriu há muito tempo não funciona: a assinatura não bate.
  assert.equal(verificarCarimbo(`${Number(instante) - 60_000}.${assinatura}`, T0 + 5000, 2000), "invalido");
  assert.equal(verificarCarimbo(`${instante}.${"0".repeat(32)}`, T0 + 5000, 2000), "invalido");
  assert.equal(verificarCarimbo(`${instante}.${assinatura}.x`, T0 + 5000, 2000), "invalido");
  assert.equal(verificarCarimbo(gerarCarimbo(T0 + 10_000), T0, 2000), "rapido");
});

test("tempo mínimo: 2 segundos por padrão, configurável por FORM_TEMPO_MINIMO_MS", () => {
  assert.equal(tempoMinimoMs({}), 2000);
  assert.equal(tempoMinimoMs({ FORM_TEMPO_MINIMO_MS: "0" }), 0);
  assert.equal(tempoMinimoMs({ FORM_TEMPO_MINIMO_MS: "5000" }), 5000);
  assert.equal(tempoMinimoMs({ FORM_TEMPO_MINIMO_MS: "abc" }), 2000);
  assert.equal(tempoMinimoMs({ FORM_TEMPO_MINIMO_MS: "-1" }), 2000);
});

test("o campo-armadilha tem nome que nenhum autopreenchimento reconhece", () => {
  const conhecidos = /^(name|nome|email|e-mail|mail|phone|tel|telefone|celular|website|site|url|homepage|company|empresa|organization|org|address|endereco|city|cidade|zip|cep|message|mensagem|subject|assunto|username|user|login|fax|title|cargo)$/i;
  assert.doesNotMatch(CAMPO_ARMADILHA, conhecidos);
  assert.doesNotMatch(CAMPO_ARMADILHA, /name|mail|phone|tel|site|url|company|empresa|addr|user|web|nome|fone/i);
});

test("carimbo vencido (mais de 12 h): o servidor pede renovação, não devolve erro", async () => {
  Object.assign(process.env, { FORM_TEMPO_MINIMO_MS: "2000" });
  const { barrarEnvio } = await import("../lib/protecao-formulario");
  const { CAMPO_CARIMBO } = await import("../lib/formularios-tipos");
  const dados = new FormData();
  dados.set(CAMPO_CARIMBO, gerarCarimbo(Date.now() - IDADE_MAXIMA_MS - 60_000));
  dados.set("nome", "Maria da Silva");
  const resposta = await barrarEnvio("contato", dados, "contato");
  assert.ok(resposta);
  assert.equal(typeof resposta.renovarCarimbo, "number");
  assert.ok((resposta.renovarCarimbo ?? 0) >= 2000, "espera ao menos o tempo mínimo antes de reenviar");
  assert.equal(resposta.erroGeral, undefined, "sem mensagem de erro");
  assert.equal(resposta.ok, undefined);
  assert.equal(resposta.valores?.nome, "Maria da Silva");
});
