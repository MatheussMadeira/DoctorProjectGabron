"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import { AppLink } from "../atoms/AppLink";
import { Button } from "../atoms/Button";
import { Logo } from "../atoms/Logo";

type Link = { label: string; href: string };

/** Textos do Header. O padrão é o português (painel e /dev); o site passa os de messages ("Header.*"). */
export interface HeaderRotulos {
  inicio: string;
  principal: string;
  menuMobile: string;
  menu: string;
  abrir: string;
  fechar: string;
  whatsapp: string;
}

export const ROTULOS_HEADER_PT: HeaderRotulos = {
  inicio: "Início — ReabToxin",
  principal: "Principal",
  menuMobile: "Menu mobile",
  menu: "Menu",
  abrir: "Abrir menu",
  fechar: "Fechar menu",
  whatsapp: "WhatsApp",
};

export interface HeaderProps {
  links?: Link[];
  current?: string;
  cta?: Link;
  /** Telefone e WhatsApp, mostrados no menu do celular (vêm de Configurações). */
  contato?: { telefone: string; telefoneHref: string; whatsapp: string };
  sticky?: boolean;
  rotulos?: HeaderRotulos;
  /** Seletor de idioma: o botão no desktop (ao lado da chamada) e a lista dentro do menu lateral do celular. */
  idioma?: ReactNode;
  idiomaMobile?: ReactNode;
}

export function Header({ links = [], current, cta, contato, sticky = true, rotulos = ROTULOS_HEADER_PT, idioma, idiomaMobile }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <header className={cx("ap-header", sticky && "is-sticky", scrolled && "is-scrolled")}>
      <div className="ap-container ap-header-row">
        <AppLink href="/" className="ap-header-logo" aria-label={rotulos.inicio}>
          <Logo variant="compacta" title="" />
        </AppLink>
        <nav className="ap-nav" aria-label={rotulos.principal}>
          {links.map((l) => (
            <AppLink key={l.href} href={l.href} aria-current={current === l.href ? "page" : undefined}>
              {l.label}
            </AppLink>
          ))}
        </nav>
        <div className="ap-header-actions">
          {idioma && <div className="ap-header-idioma">{idioma}</div>}
          {cta && (
            <Button size="sm" href={cta.href} className="ap-header-cta">
              {cta.label}
            </Button>
          )}
          <button type="button" className="ap-icon-btn ap-menu-btn" aria-label={rotulos.abrir} aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu {...ICON} size={24} />
          </button>
        </div>
      </div>
      <div className={cx("ap-drawer", open && "is-open")} aria-hidden={!open}>
        <div className="ap-drawer-veil" onClick={() => setOpen(false)} />
        <div className="ap-drawer-panel" role="dialog" aria-label={rotulos.menu}>
          <div className="ap-drawer-top">
            <Logo variant="simbolo" width={36} title="" />
            <button type="button" className="ap-icon-btn" aria-label={rotulos.fechar} onClick={() => setOpen(false)}>
              <X {...ICON} size={24} />
            </button>
          </div>
          <nav aria-label={rotulos.menuMobile}>
            {links.map((l) => (
              <AppLink key={l.href} href={l.href} aria-current={current === l.href ? "page" : undefined} onClick={() => setOpen(false)}>
                {l.label}
              </AppLink>
            ))}
          </nav>
          {cta && (
            <Button full href={cta.href} arrow>
              {cta.label}
            </Button>
          )}
          {idiomaMobile && <div className="ap-drawer-idioma">{idiomaMobile}</div>}
          {contato && (
            <p className="ap-drawer-contato">
              <a href={contato.telefoneHref}>{contato.telefone}</a>
              <a href={`https://wa.me/${contato.whatsapp}`} target="_blank" rel="noopener noreferrer">
                {rotulos.whatsapp}
              </a>
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
