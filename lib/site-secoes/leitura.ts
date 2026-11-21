import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSecoes, siteSecoesTraducoes } from "@/db/schema";
import { LOCALE_PADRAO, tagIdioma, type Locale } from "../i18n/idiomas";
import { criarTradutorCompleto } from "../i18n/mensagens";
import { obterTextosCurso } from "../textos-curso";
import { CAMPOS, mesclarTraducao, type Conteudo, type TipoSecao } from "./campos";
import { conteudoPadrao, PAGINAS, type DefSecao, type PaginaSlug } from "./paginas";

/* Leitura das seções PUBLICADAS para o site (em cache, com tag). Enquanto uma seção não foi publicada no editor, vale o conteúdo padrão (os
   textos que o site já tinha), no idioma da página. Publicada, vale o conteúdo do editor com a tradução do idioma por cima (só textos). */

export const TAG_PAGINAS = "paginas";

export interface SecaoPublica {
  def: DefSecao;
  conteudo: Conteudo;
}

export async function secoesPublicadas(pagina: PaginaSlug, locale: Locale = LOCALE_PADRAO): Promise<SecaoPublica[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_PAGINAS, tagIdioma(locale));
  const [linhas, curso] = await Promise.all([db.select().from(siteSecoes).where(eq(siteSecoes.pagina, pagina)), obterTextosCurso(locale)]);
  const trads = locale === LOCALE_PADRAO ? [] : await db.select().from(siteSecoesTraducoes).where(eq(siteSecoesTraducoes.locale, locale));
  const porSecao = new Map(trads.map((t) => [t.secaoId, t.conteudo]));
  const tr = criarTradutorCompleto(locale);

  const lista = PAGINAS[pagina].secoes.map((def, indice) => {
    const linha = linhas.find((l) => l.chave === def.chave);
    if (linha?.publicado) {
      return {
        def,
        ordem: linha.ordemPublicada ?? indice,
        visivel: linha.visivelPublicada ?? true,
        conteudo: mesclarTraducao(CAMPOS[def.tipo as TipoSecao], linha.publicado, porSecao.get(linha.id)),
      };
    }
    return { def, ordem: indice, visivel: true, conteudo: conteudoPadrao(pagina, def.chave, tr, curso) };
  });
  return lista
    .filter((s) => s.visivel)
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ def, conteudo }) => ({ def, conteudo }));
}
