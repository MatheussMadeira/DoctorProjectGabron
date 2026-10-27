"use client";

import type { ReactNode } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { ICON } from "@/lib/icon";
import { Logo } from "../atoms/Logo";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T extends { id?: string | number }> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  empty?: string;
}

export function DataTable<T extends { id?: string | number }>({ columns = [], rows = [], onEdit, onView, onDelete, empty = "Nenhum item cadastrado ainda." }: DataTableProps<T>) {
  if (!rows.length)
    return (
      <div className="ap-empty">
        <Logo variant="simbolo" width={40} title="" />
        <p>{empty}</p>
      </div>
    );
  const hasActions = !!(onEdit || onView || onDelete);
  return (
    <div className="ap-table-wrap">
      <table className="ap-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align || "left" }}>
                {c.label}
              </th>
            ))}
            {hasActions && (
              <th>
                <span className="ap-sr">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align || "left" }}>
                  {c.render ? c.render(r) : (r as Record<string, ReactNode>)[c.key]}
                </td>
              ))}
              {hasActions && (
                <td className="ap-table-actions">
                  {onView && (
                    <button type="button" className="ap-icon-btn" aria-label="Ver" onClick={() => onView(r)}>
                      <Eye {...ICON} size={18} />
                    </button>
                  )}
                  {onEdit && (
                    <button type="button" className="ap-icon-btn" aria-label="Editar" onClick={() => onEdit(r)}>
                      <Pencil {...ICON} size={18} />
                    </button>
                  )}
                  {onDelete && (
                    <button type="button" className="ap-icon-btn ap-icon-danger" aria-label="Excluir" onClick={() => onDelete(r)}>
                      <Trash2 {...ICON} size={18} />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
