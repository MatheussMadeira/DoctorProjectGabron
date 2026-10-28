"use client";

import { useActionState } from "react";
import { Alert } from "../molecules/Alert";
import { TextField } from "../molecules/TextField";
import { AdminCard } from "../molecules/AdminCard";
import { Button } from "../atoms/Button";
import styles from "../admin.module.css";

export interface EstadoConfigForm {
  ok?: boolean;
  erro?: string;
  erros?: Record<string, string>;
  teste?: { ok: boolean; mensagem: string };
}

export interface DadosClinicaValores {
  telefone: string;
  whatsapp: string;
  instagram: string;
  email: string;
  enderecoLinha1: string;
  enderecoLinha2: string;
  horario: string;
}

/** Dados de contato do site. Só o ADMIN vê; a Server Action confere a permissão de novo. */
export function DadosClinicaForm({
  valores,
  padroes,
  acao,
}: {
  valores: DadosClinicaValores;
  padroes: DadosClinicaValores;
  acao: (anterior: EstadoConfigForm, formData: FormData) => Promise<EstadoConfigForm>;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const erros = estado.erros ?? {};
  const campo = (nome: keyof DadosClinicaValores, rotulo: string, hint?: string) => (
    <TextField label={rotulo} name={nome} defaultValue={valores[nome]} placeholder={padroes[nome]} error={erros[nome]} hint={hint} />
  );
  return (
    <AdminCard titulo="Dados de contato">
      <form action={enviar} className={styles.pilha} noValidate>
        <p className={styles.muted}>
          Aparecem no menu do celular, no rodapé, no botão de WhatsApp, na página de contato e nos e-mails. O registro de cada professor fica no cadastro dele (aba Professores). Campo vazio mostra o placeholder no site.
        </p>
        {estado.erro && (
          <Alert tone="danger" title="Não foi possível salvar">
            {estado.erro}
          </Alert>
        )}
        {estado.ok && (
          <Alert tone="success" title="Dados salvos">
            O site já mostra os novos dados.
          </Alert>
        )}
        <div className={styles.linha}>
          {campo("telefone", "Telefone", "Como aparece: (31) 99999-9999.")}
          {campo("whatsapp", "WhatsApp", "Com 55 e DDD, só números: 5531999999999.")}
          {campo("instagram", "Instagram", "Ex.: @perfil.")}
        </div>
        <div className={styles.linha}>
          {campo("email", "E-mail público", "O que aparece no rodapé e na página de contato.")}
          {campo("horario", "Horário de atendimento")}
        </div>
        <div className={styles.linha}>
          {campo("enderecoLinha1", "Endereço", "Rua, número, sala · Bairro")}
          {campo("enderecoLinha2", "Cidade e CEP", "Belo Horizonte — MG · CEP 00000-000")}
        </div>
        <div>
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar dados"}
          </Button>
        </div>
      </form>
    </AdminCard>
  );
}

export interface EmailStatusInfo {
  provedor: string;
  remetente: string | null;
  configurado: boolean;
  erro: string | null;
  /** E-mail do ADMIN logado, que recebe o teste. */
  destino: string;
  /** Quem recebe os avisos internos. */
  avisosPara: string[];
}

/** Mostra como o envio está configurado e manda um e-mail de teste para o ADMIN logado. */
export function EmailDeTeste({ info, acao }: { info: EmailStatusInfo; acao: (anterior: EstadoConfigForm) => Promise<EstadoConfigForm> }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <AdminCard titulo="E-mails do site">
      <div className={styles.pilha}>
        <p className={styles.muted}>
          Provedor: <strong>{info.provedor}</strong>
          {info.remetente ? ` · remetente: ${info.remetente}` : ""}. Os avisos de nova inscrição e de mensagem de contato vão para:{" "}
          {info.avisosPara.length ? info.avisosPara.join(", ") : "ninguém (sem ADMIN ativo e sem caixa de reserva)"}.
        </p>
        {!info.configurado && (
          <Alert tone="warning" title="Envio não configurado">
            {info.erro}
          </Alert>
        )}
        {estado.teste && (
          <Alert tone={estado.teste.ok ? "success" : "danger"} title={estado.teste.ok ? "Teste enviado" : "O teste falhou"}>
            {estado.teste.mensagem}
          </Alert>
        )}
        {estado.erro && (
          <Alert tone="danger" title="Não foi possível enviar">
            {estado.erro}
          </Alert>
        )}
        <form action={enviar}>
          <Button type="submit" variant="secondary" className="ap-btn-wrap" disabled={pendente}>
            {pendente ? "Enviando…" : `Enviar e-mail de teste para ${info.destino}`}
          </Button>
        </form>
      </div>
    </AdminCard>
  );
}
