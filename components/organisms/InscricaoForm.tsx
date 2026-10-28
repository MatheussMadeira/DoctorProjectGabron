"use client";

import { useActionState } from "react";
import { CAMPO_ARMADILHA, CAMPO_CARIMBO, type EstadoFormulario } from "@/lib/formularios-tipos";
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
  profissoes: string[];
  conselhos: string[];
  /** Para mostrar estados específicos em /dev/componentes e nas capturas. */
  estadoInicial?: EstadoFormulario;
}

const semAcao = async (anterior: EstadoFormulario) => anterior;

export function InscricaoForm({ acao = semAcao, esgotada = false, eyebrow, profissoes, conselhos, estadoInicial = {} }: InscricaoFormProps) {
  const [estado, enviar, pendente] = useActionState(acao, estadoInicial);
  const { carimbo, formRef, renovando, falhou } = useCarimbo(estado);
  const erroGeral = estado.erroGeral ?? (falhou ? "Não foi possível validar o envio. Recarregue a página e tente de novo." : undefined);
  const erros = estado.erros ?? {};
  const v = estado.valores ?? {};
  const temErros = Object.keys(erros).length > 0;

  if (estado.ok) {
    return (
      <div className={`${styles.card} ${styles.sent}`}>
        <Logo variant="vertical" animated width={200} />
        <Alert tone="success" title={estado.listaEspera ? "Você entrou na lista de espera" : "Inscrição recebida"}>
          {estado.listaEspera
            ? "As vagas acabaram enquanto você enviava. Avisamos por e-mail se abrir uma vaga ou uma nova data."
            : "Enviamos os próximos passos para o seu e-mail. Se não encontrar a mensagem, confira a caixa de spam."}
        </Alert>
        <Button variant="secondary" href="/agenda">
          Ver outras turmas
        </Button>
      </div>
    );
  }

  return (
    <Stack gap={7}>
      <Reveal>
        {esgotada ? (
          <SectionHeading number="07" eyebrow="Turma esgotada" title="Lista de espera" lead="As vagas desta turma foram preenchidas. Deixe seus dados e avisamos se abrir uma vaga ou uma nova data." />
        ) : (
          <SectionHeading number="07" eyebrow={eyebrow} title="Inscrição" lead="Preencha seus dados para garantir a vaga. Você recebe os próximos passos e as formas de pagamento por e-mail." />
        )}
      </Reveal>

      <Reveal delay={120}>
        <form ref={formRef} action={enviar} className={`${styles.card} ${styles.form}`} noValidate>
          {erroGeral && (
            <Alert tone="danger" title={erroGeral}>
              {temErros ? "Confira os campos marcados abaixo." : "Se o problema continuar, fale com a equipe pelo WhatsApp."}
            </Alert>
          )}

          {/* Armadilha para robôs: fora da tela, sem foco e sem leitura por leitor de tela. Pessoas não preenchem. */}
          <div className={styles.armadilha} aria-hidden="true">
            <label>
              Deixe este campo em branco
              <input type="text" name={CAMPO_ARMADILHA} tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" />
            </label>
          </div>
          <input type="hidden" name={CAMPO_CARIMBO} value={carimbo} />

          <TextField floating label="Nome completo" name="nome" autoComplete="name" required defaultValue={v.nome} error={erros.nome} />
          <div className={styles.pair}>
            <TextField floating label="E-mail" type="email" name="email" autoComplete="email" required defaultValue={v.email} error={erros.email} />
            <TextField floating label="Telefone ou WhatsApp" type="tel" name="telefone" autoComplete="tel" required defaultValue={v.telefone} error={erros.telefone} />
          </div>
          {/* key: o React não atualiza o defaultValue de um <select> já montado; sem ela a escolha sumia depois de um erro. */}
          <Select key={`profissao-${v.profissao ?? ""}`} label="Profissão" floating name="profissao" required options={profissoes} defaultValue={v.profissao ?? ""} error={erros.profissao} />
          <div className={styles.conselho}>
            <Select key={`conselho-${v.conselho ?? ""}`} label="Conselho" floating name="conselho" required options={conselhos} defaultValue={v.conselho ?? ""} error={erros.conselho} />
            <TextField
              floating
              label="Número do registro e UF"
              name="registro"
              required
              defaultValue={v.registro}
              error={erros.registro}
              hint="Ex.: 00000 / MG. Conferimos o registro antes de confirmar a vaga."
            />
          </div>
          <div className={styles.checks}>
            <div>
              <Checkbox name="privacidade" required label="Li e aceito a Política de Privacidade. *" defaultChecked={v.privacidade === "on"} />
              {erros.privacidade && <p className={`ap-hint ap-hint-error ${styles.checkError}`}>{erros.privacidade}</p>}
            </div>
            <Checkbox name="avisos" label="Quero receber avisos de novas turmas por e-mail." hint="Opcional. Você pode cancelar quando quiser." defaultChecked={v.avisos === "on"} />
          </div>
          <div>
            <Button type="submit" size="lg" arrow disabled={pendente || renovando}>
              {pendente || renovando ? "Enviando…" : esgotada ? "Entrar na lista de espera" : "Enviar inscrição"}
            </Button>
          </div>
        </form>
      </Reveal>
    </Stack>
  );
}
