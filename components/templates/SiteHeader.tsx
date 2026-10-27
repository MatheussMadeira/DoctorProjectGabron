"use client";

import { usePathname } from "next/navigation";
import { HEADER_CTA, NAV_LINKS } from "@/lib/site";
import { useTheme } from "@/lib/theme";
import { Header, type HeaderProps } from "../organisms/Header";

/** Header do site já ligado ao tema (cookie) e à rota atual. */
export function SiteHeader(props: Partial<HeaderProps>) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  return <Header links={NAV_LINKS} cta={HEADER_CTA} current={pathname} theme={theme} onThemeChange={setTheme} {...props} />;
}
