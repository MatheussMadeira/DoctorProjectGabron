import Image from "next/image";
import { cx } from "@/lib/cx";

export interface GalleryProps {
  images: Array<{ src: string; alt: string; caption?: string }>;
}

export function Gallery({ images = [] }: GalleryProps) {
  return (
    <div className="ap-gallery">
      {images.map((im, i) => (
        <figure key={i} className={cx("ap-gallery-item", i === 0 && "is-wide")}>
          <Image src={im.src} alt={im.alt || ""} width={1200} height={800} sizes="(max-width: 900px) 100vw, 600px" />
          {im.caption && <figcaption>{im.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
