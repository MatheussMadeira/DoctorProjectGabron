"use client";

import { usePathname } from "next/navigation";
import { HEADER_CTA, NAV_LINKS } from "@/lib/site";
import { Header, type HeaderProps } from "../organisms/Header";

/** Header do site já ligado à rota atual. */
export function SiteHeader(props: Partial<HeaderProps>) {
  const pathname = usePathname();
  return <Header links={NAV_LINKS} cta={HEADER_CTA} current={pathname} {...props} />;
}
