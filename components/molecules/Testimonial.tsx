import type { ReactNode } from "react";
import Image from "@/components/atoms/ImagemSegura";
import { Quote } from "lucide-react";
import { ICON } from "@/lib/icon";
import { AppLink } from "../atoms/AppLink";

export interface TestimonialProps {
  quote: ReactNode;
  name: string;
  role?: string;
  avatar?: string;
  /** Leva para o depoimento completo (a página Alumni). */
  href?: string;
  linkLabel?: string;
}

export function Testimonial({ quote, name, role, avatar, href, linkLabel }: TestimonialProps) {
  return (
    <figure className="ap-testi">
      <Quote {...ICON} size={28} className="ap-testi-mark" />
      <blockquote>{quote}</blockquote>
      <figcaption>
        {avatar ? (
          <Image src={avatar} alt="" width={48} height={48} />
        ) : (
          <span className="ap-testi-initial" aria-hidden="true">
            {(name || "?").trim()[0]}
          </span>
        )}
        <span>
          <strong>{name}</strong>
          {role && <span>{role}</span>}
        </span>
      </figcaption>
      {href && linkLabel && (
        <AppLink href={href} className="ap-testi-link">
          {linkLabel}
        </AppLink>
      )}
    </figure>
  );
}
