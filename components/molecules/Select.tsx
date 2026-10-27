import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";
import { FieldShell } from "./FieldShell";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  options?: Array<string | { value: string; label: string }>;
}

export function Select({ label, hint, error, required, options = [], placeholder = "Selecione", id, className, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id || "f" + auto.replace(/:/g, "");
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required}>
      <div className="ap-select">
        <select
          id={fid}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? fid + "-msg" : undefined}
          className={cx("ap-input", className)}
          defaultValue={rest.value === undefined ? "" : undefined}
          {...rest}
        >
          <option value="" disabled>
            {placeholder}
          </option>
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
        </select>
        <ChevronDown {...ICON} size={18} />
      </div>
    </FieldShell>
  );
}
