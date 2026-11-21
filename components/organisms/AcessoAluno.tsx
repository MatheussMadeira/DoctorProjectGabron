"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { entrarAluno, esqueciSenha, primeiroAcesso, redefinirSenha } from "@/app/(site)/[locale]/sou-aluno/acoes";
import { SENHA_ALUNO_MINIMA_CLIENTE } from "@/lib/aluno-cliente";
import type { EstadoAluno } from "@/lib/aluno-form";
import { Button } from "../atoms/Button";
import { Alert } from "../molecules/Alert";
import { Tabs } from "../molecules/Tabs";
import { TextField } from "../molecules/TextField";
import styles from "./forms.module.css";

/* Entrada da área do aluno: "Entrar" (e-mail e senha), "Primeiro acesso" (e-mail, código e senha nova) e "Esqueci minha senha". */

type Acao = (anterior: EstadoAluno, formData: FormData) => Promise<EstadoAluno>;

function Formulario({ acao, children, enviar, enviando }: { acao: Acao; children: (estado: EstadoAluno) => React.ReactNode; enviar: string; enviando: string }) {
  const locale = useLocale();
  const [estado, executar, pendente] = useActionState(acao, {});
  return (
    <form action={executar} className={styles.form} noValidate>
      <input type="hidden" name="idioma" value={locale} />
      {estado.erro && (
        <Alert tone="danger" title={estado.erro}>
          {null}
        </Alert>
      )}
      {children(estado)}
      <div>
        <Button type="submit" size="lg" arrow disabled={pendente}>
          {pendente ? enviando : enviar}
        </Button>
      </div>
    </form>
  );
}

export function AcessoAluno({ abaInicial = "entrar" }: { abaInicial?: "entrar" | "primeiro-acesso" }) {
  const t = useTranslations("Aluno");
  const [aba, setAba] = useState<string>(abaInicial);
  return (
    <div className={styles.card}>
      <Tabs
        label={t("rotuloAbas")}
        value={aba === "esqueci" ? "entrar" : aba}
        onChange={setAba}
        items={[
          { value: "entrar", label: t("abaEntrar") },
          { value: "primeiro-acesso", label: t("abaPrimeiro") },
        ]}
      />
      {aba === "entrar" && (
        <Formulario acao={entrarAluno} enviar={t("entrar")} enviando={t("entrando")}>
          {(estado) => (
            <>
              <h2 className={styles.heading}>{t("entrarTitulo")}</h2>
              <TextField floating label={t("email")} type="email" name="email" autoComplete="username" required defaultValue={estado.valores?.email} error={estado.erros?.email} />
              <TextField floating label={t("senha")} type="password" name="senha" autoComplete="current-password" required error={estado.erros?.senha} />
              <button type="button" className={styles.linkBotao} onClick={() => setAba("esqueci")}>
                {t("esqueci")}
              </button>
            </>
          )}
        </Formulario>
      )}
      {aba === "primeiro-acesso" && (
        <Formulario acao={primeiroAcesso} enviar={t("criarConta")} enviando={t("criando")}>
          {(estado) => (
            <>
              <h2 className={styles.heading}>{t("primeiroTitulo")}</h2>
              <p className={styles.muted}>{t("primeiroLead")}</p>
              <TextField floating label={t("email")} type="email" name="email" autoComplete="username" required defaultValue={estado.valores?.email} error={estado.erros?.email} />
              <TextField floating label={t("codigo")} name="codigo" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} required defaultValue={estado.valores?.codigo} error={estado.erros?.codigo} hint={t("codigoDica")} />
              <TextField floating label={t("senhaNova")} type="password" name="senha" autoComplete="new-password" required error={estado.erros?.senha} hint={t("senhaDica", { min: SENHA_ALUNO_MINIMA_CLIENTE })} />
              <TextField floating label={t("senhaConfirmar")} type="password" name="senhaConfirmar" autoComplete="new-password" required error={estado.erros?.senhaConfirmar} />
            </>
          )}
        </Formulario>
      )}
      {aba === "esqueci" && <EsqueciSenha aoVoltar={() => setAba("entrar")} />}
    </div>
  );
}

function EsqueciSenha({ aoVoltar }: { aoVoltar: () => void }) {
  const t = useTranslations("Aluno");
  const locale = useLocale();
  const [estado, executar, pendente] = useActionState(esqueciSenha, {} as EstadoAluno);
  if (estado.ok) {
    return (
      <div className={styles.replied}>
        <Alert tone="success" title={t("esqueciOk")}>
          {null}
        </Alert>
        <Button variant="ghost" onClick={aoVoltar}>
          {t("voltar")}
        </Button>
      </div>
    );
  }
  return (
    <form action={executar} className={styles.form} noValidate>
      <input type="hidden" name="idioma" value={locale} />
      <h2 className={styles.heading}>{t("esqueciTitulo")}</h2>
      <p className={styles.muted}>{t("esqueciLead")}</p>
      {estado.erro && (
        <Alert tone="danger" title={estado.erro}>
          {null}
        </Alert>
      )}
      <TextField floating label={t("email")} type="email" name="email" autoComplete="username" required defaultValue={estado.valores?.email} error={estado.erros?.email} />
      <div className={styles.acoes}>
        <Button type="submit" size="lg" arrow disabled={pendente}>
          {pendente ? t("esqueciEnviando") : t("esqueciEnviar")}
        </Button>
        <Button type="button" variant="ghost" onClick={aoVoltar}>
          {t("voltar")}
        </Button>
      </div>
    </form>
  );
}

/** Página do link do e-mail: escolher a nova senha. */
export function RedefinirSenhaForm({ token }: { token: string }) {
  const t = useTranslations("Aluno");
  return (
    <div className={styles.card}>
      <Formulario acao={redefinirSenha} enviar={t("redefinirEnviar")} enviando={t("criando")}>
        {(estado) =>
          estado.ok ? (
            <Alert tone="success" title={t("redefinirOk")}>
              {null}
            </Alert>
          ) : (
            <>
              <h2 className={styles.heading}>{t("redefinirTitulo")}</h2>
              <input type="hidden" name="token" value={token} />
              <TextField floating label={t("senhaNova")} type="password" name="senha" autoComplete="new-password" required error={estado.erros?.senha} hint={t("senhaDica", { min: SENHA_ALUNO_MINIMA_CLIENTE })} />
              <TextField floating label={t("senhaConfirmar")} type="password" name="senhaConfirmar" autoComplete="new-password" required error={estado.erros?.senhaConfirmar} />
            </>
          )
        }
      </Formulario>
    </div>
  );
}
