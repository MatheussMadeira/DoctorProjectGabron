"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ICON } from "@/lib/icon";
import { ROTULO_SITUACAO, SITUACOES_ORDEM } from "@/lib/situacoes";
import type { Situacao, StatusEmail, TipoEmail } from "@/db/schema";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Select } from "../molecules/Select";
import styles from "../admin.module.css";

type EstadoAcao = { ok?: boolean; erro?: string };

/** Filtro por turma: o id fica na URL (?turma=), então dá para compartilhar o link e recarregar. */
export function FiltroTurma({ opcoes, valor }: { opcoes: Array<{ value: string; label: string }>; valor: string }) {
  const router = useRouter();
  return <Select label="Turma" options={opcoes} value={valor} onChange={(e) => router.push(`/admin/inscricoes?turma=${e.target.value}`)} />;
}

/** Situação editável na própria linha: trocou, salvou. */
export function SituacaoSelect({ situacao, acao, rotulo }: { situacao: Situacao; acao: (anterior: EstadoAcao, formData: FormData) => Promise<EstadoAcao>; rotulo: string }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className={`${styles.pilhaCurta} ${styles.situacaoCampo}`}>
      <div className="ap-select">
        <select
          name="situacao"
          className="ap-input"
          aria-label={`Situação de ${rotulo}`}
          defaultValue={situacao}
          disabled={pendente}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          {SITUACOES_ORDEM.map((s) => (
            <option key={s} value={s}>
              {ROTULO_SITUACAO[s]}
            </option>
          ))}
        </select>
        <ChevronDown {...ICON} size={18} />
      </div>
      {estado.erro && <p className="ap-hint ap-hint-error">{estado.erro}</p>}
    </form>
  );
}

const ROTULO_EMAIL: Record<TipoEmail, string> = {
  INSCRICAO_CONFIRMACAO: "Confirmação",
  INSCRICAO_AVISO: "Aviso à equipe",
  CONTATO_AVISO: "Aviso à equipe",
  INSCRICAO_VAGA_CONFIRMADA: "Vaga confirmada",
};
const TOM_EMAIL: Record<StatusEmail, "success" | "danger" | "neutral"> = { ENVIADO: "success", FALHOU: "danger", PENDENTE: "neutral" };
const TEXTO_EMAIL: Record<StatusEmail, string> = { ENVIADO: "Enviado", FALHOU: "Falhou", PENDENTE: "Pendente" };

export interface EmailLinha {
  id: string;
  tipo: TipoEmail;
  status: StatusEmail;
  tentativas: number;
  erro: string | null;
}

function Reenviar({ email, acao }: { email: EmailLinha; acao: (emailId: string) => Promise<EstadoAcao> }) {
  const [estado, enviar, pendente] = useActionState(() => acao(email.id), {} as EstadoAcao);
  return (
    <form action={enviar} className={styles.emailLinha}>
      <span>{ROTULO_EMAIL[email.tipo]}</span>
      <Badge tone={TOM_EMAIL[email.status]}>{TEXTO_EMAIL[email.status]}</Badge>
      <Button type="submit" size="sm" variant="ghost" disabled={pendente}>
        {pendente ? "Enviando…" : "Reenviar"}
      </Button>
      {(email.erro || estado.erro) && (
        <p className={`ap-hint ap-hint-error ${styles.emailErro}`} title={`${email.tentativas} tentativa(s)`}>
          {estado.erro ?? email.erro}
        </p>
      )}
    </form>
  );
}

/** Os e-mails de uma inscrição (ou mensagem): status de cada um e o botão "Reenviar". */
export function EmailsDaLinha({ emails, acao }: { emails: EmailLinha[]; acao: (emailId: string) => Promise<EstadoAcao> }) {
  if (!emails.length) return <span className={styles.nota}>Sem registro</span>;
  return (
    <div className={styles.pilhaCurta}>
      {emails.map((e) => (
        <Reenviar key={e.id} email={e} acao={acao} />
      ))}
    </div>
  );
}
