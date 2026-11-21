import { z } from "zod";

/* Campos de cada TIPO de seção: a fonte única do editor. Daqui saem o formulário do painel (rótulos, limites, dicas, proporção da foto), a
   validação no servidor (schemaDe) e o que pode ser traduzido (mesclarTraducao). Sem dependências do Next: o navegador também importa. */

export type Campo =
  | { tipo: "texto"; chave: string; rotulo: string; max: number; multilinha?: boolean; dica?: string; opcional?: boolean }
  | { tipo: "link"; chave: string; rotulo: string; dica?: string; opcional?: boolean }
  | { tipo: "foto"; chave: string; rotulo: string; proporcao: "retrato" | "paisagem" }
  | { tipo: "lista"; chave: string; rotulo: string; singular: string; min: number; max: number; itens: Campo[] };

export type TipoSecao = "hero" | "curso" | "cabecalho" | "numeros" | "proposta" | "valores";
export type Conteudo = Record<string, unknown>;
export interface Foto {
  url: string;
  alt: string;
}

const texto = (chave: string, rotulo: string, max: number, o: { multilinha?: boolean; dica?: string; opcional?: boolean } = {}): Campo => ({ tipo: "texto", chave, rotulo, max, ...o });
const link = (chave: string, rotulo: string, o: { dica?: string; opcional?: boolean } = {}): Campo => ({ tipo: "link", chave, rotulo, ...o });
const foto = (chave: string, rotulo: string, proporcao: "retrato" | "paisagem" = "retrato"): Campo => ({ tipo: "foto", chave, rotulo, proporcao });
const lista = (chave: string, rotulo: string, singular: string, min: number, max: number, itens: Campo[]): Campo => ({ tipo: "lista", chave, rotulo, singular, min, max, itens });

const DICA_LINK = "Use /pagina (do próprio site), #ancora ou https://…";

const pilares = lista("pilares", "Pilares", "Pilar", 3, 5, [texto("titulo", "Título", 80), texto("texto", "Texto", 240, { multilinha: true })]);

export const CAMPOS: Record<TipoSecao, Campo[]> = {
  hero: [
    texto("sobretitulo", "Sobretítulo", 120, { opcional: true }),
    texto("titulo", "Título", 120),
    texto("frase", "Texto de abertura", 400, { multilinha: true }),
    foto("foto", "Foto"),
    texto("botao1Rotulo", "Botão principal: texto", 40, { opcional: true }),
    link("botao1Link", "Botão principal: link", { dica: DICA_LINK, opcional: true }),
    texto("botao2Rotulo", "Botão secundário: texto", 40, { opcional: true }),
    link("botao2Link", "Botão secundário: link", { dica: DICA_LINK, opcional: true }),
  ],
  curso: [
    texto("eyebrow", "Sobretítulo", 80, { opcional: true }),
    texto("titulo", "Título", 120),
    texto("lead", "Texto", 600, { multilinha: true }),
    pilares,
    foto("foto", "Foto"),
    texto("botaoRotulo", "Botão: texto", 40, { opcional: true }),
    link("botaoLink", "Botão: link", { dica: DICA_LINK, opcional: true }),
  ],
  cabecalho: [
    texto("eyebrow", "Sobretítulo", 80, { opcional: true }),
    texto("titulo", "Título", 120),
    texto("lead", "Texto de apoio", 300, { multilinha: true, opcional: true, dica: "Deixe vazio para não mostrar (ou, nos professores, para usar a frase automática que conta quantos são)." }),
    texto("linkRotulo", "Link abaixo da lista: texto", 60, { opcional: true, dica: "Deixe vazio para não mostrar o link." }),
  ],
  numeros: [
    texto("eyebrow", "Sobretítulo", 80, { opcional: true }),
    texto("titulo", "Título", 120),
    lista("itens", "Números", "Número", 4, 4, [texto("valor", "Valor", 12, { dica: "Ex.: 120, +300, 15 anos." }), texto("rotulo", "Rótulo", 60)]),
  ],
  proposta: [
    texto("eyebrow", "Sobretítulo", 80, { opcional: true }),
    texto("titulo", "Título", 120),
    lista("paragrafos", "Parágrafos", "Parágrafo", 1, 4, [texto("texto", "Texto", 1200, { multilinha: true })]),
    pilares,
  ],
  valores: [texto("eyebrow", "Sobretítulo", 80, { opcional: true }), texto("titulo", "Título", 120), texto("frase", "Frase", 400, { multilinha: true })],
};

const ROTULO_TIPO: Record<TipoSecao, string> = { hero: "Topo da página", curso: "O curso", cabecalho: "Cabeçalho da seção", numeros: "Números", proposta: "A proposta", valores: "Valores" };
export const rotuloDoTipo = (t: TipoSecao) => ROTULO_TIPO[t];

const FOTO_BLOB = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;
export const fotoValida = (url: string) => url.startsWith("/images/") || FOTO_BLOB.test(url);
const LINK_VALIDO = /^(\/|#|https?:\/\/)\S*$/;

function schemaDoCampo(c: Campo): z.ZodType {
  switch (c.tipo) {
    case "texto": {
      const base = z.string().trim().max(c.max, `${c.rotulo}: no máximo ${c.max} caracteres.`);
      return c.opcional ? base.default("") : base.min(1, `${c.rotulo}: preencha o campo.`);
    }
    case "link": {
      const base = z.string().trim().max(200, `${c.rotulo}: no máximo 200 caracteres.`).refine((v) => !v || LINK_VALIDO.test(v), `${c.rotulo}: use /pagina, #ancora ou https://…`);
      return c.opcional ? base.default("") : base.min(1, `${c.rotulo}: preencha o campo.`);
    }
    case "foto":
      return z.object({
        url: z.string().trim().refine(fotoValida, `${c.rotulo}: escolha uma foto da biblioteca ou envie uma nova.`),
        alt: z.string().trim().min(3, `${c.rotulo}: descreva a foto (leitor de tela).`).max(200, `${c.rotulo}: a descrição tem no máximo 200 caracteres.`),
      });
    case "lista":
      return z
        .array(schemaDe(c.itens))
        .min(c.min, `${c.rotulo}: use ${c.min === c.max ? c.min : `de ${c.min} a ${c.max}`} item(ns).`)
        .max(c.max, `${c.rotulo}: use ${c.min === c.max ? c.min : `de ${c.min} a ${c.max}`} item(ns).`);
  }
}

/** Schema zod de uma lista de campos. */
export function schemaDe(campos: Campo[]): z.ZodObject {
  return z.object(Object.fromEntries(campos.map((c) => [c.chave, schemaDoCampo(c)])));
}

export const schemaDoTipo = (tipo: TipoSecao) => schemaDe(CAMPOS[tipo]);

/** Valida o conteúdo de uma seção. Devolve o conteúdo limpo ou os erros por caminho ("pilares.0.titulo" → mensagem). */
export function validarConteudo(tipo: TipoSecao, conteudo: unknown): { ok: true; conteudo: Conteudo } | { ok: false; erros: Record<string, string> } {
  const r = schemaDoTipo(tipo).safeParse(conteudo);
  if (r.success) return { ok: true, conteudo: r.data as Conteudo };
  const erros: Record<string, string> = {};
  for (const i of r.error.issues) erros[i.path.join(".")] ??= i.message;
  return { ok: false, erros };
}

/** Conteúdo vazio de um campo (para "Adicionar item" e para o padrão de uma lista). */
export function valorVazio(c: Campo): unknown {
  switch (c.tipo) {
    case "texto":
    case "link":
      return "";
    case "foto":
      return { url: "", alt: "" };
    case "lista":
      return [];
  }
}
export const itemVazio = (campos: Campo[]): Conteudo => Object.fromEntries(campos.map((c) => [c.chave, valorVazio(c)]));

const texto0 = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Põe a tradução por cima do português SÓ nos textos (e na descrição das fotos). Links, endereços de foto e a estrutura das listas vêm
 * sempre do português: uma tradução antiga nunca troca a foto nem o link. Lista cujo tamanho mudou desde a tradução fica em português.
 */
export function mesclarTraducao(campos: Campo[], pt: Conteudo, trad: Conteudo | null | undefined): Conteudo {
  if (!trad) return pt;
  const saida: Conteudo = { ...pt };
  for (const c of campos) {
    const t = trad[c.chave];
    if (c.tipo === "texto") {
      if (texto0(t).trim()) saida[c.chave] = t;
    } else if (c.tipo === "foto") {
      const f = pt[c.chave] as Foto | undefined;
      const alt = texto0((t as Partial<Foto> | undefined)?.alt).trim();
      if (f && alt) saida[c.chave] = { ...f, alt };
    } else if (c.tipo === "lista") {
      const itensPt = (pt[c.chave] as Conteudo[] | undefined) ?? [];
      if (Array.isArray(t) && t.length === itensPt.length) saida[c.chave] = itensPt.map((item, i) => mesclarTraducao(c.itens, item, t[i] as Conteudo));
    }
  }
  return saida;
}

/** Os valores de texto do conteúdo, em ordem, com o caminho de cada um ("pilares.0.titulo"): o que o editor tenta achar na prévia. */
export function folhasDeTexto(campos: Campo[], conteudo: Conteudo, prefixo = ""): Array<{ caminho: string; valor: string; rotulo: string; max?: number; multilinha?: boolean }> {
  const saida: Array<{ caminho: string; valor: string; rotulo: string; max?: number; multilinha?: boolean }> = [];
  for (const c of campos) {
    const caminho = prefixo ? `${prefixo}.${c.chave}` : c.chave;
    const v = conteudo?.[c.chave];
    if (c.tipo === "texto") {
      if (typeof v === "string" && v.trim()) saida.push({ caminho, valor: v, rotulo: c.rotulo, max: c.max, multilinha: c.multilinha });
    } else if (c.tipo === "lista" && Array.isArray(v)) {
      v.forEach((item, i) => saida.push(...folhasDeTexto(c.itens, item as Conteudo, `${caminho}.${i}`)));
    }
  }
  return saida;
}
/** As fotos do conteúdo, com o caminho de cada uma, na ordem em que aparecem. */
export function fotosDoConteudo(campos: Campo[], conteudo: Conteudo, prefixo = ""): Array<{ caminho: string; rotulo: string; proporcao: "retrato" | "paisagem"; foto: Foto }> {
  const saida: Array<{ caminho: string; rotulo: string; proporcao: "retrato" | "paisagem"; foto: Foto }> = [];
  for (const c of campos) {
    const caminho = prefixo ? `${prefixo}.${c.chave}` : c.chave;
    const v = conteudo?.[c.chave];
    if (c.tipo === "foto" && v) saida.push({ caminho, rotulo: c.rotulo, proporcao: c.proporcao, foto: v as Foto });
    else if (c.tipo === "lista" && Array.isArray(v)) v.forEach((item, i) => saida.push(...fotosDoConteudo(c.itens, item as Conteudo, `${caminho}.${i}`)));
  }
  return saida;
}

/** Lê e grava um valor por caminho ("pilares.1.titulo") sem mexer no original (imutável). */
export function valorEm(conteudo: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), conteudo);
}
export function comValorEm<T>(conteudo: T, caminho: string, valor: unknown): T {
  const [k, ...resto] = caminho.split(".");
  if (Array.isArray(conteudo)) {
    const i = Number(k);
    return conteudo.map((x, j) => (j === i ? (resto.length ? comValorEm(x, resto.join("."), valor) : valor) : x)) as unknown as T;
  }
  const base = (conteudo ?? {}) as Record<string, unknown>;
  return { ...base, [k]: resto.length ? comValorEm(base[k], resto.join("."), valor) : valor } as T;
}
