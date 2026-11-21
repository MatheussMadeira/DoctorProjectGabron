"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CAMPO_ARMADILHA, CAMPO_CARIMBO, CAMPO_IDIOMA, type EstadoFormulario } from "@/lib/formularios-tipos";
import type { Locale } from "@/lib/i18n/idiomas";
import { useCarimbo } from "@/lib/use-carimbo";
import { Alert } from "../molecules/Alert";
import { TextField } from "../molecules/TextField";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import styles from "./forms.module.css";

export interface DepoimentoFormProps {
  /** Server Action: (estado, formData) → novo estado. */
  acao?: (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  estadoInicial?: EstadoFormulario;
}

const semAcao = async (anterior: EstadoFormulario) => anterior;

export function DepoimentoForm({ acao = semAcao, estadoInicial = {} }: DepoimentoFormProps) {
  const t = useTranslations("DepoimentoForm");
  const tValidacao = useTranslations("Validacao");
  const locale = useLocale() as Locale;
  const [estado, enviar, pendente] = useActionState(acao, estadoInicial);
  const { carimbo, formRef, renovando, falhou } = useCarimbo(estado);
  const erroGeral = estado.erroGeral ?? (falhou ? tValidacao("carimbo") : undefined);
  const [descartado, setDescartado] = useState<EstadoFormulario | null>(null);
  const erros = estado.erros ?? {};
  const v = estado.valores ?? {};
  const enviado = estado.ok && estado !== descartado;

  return (
    <div className={styles.card}>
      {!enviado ? (
        <form ref={formRef} action={enviar} className={styles.form} noValidate>
          <div className={styles.head}>
            <h2 className={styles.heading}>{t("titulo")}</h2>
            <p className={styles.muted}>{t("obrigatorios")}</p>
          </div>
          {erroGeral && (
            <Alert tone="danger" title={erroGeral}>
              {Object.keys(erros).length ? t("erroConfira") : t("erroPersiste")}
            </Alert>
          )}
          <div className={styles.armadilha} aria-hidden="true">
            <label>
              {t("armadilha")}
              <input type="text" name={CAMPO_ARMADILHA} tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" />
            </label>
          </div>
          <input type="hidden" name={CAMPO_CARIMBO} value={carimbo} />
          <input type="hidden" name={CAMPO_IDIOMA} value={locale} />
          <TextField floating label={t("nome")} name="nome" autoComplete="name" required defaultValue={v.nome} error={erros.nome} />
          <div className={styles.pair}>
            <TextField floating label={t("profissao")} name="profissao" autoComplete="organization-title" required defaultValue={v.profissao} error={erros.profissao} />
            <TextField floating label={t("cidade")} name="cidade" autoComplete="address-level2" required defaultValue={v.cidade} error={erros.cidade} />
          </div>
          <TextField floating label={t("email")} type="email" name="email" autoComplete="email" required defaultValue={v.email} error={erros.email} hint={t("emailDica")} />
          <TextField floating multiline rows={6} label={t("texto")} name="texto" required defaultValue={v.texto} error={erros.texto} hint={t("textoDica")} />
          <div>
            <Checkbox name="consentimento" required label={t("consentimento")} hint={t("consentimentoDica")} defaultChecked={v.consentimento === "on"} />
            {erros.consentimento && <p className={`ap-hint ap-hint-error ${styles.checkError}`}>{erros.consentimento}</p>}
          </div>
          <div>
            <Checkbox name="privacidade" required label={t("privacidade")} defaultChecked={v.privacidade === "on"} />
            {erros.privacidade && <p className={`ap-hint ap-hint-error ${styles.checkError}`}>{erros.privacidade}</p>}
          </div>
          <div>
            <Button type="submit" size="lg" arrow disabled={pendente || renovando}>
              {pendente || renovando ? t("enviando") : t("enviar")}
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.replied}>
          <Alert tone="success" title={t("sucessoTitulo")}>
            {t("sucessoTexto")}
          </Alert>
          <Button variant="ghost" onClick={() => setDescartado(estado)}>
            {t("outra")}
          </Button>
        </div>
      )}
    </div>
  );
}
