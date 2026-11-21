import { Fragment } from "react";
import type { Locale } from "@/lib/i18n/idiomas";
import type { Tradutor } from "@/lib/i18n/tradutor";
import type { PaginaSlug } from "@/lib/site-secoes/paginas";
import { secoesPublicadas } from "@/lib/site-secoes/leitura";
import { numerar, renderizarSecao } from "./renderers";
import { construirCorpos } from "./slots";

/** O corpo de Início e de Sobre o curso: as seções PUBLICADAS no editor (ou o padrão), na ordem e com a visibilidade publicadas. */
export async function PaginaSecoes({ pagina, locale, tr }: { pagina: PaginaSlug; locale: Locale; tr: Tradutor }) {
  const [secoes, corpos] = await Promise.all([secoesPublicadas(pagina, locale), construirCorpos(pagina, locale, tr)]);
  const ctx = { pagina, tr, slots: corpos.slots, nProfessores: corpos.nProfessores, numeros: numerar(secoes, corpos.slots) };
  return (
    <>
      {secoes.map(({ def, conteudo }) => (
        <Fragment key={def.chave}>{renderizarSecao(def, conteudo, ctx)}</Fragment>
      ))}
      {corpos.chamada}
    </>
  );
}
