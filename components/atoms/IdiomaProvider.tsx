"use client";

import { createContext, useContext, type ReactNode } from "react";
import { LOCALE_PADRAO, type Locale } from "@/lib/i18n/idiomas";

/* O idioma da página para os componentes que não falam com o next-intl (AppLink, Stats…). O painel (/admin) e a página /dev não têm
   este provider e ficam no padrão (pt-BR, sem prefixo), então os mesmos componentes servem aos dois lados. */
const Contexto = createContext<Locale>(LOCALE_PADRAO);

export function IdiomaProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Contexto.Provider value={locale}>{children}</Contexto.Provider>;
}

export const useIdioma = () => useContext(Contexto);
