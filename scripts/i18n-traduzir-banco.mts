// Traduz com a DeepL o conteúdo que já está no banco (turmas, professores, galeria, horário, textos do curso e depoimentos) e ainda não tem
// tradução, ou cujo português mudou. Normalmente isso acontece ao salvar no admin; este script serve para o conteúdo que já existia.
// Uso: yarn i18n:traduzir-banco             → mostra o que falta traduzir (nada é enviado)
//      yarn i18n:traduzir-banco --aplicar   → traduz de verdade (gasta caracteres da cota da DeepL)
//      yarn i18n:traduzir-banco --aplicar --so turma,professor   → só essas entidades (turma, professor, foto, config, textoCurso, depoimento)
// Rascunhos já revisados por uma pessoa só são refeitos se o português mudou (regra de frescor).
import { db } from "../db";
import { configuracoes, depoimentos, fotosGaleria, professores, textosCurso, turmas } from "../db/schema";
import { ENTIDADES, type Entidade, type IdEntidade } from "../lib/i18n/campos";
import { provedorDeTraducao } from "../lib/i18n/deepl";
import { camposParaTraduzir, extrairTextos } from "../lib/i18n/estrutura";
import { IDIOMAS_TRADUZIDOS } from "../lib/i18n/idiomas";
import { lerTraducoes, traduzirEntidade } from "../lib/i18n/traduzir";

const aplicar = process.argv.includes("--aplicar");
const soArg = process.argv.indexOf("--so");
const so = soArg > 0 ? process.argv[soArg + 1].split(",") : null;

const provedor = provedorDeTraducao();
if (aplicar && !provedor) {
  console.error("Sem DEEPL_API_KEY no .env.local: nada a fazer. (A chave que termina em :fx usa o plano Free automaticamente.)");
  process.exit(1);
}

const fontes: Array<[Entidade, () => Promise<IdEntidade[]>]> = [
  ["turma", async () => (await db.select({ id: turmas.id }).from(turmas)).map((r) => r.id)],
  ["professor", async () => (await db.select({ id: professores.id }).from(professores)).map((r) => r.id)],
  ["foto", async () => (await db.select({ id: fotosGaleria.id }).from(fotosGaleria)).map((r) => r.id)],
  ["config", async () => (await db.select({ id: configuracoes.id }).from(configuracoes)).map((r) => r.id)],
  ["textoCurso", async () => (await db.select({ id: textosCurso.bloco }).from(textosCurso)).map((r) => r.id)],
  ["depoimento", async () => (await db.select({ id: depoimentos.id }).from(depoimentos)).map((r) => r.id)],
];

let registros = 0;
let comPendencia = 0;
let caracteres = 0;
let erros = 0;

for (const [entidade, ids] of fontes) {
  if (so && !so.includes(entidade)) continue;
  for (const id of await ids()) {
    registros++;
    const origem = await ENTIDADES[entidade].lerOrigem(id);
    if (!origem) continue;
    const existentes = new Map((await lerTraducoes(entidade, id)).map((l) => [l.locale, l]));
    let faltam = 0;
    for (const locale of IDIOMAS_TRADUZIDOS) {
      const campos = camposParaTraduzir(origem, existentes.get(locale));
      faltam += campos.length;
      caracteres += campos.reduce((n, c) => n + extrairTextos(origem[c], c).reduce((m, t) => m + t.length, 0), 0);
    }
    if (!faltam) continue;
    comPendencia++;
    if (!aplicar) {
      console.log(`  falta traduzir: ${entidade} ${id} (${faltam} campo(s) nos 6 idiomas)`);
      continue;
    }
    const r = await traduzirEntidade(entidade, id);
    const n = Object.keys(r.traduzidos).length;
    const e = Object.keys(r.erros).length;
    erros += e;
    console.log(`  ${entidade} ${id}: ${n} idioma(s) traduzido(s)${e ? `, ${e} com erro: ${JSON.stringify(r.erros)}` : ""}`);
  }
}

console.log(`\n${registros} registro(s) verificado(s); ${comPendencia} com tradução pendente (cerca de ${caracteres} caracteres a enviar nos 6 idiomas).`);
if (!aplicar && comPendencia) console.log("Nada foi enviado. Rode com --aplicar para traduzir.");
if (erros) process.exitCode = 1;
process.exit(process.exitCode ?? 0);
