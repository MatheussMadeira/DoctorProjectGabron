"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { menuDoHeader } from "@/lib/site";
import { Header, type HeaderProps } from "../organisms/Header";
import { SeletorDeIdioma } from "../organisms/SeletorDeIdioma";

/** Header do site já ligado à rota atual (sem o prefixo do idioma) e aos textos do idioma da página. */
export function SiteHeader(props: Partial<HeaderProps>) {
  const pathname = usePathname();
  const t = useTranslations();
  const { links, cta } = menuDoHeader(t);
  return (
    <Header
      links={links}
      cta={cta}
      current={pathname}
      rotulos={{
        inicio: t("Header.inicioAria"),
        principal: t("Header.principal"),
        menuMobile: t("Header.menuMobile"),
        menu: t("Header.menu"),
        abrir: t("Header.abrir"),
        fechar: t("Header.fechar"),
        whatsapp: t("Header.whatsapp"),
      }}
      idioma={<SeletorDeIdioma />}
      idiomaMobile={<SeletorDeIdioma variante="lista" />}
      {...props}
    />
  );
}
