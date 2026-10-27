"use client";

import { useActionState, useState } from "react";
import { CAMPO_ARMADILHA, type EstadoFormulario } from "@/lib/formularios-tipos";
import { Alert } from "../molecules/Alert";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import styles from "./forms.module.css";

export interface ContatoFormProps {
  assuntos: string[];
  /** Server Action: (estado, formData) → novo estado. */
  acao?: (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  /** Para mostrar estados específicos em /dev/componentes e nas capturas. */
  estadoInicial?: EstadoFormulario;
}

const semAcao = async (anterior: EstadoFormulario) => anterior;

export function ContatoForm({ assuntos, acao = semAcao, estadoInicial = {} }: ContatoFormProps) {
  const [estado, enviar, pendente] = useActionState(acao, estadoInicial);
  // "Enviar outra mensagem" esconde a tela de sucesso daquele resultado; o próximo envio gera um estado novo.
  const [descartado, setDescartado] = useState<EstadoFormulario | null>(null);
  const erros = estado.erros ?? {};
  const v = estado.valores ?? {};
  const enviada = estado.ok && estado !== descartado;

  return (
    <div className={styles.card}>
      {!enviada ? (
        <form action={enviar} className={styles.form} noValidate>
          <div className={styles.head}>
            <h2 className={styles.heading}>Envie uma mensagem</h2>
            <p className={styles.muted}>Campos com * são obrigatórios.</p>
          </div>
          {estado.erroGeral && (
            <Alert tone="danger" title={estado.erroGeral}>
              {Object.keys(erros).length ? "Confira os campos marcados abaixo." : "Se o problema continuar, fale com a equipe pelo WhatsApp."}
            </Alert>
          )}
          <div className={styles.armadilha} aria-hidden="true">
            <label>
              Não preencha este campo
              <input type="text" name={CAMPO_ARMADILHA} tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <TextField floating label="Nome completo" name="nome" autoComplete="name" required defaultValue={v.nome} error={erros.nome} />
          <div className={styles.pair}>
            <TextField floating label="E-mail" type="email" name="email" autoComplete="email" required defaultValue={v.email} error={erros.email} />
            <TextField floating label="Telefone ou WhatsApp" type="tel" name="telefone" autoComplete="tel" defaultValue={v.telefone} error={erros.telefone} />
          </div>
          <Select label="Assunto" name="assunto" required options={assuntos} defaultValue={v.assunto ?? ""} error={erros.assunto} />
          <TextField
            floating
            multiline
            rows={5}
            label="Mensagem"
            name="mensagem"
            defaultValue={v.mensagem}
            error={erros.mensagem}
            hint="Não envie informações de saúde por aqui. Elas são tratadas na consulta."
          />
          <div>
            <Checkbox name="privacidade" required label="Li e aceito a Política de Privacidade." hint="Seus dados são usados só para responder a este contato." defaultChecked={v.privacidade === "on"} />
            {erros.privacidade && <p className={`ap-hint ap-hint-error ${styles.checkError}`}>{erros.privacidade}</p>}
          </div>
          <div>
            <Button type="submit" size="lg" arrow disabled={pendente}>
              {pendente ? "Enviando…" : "Enviar mensagem"}
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.replied}>
          <Alert tone="success" title="Mensagem enviada">
            Obrigado pelo contato. A equipe da clínica vai responder pelo e-mail ou telefone que você informou.
          </Alert>
          <Button variant="ghost" onClick={() => setDescartado(estado)}>
            Enviar outra mensagem
          </Button>
        </div>
      )}
    </div>
  );
}
