import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { TrocarSenhaForm, UsuariosAdmin } from "@/components/organisms";
import { pode } from "@/lib/permissoes";
import { exigirSessao } from "@/lib/sessao";
import { alterarPapelUsuario, alternarUsuarioAtivo, criarUsuario, redefinirSenhaUsuario, trocarMinhaSenha } from "../acoes-usuario";
import { PaginaAdmin } from "../pagina";
import styles from "@/components/admin.module.css";

export const metadata: Metadata = { title: "Configurações" };

/* Dados de contato, WhatsApp e CRM/RQE ainda vêm de lib/site.ts como placeholders; entram aqui quando a Dra. os confirmar. */
export default async function ConfiguracoesPage() {
  const usuario = await exigirSessao();
  const lista = pode(usuario.papel, "usuario:gerir")
    ? await db.select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, papel: usuarios.papel, ativo: usuarios.ativo }).from(usuarios).orderBy(asc(usuarios.nome))
    : [];

  return (
    <PaginaAdmin usuario={usuario} ativo="config" titulo="Configurações">
      <div className={styles.pilha}>
        <TrocarSenhaForm acao={trocarMinhaSenha} />
        {pode(usuario.papel, "usuario:gerir") && (
          <UsuariosAdmin
            usuarios={lista.map((u) => ({ ...u, souEu: u.id === usuario.id }))}
            criar={criarUsuario}
            redefinirSenha={redefinirSenhaUsuario}
            alternarAtivo={alternarUsuarioAtivo}
            alterarPapel={alterarPapelUsuario}
          />
        )}
      </div>
    </PaginaAdmin>
  );
}
