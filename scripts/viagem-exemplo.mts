// Cadastra a Travel info de exemplo (local do curso, hotel, restaurante, turismo e "Como chegar") SE as tabelas estiverem vazias.
// Seguro em qualquer banco: nunca apaga nada. A equipe troca os exemplos pelos dados de verdade em /admin/viagem.
// Uso: yarn viagem:exemplo
import { db } from "../db";
import { viagemChegada, viagemLocais } from "../db/schema";
import { VIAGEM_CHEGADA_EXEMPLO, VIAGEM_LOCAIS_EXEMPLO } from "../lib/dados-exemplo";

const jaTem = (await db.select({ id: viagemLocais.id }).from(viagemLocais).limit(1)).length > 0;
if (jaTem) {
  console.log("Já existem locais cadastrados: nada a fazer.");
} else {
  const locais = await db.insert(viagemLocais).values(VIAGEM_LOCAIS_EXEMPLO.map((l) => ({ ...l }))).returning({ id: viagemLocais.id });
  const itens = await db.insert(viagemChegada).values(VIAGEM_CHEGADA_EXEMPLO.map((c) => ({ ...c }))).returning({ id: viagemChegada.id });
  console.log(`Exemplo cadastrado: ${locais.length} locais e ${itens.length} itens de "Como chegar". Para traduzir: yarn i18n:traduzir-banco --aplicar --so localViagem,chegadaViagem`);
}
process.exit(0);
