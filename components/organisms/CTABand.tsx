import type { ReactNode } from "react";
import { Button } from "../atoms/Button";
import { PedrasFundo } from "../atoms/PedrasFundo";

export interface CTABandProps {
  eyebrow?: string;
  title: ReactNode;
  text?: ReactNode;
  action?: { label: string; href: string };
  secondary?: ReactNode;
}

/* Faixa de chamada: sempre escura. */
export function CTABand({ eyebrow, title, text, action, secondary }: CTABandProps) {
  return (
    <div className="ap-cta" data-theme="escuro">
      <PedrasFundo side="right" />
      <div className="ap-cta-inner">
        <div>
          {eyebrow && <p className="ap-eyebrow">{eyebrow}</p>}
          <h2 className="ap-sh-title">{title}</h2>
          {text && <p className="ap-lead">{text}</p>}
        </div>
        <div className="ap-cta-actions">
          {action && (
            <Button size="lg" href={action.href} arrow>
              {action.label}
            </Button>
          )}
          {secondary}
        </div>
      </div>
    </div>
  );
}
