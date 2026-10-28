import type { ReactNode } from "react";
import { ADMIN_NAV, AdminShell, AdminSidebarFooter } from "@/components/organisms";
import type { UsuarioSessao } from "@/lib/sessao";
import { sair } from "./login/actions";

export interface PaginaAdminProps {
  usuario: UsuarioSessao;
  ativo: "painel" | "agenda" | "inscricoes" | "config";
  titulo: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
}

/** Moldura das páginas do painel: barra lateral com quem está logado e o botão Sair. */
export function PaginaAdmin({ usuario, ativo, titulo, acoes, children }: PaginaAdminProps) {
  return (
    <AdminShell
      active={ativo}
      title={titulo}
      actions={acoes}
      nav={ADMIN_NAV}
      sidebarFooter={<AdminSidebarFooter nome={usuario.nome} papel={usuario.papel} sair={sair} />}
    >
      {children}
    </AdminShell>
  );
}
