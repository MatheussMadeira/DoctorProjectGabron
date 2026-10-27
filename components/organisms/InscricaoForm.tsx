"use client";

import { useState, type FormEvent } from "react";
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

export type InscricaoEstado = "normal" | "erro" | "enviada" | "esgotada";

export interface InscricaoFormProps {
  /** `esgotada` troca o texto para lista de espera. `erro` e `enviada` mostram esses estados da tela. */
  estado?: InscricaoEstado;
  /** Linha acima do título, por exemplo "21 e 22 de novembro · Belo Horizonte". */
  eyebrow: string;
  profissoes: string[];
  conselhos: string[];
}

/* Fase 3: só a interface. O envio ainda não grava nada; a Server Action entra na fase 6
   (validação no servidor, transação de vagas, e-mails e invalidação das tags da turma). */
export function InscricaoForm({ estado: inicial = "normal", eyebrow, profissoes, conselhos }: InscricaoFormProps) {
  const [estado, setEstado] = useState<InscricaoEstado>(inicial);
  const espera = estado === "esgotada";
  const erro = estado === "erro";

  function enviar(e: FormEvent) {
    e.preventDefault();
    setEstado("enviada");
  }

  return (
    <Stack gap={7}>
      {estado !== "enviada" && (
        <Reveal>
          {espera ? (
            <SectionHeading number="07" eyebrow="Turma esgotada" title="Lista de espera" lead="As vagas desta turma foram preenchidas. Deixe seus dados e avisamos se abrir uma vaga ou uma nova data." />
          ) : (
            <SectionHeading number="07" eyebrow={eyebrow} title="Inscrição" lead="Preencha seus dados para garantir a vaga. Você recebe os próximos passos e as formas de pagamento por e-mail." />
          )}
        </Reveal>
      )}

      {estado !== "enviada" && (
        <Reveal delay={120}>
          <form onSubmit={enviar} className={`${styles.card} ${styles.form}`} noValidate={erro}>
            {erro && (
              <Alert tone="danger" title="Revise 2 campos antes de enviar">
                O e-mail está incompleto e falta aceitar a política de privacidade.
              </Alert>
            )}
            <TextField floating label="Nome completo" name="nome" autoComplete="name" required defaultValue={erro ? "Nome Sobrenome" : undefined} />
            <div className={styles.pair}>
              <TextField
                floating
                label="E-mail"
                type="email"
                name="email"
                autoComplete="email"
                required
                defaultValue={erro ? "nome@dominio" : undefined}
                error={erro ? "Digite um e-mail válido, como nome@dominio.com.br." : undefined}
              />
              <TextField floating label="Telefone ou WhatsApp" type="tel" name="telefone" autoComplete="tel" required defaultValue={erro ? "(31) 00000-0000" : undefined} />
            </div>
            <Select label="Profissão" name="profissao" required options={profissoes} />
            <div className={styles.conselho}>
              <Select label="Conselho" name="conselho" required options={conselhos} />
              <TextField floating label="Número do registro e UF" name="registro" required hint="Ex.: 00000 / MG. Conferimos o registro antes de confirmar a vaga." />
            </div>
            <div className={styles.checks}>
              <div>
                <Checkbox name="privacidade" required label="Li e aceito a Política de Privacidade. *" />
                {erro && <p className={`ap-hint ap-hint-error ${styles.checkError}`}>Marque esta opção para enviar a inscrição.</p>}
              </div>
              <Checkbox name="avisos" label="Quero receber avisos de novas turmas por e-mail." hint="Opcional. Você pode cancelar quando quiser." />
            </div>
            <div>
              <Button type="submit" size="lg" arrow>
                {espera ? "Entrar na lista de espera" : "Enviar inscrição"}
              </Button>
            </div>
          </form>
        </Reveal>
      )}

      {estado === "enviada" && (
        <div className={`${styles.card} ${styles.sent}`}>
          <Logo variant="vertical" animated width={200} />
          <Alert tone="success" title="Inscrição recebida">
            Enviamos os próximos passos para o seu e-mail. Se não encontrar a mensagem, confira a caixa de spam.
          </Alert>
          <Button variant="secondary" href="/agenda">
            Ver outras turmas
          </Button>
        </div>
      )}
    </Stack>
  );
}
