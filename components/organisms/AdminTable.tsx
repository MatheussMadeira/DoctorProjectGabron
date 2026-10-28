import type { ReactNode } from "react";
import { Logo } from "../atoms/Logo";
import styles from "../admin.module.css";

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (linha: T) => ReactNode;
}

export interface AdminTableProps<T extends { id: string | number }> {
  colunas: Array<AdminTableColumn<T>>;
  linhas: T[];
  /** Ações de cada linha (links e botões). Componente de servidor: pode receber funções. */
  acoes?: (linha: T) => ReactNode;
  vazio?: string;
}

/* Tabela do painel. Mesmas classes `ap-table` do DataTable, mas de servidor, para aceitar links e botões nas ações
   (o DataTable do design system recebe funções de clique, que não atravessam servidor → cliente). */
export function AdminTable<T extends { id: string | number }>({ colunas, linhas, acoes, vazio = "Nenhum item cadastrado ainda." }: AdminTableProps<T>) {
  if (!linhas.length)
    return (
      <div className="ap-empty">
        <Logo variant="simbolo" width={40} title="" />
        <p>{vazio}</p>
      </div>
    );
  return (
    <div className="ap-table-wrap ap-table-empilha">
      <table className="ap-table">
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.key} style={{ textAlign: c.align || "left" }}>
                {c.label}
              </th>
            ))}
            {acoes && (
              <th>
                <span className="ap-sr">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id}>
              {colunas.map((c) => (
                <td key={c.key} data-rotulo={c.label} style={{ textAlign: c.align || "left" }}>
                  {c.render ? c.render(l) : String((l as Record<string, unknown>)[c.key] ?? "")}
                </td>
              ))}
              {acoes && <td className={styles.acoes}>{acoes(l)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
