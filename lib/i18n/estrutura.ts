import { createHash } from "node:crypto";

/* Funções puras da camada de tradução de conteúdo do banco: o que traduzir dentro de um valor (texto, lista ou JSON), como
   remontar o valor com as traduções, o hash do português (para saber que ele mudou) e a sobreposição com fallback para o português. */

/** Chaves cujo valor NUNCA é traduzido (horas, durações, números, endereços de imagem…). */
export const NAO_TRADUZIR = new Set(["time", "duration", "valor", "fotoUrl", "url", "id", "href"]);

/**
 * Valor que não é texto de leitura: endereço de imagem ou de página, e-mail, telefone, número, data, preço, slug ou código.
 * Nunca vai para a tradução, em nenhum campo, mesmo que a chave não esteja em NAO_TRADUZIR.
 */
export function pareceNaoTexto(valor: string): boolean {
  const v = valor.trim();
  if (!v) return true;
  if (/^(\/|https?:|mailto:|tel:|data:|\.{1,2}\/|#)/i.test(v)) return true; // caminho, URL, âncora
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true; // e-mail
  if (/^[\d\s.,:;+\-/()%hH]+$/.test(v)) return true; // número, telefone, hora, data
  if (/^(R\$|US\$|€|\$)\s*[\d.,\s]+$/.test(v)) return true; // preço
  if (/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(v)) return true; // data ISO
  if (/^[a-z0-9]+(?:[-_.][a-z0-9]+)+$/.test(v)) return true; // slug / código / nome de arquivo
  return false;
}

const traduzivel = (v: string, chave?: string) => !(chave && NAO_TRADUZIR.has(chave)) && !pareceNaoTexto(v);

export type Json = string | number | boolean | null | Json[] | { [chave: string]: Json };

const vazio = (v: unknown) => v === null || v === undefined || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);
export const temConteudo = (v: unknown) => !vazio(v);

/** Todos os textos traduzíveis dentro do valor, na ordem em que aparecem. */
export function extrairTextos(valor: unknown, chave?: string): string[] {
  if (typeof valor === "string") return traduzivel(valor, chave) ? [valor] : [];
  if (Array.isArray(valor)) return valor.flatMap((v) => extrairTextos(v, chave));
  if (valor && typeof valor === "object") return Object.entries(valor).flatMap(([k, v]) => extrairTextos(v, k));
  return [];
}

/** Remonta o valor trocando cada texto traduzível pelo próximo da fila `traduzidos` (mesma ordem de `extrairTextos`). */
export function aplicarTextos(valor: unknown, traduzidos: string[], chave?: string): unknown {
  const fila = [...traduzidos];
  const trocar = (v: unknown, k?: string): unknown => {
    if (typeof v === "string") return traduzivel(v, k) ? (fila.shift() ?? v) : v;
    if (Array.isArray(v)) return v.map((x) => trocar(x, k));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, trocar(x, kk)]));
    return v;
  };
  return trocar(valor, chave);
}

/** Hash curto e estável do português de um campo. */
export const hashDe = (valor: unknown): string => createHash("sha1").update(JSON.stringify(valor ?? null)).digest("hex").slice(0, 16);

/** Põe por cima do português os campos traduzidos que existem; o que falta (ou está vazio) continua em português. */
export function sobrepor<T extends object>(base: T, conteudo: Record<string, unknown> | null | undefined, campos: ReadonlyArray<keyof T & string>): T {
  if (!conteudo) return base;
  const saida = { ...base } as Record<string, unknown>;
  for (const c of campos) {
    const v = conteudo[c];
    // Foto, link e afins vêm sempre do registro em português, mesmo que uma tradução antiga tenha guardado outra coisa.
    if (NAO_TRADUZIR.has(c) || (typeof v === "string" && pareceNaoTexto(v))) continue;
    if (temConteudo(v)) saida[c] = v;
  }
  return saida as T;
}

/** Campos do português com conteúdo e a situação de cada um (novo, mudou ou em dia) em relação à linha do idioma. */
export function camposParaTraduzir(origem: Record<string, unknown>, linha: { origem: Record<string, string>; conteudo: Record<string, unknown> } | undefined, forcar = false): string[] {
  return Object.entries(origem)
    .filter(([campo, valor]) => temConteudo(valor) && extrairTextos(valor, campo).length > 0)
    .filter(([campo, valor]) => forcar || !linha || linha.origem[campo] !== hashDe(valor) || !temConteudo(linha.conteudo[campo]))
    .map(([campo]) => campo);
}

