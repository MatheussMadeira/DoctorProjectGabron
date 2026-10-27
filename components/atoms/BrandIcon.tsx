import { cx } from "@/lib/cx";

/** Ícone de marca do Simple Icons (ex.: `siInstagram`, `siWhatsapp`), preenchido com a cor do texto. */
export function BrandIcon({ icon, size = 20, className }: { icon: { path: string }; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={cx(className)}>
      <path d={icon.path} fill="currentColor" />
    </svg>
  );
}
