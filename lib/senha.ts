import { randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

/** Mínimo de caracteres de uma senha do painel. */
export const SENHA_MINIMA = 12;

/** Argon2id com os parâmetros padrão do @node-rs/argon2 (memória 19 MiB, 2 passos). */
export const gerarHash = (senha: string) => hash(senha);

export async function conferirSenha(senha: string, hashGuardado: string): Promise<boolean> {
  try {
    return await verify(hashGuardado, senha);
  } catch {
    return false;
  }
}

/** Mensagem de erro, ou null se a senha serve. */
export function validarSenha(senha: string): string | null {
  if (senha.length < SENHA_MINIMA) return `Use pelo menos ${SENHA_MINIMA} caracteres.`;
  if (senha.length > 128) return "Use no máximo 128 caracteres.";
  return null;
}

const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Senha temporária legível (sem 0/O, 1/l/I), 16 caracteres, para o ADMIN entregar à equipe. */
export function gerarSenhaTemporaria(tamanho = 16): string {
  return Array.from({ length: tamanho }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}
