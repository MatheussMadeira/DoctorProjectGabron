"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { comPrefixo, IDIOMAS, LOCALES, type Locale } from "@/lib/i18n/idiomas";

/** Guarda a escolha em cookie (um ano). O proxy usa o cookie só na raiz "/"; o idioma do navegador nunca redireciona. */
export const guardarIdioma = (locale: Locale) => {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
};

/**
 * Seletor de idioma do Header: um botão com a sigla do idioma atual (PT, EN…) que abre a lista com o nome de cada idioma na própria
 * língua (Português, English, Español, Français, Italiano, Deutsch, 中文). Cantos retos, shadow-lg, foco visível, setas e Esc.
 * `variante="lista"` mostra a lista aberta (menu lateral do celular). Trocar mantém a página atual (mesmo caminho, outro prefixo).
 */
export function SeletorDeIdioma({ variante = "menu", className }: { variante?: "menu" | "lista"; className?: string }) {
  const t = useTranslations("Idioma");
  const atual = useLocale() as Locale;
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const id = useId();

  // Fecha com clique fora e com Esc (devolvendo o foco ao botão).
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const navegar = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const itens = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>("a"));
    const i = itens.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === "ArrowDown") (itens[(i + 1) % itens.length] ?? itens[0]).focus();
    else if (e.key === "ArrowUp") (itens[(i - 1 + itens.length) % itens.length] ?? itens[0]).focus();
    else if (e.key === "Home") itens[0].focus();
    else if (e.key === "End") itens[itens.length - 1].focus();
    else return;
    e.preventDefault();
  };

  const lista = (
    <ul id={`${id}-lista`} className="ap-lang-lista" onKeyDown={navegar}>
      {LOCALES.map((l) => (
        <li key={l}>
          <Link
            // href montado aqui: o Link do next-intl poria "/pt-BR/..." ao voltar para o idioma padrão, e o site não usa esse prefixo.
            href={comPrefixo(l, caminho)}
            prefetch={false}
            lang={IDIOMAS[l].lang}
            hrefLang={IDIOMAS[l].hreflang}
            aria-current={l === atual ? "true" : undefined}
            className={cx("ap-lang-item", l === atual && "is-atual")}
            onClick={() => {
              guardarIdioma(l);
              setAberto(false);
            }}
          >
            {IDIOMAS[l].nome}
          </Link>
        </li>
      ))}
    </ul>
  );

  if (variante === "lista") {
    return (
      <nav aria-label={t("rotulo")} className={cx("ap-lang ap-lang-aberta", className)}>
        {lista}
      </nav>
    );
  }
  return (
    <div ref={raiz} className={cx("ap-lang", className)}>
      <button
        ref={botao}
        type="button"
        className="ap-lang-btn"
        // O nome acessível começa com "Idioma" e contém o texto visível (a sigla), como o axe exige (label-content-name-mismatch).
        aria-label={`${t("rotulo")}: ${IDIOMAS[atual].sigla}`}
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        onClick={() => setAberto((a) => !a)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !aberto) {
            e.preventDefault();
            setAberto(true);
          }
        }}
      >
        {IDIOMAS[atual].sigla}
      </button>
      {aberto && <div className="ap-lang-painel">{lista}</div>}
    </div>
  );
}
