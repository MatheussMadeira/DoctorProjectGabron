import { defineRouting } from "next-intl/routing";
import { LOCALE_PADRAO, LOCALES } from "@/lib/i18n/idiomas";

/* pt-BR sem prefixo; /en /es /fr /it /de /zh com prefixo. Os caminhos são os mesmos em todos os idiomas (/en/agenda, /en/sobre-o-curso).
   Não há detecção pelo idioma do navegador: ela só gera uma sugestão (components/organisms/SugestaoDeIdioma.tsx). O cookie é lido pelo
   proxy.ts, só na raiz. O código do chinês na URL é "zh" (o arquivo de textos é messages/zh-CN.json; ver lib/i18n/idiomas.ts). */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: LOCALE_PADRAO,
  localePrefix: "as-needed",
  localeDetection: false,
  // O cookie NEXT_LOCALE só é gravado por uma escolha explícita (seletor ou sugestão); visitar /de por um link não "escolhe" o alemão.
  localeCookie: false,
});
