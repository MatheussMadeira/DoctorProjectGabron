/* Área do aluno: código, sessão assinada (sem banco) e as regras de acesso no banco de desenvolvimento (só com TESTES_BANCO=1; limpa tudo ao
   final): criação do acesso na confirmação, aluno recorrente sem novo código, primeiro acesso, login com bloqueio de 5 minutos, "esqueci
   minha senha" e o que o aluno enxerga (turmas confirmadas, material publicado, nada de turma alheia). O e-mail sai pelo provedor "console". */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { eq, inArray, like } from "drizzle-orm";
import { codigoValido, gerarCodigo, normalizarCodigo } from "../lib/aluno-codigo";
import { criarToken, lerToken } from "../lib/aluno-sessao";
import { ARQUIVO_BLOB } from "../lib/aluno-form";

test("código: 8 caracteres sem os que confundem, em dois grupos; aceita o que a pessoa digitar", () => {
  const codigos = new Set(Array.from({ length: 500 }, () => gerarCodigo()));
  assert.equal(codigos.size, 500);
  for (const c of codigos) {
    assert.ok(codigoValido(c), c);
    assert.doesNotMatch(c, /[01ILO]/);
  }
  assert.equal(normalizarCodigo("k7m2-9qxa"), "K7M2-9QXA");
  assert.equal(normalizarCodigo(" K7M2 9QXA "), "K7M2-9QXA");
  assert.equal(normalizarCodigo("k7m29qxa"), "K7M2-9QXA");
  assert.equal(normalizarCodigo("abc"), "ABC");
  assert.equal(codigoValido("K7M2-9QX0"), false);
});

test("sessão: o cookie é assinado, expira e não aceita adulteração", () => {
  const agora = Date.UTC(2026, 10, 20);
  const token = criarToken("11111111-1111-1111-1111-111111111111", 3, agora);
  assert.deepEqual(lerToken(token, agora + 1000), { alunoId: "11111111-1111-1111-1111-111111111111", versao: 3 });
  assert.equal(lerToken(token, agora + 15 * 24 * 3600 * 1000), null, "vencido depois de 14 dias");
  const [id, , exp, assinatura] = token.split(".");
  assert.equal(lerToken(`${id}.4.${exp}.${assinatura}`, agora), null, "versão trocada");
  assert.equal(lerToken(`22222222-2222-2222-2222-222222222222.3.${exp}.${assinatura}`, agora), null, "outro aluno");
  assert.equal(lerToken(`${token}x`, agora), null);
  assert.equal(lerToken("", agora), null);
  assert.equal(lerToken(undefined, agora), null);
  assert.equal(lerToken("a.b.c", agora), null);
});

test("arquivos: só o Blob do projeto é aceito no banco e buscado pelo servidor", () => {
  assert.ok(ARQUIVO_BLOB.test("https://abc123.public.blob.vercel-storage.com/aluno/a-xyz.pdf"));
  for (const ruim of ["http://abc.public.blob.vercel-storage.com/a.pdf", "https://evil.example/a.pdf", "https://abc.blob.vercel-storage.com/a.pdf", "https://public.blob.vercel-storage.com.evil.example/a.pdf", "/images/maos.webp", ""]) {
    assert.equal(ARQUIVO_BLOB.test(ruim), false, ruim);
  }
});

/* ------------------------------ Banco ------------------------------ */

const habilitado = process.env.TESTES_BANCO === "1";
const opcoes = { skip: !habilitado && "defina TESTES_BANCO=1" };
const marca = `${Date.now()}`;
const emailA = `aluno-a-${marca}@exemplo.invalid`;
const emailB = `aluno-b-${marca}@exemplo.invalid`;
const SENHA = "uma-senha-bem-longa-1";
const ambienteOriginal = { ...process.env };
let t1 = "";
let t2 = "";
let t3 = "";
const ins: Record<string, string> = {};

type Banco = typeof import("../db");
let banco: Banco;
let schema: typeof import("../db/schema");
let aluno: typeof import("../lib/aluno");
let conteudo: typeof import("../lib/aluno-conteudo");

before(async () => {
  if (!habilitado) return;
  Object.assign(process.env, { EMAIL_PROVIDER: "console", I18N_PROVEDOR: "", AUTH_SECRET: process.env.AUTH_SECRET ?? "segredo-de-teste" });
  banco = await import("../db");
  schema = await import("../db/schema");
  aluno = await import("../lib/aluno");
  conteudo = await import("../lib/aluno-conteudo");
  const { db } = banco;
  const base = { resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL" as const, publicacao: "PUBLICADO" as const, horario: "8h", cidade: "BH", vagas: 10, fotoUrl: "/images/maos.webp", fotoAlt: "Teste" };
  const [a, b, c] = await db
    .insert(schema.turmas)
    .values([
      { ...base, slug: `teste-aluno-1-${marca}`, titulo: `Turma Um ${marca}`, inicio: "2026-01-10" },
      { ...base, slug: `teste-aluno-2-${marca}`, titulo: `Turma Dois ${marca}`, inicio: "2026-06-10" },
      { ...base, slug: `teste-aluno-3-${marca}`, titulo: `Turma Três ${marca}`, inicio: "2026-09-10" },
    ])
    .returning({ id: schema.turmas.id });
  [t1, t2, t3] = [a.id, b.id, c.id];
  const comum = { telefone: "31999990000", profissao: "Médico(a)", conselho: "CRM" as const, registro: "1 / MG", aceitePrivacidadeEm: new Date() };
  const linhas = await db
    .insert(schema.inscricoes)
    .values([
      { ...comum, turmaId: t1, nome: "Aluno A", email: emailA, idioma: "de", situacao: "CONFIRMADA" },
      { ...comum, turmaId: t2, nome: "Aluno A", email: emailA, idioma: "de", situacao: "CONFIRMADA" },
      { ...comum, turmaId: t3, nome: "Aluno A", email: emailA, idioma: "de", situacao: "LISTA_ESPERA" },
      { ...comum, turmaId: t3, nome: "Aluno B", email: emailB, situacao: "AGUARDANDO_PAGAMENTO" },
    ])
    .returning({ id: schema.inscricoes.id, turmaId: schema.inscricoes.turmaId, email: schema.inscricoes.email });
  for (const l of linhas) ins[`${l.email === emailA ? "A" : "B"}${l.turmaId === t1 ? 1 : l.turmaId === t2 ? 2 : 3}`] = l.id;
});

after(async () => {
  process.env = ambienteOriginal;
  if (!habilitado) return;
  const { db, pool } = banco;
  await db.delete(schema.alunos).where(like(schema.alunos.email, `%-${marca}@exemplo.invalid`)); // redefinições, comentários, certificados e e-mails saem junto
  await db.delete(schema.inscricoes).where(inArray(schema.inscricoes.turmaId, [t1, t2, t3])); // módulos e materiais saem com as turmas
  await db.delete(schema.turmas).where(inArray(schema.turmas.id, [t1, t2, t3]));
  await pool.end();
});

test("confirmar a inscrição cria o acesso e manda o código; inscrição não confirmada não cria", opcoes, async () => {
  const { db } = banco;
  assert.equal(await aluno.garantirAlunoDaInscricao(ins.B3), null, "aguardando pagamento não cria acesso");
  const r = await aluno.garantirAlunoDaInscricao(ins.A1);
  assert.ok(r?.criado);
  const [a] = await db.select().from(schema.alunos).where(eq(schema.alunos.email, emailA));
  assert.match(a.codigo ?? "", /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(a.idioma, "de");
  assert.ok(a.codigoEnviadoEm, "o envio do código foi registrado");
  const envios = await db.select().from(schema.emailsEnvios).where(eq(schema.emailsEnvios.alunoId, a.id));
  assert.equal(envios.length, 1);
  assert.equal(envios[0].tipo, "ALUNO_CODIGO");
  assert.equal(envios[0].status, "ENVIADO");
});

test("aluno recorrente: a segunda turma não gera novo código nem novo e-mail, só o acesso à turma", opcoes, async () => {
  const { db } = banco;
  const [antes] = await db.select().from(schema.alunos).where(eq(schema.alunos.email, emailA));
  const r = await aluno.garantirAlunoDaInscricao(ins.A2);
  assert.equal(r?.criado, false);
  assert.equal(r?.alunoId, antes.id);
  const [depois] = await db.select().from(schema.alunos).where(eq(schema.alunos.email, emailA));
  assert.equal(depois.codigo, antes.codigo);
  assert.equal((await db.select().from(schema.emailsEnvios).where(eq(schema.emailsEnvios.alunoId, antes.id))).length, 1);
  const turmas = await aluno.turmasDoAluno(emailA);
  assert.deepEqual(turmas.map((t) => t.id).sort(), [t1, t2].sort(), "só as confirmadas (a lista de espera não conta)");
});

test("primeiro acesso: o código certo cria a conta e some; errado, repetido ou com outro e-mail é recusado igual", opcoes, async () => {
  const { db } = banco;
  const [a] = await db.select().from(schema.alunos).where(eq(schema.alunos.email, emailA));
  const errado = await aluno.ativarConta(emailA, "AAAA-AAAA", SENHA);
  assert.deepEqual(errado, { ok: false, erro: "credenciais" });
  assert.deepEqual(await aluno.ativarConta(`outro-${marca}@exemplo.invalid`, a.codigo!, SENHA), { ok: false, erro: "credenciais" });
  const certo = await aluno.ativarConta(emailA.toUpperCase(), a.codigo!.toLowerCase().replace("-", " "), SENHA);
  assert.ok(certo.ok);
  const [ativo] = await db.select().from(schema.alunos).where(eq(schema.alunos.email, emailA));
  assert.equal(ativo.codigo, null, "o código some depois de usado");
  assert.ok(ativo.ativadoEm && ativo.senhaHash && ativo.senhaHash !== SENHA);
  assert.deepEqual(await aluno.ativarConta(emailA, a.codigo!, "outra-senha-qualquer-1"), { ok: false, erro: "credenciais" }, "o código não serve duas vezes");
  const reenvio = await aluno.enviarCodigoAoAluno(a.id);
  assert.equal(reenvio.ok, false, "conta criada: não há código para reenviar");
});

test("login: senha errada 5 vezes bloqueia por 5 minutos (até a certa fica recusada); depois de liberado, entra", opcoes, async () => {
  const { db } = banco;
  assert.ok((await aluno.entrar(emailA, SENHA)).ok);
  for (let i = 0; i < 4; i++) assert.deepEqual(await aluno.entrar(emailA, "senha-errada"), { ok: false, erro: "credenciais" });
  assert.deepEqual(await aluno.entrar(emailA, "senha-errada"), { ok: false, erro: "credenciais" }, "o quinto erro ainda diz só 'incorreto'");
  const bloqueado = await aluno.entrar(emailA, SENHA);
  assert.equal(bloqueado.ok, false);
  assert.equal(!bloqueado.ok && bloqueado.erro, "tempo");
  assert.ok(!bloqueado.ok && (bloqueado.minutos ?? 0) >= 4 && (bloqueado.minutos ?? 0) <= 5);
  await db.update(schema.alunos).set({ bloqueadoAte: new Date(Date.now() - 1000) }).where(eq(schema.alunos.email, emailA));
  assert.ok((await aluno.entrar(emailA, SENHA)).ok);
  assert.deepEqual(await aluno.entrar(`nao-existe-${marca}@exemplo.invalid`, SENHA), { ok: false, erro: "credenciais" });
});

test("bloqueio do ADMIN: a conta bloqueada não entra e a mensagem é outra", opcoes, async () => {
  const { db } = banco;
  await db.update(schema.alunos).set({ bloqueado: true }).where(eq(schema.alunos.email, emailA));
  assert.deepEqual(await aluno.entrar(emailA, SENHA), { ok: false, erro: "bloqueado" });
  await db.update(schema.alunos).set({ bloqueado: false }).where(eq(schema.alunos.email, emailA));
  assert.ok((await aluno.entrar(emailA, SENHA)).ok);
});

test("esqueci minha senha: o link vale uma vez, troca a senha, derruba as sessões e não existe para e-mail sem conta", opcoes, async () => {
  const { db } = banco;
  assert.equal(await aluno.criarRedefinicao(`nao-existe-${marca}@exemplo.invalid`), null);
  const [antes] = await db.select().from(schema.alunos).where(eq(schema.alunos.email, emailA));
  const pedido = await aluno.criarRedefinicao(emailA);
  assert.ok(pedido);
  assert.equal(await aluno.redefinicaoValida("token-qualquer"), false);
  assert.equal(await aluno.redefinicaoValida(pedido!.token), true);
  assert.equal(await aluno.usarRedefinicao(pedido!.token, "a-senha-nova-comprida-2"), true);
  assert.equal(await aluno.usarRedefinicao(pedido!.token, "outra-senha-comprida-3"), false, "uma vez só");
  assert.equal(await aluno.redefinicaoValida(pedido!.token), false);
  const [depois] = await db.select().from(schema.alunos).where(eq(schema.alunos.email, emailA));
  assert.equal(depois.sessaoVersao, antes.sessaoVersao + 1, "as sessões abertas caem");
  assert.equal((await aluno.entrar(emailA, SENHA)).ok, false);
  assert.ok((await aluno.entrar(emailA, "a-senha-nova-comprida-2")).ok);
  // Link vencido não vale.
  const velho = await aluno.criarRedefinicao(emailA);
  await db.update(schema.alunoRedefinicoes).set({ expiraEm: new Date(Date.now() - 1000) }).where(eq(schema.alunoRedefinicoes.alunoId, antes.id));
  assert.equal(await aluno.redefinicaoValida(velho!.token), false);
});

test("o aluno só enxerga material publicado, de módulo visível e das turmas dele; arquivo e comentário seguem a mesma regra", opcoes, async () => {
  const { db } = banco;
  const [a] = await db.select().from(schema.alunos).where(eq(schema.alunos.email, emailA));
  const quem = { id: a.id, email: a.email };
  const [mod1] = await db.insert(schema.alunoModulos).values({ turmaId: t1, titulo: "Módulo 1", ordem: 0 }).returning({ id: schema.alunoModulos.id });
  const [modOculto] = await db.insert(schema.alunoModulos).values({ turmaId: t1, titulo: "Módulo oculto", visivel: false, ordem: 1 }).returning({ id: schema.alunoModulos.id });
  const [modAlheio] = await db.insert(schema.alunoModulos).values({ turmaId: t3, titulo: "De outra turma", ordem: 0 }).returning({ id: schema.alunoModulos.id });
  const futuro = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const url = "https://abc.public.blob.vercel-storage.com/aluno/x.pdf";
  const [pub, agendado, oculto, noModOculto, alheio, caso] = await db
    .insert(schema.alunoMateriais)
    .values([
      { moduloId: mod1.id, tipo: "PDF", titulo: "PDF publicado", arquivoUrl: url, arquivoNome: "x.pdf", ordem: 0 },
      { moduloId: mod1.id, tipo: "PDF", titulo: "PDF agendado", arquivoUrl: url, publicarEm: futuro, ordem: 1 },
      { moduloId: mod1.id, tipo: "PDF", titulo: "PDF oculto", arquivoUrl: url, visivel: false, ordem: 2 },
      { moduloId: modOculto.id, tipo: "PDF", titulo: "Em módulo oculto", arquivoUrl: url, ordem: 0 },
      { moduloId: modAlheio.id, tipo: "PDF", titulo: "De turma que não é dele", arquivoUrl: url, ordem: 0 },
      { moduloId: mod1.id, tipo: "CASO", titulo: "Caso publicado", texto: "Texto do caso", imagens: [{ url, alt: "Radiografia" }], ordem: 3 },
    ])
    .returning({ id: schema.alunoMateriais.id });

  const turmas = await conteudo.conteudoDoAluno(quem, "pt-BR");
  assert.deepEqual(turmas.map((t) => t.id).sort(), [t1, t2].sort());
  const doT1 = turmas.find((t) => t.id === t1)!;
  assert.deepEqual(doT1.modulos.map((m) => m.titulo), ["Módulo 1"]);
  assert.deepEqual(doT1.modulos[0].materiais.map((m) => m.titulo), ["PDF publicado", "Caso publicado"]);

  assert.ok(await conteudo.materialDoAluno(quem, pub.id, "pt-BR"));
  for (const bloqueado of [agendado, oculto, noModOculto, alheio]) assert.equal(await conteudo.materialDoAluno(quem, bloqueado.id, "pt-BR"), null);
  const c = await conteudo.materialDoAluno(quem, caso.id, "pt-BR");
  assert.deepEqual(c?.imagens, [{ indice: 0, alt: "Radiografia" }], "só o índice e a descrição: o endereço da imagem não sai");
  assert.equal(JSON.stringify(c).includes("blob.vercel-storage"), false);

  assert.deepEqual(await conteudo.arquivoDoAluno(quem, "material", pub.id), { url, nome: "x.pdf" });
  assert.equal(await conteudo.arquivoDoAluno(quem, "material", alheio.id), null);
  assert.equal(await conteudo.arquivoDoAluno(quem, "material", agendado.id), null);
  assert.deepEqual(await conteudo.arquivoDoAluno(quem, "imagem", caso.id, 0), { url, nome: "imagem-1" });
  assert.equal(await conteudo.arquivoDoAluno(quem, "imagem", caso.id, 5), null);
  assert.equal(await conteudo.podeComentar(quem, caso.id), true);
  assert.equal(await conteudo.podeComentar(quem, pub.id), false, "só discussão de caso aceita comentário");
  assert.equal(await conteudo.podeComentar(quem, alheio.id), false);

  // Certificado: só o do próprio aluno.
  const [cert] = await db.insert(schema.alunoCertificados).values({ alunoId: a.id, turmaId: t1, arquivoUrl: url, arquivoNome: "certificado.pdf" }).returning({ id: schema.alunoCertificados.id });
  assert.deepEqual(await conteudo.arquivoDoAluno(quem, "certificado", cert.id), { url, nome: "certificado.pdf" });
  assert.equal(await conteudo.arquivoDoAluno({ id: "00000000-0000-4000-8000-000000000000", email: "outro@exemplo.invalid" }, "certificado", cert.id), null);
});

test("aviso de confidencialidade: pede de novo quando a versão sobe", opcoes, async () => {
  const { db } = banco;
  const [a] = await db.select().from(schema.alunos).where(eq(schema.alunos.email, emailA));
  assert.equal(aluno.precisaAceitar(a), true);
  await aluno.registrarAceite(a.id);
  const [depois] = await db.select().from(schema.alunos).where(eq(schema.alunos.id, a.id));
  assert.equal(aluno.precisaAceitar(depois), false);
  assert.ok(depois.aceiteEm);
  assert.equal(aluno.precisaAceitar({ aceiteVersao: aluno.TERMOS_VERSAO - 1 }), true);
});
