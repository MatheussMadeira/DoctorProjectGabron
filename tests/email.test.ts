import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { render } from "@react-email/render";
import { lerConfig } from "../lib/email/config";
import { enviarEmail } from "../lib/email";
import { ContatoAviso } from "../lib/email/modelos/ContatoAviso";
import { InscricaoAviso } from "../lib/email/modelos/InscricaoAviso";
import { InscricaoConfirmacao } from "../lib/email/modelos/InscricaoConfirmacao";

test("smtp: sem EMAIL_TESTE e SENHA_TESTE a configuração acusa o que falta", () => {
  const c = lerConfig({});
  assert.equal(c.ok, false);
  assert.match(c.ok === false ? c.erro : "", /EMAIL_TESTE e SENHA_TESTE/);
});

test("smtp: usa o Gmail do site como remetente e tira os espaços da senha de app", () => {
  const c = lerConfig({ EMAIL_TESTE: "site@gmail.com", SENHA_TESTE: "abcd efgh ijkl mnop" });
  assert.ok(c.ok);
  if (!c.ok) return;
  assert.equal(c.provedor, "smtp");
  assert.deepEqual(c.remetente, { nome: "Dra. Ana Paula Fonseca", email: "site@gmail.com" });
  assert.equal(c.smtp?.senha, "abcdefghijklmnop");
  assert.equal(c.smtp?.host, "smtp.gmail.com");
  assert.equal(c.equipe, "site@gmail.com");
});

test("trocar para o Resend é só configuração", () => {
  assert.equal(lerConfig({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_x" }).ok, false);
  const c = lerConfig({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_x", EMAIL_REMETENTE: "contato@dominio.com.br", EMAIL_EQUIPE: "equipe@dominio.com.br" });
  assert.ok(c.ok);
  if (c.ok) {
    assert.equal(c.provedor, "resend");
    assert.equal(c.remetente.email, "contato@dominio.com.br");
    assert.equal(c.equipe, "equipe@dominio.com.br");
  }
});

test("provedor desconhecido é recusado", () => assert.equal(lerConfig({ EMAIL_PROVIDER: "pombo" }).ok, false));

test("a senha nunca aparece no erro quando o SMTP falha", async () => {
  const antes = { ...process.env };
  Object.assign(process.env, { EMAIL_PROVIDER: "smtp", EMAIL_TESTE: "site@gmail.com", SENHA_TESTE: "segredo-super-12345", EMAIL_SMTP_HOST: "127.0.0.1", EMAIL_SMTP_PORT: "1" });
  try {
    const r = await enviarEmail({ para: "alguem@exemplo.invalid", assunto: "Teste", react: createElement(ContatoAviso, { nome: "A", email: "a@b.co", telefone: null, assunto: "x", mensagem: null }) });
    assert.equal(r.ok, false);
    assert.ok(!JSON.stringify(r).includes("segredo-super-12345"));
    assert.equal(r.provedor, "smtp");
  } finally {
    process.env = antes;
  }
});

test("provedor console 'envia' sem rede", async () => {
  const antes = { ...process.env };
  process.env.EMAIL_PROVIDER = "console";
  try {
    const r = await enviarEmail({ para: "alguem@exemplo.invalid", assunto: "Teste", react: createElement(ContatoAviso, { nome: "A", email: "a@b.co", telefone: null, assunto: "x", mensagem: "oi" }) });
    assert.equal(r.ok, true);
  } finally {
    process.env = antes;
  }
});

const turma = { titulo: "Toxina botulínica — módulo essencial", periodo: "21 e 22 de novembro", horario: "8h às 18h", local: "Belo Horizonte, MG" };

test("modelo de confirmação: identidade, dados da turma e tom (sem exclamação)", async () => {
  const html = await render(createElement(InscricaoConfirmacao, { nome: "Maria da Silva", turma, conselho: "CRM", registro: "00000 / MG", listaEspera: false, link: "https://exemplo.invalid/agenda/x" }));
  assert.match(html, /Inscrição recebida/);
  assert.match(html, /Olá, Maria\./);
  assert.match(html, /módulo essencial/);
  assert.match(html, /#28334f/i, "usa o azul-escuro do design system");
  assert.match(html, /lang="pt-BR"/);
  const texto = await render(createElement(InscricaoConfirmacao, { nome: "Maria da Silva", turma, conselho: "CRM", registro: "00000 / MG", listaEspera: false, link: "https://exemplo.invalid/agenda/x" }), { plainText: true });
  assert.match(texto, /Próximos passos/i);
  assert.ok(!texto.includes("!"), "sem ponto de exclamação no texto que a pessoa lê");
});

test("modelo de confirmação na lista de espera não promete vaga nem pagamento", async () => {
  const html = await render(createElement(InscricaoConfirmacao, { nome: "Maria", turma, conselho: "CRM", registro: "1", listaEspera: true, link: "https://exemplo.invalid" }));
  assert.match(html, /lista de espera/i);
  assert.ok(!/Próximos passos/i.test(html));
  assert.ok(!/pagamento/i.test(html));
});

test("aviso à equipe traz os dados da pessoa e o lembrete do registro", async () => {
  const texto = await render(
    createElement(InscricaoAviso, {
      nome: "Maria da Silva", email: "maria@exemplo.invalid", telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "00000 / MG",
      situacao: "Aguardando pagamento", querAvisos: true, turma: { titulo: turma.titulo, periodo: turma.periodo }, vagas: "5 de 12 vagas ocupadas", linkPainel: "https://exemplo.invalid/admin",
    }),
    { plainText: true },
  );
  for (const trecho of ["maria@exemplo.invalid", "(31) 90000-0000", "CRM 00000 / MG", "5 de 12 vagas ocupadas", "Confira o registro no conselho"]) assert.ok(texto.includes(trecho), trecho);
});
