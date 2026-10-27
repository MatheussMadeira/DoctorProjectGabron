/* Teste de integração no banco de desenvolvimento: cria uma turma temporária com 2 vagas, dispara 6 inscrições
   ao mesmo tempo e confere que exatamente 2 ocupam vaga e 4 vão para a lista de espera (SELECT ... FOR UPDATE).
   Roda só com TESTES_BANCO=1, porque grava no banco; limpa tudo ao final. */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../db";
import { inscricoes, SITUACOES_QUE_OCUPAM, turmas } from "../db/schema";
import { criarInscricao, TurmaIndisponivelError } from "../lib/inscricoes";

const habilitado = process.env.TESTES_BANCO === "1";
const SLUG = `teste-concorrencia-${Date.now()}`;
let turmaId = "";

const dados = (i: number) => ({
  slug: SLUG,
  nome: `Teste ${i}`,
  email: `teste-${i}@exemplo.invalid`,
  telefone: "(31) 00000-0000",
  profissao: "Médico(a)",
  conselho: "CRM" as const,
  registro: "00000 / MG",
  querAvisos: false,
});

before(async () => {
  if (!habilitado) return;
  const [t] = await db
    .insert(turmas)
    .values({
      slug: SLUG, titulo: "Teste", resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL", publicacao: "PUBLICADO",
      inicio: "2099-01-10", horario: "8h às 18h", cidade: "Belo Horizonte, MG", vagas: 2, fotoUrl: "/images/maos.webp", fotoAlt: "Teste",
    })
    .returning({ id: turmas.id });
  turmaId = t.id;
});

after(async () => {
  if (habilitado) {
    await db.delete(inscricoes).where(eq(inscricoes.turmaId, turmaId));
    await db.delete(turmas).where(eq(turmas.id, turmaId));
  }
  await pool.end();
});

test("6 inscrições simultâneas para 2 vagas: 2 ocupam, 4 vão para a lista de espera", { skip: !habilitado && "defina TESTES_BANCO=1" }, async () => {
  const resultados = await Promise.all(Array.from({ length: 6 }, (_, i) => criarInscricao(dados(i))));
  assert.equal(resultados.filter((r) => r.situacao === "AGUARDANDO_PAGAMENTO").length, 2);
  assert.equal(resultados.filter((r) => r.situacao === "LISTA_ESPERA").length, 4);

  const ocupadas = await db
    .select({ id: inscricoes.id })
    .from(inscricoes)
    .where(and(eq(inscricoes.turmaId, turmaId), inArray(inscricoes.situacao, SITUACOES_QUE_OCUPAM)));
  assert.equal(ocupadas.length, 2);
});

test("turma que não existe ou já passou recusa a inscrição", { skip: !habilitado && "defina TESTES_BANCO=1" }, async () => {
  await assert.rejects(() => criarInscricao({ ...dados(99), slug: "nao-existe" }), TurmaIndisponivelError);
  await db.update(turmas).set({ inicio: "2020-01-10" }).where(eq(turmas.id, turmaId));
  await assert.rejects(() => criarInscricao(dados(98)), (e) => e instanceof TurmaIndisponivelError && e.motivo === "encerrada");
});
