import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";

export interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/** Rótulo, controle e mensagem (dica ou erro) de um campo. */
export function FieldShell({ id, label, hint, error, required, children }: FieldShellProps) {
  return (
    <div className={cx("ap-field", error && "ap-field-error")}>
      {label && (
        <label className="ap-label" htmlFor={id}>
          {label}
          {required && <span className="ap-req" aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}

export function FieldMessage({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (error)
    return (
      <p className="ap-hint ap-hint-error" id={id + "-msg"}>
        <CircleAlert {...ICON} size={14} />
        {error}
      </p>
    );
  if (hint)
    return (
      <p className="ap-hint" id={id + "-msg"}>
        {hint}
      </p>
    );
  return null;
}
