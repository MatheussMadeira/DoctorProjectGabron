import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { render } from "@react-email/render";
import { lerConfig } from "../lib/email/config";
import { enviarEmail } from "../lib/email";
import { escolherDestinatarios } from "../lib/email/destinatarios";
import { ContatoAviso } from "../lib/email/modelos/ContatoAviso";
import { EmailTeste } from "../lib/email/modelos/EmailTeste";
import { InscricaoAviso } from "../lib/email/modelos/InscricaoAviso";
import { InscricaoConfirmacao } from "../lib/email/modelos/InscricaoConfirmacao";
import { VagaConfirmada } from "../lib/email/modelos/VagaConfirmada";

const contexto = {
  logoUrl: "https://site.exemplo.invalid/logos/logo-horizontal-negativo-2x.png",
  legal: "© 2026 ReabToxin · Formação em toxina botulínica · Belo Horizonte, MG",
};

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
  assert.deepEqual(c.remetente, { nome: "ReabToxin", email: "site@gmail.com" });
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

test("avisos internos: vão para os ADMIN ativos; a caixa de reserva só entra quando não há nenhum", () => {
  assert.deepEqual(escolherDestinatarios(["dra@clinica.com.br", "outra@clinica.com.br"], "reserva@gmail.com"), ["dra@clinica.com.br", "outra@clinica.com.br"]);
  assert.deepEqual(escolherDestinatarios([" Dra@Clinica.com.br ", "dra@clinica.com.br"], "reserva@gmail.com"), ["dra@clinica.com.br"], "sem repetir");
  assert.deepEqual(escolherDestinatarios([], "reserva@gmail.com"), ["reserva@gmail.com"]);
  assert.deepEqual(escolherDestinatarios([], undefined), []);
});

test("a senha nunca aparece no erro quando o SMTP falha", async () => {
  const antes = { ...process.env };
  Object.assign(process.env, { EMAIL_PROVIDER: "smtp", EMAIL_TESTE: "site@gmail.com", SENHA_TESTE: "segredo-super-12345", EMAIL_SMTP_HOST: "127.0.0.1", EMAIL_SMTP_PORT: "1" });
  try {
    const r = await enviarEmail({ para: ["alguem@exemplo.invalid"], assunto: "Teste", react: createElement(ContatoAviso, { nome: "A", email: "a@b.co", telefone: null, assunto: "x", mensagem: null, contexto }) });
    assert.equal(r.ok, false);
    assert.ok(!JSON.stringify(r).includes("segredo-super-12345"));
    assert.equal(r.provedor, "smtp");
  } finally {
    process.env = antes;
  }
});

test("provedor console 'envia' sem rede, para vários destinatários", async () => {
  const antes = { ...process.env };
  process.env.EMAIL_PROVIDER = "console";
  try {
    const r = await enviarEmail({ para: ["a@exemplo.invalid", "b@exemplo.invalid"], assunto: "Teste", react: createElement(ContatoAviso, { nome: "A", email: "a@b.co", telefone: null, assunto: "x", mensagem: "oi", contexto }) });
    assert.equal(r.ok, true);
    assert.equal((await enviarEmail({ para: [], assunto: "Teste", react: createElement(ContatoAviso, { nome: "A", email: "a@b.co", telefone: null, assunto: "x", mensagem: "oi", contexto }) })).ok, false, "sem destinatário não envia");
  } finally {
    process.env = antes;
  }
});

const turma = { titulo: "Toxina botulínica — módulo essencial", periodo: "21 e 22 de novembro", horario: "8h às 18h", local: "Belo Horizonte, MG" };
const props = { nome: "Maria da Silva", turma, conselho: "CRM", registro: "00000 / MG", listaEspera: false, link: "https://exemplo.invalid/agenda/x", contexto };

test("modelo de confirmação: identidade, dados da turma e tom (sem exclamação)", async () => {
  const html = await render(createElement(InscricaoConfirmacao, props));
  assert.match(html, /Inscrição recebida/);
  assert.match(html, /Olá, Maria\./);
  assert.match(html, /módulo essencial/);
  assert.match(html, /#28334f/i, "usa o azul-escuro do design system");
  assert.match(html, /lang="pt-BR"/);
  const texto = await render(createElement(InscricaoConfirmacao, props), { plainText: true });
  assert.match(texto, /Próximos passos/i);
  assert.ok(!texto.includes("!"), "sem ponto de exclamação no texto que a pessoa lê");
});

test("o logo vai como PNG com endereço absoluto, com texto alternativo", async () => {
  const html = await render(createElement(InscricaoConfirmacao, props));
  assert.match(html, /<img[^>]+src="https:\/\/site\.exemplo\.invalid\/logos\/logo-horizontal-negativo-2x\.png"/);
  assert.match(html, /alt="ReabToxin"/);
  assert.ok(!/src="\//.test(html), "nenhuma imagem com caminho relativo");
});

test("o rodapé legal do e-mail é o do ReabToxin, sem CRM nem RQE", async () => {
  const texto = await render(createElement(InscricaoConfirmacao, props), { plainText: true });
  assert.ok(texto.includes("© 2026 ReabToxin · Formação em toxina botulínica · Belo Horizonte, MG"));
  assert.ok(!/Coordenação|responsabilidade técnica/.test(texto));
});

test("modelo de confirmação na lista de espera não promete vaga nem pagamento", async () => {
  const html = await render(createElement(InscricaoConfirmacao, { ...props, listaEspera: true }));
  assert.match(html, /lista de espera/i);
  assert.ok(!/Próximos passos/i.test(html));
  assert.ok(!/pagamento/i.test(html));
});

test("e-mail de vaga confirmada", async () => {
  const texto = await render(createElement(VagaConfirmada, { nome: "Maria da Silva", turma, link: props.link, contexto }), { plainText: true });
  assert.match(texto, /Vaga confirmada/i);
  assert.match(texto, /Olá, Maria\./);
  assert.match(texto, /21 e 22 de novembro/);
  assert.ok(!texto.includes("!"));
});

test("e-mail de teste mostra quem pediu e com qual configuração", async () => {
  const texto = await render(createElement(EmailTeste, { quemPediu: "Dra. Ana (dra@clinica.com.br)", provedor: "smtp", remetente: "Dra. Ana Paula Fonseca <site@gmail.com>", contexto }), { plainText: true });
  for (const trecho of ["Dra. Ana (dra@clinica.com.br)", "smtp", "site@gmail.com", "funcionando"]) assert.ok(texto.includes(trecho), trecho);
});

test("aviso à equipe traz os dados da pessoa e o lembrete do registro", async () => {
  const texto = await render(
    createElement(InscricaoAviso, {
      nome: "Maria da Silva", email: "maria@exemplo.invalid", telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM", registro: "00000 / MG",
      situacao: "Aguardando pagamento", querAvisos: true, turma: { titulo: turma.titulo, periodo: turma.periodo }, vagas: "5 de 12 vagas ocupadas", linkPainel: "https://exemplo.invalid/admin", contexto,
    }),
    { plainText: true },
  );
  for (const trecho of ["maria@exemplo.invalid", "(31) 90000-0000", "CRM 00000 / MG", "5 de 12 vagas ocupadas", "Confira o registro no conselho"]) assert.ok(texto.includes(trecho), trecho);
});
