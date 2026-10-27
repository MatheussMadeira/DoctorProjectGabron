/* Bloqueio de login no banco de desenvolvimento: 5 senhas erradas bloqueiam o e-mail por 15 minutos; vencido o prazo,
   volta a funcionar. Grava no banco, então só roda com TESTES_BANCO=1; limpa tudo ao final. */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { loginTentativas, usuarios } from "../db/schema";
import { BLOQUEIO_MINUTOS, MAX_FALHAS, verificarCredenciais } from "../lib/login";
import { gerarHash, gerarSenhaTemporaria, validarSenha } from "../lib/senha";

const habilitado = process.env.TESTES_BANCO === "1";
const email = `teste-login-${Date.now()}@exemplo.invalid`;
const SENHA = "uma-senha-boa-123";
let id = "";

before(async () => {
  if (!habilitado) return;
  const [u] = await db.insert(usuarios).values({ nome: "Teste login", email, papel: "EQUIPE", senhaHash: await gerarHash(SENHA) }).returning({ id: usuarios.id });
  id = u.id;
});

after(async () => {
  if (habilitado) {
    await db.delete(loginTentativas).where(eq(loginTentativas.email, email));
    await db.delete(usuarios).where(eq(usuarios.id, id));
  }
  await pool.end();
});

const opcoes = { skip: !habilitado && "defina TESTES_BANCO=1" };

test("senha certa entra", opcoes, async () => {
  const r = await verificarCredenciais(email, SENHA);
  assert.equal(r.ok, true);
});

test("e-mail em maiúsculas e com espaços também entra", opcoes, async () => {
  const r = await verificarCredenciais(`  ${email.toUpperCase()} `, SENHA);
  assert.equal(r.ok, true);
});

test(`${MAX_FALHAS} erros bloqueiam por ${BLOQUEIO_MINUTOS} minutos, até com a senha certa; vencido o prazo, volta`, opcoes, async () => {
  for (let i = 1; i < MAX_FALHAS; i++) assert.deepEqual(await verificarCredenciais(email, "errada-errada"), { ok: false, motivo: "invalida" });

  const quinta = await verificarCredenciais(email, "errada-errada");
  assert.equal(quinta.ok, false);
  assert.equal(quinta.ok === false && quinta.motivo, "bloqueada");
  if (!quinta.ok && quinta.motivo === "bloqueada") {
    const minutos = (quinta.ate.getTime() - Date.now()) / 60000;
    assert.ok(minutos > BLOQUEIO_MINUTOS - 1 && minutos <= BLOQUEIO_MINUTOS, `bloqueio de ${minutos.toFixed(1)} min`);
  }

  const certaMasBloqueada = await verificarCredenciais(email, SENHA);
  assert.equal(certaMasBloqueada.ok === false && certaMasBloqueada.motivo, "bloqueada");

  await db.update(loginTentativas).set({ bloqueadoAte: new Date(Date.now() - 1000) }).where(eq(loginTentativas.email, email));
  assert.equal((await verificarCredenciais(email, SENHA)).ok, true);
  const [restou] = await db.select().from(loginTentativas).where(eq(loginTentativas.email, email));
  assert.equal(restou, undefined, "o sucesso zera as tentativas");
});

test("e-mail que não existe também é bloqueado, sem revelar que não existe", opcoes, async () => {
  const fantasma = `fantasma-${Date.now()}@exemplo.invalid`;
  try {
    for (let i = 1; i < MAX_FALHAS; i++) assert.deepEqual(await verificarCredenciais(fantasma, "qualquer-coisa"), { ok: false, motivo: "invalida" });
    const r = await verificarCredenciais(fantasma, "qualquer-coisa");
    assert.equal(r.ok === false && r.motivo, "bloqueada");
  } finally {
    await db.delete(loginTentativas).where(eq(loginTentativas.email, fantasma));
  }
});

test("usuário desativado não entra", opcoes, async () => {
  await db.update(usuarios).set({ ativo: false }).where(eq(usuarios.id, id));
  assert.equal((await verificarCredenciais(email, SENHA)).ok, false);
  await db.update(usuarios).set({ ativo: true }).where(eq(usuarios.id, id));
});

test("regras de senha", () => {
  assert.ok(validarSenha("curta"));
  assert.equal(validarSenha("doze-caracteres"), null);
  const temporaria = gerarSenhaTemporaria();
  assert.equal(temporaria.length, 16);
  assert.equal(validarSenha(temporaria), null);
});
