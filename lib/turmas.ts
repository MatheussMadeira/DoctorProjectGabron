import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq, getTableColumns, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  inscricoes,
  SITUACOES_QUE_OCUPAM,
  turmas,
  type DiaProgramacao,
  type Modalidade,
  type PerguntaFaq,
  type Publicacao,
} from "@/db/schema";
import type { EventStatus } from "./agenda";
import { formatarPreco } from "./preco";
import { calcularStatus } from "./status";

/** Turma pronta para as páginas: dados + vagas e status calculados. */
export interface Turma {
  id: string;
  slug: string;
  titulo: string;
  /** Versão curta para faixas de chamada ("Módulo essencial"). */
  tituloCurto: string;
  resumo: string;
  descricao: string[];
  modalidade: "Presencial" | "Online";
  publicacao: Publicacao;
  inicio: string;
  fim?: string;
  horario: string;
  /** Presencial: "Belo Horizonte, MG". Online: "Ao vivo". */
  cidade: string;
  local?: string;
  vagas: number;
  /** Inscrições ocupadas (aguardando pagamento, registro a conferir ou confirmada). */
  ocupadas: number;
  vagasLivres: number;
  /** Texto de exibição do preço. */
  preco: string;
  parcelamento?: string;
  fotoUrl: string;
  fotoAlt: string;
  publicoAlvo: string[];
  aprendizados: string[];
  programacao: DiaProgramacao[];
  faq: PerguntaFaq[];
  status: EventStatus;
}

/* Tags de cache (ver "Cache e invalidação" na especificação):
   - `turmas`: listas e criação/exclusão de turmas;
   - `turma:<slug>`: uma turma e a contagem das suas vagas.
   Em Server Actions, invalide com updateTag(tag). Fora delas (Route Handlers, webhooks), com
   revalidateTag(tag, { expire: 0 }). Nunca use o perfil "max": ele serve vagas desatualizadas. */
export const TAG_TURMAS = "turmas";
export const tagTurma = (slug: string) => `turma:${slug}`;


const MODALIDADE: Record<Modalidade, Turma["modalidade"]> = { PRESENCIAL: "Presencial", ONLINE: "Online" };

const ocupadasSql = sql<number>`count(${inscricoes.id}) filter (where ${inArray(inscricoes.situacao, SITUACOES_QUE_OCUPAM)})::int`;

/** Turmas visíveis no site (não excluídas, fora de rascunho) com a contagem de vagas ocupadas. */
async function consultar(slug?: string): Promise<Turma[]> {
  const linhas = await db
    .select({ ...getTableColumns(turmas), ocupadas: ocupadasSql })
    .from(turmas)
    .leftJoin(inscricoes, eq(inscricoes.turmaId, turmas.id))
    .where(and(isNull(turmas.excluidaEm), ne(turmas.publicacao, "RASCUNHO"), slug ? eq(turmas.slug, slug) : undefined))
    .groupBy(turmas.id)
    .orderBy(asc(turmas.inicio), asc(turmas.slug));

  return linhas.flatMap((l) => {
    const status = calcularStatus({ publicacao: l.publicacao, inicio: l.inicio, fim: l.fim, vagas: l.vagas, ocupadas: l.ocupadas });
    if (!status) return [];
    const turma: Turma = {
      id: l.id,
      slug: l.slug,
      titulo: l.titulo,
      tituloCurto: l.tituloCurto ?? l.titulo,
      resumo: l.resumo,
      descricao: l.descricao.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
      modalidade: MODALIDADE[l.modalidade],
      publicacao: l.publicacao,
      inicio: l.inicio,
      fim: l.fim ?? undefined,
      horario: l.horario,
      cidade: l.cidade,
      local: l.local ?? undefined,
      vagas: l.vagas,
      ocupadas: l.ocupadas,
      vagasLivres: Math.max(0, l.vagas - l.ocupadas),
      preco: formatarPreco(l.precoCentavos),
      parcelamento: l.parcelamento ?? undefined,
      fotoUrl: l.fotoUrl,
      fotoAlt: l.fotoAlt,
      publicoAlvo: l.publicoAlvo,
      aprendizados: l.aprendizados,
      programacao: l.programacao,
      faq: l.faq,
      status,
    };
    return [turma];
  });
}

/** Todas as turmas publicadas, da data mais próxima para a mais distante. */
export async function listarTurmas(): Promise<Turma[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAG_TURMAS);
  const lista = await consultar();
  // A lista mostra as vagas de cada turma, então também depende da tag de cada uma.
  lista.forEach((t) => cacheTag(tagTurma(t.slug)));
  return lista;
}

/** Uma turma publicada pelo slug, ou null (a página responde 404). */
export async function obterTurma(slug: string): Promise<Turma | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tagTurma(slug));
  return (await consultar(slug))[0] ?? null;
}

/** As próximas turmas publicadas e não encerradas, por data (Início). */
export async function listarProximas(limite = 3): Promise<Turma[]> {
  return (await listarTurmas()).filter((t) => t.status !== "encerrado").slice(0, limite);
}

/** A próxima turma com inscrições abertas (faixa de chamada do Início e do Sobre). */
export async function proximaComInscricoesAbertas(): Promise<Turma | undefined> {
  return (await listarTurmas()).find((t) => t.status === "aberto" || t.status === "ultimas");
}

/** Slugs para `generateStaticParams`. */
export async function listarSlugs(): Promise<string[]> {
  return (await listarTurmas()).map((t) => t.slug);
}
