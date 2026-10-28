import { getRequestConfig } from "next-intl/server";
import { ehLocale, LOCALE_PADRAO } from "@/lib/i18n/idiomas";
import { carregarMensagens } from "@/lib/i18n/mensagens";

export default getRequestConfig(async ({ requestLocale }) => {
  const pedido = await requestLocale;
  const locale = ehLocale(pedido) ? pedido : LOCALE_PADRAO;
  // Texto que ainda não existe no idioma cai no português (nunca aparece a chave).
  return { locale, messages: carregarMensagens(locale) };
});
