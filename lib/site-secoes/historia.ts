/**
 * Desfazer/refazer por sessão: pilha de fotografias do estado. Digitar seguido no MESMO campo vira um passo só (coalesce), para o Desfazer
 * não voltar uma letra por vez. (Mesma ideia do editor da Turma da Aventura.)
 */
export interface Historia<T> {
  passado: T[];
  presente: T;
  futuro: T[];
  ultimaChave: string | null;
  ultimoEm: number;
}

export const JUNTAR_MS = 1200;
const LIMITE = 100;

export const iniciarHistoria = <T>(presente: T): Historia<T> => ({ passado: [], presente, futuro: [], ultimaChave: null, ultimoEm: 0 });

export function empurrar<T>(h: Historia<T>, proximo: T, chave: string | null = null, agora = Date.now()): Historia<T> {
  if (Object.is(proximo, h.presente)) return h;
  const juntar = chave !== null && chave === h.ultimaChave && agora - h.ultimoEm < JUNTAR_MS;
  return { passado: juntar ? h.passado : [...h.passado, h.presente].slice(-LIMITE), presente: proximo, futuro: [], ultimaChave: chave, ultimoEm: agora };
}

export function desfazer<T>(h: Historia<T>): Historia<T> {
  if (!h.passado.length) return h;
  const anterior = h.passado[h.passado.length - 1]!;
  return { passado: h.passado.slice(0, -1), presente: anterior, futuro: [h.presente, ...h.futuro], ultimaChave: null, ultimoEm: 0 };
}

export function refazer<T>(h: Historia<T>): Historia<T> {
  if (!h.futuro.length) return h;
  const [proximo, ...resto] = h.futuro;
  return { passado: [...h.passado, h.presente], presente: proximo!, futuro: resto, ultimaChave: null, ultimoEm: 0 };
}

export const podeDesfazer = (h: Historia<unknown>) => h.passado.length > 0;
export const podeRefazer = (h: Historia<unknown>) => h.futuro.length > 0;
