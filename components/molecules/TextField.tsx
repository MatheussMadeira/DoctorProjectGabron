import { useId, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { FieldMessage, FieldShell } from "./FieldShell";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  floating?: boolean;
}

export function TextField({ label, hint, error, required, multiline = false, rows = 4, floating = false, id, className, ...rest }: TextFieldProps) {
  const auto = useId();
  const fid = id || "f" + auto.replace(/:/g, "");
  const props = {
    id: fid,
    required,
    "aria-invalid": !!error || undefined,
    "aria-describedby": error || hint ? fid + "-msg" : undefined,
    className: cx("ap-input", className),
    ...rest,
  };
  /* O estado de erro ou dica é mostrado por FieldMessage; o valor controlado fica com quem chama. */
  const field = (p: typeof props) =>
    multiline ? (
      <textarea rows={rows} {...(p as unknown as InputHTMLAttributes<HTMLTextAreaElement>)} />
    ) : (
      <input {...p} />
    );

  if (floating) {
    /* Rótulo dentro do campo que sobe ao focar ou digitar. O placeholder vira " " para o CSS saber se há texto. */
    return (
      <div className={cx("ap-field", "ap-field-float", error && "ap-field-error", multiline && "is-multi")}>
        <div className="ap-float">
          {field({ ...props, placeholder: " " })}
          <label className="ap-float-label" htmlFor={fid}>
            {label}
            {required && <span className="ap-req" aria-hidden="true"> *</span>}
          </label>
          <span className="ap-float-line" aria-hidden="true" />
        </div>
        <FieldMessage id={fid} hint={hint} error={error} />
      </div>
    );
  }
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required}>
      {field(props)}
    </FieldShell>
  );
}
