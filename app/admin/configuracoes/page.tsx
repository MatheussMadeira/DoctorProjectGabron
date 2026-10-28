import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { DadosClinicaForm, EmailDeTeste, TrocarSenhaForm, UsuariosAdmin } from "@/components/organisms";
import { lerLinhaConfiguracoes } from "@/lib/configuracoes";
import { lerConfig } from "@/lib/email/config";
import { destinatariosDaEquipe } from "@/lib/email/destinatarios";
import { pode } from "@/lib/permissoes";
import { exigirSessao } from "@/lib/sessao";
import { SITE_PADRAO } from "@/lib/site";
import { alterarPapelUsuario, alternarUsuarioAtivo, criarUsuario, redefinirSenhaUsuario, trocarMinhaSenha } from "../acoes-usuario";
import { enviarEmailDeTeste, salvarConfiguracoes } from "../acoes-config";
import { PaginaAdmin } from "../pagina";
import styles from "@/components/admin.module.css";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const usuario = await exigirSessao();
  const admin = pode(usuario.papel, "usuario:gerir");

  const [lista, linha, avisosPara] = admin
    ? await Promise.all([
        db.select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, papel: usuarios.papel, ativo: usuarios.ativo }).from(usuarios).orderBy(asc(usuarios.nome)),
        lerLinhaConfiguracoes(),
        destinatariosDaEquipe(),
      ])
    : [[], null, []];
  const cfg = lerConfig();

  return (
    <PaginaAdmin usuario={usuario} ativo="config" titulo="Configurações">
      <div className={styles.pilha}>
        <TrocarSenhaForm acao={trocarMinhaSenha} />
        {pode(usuario.papel, "configuracao:editar") && (
          <>
            <DadosClinicaForm
              acao={salvarConfiguracoes}
              padroes={SITE_PADRAO}
              valores={{
                telefone: linha?.telefone ?? "",
                whatsapp: linha?.whatsapp ?? "",
                instagram: linha?.instagram ?? "",
                email: linha?.email ?? "",
                enderecoLinha1: linha?.enderecoLinha1 ?? "",
                enderecoLinha2: linha?.enderecoLinha2 ?? "",
                horario: linha?.horario ?? "",
                crm: linha?.crm ?? "",
                rqe: linha?.rqe ?? "",
              }}
            />
            <EmailDeTeste
              acao={enviarEmailDeTeste}
              info={{
                provedor: cfg.provedor,
                remetente: cfg.ok ? `${cfg.remetente.nome} <${cfg.remetente.email}>` : null,
                configurado: cfg.ok,
                erro: cfg.ok ? null : cfg.erro,
                destino: usuario.email,
                avisosPara,
              }}
            />
          </>
        )}
        {admin && (
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
