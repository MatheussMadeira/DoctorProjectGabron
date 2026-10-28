"use client";

import type { AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { comPrefixo } from "@/lib/i18n/idiomas";
import { useIdioma } from "./IdiomaProvider";

export interface AppLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

/** `next/link` para rotas internas ("/agenda"), já com o prefixo do idioma da página ("/en/agenda"; português sem prefixo);
    `<a>` para âncoras (#), mailto:, tel: e links externos. */
export function AppLink({ href, children, ...rest }: AppLinkProps) {
  const locale = useIdioma();
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={comPrefixo(locale, href)} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
