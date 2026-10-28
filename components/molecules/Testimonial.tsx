import type { ReactNode } from "react";
import Image from "@/components/atoms/ImagemSegura";
import { Quote } from "lucide-react";
import { ICON } from "@/lib/icon";

export interface TestimonialProps {
  quote: ReactNode;
  name: string;
  role?: string;
  avatar?: string;
}

export function Testimonial({ quote, name, role, avatar }: TestimonialProps) {
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
    </figure>
  );
}
