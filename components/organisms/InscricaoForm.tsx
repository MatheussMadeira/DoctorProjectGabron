"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CAMPO_ARMADILHA, CAMPO_CARIMBO, CAMPO_IDIOMA, type EstadoFormulario } from "@/lib/formularios-tipos";
import { comPrefixo, type Locale } from "@/lib/i18n/idiomas";
import { CONSELHOS_OPCOES, comoOpcoes, PROFISSOES_OPCOES } from "@/lib/i18n/opcoes";
import { useCarimbo } from "@/lib/use-carimbo";
import { Alert } from "../molecules/Alert";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { SectionHeading } from "../molecules/SectionHeading";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import { Logo } from "../atoms/Logo";
import { Reveal } from "../atoms/Reveal";
import { Stack } from "../atoms/Stack";
import styles from "./forms.module.css";

export interface InscricaoFormProps {
  /** Server Action já ligada ao slug da turma: (estado, formData) → novo estado. */
  acao?: (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  /** Turma esgotada: o texto passa a ser de lista de espera. */
  esgotada?: boolean;
  /** Linha acima do título, por exemplo "21 e 22 de novembro · Belo Horizonte". */
  eyebrow: string;
  /** Não usados mais: as opções (valor canônico em português + rótulo traduzido) vêm de lib/i18n/opcoes.ts. Mantidos para não quebrar quem ainda passa. */
  profissoes?: string[];
  conselhos?: string[];
  /** Para mostrar estados específicos em /dev/componentes e nas capturas. */
  estadoInicial?: EstadoFormulario;
}

const semAcao = async (anterior: EstadoFormulario) => anterior;

export function InscricaoForm({ acao = semAcao, esgotada = false, eyebrow, estadoInicial = {} }: InscricaoFormProps) {
  const t = useTranslations("Inscricao");
  const tValidacao = useTranslations("Validacao");
  const tProfissoes = useTranslations("Opcoes.profissoes");
  const tConselhos = useTranslations("Opcoes.conselhos");
  const locale = useLocale() as Locale;
  const [estado, enviar, pendente] = useActionState(acao, estadoInicial);
  const { carimbo, formRef, renovando, falhou } = useCarimbo(estado);
  const erroGeral = estado.erroGeral ?? (falhou ? tValidacao("carimbo") : undefined);
  const erros = estado.erros ?? {};
  const v = estado.valores ?? {};
  const temErros = Object.keys(erros).length > 0;

  if (estado.ok) {
    return (
      <div className={`${styles.card} ${styles.sent}`}>
        <Logo variant="vertical" animated width={200} />
        <Alert tone="success" title={estado.listaEspera ? t("sucessoListaTitulo") : t("sucessoTitulo")}>
          {estado.listaEspera ? t("sucessoListaTexto") : t("sucessoTexto")}
        </Alert>
        <Button variant="secondary" href={comPrefixo(locale, "/agenda")}>
          {t("verOutras")}
        </Button>
      </div>
    );
  }

  return (
    <Stack gap={7}>
      <Reveal>
        {esgotada ? (
          <SectionHeading number="07" eyebrow={t("esgotadaEyebrow")} title={t("esgotadaTitulo")} lead={t("esgotadaLead")} />
        ) : (
          <SectionHeading number="07" eyebrow={eyebrow} title={t("titulo")} lead={t("lead")} />
        )}
      </Reveal>

      <Reveal delay={120}>
        <form ref={formRef} action={enviar} className={`${styles.card} ${styles.form}`} noValidate>
          {erroGeral && (
            <Alert tone="danger" title={erroGeral}>
              {temErros ? t("erroConfira") : t("erroPersiste")}
            </Alert>
          )}

          {/* Armadilha para robôs: fora da tela, sem foco e sem leitura por leitor de tela. Pessoas não preenchem. */}
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
            <TextField floating label={t("telefone")} type="tel" name="telefone" autoComplete="tel" required defaultValue={v.telefone} error={erros.telefone} />
          </div>
          {/* key: o React não atualiza o defaultValue de um <select> já montado; sem ela a escolha sumia depois de um erro. */}
          <Select key={`profissao-${v.profissao ?? ""}`} label={t("profissao")} floating name="profissao" required options={comoOpcoes(PROFISSOES_OPCOES, tProfissoes)} defaultValue={v.profissao ?? ""} error={erros.profissao} />
          <div className={styles.conselho}>
            <Select key={`conselho-${v.conselho ?? ""}`} label={t("conselho")} floating name="conselho" required options={comoOpcoes(CONSELHOS_OPCOES, tConselhos)} defaultValue={v.conselho ?? ""} error={erros.conselho} />
            <TextField
              floating
              label={t("registro")}
              name="registro"
              required
              defaultValue={v.registro}
              error={erros.registro}
              hint={t("registroDica")}
            />
          </div>
          <div className={styles.checks}>
            <div>
              <Checkbox name="privacidade" required label={t("privacidade")} defaultChecked={v.privacidade === "on"} />
              {erros.privacidade && <p className={`ap-hint ap-hint-error ${styles.checkError}`}>{erros.privacidade}</p>}
            </div>
            <Checkbox name="avisos" label={t("avisos")} hint={t("avisosDica")} defaultChecked={v.avisos === "on"} />
          </div>
          <div>
            <Button type="submit" size="lg" arrow disabled={pendente || renovando}>
              {pendente || renovando ? t("enviando") : esgotada ? t("entrarLista") : t("enviar")}
            </Button>
          </div>
        </form>
      </Reveal>
    </Stack>
  );
}
