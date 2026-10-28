"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import { AppLink } from "../atoms/AppLink";
import { Button } from "../atoms/Button";
import { Logo } from "../atoms/Logo";

type Link = { label: string; href: string };

export interface HeaderProps {
  links?: Link[];
  current?: string;
  cta?: Link;
  /** Telefone e WhatsApp, mostrados no menu do celular (vêm de Configurações). */
  contato?: { telefone: string; telefoneHref: string; whatsapp: string };
  sticky?: boolean;
}

export function Header({ links = [], current, cta, contato, sticky = true }: HeaderProps) {
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
        <Link href="/" className="ap-header-logo" aria-label="Início — ReabToxin">
          <Logo variant="compacta" title="" />
        </Link>
        <nav className="ap-nav" aria-label="Principal">
          {links.map((l) => (
            <AppLink key={l.href} href={l.href} aria-current={current === l.href ? "page" : undefined}>
              {l.label}
            </AppLink>
          ))}
        </nav>
        <div className="ap-header-actions">
          {cta && (
            <Button size="sm" href={cta.href} className="ap-header-cta">
              {cta.label}
            </Button>
          )}
          <button type="button" className="ap-icon-btn ap-menu-btn" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu {...ICON} size={24} />
          </button>
        </div>
      </div>
      <div className={cx("ap-drawer", open && "is-open")} aria-hidden={!open}>
        <div className="ap-drawer-veil" onClick={() => setOpen(false)} />
        <div className="ap-drawer-panel" role="dialog" aria-label="Menu">
          <div className="ap-drawer-top">
            <Logo variant="simbolo" width={36} title="" />
            <button type="button" className="ap-icon-btn" aria-label="Fechar menu" onClick={() => setOpen(false)}>
              <X {...ICON} size={24} />
            </button>
          </div>
          <nav aria-label="Menu mobile">
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
          {contato && (
            <p className="ap-drawer-contato">
              <a href={contato.telefoneHref}>{contato.telefone}</a>
              <a href={`https://wa.me/${contato.whatsapp}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
