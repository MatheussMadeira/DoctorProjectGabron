/** Biblioteca da marca (public/images): fotos já aprovadas, com texto alternativo pronto. */
export const BIBLIOTECA_FOTOS = [
  { id: "maos", src: "/images/maos.webp", alt: "Mãos em luvas preparando uma aplicação" },
  { id: "luvas", src: "/images/luvas.webp", alt: "Luvas cirúrgicas sobre bancada" },
  { id: "anatomia", src: "/images/anatomia-quadril.webp", alt: "Modelo anatômico do quadril" },
  { id: "boneco", src: "/images/boneco-articulado.webp", alt: "Boneco articulado de madeira em pose de movimento" },
  { id: "pedras", src: "/images/pedras-empilhadas.webp", alt: "Pedras empilhadas em equilíbrio" },
  { id: "mar", src: "/images/pedras-mar.webp", alt: "Pedras à beira-mar" },
] as const;

/** Regras do envio de foto (spec): JPG ou WebP, 16:10, a partir de 1600 px, até 5 MB. */
export const FOTO_REGRAS = {
  tipos: ["image/jpeg", "image/webp"],
  maxBytes: 5 * 1024 * 1024,
  larguraMinima: 1600,
  proporcao: 16 / 10,
  tolerancia: 0.02,
} as const;
