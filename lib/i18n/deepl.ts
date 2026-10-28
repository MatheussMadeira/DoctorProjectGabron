import type { Locale } from "./idiomas";
import { IDIOMAS } from "./idiomas";

/* Provedor de tradução. Em produção e no desenvolvimento: DeepL (DEEPL_API_KEY; chave terminada em ":fx" = plano Free, que usa
   api-free.deepl.com, e qualquer outra = Pro, api.deepl.com). Nos testes: o provedor "falso" (I18N_PROVEDOR=falso), que devolve o
   texto com o idioma na frente e não sai da máquina. Sem chave e sem o falso, nada é traduzido (o site mostra o português). */

export interface ProvedorDeTraducao {
  nome: string;
  traduzir(textos: string[], locale: Locale): Promise<string[]>;
}

export const MARCA = "ReabToxin";
const TAM_LOTE = 40;
const MAX_CARACTERES_POR_LOTE = 60_000;

export const urlDaDeepl = (chave: string) => (chave.trim().endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com");

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const desescapar = (t: string) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** A marca não se traduz: vai dentro de <x>, que a DeepL ignora (ignore_tags). */
export const protegerMarca = (t: string) => escapar(t).replace(new RegExp(MARCA, "g"), `<x>${MARCA}</x>`);
export const restaurarMarca = (t: string) => desescapar(t.replace(/<\/?x>/g, ""));

function lotes(textos: string[]): string[][] {
  const saida: string[][] = [];
  let atual: string[] = [];
  let tamanho = 0;
  for (const t of textos) {
    if (atual.length && (atual.length >= TAM_LOTE || tamanho + t.length > MAX_CARACTERES_POR_LOTE)) {
      saida.push(atual);
      atual = [];
      tamanho = 0;
    }
    atual.push(t);
    tamanho += t.length;
  }
  if (atual.length) saida.push(atual);
  return saida;
}

export function deepl(chave: string, buscar: typeof fetch = fetch): ProvedorDeTraducao {
  return {
    nome: "deepl",
    async traduzir(textos, locale) {
      const saida: string[] = [];
      for (const lote of lotes(textos)) {
        const resposta = await buscar(`${urlDaDeepl(chave)}/v2/translate`, {
          method: "POST",
          headers: { Authorization: `DeepL-Auth-Key ${chave}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            text: lote.map(protegerMarca),
            source_lang: "PT",
            target_lang: IDIOMAS[locale].deepl,
            tag_handling: "xml",
            ignore_tags: ["x"],
            preserve_formatting: true,
          }),
        });
        if (!resposta.ok) throw new Error(`DeepL respondeu ${resposta.status}${resposta.status === 456 ? " (cota de caracteres esgotada)" : ""}`);
        const json = (await resposta.json()) as { translations: Array<{ text: string }> };
        if (json.translations.length !== lote.length) throw new Error("DeepL devolveu um número de textos diferente do enviado");
        saida.push(...json.translations.map((t) => restaurarMarca(t.text)));
      }
      return saida;
    },
  };
}

export const provedorFalso: ProvedorDeTraducao = {
  nome: "falso",
  async traduzir(textos, locale) {
    return textos.map((t) => `[${locale}] ${t}`);
  },
};

/** O provedor configurado, ou null quando não há como traduzir. */
export function provedorDeTraducao(env: Record<string, string | undefined> = process.env): ProvedorDeTraducao | null {
  // O provedor falso só existe nos testes (e2e liga TESTE_E2E=1 junto). Em desenvolvimento e produção, nunca: sem chave, nada é traduzido.
  if (env.I18N_PROVEDOR === "falso") {
    if (env.TESTE_E2E === "1") return provedorFalso;
    console.warn("[i18n] I18N_PROVEDOR=falso ignorado: o provedor falso só vale nos testes.");
  }
  const chave = env.DEEPL_API_KEY?.trim();
  return chave ? deepl(chave) : null;
}
