import type { ReactNode } from "react";
import Image from "next/image";
import { PedrasFundo } from "../atoms/PedrasFundo";
import styles from "../admin.module.css";

/** Duas metades: marca em azul-escuro de um lado, formulário do outro (AdminLogin.dc.html). */
export function AdminLoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.login}>
      <div data-theme="escuro" className={styles.loginMarca}>
        <PedrasFundo side="right" />
        <div>
          <Image src="/logos/reabtoxin-site-claro.png" alt="ReabToxin" width={220} height={59} style={{ width: 220, height: "auto" }} />
        </div>
        <p className={styles.loginTexto}>Painel para cadastrar as datas das turmas e acompanhar as inscrições.</p>
      </div>
      <div className={styles.loginLado}>{children}</div>
    </div>
  );
}
