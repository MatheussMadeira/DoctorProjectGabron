import { getLocale, getTranslations } from "next-intl/server";
import { IDIOMAS, type Locale } from "@/lib/i18n/idiomas";

/** Aviso discreto no rodapé das versões fr, it, de e zh: "Tradução automática. Em caso de dúvida, vale a versão em português." (no idioma da página). */
export async function AvisoDeTraducao() {
  const locale = (await getLocale()) as Locale;
  if (!IDIOMAS[locale].avisoDeTraducao) return null;
  const t = await getTranslations("Idioma");
  return <p className="ap-aviso-traducao">{t("avisoTraducao")}</p>;
}
