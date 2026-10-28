// Junta messages/_parcial/*.json (um arquivo por área, só pt-BR) em messages/pt-BR.json. Uso: node scripts/i18n-juntar.mjs
// pt-BR.json é a fonte dos textos fixos do site: os outros idiomas nascem dele (yarn i18n:traduzir).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pasta = "messages/_parcial";
mkdirSync(pasta, { recursive: true });
const saida = {};
const mesclar = (a, b, caminho = "") => {
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      a[k] = a[k] && typeof a[k] === "object" ? a[k] : {};
      mesclar(a[k], v, `${caminho}${k}.`);
    } else {
      if (k in a && JSON.stringify(a[k]) !== JSON.stringify(v)) console.warn(`aviso: ${caminho}${k} definido em mais de um arquivo`);
      a[k] = v;
    }
  }
};
if (existsSync(pasta)) for (const f of readdirSync(pasta).filter((x) => x.endsWith(".json")).sort()) mesclar(saida, JSON.parse(readFileSync(join(pasta, f), "utf8")));
writeFileSync("messages/pt-BR.json", JSON.stringify(saida, null, 2) + "\n");
console.log(`ok: messages/pt-BR.json (${Object.keys(saida).join(", ")})`);
