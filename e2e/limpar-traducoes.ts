import { sql } from "drizzle-orm";
import { db } from "../db";
import { configuracoesTraducoes, depoimentosTraducoes, fotosGaleriaTraducoes, professoresTraducoes, textosCursoTraducoes, turmasTraducoes } from "../db/schema";

/* O provedor falso dos testes escreve "[es] texto" no banco. Isto apaga toda linha de tradução com esse prefixo (nunca mexe em tradução real). */
const TABELAS = { turmas: turmasTraducoes, professores: professoresTraducoes, galeria: fotosGaleriaTraducoes, configuracoes: configuracoesTraducoes, textosCurso: textosCursoTraducoes, depoimentos: depoimentosTraducoes };
const PREFIXO_FALSO = String.raw`\[(en|es|fr|it|de|zh)\] `;

export async function limparTraducoesFalsas(opcoes: { apenasContar?: boolean } = {}): Promise<Record<string, number>> {
  const saida: Record<string, number> = {};
  for (const [nome, tabela] of Object.entries(TABELAS)) {
    const onde = sql`${tabela.conteudo}::text ~ ${PREFIXO_FALSO}`;
    if (opcoes.apenasContar) {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(tabela).where(onde);
      saida[nome] = n;
    } else {
      const apagadas = await db.delete(tabela).where(onde).returning({ locale: tabela.locale });
      saida[nome] = apagadas.length;
    }
  }
  return saida;
}

/** globalTeardown do Playwright: nenhum teste deixa tradução de mentira no banco. */
export default async function limpar() {
  await limparTraducoesFalsas();
}
