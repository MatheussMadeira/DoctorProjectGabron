import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import { FieldMessage, FieldShell } from "./FieldShell";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  /** Rótulo dentro da caixa, que sobe quando há uma opção escolhida (igual ao TextField floating). A opção vazia não mostra "Selecione". */
  floating?: boolean;
  options?: Array<string | { value: string; label: string }>;
}

export function Select({ label, hint, error, required, options = [], placeholder = "Selecione", floating = false, id, className, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id || "f" + auto.replace(/:/g, "");
  const comum = {
    id: fid,
    required,
    "aria-invalid": !!error || undefined,
    "aria-describedby": error || hint ? fid + "-msg" : undefined,
    className: cx("ap-input", className),
    defaultValue: rest.value === undefined ? "" : undefined,
    ...rest,
  };
  const opcoes = (
    <>
          {options.map((o) =>
              typeof o === "string" ? (
                <option key={o} value={o}>
                  {o}
                </option>
              ) : (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ),
            )}
    </>
  );

  if (floating) {
    /* Mesma estrutura do TextField floating: rótulo dentro da caixa, que sobe com uma opção escolhida; mesma altura, borda, linha e foco. */
    return (
      <div className={cx("ap-field", "ap-field-float", error && "ap-field-error")}>
        <div className="ap-float ap-select">
          <select {...comum}>
            <option value="" disabled hidden />
            {opcoes}
          </select>
          <label className="ap-float-label" htmlFor={fid}>
            {label}
            {required && <span className="ap-req" aria-hidden="true"> *</span>}
          </label>
          <span className="ap-float-line" aria-hidden="true" />
          <ChevronDown {...ICON} size={18} />
        </div>
        <FieldMessage id={fid} hint={hint} error={error} />
      </div>
    );
  }
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required}>
      <div className="ap-select">
        <select {...comum}>
          <option value="" disabled>
            {placeholder}
          </option>
          {opcoes}
        </select>
        <ChevronDown {...ICON} size={18} />
      </div>
    </FieldShell>
  );
}
