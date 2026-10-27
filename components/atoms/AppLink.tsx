import type { AnchorHTMLAttributes } from "react";
import Link from "next/link";

export interface AppLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

/** `next/link` para rotas internas ("/agenda"); `<a>` para âncoras (#), mailto:, tel: e links externos. */
export function AppLink({ href, children, ...rest }: AppLinkProps) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...rest}>
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
