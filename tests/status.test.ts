import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularStatus } from "../lib/status";

const base = { publicacao: "PUBLICADO" as const, inicio: "2026-11-21", fim: "2026-11-22", vagas: 12, ocupadas: 0 };
const hoje = "2026-10-27";

test("rascunho não aparece", () => assert.equal(calcularStatus({ ...base, publicacao: "RASCUNHO" }, hoje), null));
test("turma passada é encerrada, usando o fim quando existe", () => {
  assert.equal(calcularStatus({ ...base, inicio: "2026-10-01", fim: "2026-10-02" }, hoje), "encerrado");
  assert.equal(calcularStatus({ ...base, inicio: "2026-10-27", fim: undefined }, hoje), "aberto"); // hoje ainda não passou
});
test("em breve vem antes de esgotado", () => {
  assert.equal(calcularStatus({ ...base, publicacao: "EM_BREVE", vagas: 0 }, hoje), "em-breve");
});
test("esgotado quando as vagas acabam", () => assert.equal(calcularStatus({ ...base, ocupadas: 12 }, hoje), "esgotado"));
test("últimas vagas com 3 ou menos", () => {
  assert.equal(calcularStatus({ ...base, ocupadas: 9 }, hoje), "ultimas");
  assert.equal(calcularStatus({ ...base, ocupadas: 8 }, hoje), "aberto");
});
