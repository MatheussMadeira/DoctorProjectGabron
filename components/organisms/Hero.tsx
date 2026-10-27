import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { cx } from "@/lib/cx";
import { Button } from "../atoms/Button";
import { PedrasFundo } from "../atoms/PedrasFundo";

type Link = { label: string; href: string };

export interface HeroProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  primary?: Link;
  secondary?: Link;
  image?: string;
  imageAlt?: string;
  theme?: "claro" | "escuro";
  intro?: boolean;
  /** Mesmo nome do EventCard da turma, para a foto "crescer" na View Transition. */
  transitionName?: string;
}

export function Hero({ eyebrow = "Médica Fisiatra", title, lead, primary, secondary, image, imageAlt = "", theme = "escuro", intro = true, transitionName }: HeroProps) {
  return (
    <section className={cx("ap-hero", intro && "ap-hero-intro")} data-theme={theme}>
      <PedrasFundo side="full" intro={intro} />
      <div className="ap-container ap-hero-grid">
        <div className="ap-hero-copy">
          {eyebrow && <p className="ap-eyebrow">{eyebrow}</p>}
          <h1 className="ap-hero-title">{title}</h1>
          {lead && <p className="ap-lead">{lead}</p>}
          {(primary || secondary) && (
            <div className="ap-hero-actions">
              {primary && (
                <Button arrow size="lg" href={primary.href}>
                  {primary.label}
                </Button>
              )}
              {secondary && (
                <Button variant="secondary" size="lg" href={secondary.href}>
                  {secondary.label}
                </Button>
              )}
            </div>
          )}
        </div>
        {image && (
          <figure className="ap-hero-media" style={transitionName ? ({ viewTransitionName: transitionName } as CSSProperties) : undefined}>
            <Image src={image} alt={imageAlt} width={1200} height={1500} sizes="(max-width: 900px) 100vw, 560px" priority />
          </figure>
        )}
      </div>
    </section>
  );
}
