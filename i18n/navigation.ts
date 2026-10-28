import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Link, redirect, usePathname e useRouter que já cuidam do prefixo do idioma. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
