"use client";

import { useActionState } from "react";
import { Alert } from "../molecules/Alert";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { AdminCard } from "../molecules/AdminCard";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import styles from "../admin.module.css";

export interface EstadoUsuarioForm {
  ok?: boolean;
  erro?: string;
  senhaTemporaria?: string;
  email?: string;
  mensagem?: string;
}
type Acao = (
  anterior: EstadoUsuarioForm,
  formData: FormData,
) => Promise<EstadoUsuarioForm>;

export interface UsuarioLinha {
  id: string;
  nome: string;
  email: string;
  papel: "ADMIN" | "EQUIPE";
  ativo: boolean;
  souEu: boolean;
}

/** Senha temporária: aparece uma vez, para o ADMIN copiar e entregar. Não fica guardada em lugar nenhum. */
function SenhaTemporaria({ estado }: { estado: EstadoUsuarioForm }) {
  if (!estado.senhaTemporaria) return null;
  return (
    <Alert tone="success" title={estado.mensagem}>
      Entregue esta senha a {estado.email}. Ela não será mostrada de novo; quem
      recebe deve trocá-la em Configurações.
      <code className={styles.senhaNova}>{estado.senhaTemporaria}</code>
    </Alert>
  );
}

export function TrocarSenhaForm({ acao }: { acao: Acao }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <AdminCard titulo="Minha senha">
      <form action={enviar} className={styles.pilha}>
        {estado.erro && (
          <Alert tone="danger" title="Não foi possível trocar a senha">
            {estado.erro}
          </Alert>
        )}
        {estado.ok && (
          <Alert tone="success" title={estado.mensagem}>
            Use a nova senha no próximo acesso.
          </Alert>
        )}
        <TextField
          label="Senha atual"
          type="password"
          name="atual"
          autoComplete="current-password"
          required
        />
        <div className={styles.linha}>
          <TextField
            label="Nova senha"
            type="password"
            name="nova"
            autoComplete="new-password"
            required
            hint="Pelo menos 12 caracteres."
          />
          <TextField
            label="Repita a nova senha"
            type="password"
            name="repetida"
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Trocar senha"}
          </Button>
        </div>
      </form>
    </AdminCard>
  );
}

function BotaoAcao({
  acao,
  id,
  rotulo,
  variante = "ghost",
}: {
  acao: Acao;
  id: string;
  rotulo: string;
  variante?: "ghost" | "secondary";
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className={styles.pilhaCurta}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant={variante} disabled={pendente}>
        {rotulo}
      </Button>
      {estado.erro && <p className="ap-hint ap-hint-error">{estado.erro}</p>}
      <SenhaTemporaria estado={estado} />
    </form>
  );
}

function PapelUsuario({ u, acao }: { u: UsuarioLinha; acao: Acao }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className={styles.usuarioAcoes}>
      <input type="hidden" name="id" value={u.id} />
      <Select
        label="Papel"
        name="papel"
        defaultValue={u.papel}
        options={[
          { value: "ADMIN", label: "ADMIN" },
          { value: "EQUIPE", label: "EQUIPE" },
        ]}
      />
      <Button type="submit" size="sm" variant="ghost" disabled={pendente}>
        Salvar papel
      </Button>
      {estado.erro && <p className="ap-hint ap-hint-error">{estado.erro}</p>}
    </form>
  );
}

export interface UsuariosAdminProps {
  usuarios: UsuarioLinha[];
  criar: Acao;
  redefinirSenha: Acao;
  alternarAtivo: Acao;
  alterarPapel: Acao;
}

/** Só o ADMIN vê esta área (a página confere a permissão e cada Server Action confere de novo). */
export function UsuariosAdmin({
  usuarios,
  criar,
  redefinirSenha,
  alternarAtivo,
  alterarPapel,
}: UsuariosAdminProps) {
  const [estadoNovo, enviarNovo, criando] = useActionState(criar, {});
  return (
    <>
      <AdminCard titulo="Usuários">
        <p className={styles.muted}>
          Não há cadastro público: só você cria as contas da equipe. Se alguém
          esquecer a senha, redefina aqui.
        </p>
        <div>
          {usuarios.map((u) => (
            <div key={u.id} className={styles.usuarioLinha}>
              <div className={styles.usuarioDados}>
                <strong>
                  {u.nome} {u.souEu && <span>(você)</span>}
                </strong>
                <span>{u.email}</span>
              </div>
              <Badge tone={u.ativo ? "success" : "neutral"}>
                {u.ativo ? "Ativo" : "Desativado"}
              </Badge>
              <PapelUsuario u={u} acao={alterarPapel} />
              <div className={styles.usuarioAcoes}>
                <BotaoAcao
                  acao={redefinirSenha}
                  id={u.id}
                  rotulo="Redefinir senha"
                  variante="secondary"
                />
                {!u.souEu && (
                  <BotaoAcao
                    acao={alternarAtivo}
                    id={u.id}
                    rotulo={u.ativo ? "Desativar" : "Reativar"}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard titulo="Novo usuário">
        <form action={enviarNovo} className={styles.pilha}>
          {estadoNovo.erro && (
            <Alert tone="danger" title="Não foi possível criar">
              {estadoNovo.erro}
            </Alert>
          )}
          <SenhaTemporaria estado={estadoNovo} />
          <div className={styles.linha}>
            <TextField label="Nome" name="nome" required />
            <TextField label="E-mail" type="email" name="email" required />
            <Select
              label="Papel"
              name="papel"
              defaultValue="EQUIPE"
              options={[
                {
                  value: "EQUIPE",
                  label: "EQUIPE (cria e edita turmas, cuida das inscrições)",
                },
                {
                  value: "ADMIN",
                  label: "ADMIN (tudo, inclusive excluir e gerenciar usuários)",
                },
              ]}
            />
          </div>
          <div>
            <Button type="submit" disabled={criando}>
              {criando ? "Criando…" : "Criar usuário"}
            </Button>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
