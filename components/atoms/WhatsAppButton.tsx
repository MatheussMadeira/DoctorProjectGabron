import { siWhatsapp } from "simple-icons";
import { cx } from "@/lib/cx";

export interface WhatsAppButtonProps {
  phone?: string;
  message?: string;
  label?: string;
  floating?: boolean;
  className?: string;
}

export function WhatsAppButton({
  phone = "5531000000000", // placeholder até a clínica confirmar o número
  message = "Olá! Gostaria de saber mais sobre as próximas turmas.",
  label = "Fale conosco no WhatsApp",
  floating = true,
  className,
}: WhatsAppButtonProps) {
  const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cx("ap-wa", floating && "ap-wa-float", className)} aria-label={label}>
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path d={siWhatsapp.path} fill="currentColor" />
      </svg>
      <span className="ap-wa-label">{label}</span>
    </a>
  );
}
