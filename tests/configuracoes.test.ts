import assert from "node:assert/strict";
import { test } from "node:test";
import { configuracoesSchema } from "../lib/configuracoes-form";
import { ehPlaceholder, montarSite, SITE_PADRAO } from "../lib/site";

test("sem nada salvo, o site usa os placeholders explícitos", () => {
  const s = montarSite(null, 2026);
  assert.equal(s.telefone, SITE_PADRAO.telefone);
  assert.equal(s.registro, "CRM-MG 00000 · RQE 00000");
  assert.equal(s.legal, "© 2026 Dra. Ana Paula Fonseca · Médica Fisiatra · CRM-MG 00000 · RQE 00000");
});

test("o que foi salvo vence o placeholder, campo a campo", () => {
  const s = montarSite({ telefone: "(31) 99999-9999", instagram: "dra.ana", crm: "CRM-MG 12345", rqe: null }, 2026);
  assert.equal(s.telefone, "(31) 99999-9999");
  assert.equal(s.telefoneHref, "tel:31999999999");
  assert.equal(s.instagram, "@dra.ana");
  assert.equal(s.instagramUrl, "https://instagram.com/dra.ana");
  assert.equal(s.registro, "CRM-MG 12345 · RQE 00000");
});

test("placeholders são reconhecidos (para nunca irem a dados estruturados)", () => {
  for (const t of ["CRM-MG 00000", "+55 31 0000-0000", "contato@dominio.com.br", "@perfil", "Rua, número, sala · Bairro", "Belo Horizonte — MG · CEP 00000-000", "a confirmar", "", null]) assert.equal(ehPlaceholder(t), true, String(t));
  for (const t of ["CRM-MG 12345", "(31) 99999-9999", "(31) 99000-0000", "Belo Horizonte — MG · CEP 30000-000", "CRM-MG 10000", "contato@clinica.com.br", "@dra.ana"]) assert.equal(ehPlaceholder(t), false, t);
});

test("validação das Configurações: mensagens que dizem o que fazer, vazio vira nulo", () => {
  const vazio = configuracoesSchema.parse({ telefone: "", whatsapp: "", instagram: "", email: "", enderecoLinha1: "", enderecoLinha2: "", horario: "", crm: "", rqe: "" });
  assert.deepEqual(Object.values(vazio), [null, null, null, null, null, null, null, null, null]);

  const ruim = configuracoesSchema.safeParse({ telefone: "123", whatsapp: "31999999999", instagram: "dra ana!", email: "nao-e-email", enderecoLinha1: "", enderecoLinha2: "", horario: "", crm: "", rqe: "" });
  assert.equal(ruim.success, false);
  if (!ruim.success) {
    const e = Object.fromEntries(ruim.error.issues.map((i) => [String(i.path[0]), i.message]));
    assert.match(e.telefone, /DDD/);
    assert.match(e.whatsapp, /55/);
    assert.match(e.instagram, /@perfil/);
    assert.match(e.email, /nome@dominio\.com\.br/);
  }

  const bom = configuracoesSchema.parse({ telefone: "(31) 99999-9999", whatsapp: "+55 (31) 99999-9999", instagram: "dra.ana", email: "contato@clinica.com.br", enderecoLinha1: "", enderecoLinha2: "", horario: "", crm: " CRM-MG 12345 ", rqe: "" });
  assert.equal(bom.whatsapp, "5531999999999");
  assert.equal(bom.instagram, "@dra.ana");
  assert.equal(bom.crm, "CRM-MG 12345");
});
