import Image, { type ImageProps } from "next/image";

/** Caminho do próprio site ("/images/x.webp", nunca "//host") ou URL http(s) válida, sem espaços. */
export function srcValido(src: unknown): src is string {
  if (typeof src !== "string" || !src || /\s/.test(src)) return false;
  if (src.startsWith("/")) return !src.startsWith("//");
  try {
    const u = new URL(src);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/* next/image que não derruba a página: com src inválido (ex.: um texto no lugar do endereço) registra o erro e não mostra a imagem. */
export default function ImagemSegura(props: ImageProps) {
  // eslint-disable-next-line jsx-a11y/alt-text -- o alt vem nas props de quem chama
  if (typeof props.src !== "string") return <Image {...props} />; // importação estática (StaticImageData)
  if (!srcValido(props.src)) {
    console.error(`[imagem] src inválido, imagem omitida: ${JSON.stringify(props.src)}`);
    return null;
  }
  // eslint-disable-next-line jsx-a11y/alt-text -- o alt vem nas props de quem chama
  return <Image {...props} />;
}
