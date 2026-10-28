import { LogOut } from "lucide-react";
import { ICON } from "@/lib/icon";
import { Button } from "../atoms/Button";
import styles from "../admin.module.css";

export interface AdminSidebarFooterProps {
  nome: string;
  papel: "ADMIN" | "EQUIPE";
  /** Server Action de logout. */
  sair: () => void | Promise<void>;
}

export function AdminSidebarFooter({ nome, papel, sair }: AdminSidebarFooterProps) {
  return (
    <>
      <div className={styles.quem}>
        <strong>{nome}</strong>
        <span>{papel === "ADMIN" ? "Administração" : "Equipe"}</span>
      </div>
      <form action={sair}>
        <Button type="submit" variant="ghost" size="sm" icon={<LogOut {...ICON} size={18} />}>
          Sair
        </Button>
      </form>
    </>
  );
}
