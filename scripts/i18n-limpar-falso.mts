// Apaga do banco do .env.local as traduções feitas pelo provedor falso (texto começando com "[es] ", "[de] "…). Use --contar para só contar.
// Uso: node --env-file=.env.local --import tsx scripts/i18n-limpar-falso.mts [--contar]
import { limparTraducoesFalsas } from "../e2e/limpar-traducoes";

const apenasContar = process.argv.includes("--contar");
const r = await limparTraducoesFalsas({ apenasContar });
console.log(apenasContar ? "Linhas com prefixo falso:" : "Linhas apagadas:", r);
process.exit(0);
