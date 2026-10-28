import assert from "node:assert/strict";
import { test } from "node:test";
import { pode } from "../lib/permissoes";

test("ADMIN pode tudo", () => {
  for (const p of ["turma:criar", "turma:editar", "turma:excluir", "inscricao:gerir", "usuario:gerir", "configuracao:editar"] as const) assert.equal(pode("ADMIN", p), true, p);
});

test("EQUIPE cria e edita turmas e cuida das inscrições, mas não exclui nem gerencia usuários", () => {
  assert.equal(pode("EQUIPE", "turma:criar"), true);
  assert.equal(pode("EQUIPE", "turma:editar"), true);
  assert.equal(pode("EQUIPE", "inscricao:gerir"), true);
  assert.equal(pode("EQUIPE", "turma:excluir"), false);
  assert.equal(pode("EQUIPE", "usuario:gerir"), false);
  assert.equal(pode("EQUIPE", "configuracao:editar"), false);
});

test("sem papel não pode nada", () => {
  assert.equal(pode(null, "turma:editar"), false);
  assert.equal(pode(undefined, "usuario:gerir"), false);
});
