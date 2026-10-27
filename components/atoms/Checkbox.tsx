import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  hint?: string;
}

export function Checkbox({ label, hint, id, className, ...rest }: CheckboxProps) {
  const auto = useId();
  const fid = id || "c" + auto.replace(/:/g, "");
  return (
    <div className={cx("ap-check", className)}>
      <input type="checkbox" id={fid} {...rest} />
      <span className="ap-check-box" aria-hidden="true">
        <Check {...ICON} size={14} strokeWidth={2.5} />
      </span>
      <label htmlFor={fid}>
        {label}
        {hint && <span className="ap-check-hint">{hint}</span>}
      </label>
    </div>
  );
}
