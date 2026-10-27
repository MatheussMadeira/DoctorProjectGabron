"use client";

import { useActionState } from "react";
import { Alert } from "../molecules/Alert";
import { TextField } from "../molecules/TextField";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import styles from "../admin.module.css";

export interface EstadoLoginForm {
  erro?: "invalida" | "bloqueada";
  email?: string;
}

export interface LoginFormProps {
  /** Server Action de login: (estado, formData) → novo estado, ou redireciona ao entrar. */
  acao: (anterior: EstadoLoginForm, formData: FormData) => Promise<EstadoLoginForm>;
  /** Endereço para onde voltar depois do login (só dentro de /admin). */
  de?: string;
  /** Para mostrar o estado de erro nas capturas e no /dev/componentes. */
  estadoInicial?: EstadoLoginForm;
}

export function LoginForm({ acao, de, estadoInicial = {} }: LoginFormProps) {
  const [estado, enviar, pendente] = useActionState(acao, estadoInicial);
  return (
    <form action={enviar} className={styles.loginForm}>
      <div className={styles.loginCabeca}>
        <p className="ap-eyebrow">Área restrita</p>
        <h1 className={styles.loginTitulo}>Entrar no painel</h1>
      </div>

      {estado.erro === "invalida" && (
        <Alert tone="danger" title="E-mail ou senha incorretos">
          Confira os dados e tente de novo. Depois de 5 tentativas, o acesso fica bloqueado por 15 minutos.
        </Alert>
      )}
      {estado.erro === "bloqueada" && (
        <Alert tone="danger" title="Acesso bloqueado por 15 minutos">
          Houve 5 tentativas com senha incorreta. Aguarde e tente de novo, ou peça à Dra. para redefinir a sua senha.
        </Alert>
      )}

      {de && <input type="hidden" name="de" value={de} />}
      <TextField floating label="E-mail" type="email" name="email" autoComplete="username" required defaultValue={estado.email} />
      <TextField
        floating
        label="Senha"
        type="password"
        name="senha"
        autoComplete="current-password"
        required
        error={estado.erro === "invalida" ? "Digite a senha de novo." : undefined}
      />
      <Checkbox name="lembrar" label="Manter conectada neste aparelho" hint="Fica conectada por 30 dias. Sem marcar, são 7 dias." />
      <Button type="submit" size="lg" full arrow disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </Button>
      <p className={styles.nota}>Acesso só para a Dra. e a equipe autorizada. Esqueceu a senha? Peça à Dra. para redefinir.</p>
    </form>
  );
}
