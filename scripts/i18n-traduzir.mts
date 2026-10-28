// Traduz os textos fixos do site (messages/pt-BR.json) para en, es, fr, it, de e zh-CN com a DeepL.
// Uso:  yarn i18n:traduzir                  → traduz só o que ainda NÃO existe em cada idioma (idempotente; pode rodar de novo quando surgir texto novo)
//       yarn i18n:traduzir --forcar         → retraduz também o que ainda não foi revisado (nunca toca no que foi marcado como revisado)
//       yarn i18n:traduzir --idioma de      → só um idioma
//       yarn i18n:traduzir --revisado de Home.   → marca como revisado (em messages/revisao.json) as chaves do alemão que começam com "Home."
//       yarn i18n:traduzir --revisado de   → marca TODAS as chaves do alemão como revisadas
// O que veio da API e ainda não foi conferido por uma pessoa fica listado em messages/revisao.json (idioma → chaves). Quem revisa
// edita o texto em messages/<idioma>.json e tira a chave de lá (ou usa --revisado). A sintaxe ICU ({ano}, plural, <tags>) é preservada.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { aplicarTraduzidos, definir, extrairTraduziveis, folhas, ler } from "../lib/i18n/icu";
import { provedorDeTraducao } from "../lib/i18n/deepl";
import { IDIOMAS, IDIOMAS_TRADUZIDOS, ehLocale, type Locale } from "../lib/i18n/idiomas";

const args = process.argv.slice(2);
const forcar = args.includes("--forcar");
const iIdioma = args.indexOf("--idioma");
const soUm = iIdioma >= 0 ? args[iIdioma + 1] : undefined;
const iRev = args.indexOf("--revisado");

const lerJson = (p: string): Record<string, unknown> => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {});
const gravar = (p: string, o: unknown) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

const arquivo = (l: Locale) => `messages/${IDIOMAS[l].arquivo}.json`;
const revisao = lerJson("messages/revisao.json") as Record<string, string[]>;

if (iRev >= 0) {
  const l = args[iRev + 1];
  const prefixo = args[iRev + 2] ?? "";
  if (!ehLocale(l) || l === "pt-BR") throw new Error("Use: --revisado <en|es|fr|it|de|zh> [prefixo]");
  const antes = revisao[l]?.length ?? 0;
  revisao[l] = (revisao[l] ?? []).filter((k) => !k.startsWith(prefixo));
  gravar("messages/revisao.json", revisao);
  console.log(`${l}: ${antes - revisao[l].length} chave(s) marcada(s) como revisada(s); faltam ${revisao[l].length}.`);
  process.exit(0);
}

const provedor = provedorDeTraducao();
if (!provedor) {
  console.error("Sem DEEPL_API_KEY no .env.local: nada a fazer. (A chave que termina em :fx usa o plano Free automaticamente.)");
  process.exit(1);
}

const pt = lerJson("messages/pt-BR.json");
// E-mails internos (para os ADMIN) ficam sempre em português: não entram na tradução.
const origem = folhas(pt).filter(([chave]) => !chave.startsWith("EmailsInternos."));
const alvos = IDIOMAS_TRADUZIDOS.filter((l) => !soUm || l === soUm);
let caracteres = 0;

for (const locale of alvos) {
  const atual = lerJson(arquivo(locale));
  const pendentes = new Set(revisao[locale] ?? []);
  // Faltando, ou (com --forcar) ainda não revisado. O que está revisado nunca é sobrescrito.
  const fazer = origem.filter(([chave]) => {
    const existe = typeof ler(atual, chave) === "string" && (ler(atual, chave) as string).trim() !== "";
    return !existe || (forcar && pendentes.has(chave));
  });
  if (!fazer.length) {
    console.log(`${locale}: em dia (${origem.length} textos).`);
    continue;
  }
  const trechos = fazer.map(([, msg]) => extrairTraduziveis(msg));
  const planos = trechos.flat();
  caracteres += planos.reduce((n, t) => n + t.length, 0);
  const traduzidos = planos.length ? await provedor.traduzir(planos, locale) : [];
  let cursor = 0;
  fazer.forEach(([chave, msg], i) => {
    const n = trechos[i].length;
    definir(atual, chave, aplicarTraduzidos(msg, traduzidos.slice(cursor, cursor + n)));
    cursor += n;
    pendentes.add(chave);
  });
  // Chaves que não existem mais em português saem do idioma e da lista de revisão.
  const validas = new Set(origem.map(([c]) => c));
  revisao[locale] = [...pendentes].filter((c) => validas.has(c)).sort();
  gravar(arquivo(locale), atual);
  console.log(`${locale}: ${fazer.length} texto(s) traduzido(s) (${IDIOMAS[locale].deepl}); ${revisao[locale].length} aguardando revisão.`);
}

gravar("messages/revisao.json", revisao);
console.log(`Pronto (${provedor.nome}). Caracteres enviados nesta rodada: ${caracteres}. Revise em messages/revisao.json.`);
