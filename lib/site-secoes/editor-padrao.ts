import { criarTradutorCompleto } from "../i18n/mensagens";
import { lerBlocosEmPortugues } from "../textos-curso";
import type { Conteudo } from "./campos";
import { conteudoPadrao, PAGINAS, type PaginaSlug } from "./paginas";

/** O conteúdo padrão de cada seção da página, em português (os textos que o site já tinha): cria as seções do editor e diz o que "não foi mexido". */
export async function conteudoPadraoDaPagina(pagina: PaginaSlug): Promise<Record<string, Conteudo>> {
  const curso = await lerBlocosEmPortugues();
  const tr = criarTradutorCompleto("pt-BR");
  return Object.fromEntries(PAGINAS[pagina].secoes.map((d) => [d.chave, conteudoPadrao(pagina, d.chave, tr, curso)]));
}
