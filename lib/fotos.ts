/** Biblioteca da marca (public/images): fotos já aprovadas, com texto alternativo pronto. */
export const BIBLIOTECA_FOTOS = [
  { id: "maos", src: "/images/maos.webp", alt: "Mãos em luvas preparando uma aplicação" },
  { id: "luvas", src: "/images/luvas.webp", alt: "Luvas cirúrgicas sobre bancada" },
  { id: "anatomia", src: "/images/anatomia-quadril.webp", alt: "Modelo anatômico do quadril" },
  { id: "boneco", src: "/images/boneco-articulado.webp", alt: "Boneco articulado de madeira em pose de movimento" },
  { id: "pedras", src: "/images/pedras-empilhadas.webp", alt: "Pedras empilhadas em equilíbrio" },
  { id: "mar", src: "/images/pedras-mar.webp", alt: "Pedras à beira-mar" },
] as const;

/** Regras do envio de foto. A pessoa escolhe qualquer foto razoável; o navegador recorta (16:10), reduz, converte para WebP
    e tira os metadados (EXIF e localização) ANTES de enviar. Só o arquivo final vai para o Blob. */
export const FOTO_REGRAS = {
  /** O que a pessoa pode escolher (o arquivo original, antes de preparar). */
  tiposOriginais: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  extensoesOriginais: /\.(jpe?g|png|webp|heic|heif)$/i,
  maxOriginalBytes: 25 * 1024 * 1024,
  /** O que vai para o Blob. O servidor só aceita isto. */
  tipoFinal: "image/webp",
  maxFinalBytes: 2 * 1024 * 1024,
  larguraMaxima: 2000,
  /** Recorte com menos que isto mostra um aviso que não bloqueia. */
  larguraAviso: 1200,
  qualidade: 0.82,
  proporcao: 16 / 10,
} as const;

type ArquivoLike = { type: string; name: string };

export const ehHeic = (a: ArquivoLike) => /^image\/hei[cf]$/i.test(a.type) || /\.(heic|heif)$/i.test(a.name);

/** Aceita pelo tipo ou, quando o sistema não informa o tipo (comum com HEIC no Windows), pela extensão. */
export const tipoAceito = (a: ArquivoLike) => (FOTO_REGRAS.tiposOriginais as readonly string[]).includes(a.type.toLowerCase()) || ((!a.type || a.type === "application/octet-stream") && FOTO_REGRAS.extensoesOriginais.test(a.name));

/** Formatos do recorte: "paisagem" (16:10, foto da turma), "retrato" (4:5, professor) e "livre" (galeria: mantém o enquadramento original). */
export type FormatoFoto = "paisagem" | "retrato" | "livre";
export const FORMATOS_FOTO = {
  paisagem: { proporcao: 16 / 10, larguraMaxima: 2000, larguraAviso: 1200 },
  retrato: { proporcao: 4 / 5, larguraMaxima: 1200, larguraAviso: 800 },
  livre: { proporcao: null, larguraMaxima: 2000, larguraAviso: 1200 },
} as const;

/** Tamanho do arquivo final a partir do recorte (em pixels da foto original): nunca passa da largura máxima do formato e nunca é ampliado.
    "livre" mantém a proporção do recorte (passe a altura dele). */
export function tamanhoDeSaida(larguraDoRecorte: number, formato: FormatoFoto = "paisagem", alturaDoRecorte?: number): { largura: number; altura: number } {
  const f = FORMATOS_FOTO[formato];
  const largura = Math.max(1, Math.min(f.larguraMaxima, Math.round(larguraDoRecorte)));
  const proporcao = f.proporcao ?? (alturaDoRecorte ? larguraDoRecorte / alturaDoRecorte : FORMATOS_FOTO.paisagem.proporcao);
  return { largura, altura: Math.max(1, Math.round(largura / proporcao)) };
}

export const recorteEhPequeno = (larguraDoRecorte: number, formato: FormatoFoto = "paisagem") => larguraDoRecorte < FORMATOS_FOTO[formato].larguraAviso;

/** Mensagens em linguagem simples (sem proporção, pixels ou megabytes quando dá para evitar). */
export const MENSAGENS_FOTO = {
  tipoInvalido: "Este tipo de arquivo não serve. Escolha uma foto do celular ou do computador (JPG, PNG ou HEIC).",
  grandeDemais: "Este arquivo é grande demais. Escolha outra foto ou tire um print dela.",
  naoAbriu: "Não foi possível abrir esta foto. Tente outra ou tire um print dela.",
  naoPreparou: "Não foi possível preparar esta foto. Tente outra ou tire um print dela.",
  semWebp: "Este navegador não consegue preparar a foto. Use o Chrome, o Edge ou o Safari atualizado.",
  naoEnviou: "Não foi possível enviar a foto. Tente de novo.",
  semArmazenamento: "O armazenamento de fotos ainda não está configurado (falta o BLOB_READ_WRITE_TOKEN na Vercel). Por enquanto, escolha uma foto da biblioteca.",
  pequena: "Esta foto é pequena e pode ficar borrada em telas grandes. Usar mesmo assim?",
} as const;
