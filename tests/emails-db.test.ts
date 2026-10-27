/* Fluxo de e-mail no banco de desenvolvimento: registro do envio, falha registrada, "Reenviar", duplicidade e limite
   de taxa. Grava no banco, então só roda com TESTES_BANCO=1; limpa tudo ao final. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, test } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../db";
import { emailsEnvios, inscricoes, limitesTaxa, turmas } from "../db/schema";
import { enviarERegistrar, reenviar } from "../lib/email/registro";
import { criarInscricao, InscricaoDuplicadaError } from "../lib/inscricoes";
import { dentroDoLimite } from "../lib/limite-taxa";

const habilitado = process.env.TESTES_BANCO === "1";
const opcoes = { skip: !habilitado && "defina TESTES_BANCO=1" };
const SLUG = `teste-emails-${Date.now()}`;
const IP = `10.99.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
let turmaId = "";
let inscricaoId = "";
const dados = { slug: SLUG, nome: "Maria da Silva", email: `maria-${Date.now()}@exemplo.invalid`, telefone: "(31) 90000-0000", profissao: "Médico(a)", conselho: "CRM" as const, registro: "00000 / MG", querAvisos: false };
const ambienteOriginal = { ...process.env };

before(async () => {
  if (!habilitado) return;
  const [t] = await db
    .insert(turmas)
    .values({
      slug: SLUG, titulo: "Turma de teste de e-mail", resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL", publicacao: "PUBLICADO",
      inicio: "2099-03-14", horario: "8h às 18h", cidade: "Belo Horizonte, MG", vagas: 3, fotoUrl: "/images/maos.webp", fotoAlt: "Teste",
    })
    .returning({ id: turmas.id });
  turmaId = t.id;
});

after(async () => {
  process.env = ambienteOriginal;
  if (habilitado) {
    await db.delete(inscricoes).where(eq(inscricoes.turmaId, turmaId)); // e-mails saem junto (cascade)
    await db.delete(turmas).where(eq(turmas.id, turmaId));
    await db.delete(limitesTaxa).where(inArray(limitesTaxa.chave, ["inscricao", "contato"].map((r) => createHash("sha256").update(`${IP}|${r}|${process.env.AUTH_SECRET ?? ""}`).digest("hex"))));
  }
  await pool.end();
});

test("a mesma pessoa não se inscreve duas vezes na mesma turma, a não ser que tenha cancelado", opcoes, async () => {
  const primeira = await criarInscricao(dados);
  inscricaoId = primeira.id;
  await assert.rejects(() => criarInscricao({ ...dados, email: dados.email.toUpperCase() }), InscricaoDuplicadaError);

  await db.update(inscricoes).set({ situacao: "CANCELADA" }).where(eq(inscricoes.id, inscricaoId));
  const outra = await criarInscricao(dados); // cancelada libera
  assert.notEqual(outra.id, inscricaoId);
  await db.update(inscricoes).set({ situacao: "CANCELADA" }).where(eq(inscricoes.id, outra.id));
  await db.update(inscricoes).set({ situacao: "AGUARDANDO_PAGAMENTO" }).where(eq(inscricoes.id, inscricaoId));
});

test("e-mail que falha fica registrado como FALHOU, sem a senha, e o Reenviar refaz no mesmo registro", opcoes, async () => {
  Object.assign(process.env, { EMAIL_PROVIDER: "smtp", EMAIL_TESTE: "site@gmail.com", SENHA_TESTE: "segredo-super-12345", EMAIL_SMTP_HOST: "127.0.0.1", EMAIL_SMTP_PORT: "1" });
  const falha = await enviarERegistrar("INSCRICAO_CONFIRMACAO", { inscricaoId });
  assert.equal(falha.ok, false);
  assert.ok(falha.emailId);

  const [registro] = await db.select().from(emailsEnvios).where(eq(emailsEnvios.id, falha.emailId!));
  assert.equal(registro.status, "FALHOU");
  assert.equal(registro.tentativas, 1);
  assert.equal(registro.destinatario, dados.email);
  assert.equal(registro.provedor, "smtp");
  assert.ok(registro.erro && !registro.erro.includes("segredo-super-12345"));

  // A inscrição continua valendo mesmo com o e-mail falhando.
  const [ins] = await db.select().from(inscricoes).where(eq(inscricoes.id, inscricaoId));
  assert.equal(ins.situacao, "AGUARDANDO_PAGAMENTO");

  // Problema resolvido (outro provedor/configuração): Reenviar.
  Object.assign(process.env, { EMAIL_PROVIDER: "console" });
  const refeito = await reenviar(falha.emailId!);
  assert.equal(refeito.ok, true);
  const [depois] = await db.select().from(emailsEnvios).where(eq(emailsEnvios.id, falha.emailId!));
  assert.equal(depois.status, "ENVIADO");
  assert.equal(depois.tentativas, 2);
  assert.equal(depois.erro, null);
  assert.ok(depois.enviadoEm);
});

test("o aviso à equipe vai para a caixa da clínica e responde para a pessoa inscrita", opcoes, async () => {
  Object.assign(process.env, { EMAIL_PROVIDER: "console", EMAIL_TESTE: "clinica@exemplo.invalid" });
  const r = await enviarERegistrar("INSCRICAO_AVISO", { inscricaoId });
  assert.equal(r.ok, true);
  const [registro] = await db.select().from(emailsEnvios).where(and(eq(emailsEnvios.inscricaoId, inscricaoId), eq(emailsEnvios.tipo, "INSCRICAO_AVISO")));
  assert.equal(registro.destinatario, "clinica@exemplo.invalid");
  assert.match(registro.assunto, /Nova inscrição: Maria da Silva/);
});

test("e-mail de inscrição que não existe mais não quebra: devolve erro", opcoes, async () => {
  const r = await enviarERegistrar("INSCRICAO_CONFIRMACAO", { inscricaoId: "00000000-0000-0000-0000-000000000000" });
  assert.equal(r.ok, false);
});

test("limite de taxa: o 4º envio de contato na janela é barrado; a inscrição aguenta 5", opcoes, async () => {
  const contatos = [];
  for (let i = 0; i < 4; i++) contatos.push(await dentroDoLimite("contato", IP));
  assert.deepEqual(contatos, [true, true, true, false]);

  const inscricoesPermitidas = [];
  for (let i = 0; i < 6; i++) inscricoesPermitidas.push(await dentroDoLimite("inscricao", IP));
  assert.deepEqual(inscricoesPermitidas, [true, true, true, true, true, false]);
});
