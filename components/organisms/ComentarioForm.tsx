"use client";

import { useActionState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { comentar } from "@/app/(site)/[locale]/sou-aluno/acoes";
import type { EstadoAluno } from "@/lib/aluno-form";
import { Button } from "../atoms/Button";
import { Alert } from "../molecules/Alert";
import { TextField } from "../molecules/TextField";
import styles from "./forms.module.css";

/** Comentar em uma discussão de caso. */
export function ComentarioForm({ materialId }: { materialId: string }) {
  const t = useTranslations("Aluno");
  const locale = useLocale();
  const [estado, enviar, pendente] = useActionState(comentar.bind(null, materialId), {} as EstadoAluno);
  const formulario = useRef<HTMLFormElement>(null);
  // Depois de publicar, o campo esvazia (o React já faz o reset do formulário quando a ação termina).
  useEffect(() => {
    if (estado.ok) formulario.current?.querySelector("textarea")?.focus();
  }, [estado]);
  return (
    <form ref={formulario} action={enviar} className={styles.form} noValidate>
      <input type="hidden" name="idioma" value={locale} />
      {estado.erro && (
        <Alert tone="danger" title={estado.erro}>
          {null}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title={t("comentarioOk")}>
          {null}
        </Alert>
      )}
      <TextField floating multiline rows={4} label={t("comentarioCampo")} name="texto" required defaultValue={estado.valores?.texto} error={estado.erros?.texto} hint={t("comentarioDica")} maxLength={1000} />
      <div>
        <Button type="submit" disabled={pendente}>
          {pendente ? t("comentarioEnviando") : t("comentarioEnviar")}
        </Button>
      </div>
    </form>
  );
}
