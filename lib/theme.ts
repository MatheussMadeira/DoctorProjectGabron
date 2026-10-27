"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_COOKIE } from "./theme-script";

export type Theme = "claro" | "escuro";

const read = (): Theme => (document.documentElement.getAttribute("data-theme") === "escuro" ? "escuro" : "claro");

function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

/** Tema atual do site e função para trocá-lo (grava o cookie por 1 ano). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "claro" as Theme);
  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return { theme, setTheme };
}
