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
