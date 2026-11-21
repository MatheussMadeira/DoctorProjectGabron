import { randomInt } from "node:crypto";

/* Código de primeiro acesso da área do aluno: 8 caracteres aleatórios, em dois grupos ("K7M2-9QXA"). O alfabeto não tem 0/O nem 1/I/L,
   que se confundem ao digitar. São 31^8 (cerca de 850 bilhões) de combinações, e o site só aceita o código junto com o e-mail certo e
   com limite de tentativas. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function gerarCodigo(): string {
  const c = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

/** Aceita o que a pessoa digitar: minúsculas, sem o hífen, com espaços. Devolve no formato guardado ("K7M2-9QXA") ou o texto limpo se não tiver 8 caracteres. */
export function normalizarCodigo(entrada: string): string {
  const limpo = entrada.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return limpo.length === 8 ? `${limpo.slice(0, 4)}-${limpo.slice(4)}` : limpo;
}

export const codigoValido = (codigo: string) => /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(codigo);
