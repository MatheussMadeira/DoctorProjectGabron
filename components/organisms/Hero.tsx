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
  /** "retrato" (4:5, a foto da Dra. na home e no Sobre) ou "paisagem" (16:10, a foto da turma). */
  imageRatio?: "retrato" | "paisagem";
  theme?: "claro" | "escuro";
  intro?: boolean;
  /** Mesmo nome do EventCard da turma, para a foto "crescer" na View Transition. */
  transitionName?: string;
}

export function Hero({ eyebrow = "Médica Fisiatra", title, lead, primary, secondary, image, imageAlt = "", imageRatio = "retrato", theme = "escuro", intro = true, transitionName }: HeroProps) {
  const paisagem = imageRatio === "paisagem";
  return (
    <section className={cx("ap-hero", intro && "ap-hero-intro")} data-theme={theme}>
      {/* Sem imagem, as pedras ficam só do lado direito: não passam por trás do título e do texto. */}
      <PedrasFundo side={image ? "full" : "right"} intro={intro} />
      <div className={cx("ap-container ap-hero-grid", paisagem && "ap-hero-grid-paisagem")}>
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
          <figure className={cx("ap-hero-media", paisagem && "ap-hero-media-paisagem")} style={transitionName ? ({ viewTransitionName: transitionName } as CSSProperties) : undefined}>
            <Image src={image} alt={imageAlt} width={paisagem ? 1600 : 1200} height={paisagem ? 1000 : 1500} sizes={paisagem ? "(max-width: 1023px) 100vw, 600px" : "(max-width: 900px) 100vw, 560px"} priority />
          </figure>
        )}
      </div>
    </section>
  );
}
