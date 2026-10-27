"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "../molecules/Alert";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import styles from "./forms.module.css";

export interface ContatoFormProps {
  assuntos: string[];
  /** Mostra a mensagem de sucesso desde o início (conferência do estado). */
  enviada?: boolean;
}

/* Fase 3: só a interface. O envio ainda não grava nem manda e-mail; isso entra na fase 6. */
export function ContatoForm({ assuntos, enviada: inicial = false }: ContatoFormProps) {
  const [enviada, setEnviada] = useState(inicial);

  function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviada(true);
  }

  return (
    <div className={styles.card}>
      {!enviada ? (
        <form onSubmit={enviar} className={styles.form}>
          <div className={styles.head}>
            <h2 className={styles.heading}>Envie uma mensagem</h2>
            <p className={styles.muted}>Campos com * são obrigatórios.</p>
          </div>
          <TextField floating label="Nome completo" name="nome" autoComplete="name" required />
          <div className={styles.pair}>
            <TextField floating label="E-mail" type="email" name="email" autoComplete="email" required />
            <TextField floating label="Telefone ou WhatsApp" type="tel" name="telefone" autoComplete="tel" />
          </div>
          <Select label="Assunto" name="assunto" required options={assuntos} />
          <TextField floating multiline rows={5} label="Mensagem" name="mensagem" hint="Não envie informações de saúde por aqui. Elas são tratadas na consulta." />
          <Checkbox name="privacidade" required label="Li e aceito a Política de Privacidade." hint="Seus dados são usados só para responder a este contato." />
          <div>
            <Button type="submit" size="lg" arrow>
              Enviar mensagem
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.replied}>
          <Alert tone="success" title="Mensagem enviada">
            Obrigado pelo contato. A equipe da clínica vai responder pelo e-mail ou telefone que você informou.
          </Alert>
          <Button variant="ghost" onClick={() => setEnviada(false)}>
            Enviar outra mensagem
          </Button>
        </div>
      )}
    </div>
  );
}
