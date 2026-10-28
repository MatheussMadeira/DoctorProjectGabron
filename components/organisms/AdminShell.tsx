import type { ComponentType, ReactNode } from "react";
import { BookOpen, CalendarDays, LayoutDashboard, Settings, UserRound } from "lucide-react";
import { ICON } from "@/lib/icon";
import { AppLink } from "../atoms/AppLink";
import { Logo } from "../atoms/Logo";
import styles from "../admin.module.css";

type NavItem = { key: string; label: string; href?: string; icon?: ComponentType<Record<string, unknown>> };

export const ADMIN_NAV: NavItem[] = [
  { key: "painel", label: "Painel", href: "/admin", icon: LayoutDashboard },
  { key: "agenda", label: "Agenda", href: "/admin/agenda", icon: CalendarDays },
  { key: "inscricoes", label: "Inscrições", href: "/admin/inscricoes", icon: UserRound },
  { key: "config", label: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

export interface AdminShellProps {
  active?: string;
  title: ReactNode;
  actions?: ReactNode;
  nav?: NavItem[];
  /** Rodapé da barra lateral: quem está logado e o botão Sair. */
  sidebarFooter?: ReactNode;
  children?: ReactNode;
}

export function AdminShell({ active = "agenda", title, actions, nav = ADMIN_NAV, sidebarFooter, children }: AdminShellProps) {
  return (
    <div className="ap-admin">
      <aside className="ap-admin-side" data-theme="escuro">
        <Logo variant="compacta" width={150} />
        <nav aria-label="Administração">
          {nav.map((n) => {
            const I = n.icon || BookOpen;
            return (
              <AppLink key={n.key} href={n.href || "#"} aria-current={active === n.key ? "page" : undefined}>
                <I {...ICON} />
                {n.label}
              </AppLink>
            );
          })}
        </nav>
        {sidebarFooter && <div className={styles.footer}>{sidebarFooter}</div>}
      </aside>
      <div className="ap-admin-main">
        <div className="ap-admin-top">
          <h1 className="ap-admin-title">{title}</h1>
          <div className="ap-admin-actions">{actions}</div>
        </div>
        {children}
      </div>
    </div>
  );
}
