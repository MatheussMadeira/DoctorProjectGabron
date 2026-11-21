/* Vídeo de feedback: aceita link do YouTube, link do Vimeo ou arquivo de vídeo (MP4/WebM, em geral enviado ao Cloudinary).
   Devolve como mostrar: um `embed` (iframe) ou um `src` (elemento <video>). Qualquer outra coisa é inválida (nada de iframe de endereço qualquer). */

export type VideoInfo = { tipo: "youtube" | "vimeo"; embed: string } | { tipo: "arquivo"; src: string };

const ID_YOUTUBE = /^[\w-]{11}$/;

export function interpretarVideo(entrada: string | null | undefined): VideoInfo | null {
  const texto = (entrada ?? "").trim();
  if (!texto) return null;
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");

  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
    const partes = url.pathname.split("/").filter(Boolean);
    const id = host === "youtu.be" ? partes[0] : url.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(partes[0]) ? partes[1] : undefined);
    return id && ID_YOUTUBE.test(id) ? { tipo: "youtube", embed: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).find((p) => /^\d+$/.test(p));
    return id ? { tipo: "vimeo", embed: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (/\.(mp4|webm|mov)$/i.test(url.pathname) || host === "res.cloudinary.com") return { tipo: "arquivo", src: url.toString() };
  return null;
}

/** Legenda opcional (arquivo .vtt) do vídeo em arquivo. */
export const legendaValida = (entrada: string | null | undefined) => {
  const texto = (entrada ?? "").trim();
  if (!texto) return true;
  try {
    const url = new URL(texto);
    return url.protocol === "https:" && /\.vtt$/i.test(url.pathname);
  } catch {
    return false;
  }
};
