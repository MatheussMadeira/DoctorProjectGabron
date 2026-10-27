"use client";

import { useActionState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { ICON } from "@/lib/icon";
import { Button } from "../atoms/Button";
import { Alert } from "../molecules/Alert";
import styles from "../admin.module.css";

type AcaoComErro = (anterior: { erro?: string }, formData: FormData) => Promise<{ erro?: string }>;

export interface ExcluirTurmaDialogProps {
  curso: string;
  data: string;
  local: string;
  /** Pessoas com inscrição (inclusive lista de espera). */
  inscritos: number;
  /** Só o ADMIN vê "Excluir data"; a EQUIPE só pode mudar para rascunho. A Server Action confere de novo. */
  podeExcluir: boolean;
  excluir: AcaoComErro;
  mudarParaRascunho: AcaoComErro;
}

/** Botão da lixeira na linha da agenda + diálogo de confirmação (AdminExcluir.dc.html). */
export function ExcluirTurmaDialog({ curso, data, local, inscritos, podeExcluir, excluir, mudarParaRascunho }: ExcluirTurmaDialogProps) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [estadoExcluir, acaoExcluir, excluindo] = useActionState(excluir, {});
  const [estadoRascunho, acaoRascunho, mudando] = useActionState(mudarParaRascunho, {});
  const erro = estadoExcluir.erro ?? estadoRascunho.erro;
  const ocupado = excluindo || mudando;

  return (
    <>
      <button type="button" className={`${styles.iconeLink} ${styles.perigo}`} aria-label={`${podeExcluir ? "Excluir" : "Mudar para rascunho"}: ${curso}, ${data}`} onClick={() => dialogo.current?.showModal()}>
        <Trash2 {...ICON} size={18} />
      </button>

      <dialog ref={dialogo} className={styles.dialogo} aria-labelledby="dlg-excluir-titulo">
        <div className={styles.dialogoCorpo}>
          <div className={styles.loginCabeca}>
            <p className={`ap-eyebrow ${styles.rotuloPerigo}`}>{podeExcluir ? "Excluir data" : "Tirar do site"}</p>
            <h2 id="dlg-excluir-titulo" className={styles.dialogoTitulo}>
              {podeExcluir ? "Excluir esta data da agenda?" : "Mudar esta data para rascunho?"}
            </h2>
          </div>

          <div className={styles.alvo}>
            <strong>{curso}</strong>
            <span>
              {data} · {local}
            </span>
          </div>

          {inscritos > 0 && (
            <Alert tone="warning" title={inscritos === 1 ? "Esta data tem 1 pessoa inscrita" : `Esta data tem ${inscritos} pessoas inscritas`}>
              Elas não são avisadas automaticamente. Prefira mudar a data para Rascunho e falar com cada pessoa antes de excluir.
            </Alert>
          )}

          <p className={styles.muted}>
            {podeExcluir
              ? "A página da turma sai do site e as inscrições ficam arquivadas. Esta ação não pode ser desfeita."
              : "A página da turma sai do site e as inscrições continuam guardadas. Só a Dra. pode excluir uma data."}
          </p>
          {erro && (
            <Alert tone="danger" title="Não foi possível concluir">
              {erro}
            </Alert>
          )}

          <div className={styles.rodape}>
            <Button type="button" variant="ghost" onClick={() => dialogo.current?.close()}>
              Cancelar
            </Button>
            <form action={acaoRascunho}>
              <Button type="submit" variant="secondary" disabled={ocupado}>
                Mudar para rascunho
              </Button>
            </form>
            {podeExcluir && (
              <form action={acaoExcluir}>
                <button type="submit" className={styles.botaoPerigo} disabled={ocupado}>
                  Excluir data
                </button>
              </form>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
