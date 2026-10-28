import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { siInstagram } from "simple-icons";
import { ICON } from "@/lib/icon";
import { AppLink } from "../atoms/AppLink";
import { Logo } from "../atoms/Logo";

export interface FooterProps {
  phone?: string;
  email?: string;
  address?: string;
  instagram?: string;
  links?: Array<{ label: string; href: string }>;
  legal?: ReactNode;
}

export function Footer({ phone, email, address, instagram, links = [], legal }: FooterProps) {
  return (
    <footer className="ap-footer" data-theme="escuro">
      <div className="ap-container">
        <div className="ap-footer-grid">
          <div className="ap-footer-brand">
            <Logo variant="vertical" width={180} />
          </div>
          {links.length > 0 && (
            <nav aria-label="Rodapé" className="ap-footer-col">
              <p className="ap-eyebrow">Navegação</p>
              {links.map((l) => (
                <AppLink key={l.href} href={l.href}>
                  {l.label}
                </AppLink>
              ))}
            </nav>
          )}
          <div className="ap-footer-col">
            <p className="ap-eyebrow">Contato</p>
            {phone && (
              <a href={`tel:${phone.replace(/\D/g, "")}`}>
                <Phone {...ICON} size={18} />
                {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`}>
                <Mail {...ICON} size={18} />
                {email}
              </a>
            )}
            {instagram && (
              <a href={`https://instagram.com/${instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d={siInstagram.path} fill="currentColor" />
                </svg>
                {instagram}
              </a>
            )}
            {address && (
              <span>
                <MapPin {...ICON} size={18} />
                {address}
              </span>
            )}
          </div>
        </div>
        <div className="ap-footer-legal">{legal}</div>
      </div>
    </footer>
  );
}
