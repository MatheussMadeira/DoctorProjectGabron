import type { Papel } from "@/db/schema";

/* Quem pode o quê. É a única fonte da regra: a interface esconde o que o papel não pode, e cada Server Action
   confere de novo (lib/sessao.ts → autorizar), porque esconder botão não protege nada.
   ADMIN: a Dra., tudo. EQUIPE: cria e edita turmas e cuida das inscrições; não exclui turmas nem mexe em usuários. */
export const PERMISSOES = {
  "turma:criar": ["ADMIN", "EQUIPE"],
  "turma:editar": ["ADMIN", "EQUIPE"],
  "turma:excluir": ["ADMIN"],
  "inscricao:gerir": ["ADMIN", "EQUIPE"],
  "usuario:gerir": ["ADMIN"],
  "configuracao:editar": ["ADMIN"],
  "professor:gerir": ["ADMIN"],
  "galeria:gerir": ["ADMIN"],
} as const satisfies Record<string, readonly Papel[]>;

export type Permissao = keyof typeof PERMISSOES;

export function pode(papel: Papel | null | undefined, permissao: Permissao): boolean {
  return !!papel && (PERMISSOES[permissao] as readonly Papel[]).includes(papel);
}
