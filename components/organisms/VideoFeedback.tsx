import { interpretarVideo } from "@/lib/video";
import styles from "./alumni.module.css";

/* Vídeo de feedback: YouTube ou Vimeo em iframe (só os endereços que lib/video.ts reconhece) ou arquivo MP4 em <video> com legenda opcional.
   Nada carrega antes do clique no vídeo em arquivo (`preload="metadata"`); os iframes são preguiçosos. */
export function VideoFeedback({ url, legendaUrl, titulo, idiomaLegenda = "pt", rotuloLegenda = "Português" }: { url: string; legendaUrl?: string | null; titulo: string; idiomaLegenda?: string; rotuloLegenda?: string }) {
  const info = interpretarVideo(url);
  if (!info) return null;
  return (
    <div className={styles.video}>
      {info.tipo === "arquivo" ? (
        <video controls preload="metadata" playsInline aria-label={titulo}>
          <source src={info.src} />
          {legendaUrl && <track kind="captions" src={legendaUrl} srcLang={idiomaLegenda} label={rotuloLegenda} default />}
        </video>
      ) : (
        <iframe src={info.embed} title={titulo} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      )}
    </div>
  );
}
