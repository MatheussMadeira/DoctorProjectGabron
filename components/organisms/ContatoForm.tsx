"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CAMPO_ARMADILHA, CAMPO_CARIMBO, CAMPO_IDIOMA, type EstadoFormulario } from "@/lib/formularios-tipos";
import type { Locale } from "@/lib/i18n/idiomas";
import { ASSUNTOS_OPCOES, comoOpcoes } from "@/lib/i18n/opcoes";
import { useCarimbo } from "@/lib/use-carimbo";
import { Alert } from "../molecules/Alert";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import styles from "./forms.module.css";

export interface ContatoFormProps {
  /** Não usado mais: as opções (valor canônico em português + rótulo traduzido) vêm de lib/i18n/opcoes.ts. Mantido para não quebrar quem ainda passa. */
  assuntos?: string[];
  /** Server Action: (estado, formData) → novo estado. */
  acao?: (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  /** Para mostrar estados específicos em /dev/componentes e nas capturas. */
  estadoInicial?: EstadoFormulario;
}

const semAcao = async (anterior: EstadoFormulario) => anterior;

export function ContatoForm({ acao = semAcao, estadoInicial = {} }: ContatoFormProps) {
  const t = useTranslations("ContatoForm");
  const tValidacao = useTranslations("Validacao");
  const tAssuntos = useTranslations("Opcoes.assuntos");
  const locale = useLocale() as Locale;
  const [estado, enviar, pendente] = useActionState(acao, estadoInicial);
  const { carimbo, formRef, renovando, falhou } = useCarimbo(estado);
  const erroGeral = estado.erroGeral ?? (falhou ? tValidacao("carimbo") : undefined);
  // "Enviar outra mensagem" esconde a tela de sucesso daquele resultado; o próximo envio gera um estado novo.
  const [descartado, setDescartado] = useState<EstadoFormulario | null>(null);
  const erros = estado.erros ?? {};
  const v = estado.valores ?? {};
  const enviada = estado.ok && estado !== descartado;

  return (
    <div className={styles.card}>
      {!enviada ? (
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
            <TextField floating label={t("email")} type="email" name="email" autoComplete="email" required defaultValue={v.email} error={erros.email} />
            <TextField floating label={t("telefone")} type="tel" name="telefone" autoComplete="tel" defaultValue={v.telefone} error={erros.telefone} />
          </div>
          {/* key: o React não atualiza o defaultValue de um <select> já montado; sem ela a escolha sumia depois de um erro. */}
          <Select key={`assunto-${v.assunto ?? ""}`} label={t("assunto")} floating name="assunto" required options={comoOpcoes(ASSUNTOS_OPCOES, tAssuntos)} defaultValue={v.assunto ?? ""} error={erros.assunto} />
          <TextField
            floating
            multiline
            rows={5}
            label={t("mensagem")}
            name="mensagem"
            defaultValue={v.mensagem}
            error={erros.mensagem}
            hint={t("mensagemDica")}
          />
          <div>
            <Checkbox name="privacidade" required label={t("privacidade")} hint={t("privacidadeDica")} defaultChecked={v.privacidade === "on"} />
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
