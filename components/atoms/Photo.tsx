import Image from "next/image";
import { cx } from "@/lib/cx";
import styles from "./Photo.module.css";

export interface PhotoProps {
  src: string;
  alt: string;
  /** Proporção da moldura. Retratos e cartões da clínica: 4/5. Fotos de turma: 16/10. */
  ratio?: "4/5" | "16/10";
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/* Moldura reta com shadow-md, como pede o design system. */
export function Photo({ src, alt, ratio = "4/5", sizes = "(max-width: 900px) 100vw, 560px", priority = false, className }: PhotoProps) {
  const [w, h] = ratio === "4/5" ? [1200, 1500] : [1600, 1000];
  return (
    <figure className={cx(styles.photo, ratio === "16/10" && styles.wide, className)}>
      <Image src={src} alt={alt} width={w} height={h} sizes={sizes} priority={priority} />
    </figure>
  );
}
