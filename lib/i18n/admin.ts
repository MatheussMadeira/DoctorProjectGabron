import { ENTIDADES, type Entidade, type IdEntidade } from "./campos";
import { temConteudo, extrairTextos } from "./estrutura";
import { lerTraducoes } from "./traduzir";
import { IDIOMAS_TRADUZIDOS, type Locale } from "./idiomas";

/** O que o formulário de revisão precisa de uma entidade (serializável: vai como props para o componente do cliente). */
export interface TraducaoSerial {
  locale: Locale;
  conteudo: Record<string, unknown>;
  status: "rascunho_automatico" | "revisada";
  precisaRevisar: boolean;
  revisadaEm: string | null;
  atualizadaEm: string;
}
export interface DadosDeTraducao {
  entidade: Entidade;
  id: IdEntidade;
  /** O português de cada campo que tem texto (campos vazios não entram). */
  origem: Record<string, unknown>;
  rotulos: Record<string, string>;
  traducoes: TraducaoSerial[];
}

export async function dadosDeTraducao(entidade: Entidade, id: IdEntidade): Promise<DadosDeTraducao | null> {
  const e = ENTIDADES[entidade];
  const origemCompleta = await e.lerOrigem(id);
  if (!origemCompleta) return null;
  const origem = Object.fromEntries(Object.entries(origemCompleta).filter(([, v]) => temConteudo(v) && extrairTextos(v).length > 0));
  const linhas = await lerTraducoes(entidade, id);
  return {
    entidade,
    id,
    origem,
    rotulos: e.rotulos,
    traducoes: linhas
      .filter((l) => (IDIOMAS_TRADUZIDOS as readonly string[]).includes(l.locale))
      .map((l) => ({ locale: l.locale as Locale, conteudo: l.conteudo, status: l.status, precisaRevisar: l.precisaRevisar, revisadaEm: l.revisadaEm?.toISOString() ?? null, atualizadaEm: l.updatedAt.toISOString() })),
  };
}

/** Quantas traduções ainda não foram revisadas (para o aviso nas listas do admin). */
export const pendentes = (d: DadosDeTraducao | null) => (d ? IDIOMAS_TRADUZIDOS.filter((l) => !d.traducoes.some((t) => t.locale === l && t.status === "revisada" && !t.precisaRevisar)).length : 0);
