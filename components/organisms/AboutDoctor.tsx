import type { ReactNode } from "react";
import Image from "@/components/atoms/ImagemSegura";
import { Award } from "lucide-react";
import { ICON } from "@/lib/icon";
import { Button } from "../atoms/Button";
import { Logo } from "../atoms/Logo";

export interface AboutDoctorProps {
  photo?: string;
  photoAlt?: string;
  name?: string;
  role?: string;
  /** CRM e RQE: obrigatórios junto ao nome da Dra. (CFM). */
  registry?: string;
  bio?: ReactNode;
  credentials?: string[];
  action?: { label: string; href: string };
}

export function AboutDoctor({ photo, photoAlt = "Dra. Ana Paula Fonseca", name = "Dra. Ana Paula Fonseca", role = "Médica Fisiatra", registry, bio, credentials = [], action }: AboutDoctorProps) {
  return (
    <div className="ap-about">
      <figure className="ap-about-media">
        {photo && <Image src={photo} alt={photoAlt} width={1200} height={1500} sizes="(max-width: 900px) 100vw, 480px" />}
        <Logo variant="selo" className="ap-about-seal" title="" />
      </figure>
      <div className="ap-about-copy">
        <p className="ap-eyebrow">{role}</p>
        <h2 className="ap-sh-title">{name}</h2>
        {registry && <p className="ap-about-reg">{registry}</p>}
        {bio && <p className="ap-body-l">{bio}</p>}
        {credentials.length > 0 && (
          <ul className="ap-creds">
            {credentials.map((c, i) => (
              <li key={i}>
                <Award {...ICON} size={18} />
                {c}
              </li>
            ))}
          </ul>
        )}
        {action && (
          <Button variant="secondary" href={action.href} arrow>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
