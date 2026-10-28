import assert from "node:assert/strict";
import { test } from "node:test";
import { contatoSchema, errosPorCampo, inscricaoSchema } from "../lib/formularios";

/* Formulário enviado sem preencher nada: o navegador manda só o que existe (um <select> sem escolha não vai).
   Toda mensagem precisa estar em português e dizer o que fazer. */

test("inscrição vazia: sete campos, todos com mensagem em português", () => {
  const r = inscricaoSchema.safeParse({ nome: "", email: "", telefone: "", registro: "" });
  assert.equal(r.success, false);
  if (r.success) return;
  const erros = errosPorCampo(r.error);
  assert.deepEqual(Object.keys(erros).sort(), ["conselho", "email", "nome", "privacidade", "profissao", "registro", "telefone"]);
  for (const mensagem of Object.values(erros)) assert.ok(!/invalid|expected|received|undefined/i.test(mensagem), mensagem);
  assert.equal(erros.profissao, "Escolha a sua profissão.");
  assert.equal(erros.conselho, "Escolha o conselho.");
});

test("inscrição válida", () => {
  const r = inscricaoSchema.safeParse({ nome: "Maria da Silva", email: " MARIA@Dominio.com.br ", telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "00000 / MG", privacidade: "on" });
  assert.ok(r.success);
  if (r.success) assert.equal(r.data.email, "maria@dominio.com.br");
});

test("telefone sem DDD e e-mail sem domínio são recusados com instrução", () => {
  const r = inscricaoSchema.safeParse({ nome: "Maria da Silva", email: "maria@dominio", telefone: "90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "1", privacidade: "on" });
  assert.equal(r.success, false);
  if (!r.success) {
    const e = errosPorCampo(r.error);
    assert.match(e.email, /nome@dominio\.com\.br/);
    assert.match(e.telefone, /DDD/);
  }
});

test("contato vazio: assunto e aceite são obrigatórios; telefone e mensagem não", () => {
  const r = contatoSchema.safeParse({ nome: "", email: "", telefone: "", mensagem: "" });
  assert.equal(r.success, false);
  if (r.success) return;
  const erros = errosPorCampo(r.error);
  assert.deepEqual(Object.keys(erros).sort(), ["assunto", "email", "nome", "privacidade"]);
  for (const mensagem of Object.values(erros)) assert.ok(!/invalid|expected|received|undefined/i.test(mensagem), mensagem);

  const ok = contatoSchema.safeParse({ nome: "Maria", email: "maria@dominio.com.br", telefone: "", assunto: "Outro assunto", mensagem: "", privacidade: "on" });
  assert.ok(ok.success);
  if (ok.success) {
    assert.equal(ok.data.telefone, null);
    assert.equal(ok.data.mensagem, null);
  }
});

/* ---------------- idiomas ---------------- */
import { criarContatoSchema, criarInscricaoSchema, idiomaDoFormulario } from "../lib/formularios";
import { LOCALES } from "../lib/i18n/idiomas";
import { carregarMensagens, criarTradutor } from "../lib/i18n/mensagens";
import { ASSUNTOS_OPCOES, CONSELHOS_OPCOES, PROFISSOES_OPCOES, VALORES_ASSUNTOS, VALORES_CONSELHOS, VALORES_PROFISSOES } from "../lib/i18n/opcoes";
import { ASSUNTOS_CONTATO, CONSELHOS, PROFISSOES } from "../lib/dados-exemplo";

test("as opções dos selects têm os mesmos valores canônicos (português) que sempre foram gravados no banco", () => {
  assert.deepEqual(VALORES_PROFISSOES, PROFISSOES);
  assert.deepEqual(VALORES_CONSELHOS, CONSELHOS);
  assert.deepEqual(VALORES_ASSUNTOS, ASSUNTOS_CONTATO);
  // Cada opção tem rótulo no namespace Opcoes em pt-BR (e nos outros idiomas, ao menos pelo fallback).
  for (const locale of LOCALES) {
    for (const [ns, lista] of [["Opcoes.profissoes", PROFISSOES_OPCOES], ["Opcoes.conselhos", CONSELHOS_OPCOES], ["Opcoes.assuntos", ASSUNTOS_OPCOES]] as const) {
      const arvore = (carregarMensagens(locale).Opcoes as Record<string, Record<string, string>>)[ns.split(".")[1]];
      for (const o of lista) assert.ok(typeof arvore[o.chave] === "string" && arvore[o.chave].length > 0, `${locale} ${ns}.${o.chave}`);
    }
  }
});

test("validação por idioma: a mensagem vem do tradutor do idioma (e cai no português se a tradução ainda não existe)", () => {
  for (const locale of LOCALES) {
    const t = criarTradutor(locale, "Validacao");
    const r = criarInscricaoSchema(t).safeParse({ nome: "", email: "x", telefone: "", registro: "" });
    assert.equal(r.success, false);
    if (r.success) continue;
    const erros = errosPorCampo(r.error);
    assert.equal(erros.profissao, t("profissao"), locale);
    assert.equal(erros.conselho, t("conselho"), locale);
    assert.equal(erros.email, t("email"), locale);
    assert.equal(erros.privacidade, t("privacidadeInscricao"), locale);
    const c = criarContatoSchema(t).safeParse({ nome: "", email: "", telefone: "", mensagem: "" });
    assert.equal(c.success, false);
    if (!c.success) assert.equal(errosPorCampo(c.error).privacidade, t("privacidadeContato"), locale);
  }
});

test("mensagens de estado: 'Revise N campos' com plural; chave nunca aparece", () => {
  const pt = criarTradutor("pt-BR", "Validacao");
  assert.equal(pt("revise", { count: 1 }), "Revise 1 campo antes de enviar");
  assert.equal(pt("revise", { count: 7 }), "Revise 7 campos antes de enviar");
  assert.equal(pt("maximo", { max: 120 }), "Use no máximo 120 caracteres.");
  for (const locale of LOCALES) {
    const t = criarTradutor(locale, "Validacao");
    for (const k of ["rapido", "carimbo", "limite", "emailDuplicado", "turmaInexistente", "turmaEncerrada", "turmaEmBreve", "falhaInscricao", "falhaContato"]) assert.ok(t(k) && t(k) !== k, `${locale} ${k}`);
  }
});

test("idioma do formulário: só vale um dos 7; qualquer outra coisa vira pt-BR", () => {
  const fd = (v?: string) => {
    const f = new FormData();
    if (v !== undefined) f.set("idioma", v);
    return f;
  };
  for (const l of LOCALES) assert.equal(idiomaDoFormulario(fd(l)), l);
  for (const v of [undefined, "", "xx", "EN", "pt", "en-US", "../etc"]) assert.equal(idiomaDoFormulario(fd(v)), "pt-BR", String(v));
});
