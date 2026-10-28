"use client";

import { FOTO_REGRAS, MENSAGENS_FOTO, ehHeic, tamanhoDeSaida } from "./fotos";

/* Preparo da foto no navegador, antes de qualquer envio: abre (inclusive HEIC de iPhone), recorta, reduz, converte para
   WebP e, como o resultado sai de um canvas, não leva nenhum metadado junto (EXIF, localização GPS, miniatura). */

export class ErroDeFoto extends Error {}

export interface AreaDoRecorte {
  x: number;
  y: number;
  width: number;
  height: number;
}

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ErroDeFoto(MENSAGENS_FOTO.naoAbriu));
    img.src = url;
  });
}

/** Devolve uma imagem que o navegador sabe mostrar: o próprio arquivo, ou (HEIC no Chrome e no Firefox) a conversão para JPEG. */
export async function abrirFoto(arquivo: File): Promise<{ url: string; imagem: HTMLImageElement }> {
  const direto = URL.createObjectURL(arquivo);
  try {
    return { url: direto, imagem: await carregarImagem(direto) };
  } catch (e) {
    URL.revokeObjectURL(direto);
    if (!ehHeic(arquivo)) throw e;
  }
  try {
    const { heicTo } = await import("heic-to");
    const jpeg = await heicTo({ blob: arquivo, type: "image/jpeg", quality: 0.92 });
    const url = URL.createObjectURL(jpeg);
    return { url, imagem: await carregarImagem(url) };
  } catch {
    throw new ErroDeFoto(MENSAGENS_FOTO.naoAbriu);
  }
}

function paraWebp(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new ErroDeFoto(MENSAGENS_FOTO.naoPreparou))), FOTO_REGRAS.tipoFinal, qualidade));
}

export interface FotoPreparada {
  blob: Blob;
  /** Largura do recorte na foto original: abaixo de 1200 vale o aviso de foto pequena. */
  larguraDoRecorte: number;
  largura: number;
  altura: number;
}

/** Aplica o recorte, reduz para no máximo 2000 de largura e converte para WebP (qualidade 0,82). Passando de 2 MB, reduz mais. */
export async function prepararFoto(imagem: HTMLImageElement, area: AreaDoRecorte): Promise<FotoPreparada> {
  let { largura, altura } = tamanhoDeSaida(area.width);
  let qualidade: number = FOTO_REGRAS.qualidade;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ErroDeFoto(MENSAGENS_FOTO.naoPreparou);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imagem, area.x, area.y, area.width, area.height, 0, 0, largura, altura);
    const blob = await paraWebp(canvas, qualidade);
    if (blob.type !== FOTO_REGRAS.tipoFinal) throw new ErroDeFoto(MENSAGENS_FOTO.semWebp);
    if (blob.size <= FOTO_REGRAS.maxFinalBytes) return { blob, larguraDoRecorte: Math.round(area.width), largura, altura };
    // Ainda grande demais: baixa a qualidade e, na segunda vez em diante, o tamanho.
    qualidade = Math.max(0.5, qualidade - 0.1);
    if (tentativa >= 1) {
      largura = Math.round(largura * 0.85);
      altura = Math.round(largura / FOTO_REGRAS.proporcao);
    }
  }
  throw new ErroDeFoto(MENSAGENS_FOTO.naoPreparou);
}
