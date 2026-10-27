import type { ReactNode } from "react";
import { Logo } from "../atoms/Logo";
import { PedrasFundo } from "../atoms/PedrasFundo";
import styles from "../admin.module.css";

/** Duas metades: marca em azul-escuro de um lado, formulário do outro (AdminLogin.dc.html). */
export function AdminLoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.login}>
      <div data-theme="escuro" className={styles.loginMarca}>
        <PedrasFundo side="right" />
        <div>
          <Logo variant="vertical" width={200} />
        </div>
        <p className={styles.loginTexto}>Painel para cadastrar as datas das turmas e acompanhar as inscrições.</p>
      </div>
      <div className={styles.loginLado}>{children}</div>
    </div>
  );
}
