"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ehLocale, IDIOMAS, type Locale } from "@/lib/i18n/idiomas";
import { guardarIdioma } from "./SeletorDeIdioma";

const COOKIE_FECHADA = "ap-sugestao-idioma";

const temCookie = (nome: string) => document.cookie.split("; ").some((c) => c.startsWith(`${nome}=`));

/** O idioma do navegador que o site tem, ou null. Só serve para SUGERIR: nunca redireciona. */
function idiomaDoNavegador(): Locale | null {
  for (const lang of navigator.languages ?? [navigator.language]) {
    const minusculo = lang.toLowerCase();
    if (minusculo === "pt" || minusculo.startsWith("pt-")) return "pt-BR";
    const curto = minusculo.split("-")[0];
    if (ehLocale(curto)) return curto;
  }
  return null;
}

/**
 * Sugestão discreta na primeira visita (sem cookie de idioma e sem ter fechado antes): "Esta página também está disponível em Deutsch."
 * Aparece só quando o navegador pede um idioma que o site tem e que não é o da página. Fechar ou aceitar guarda a decisão em cookie.
 */
export function SugestaoDeIdioma() {
  const t = useTranslations("Idioma");
  const atual = useLocale() as Locale;
  const caminho = usePathname();
  // Lido do navegador no cliente (no servidor é sempre null: nada sugerido, e o HTML estático fica igual para todos).
  const doNavegador = useSyncExternalStore(
    () => () => {},
    () => {
      if (temCookie("NEXT_LOCALE") || temCookie(COOKIE_FECHADA)) return null;
      const lang = idiomaDoNavegador();
      return lang && lang !== atual ? lang : null;
    },
    () => null,
  );
  const [fechada, setFechada] = useState(false);
  const sugerido = fechada ? null : doNavegador;

  if (!sugerido) return null;
  const nome = IDIOMAS[sugerido].nome;
  const fechar = () => {
    document.cookie = `${COOKIE_FECHADA}=1; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setFechada(true);
  };
  return (
    <aside className="ap-sugestao-idioma" role="region" aria-label={t("rotulo")}>
      <p>{t("sugestao", { idioma: nome })}</p>
      <div>
        <Link
          href={caminho}
          locale={sugerido}
          prefetch={false}
          lang={IDIOMAS[sugerido].lang}
          className="ap-btn ap-btn-secondary ap-btn-sm"
          onClick={() => {
            guardarIdioma(sugerido);
            fechar();
          }}
        >
          <span className="ap-btn-label">{t("sugestaoAcao", { idioma: nome })}</span>
        </Link>
        <button type="button" className="ap-sugestao-fechar" aria-label={t("sugestaoFechar")} onClick={fechar}>
          ×
        </button>
      </div>
    </aside>
  );
}
