import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { alunos, turmas } from "@/db/schema";
import { conteudoDoAluno, ID_PREVIA, materialDoAluno, type Quem } from "@/lib/aluno-conteudo";
import { comPrefixo, type Locale } from "@/lib/i18n/idiomas";
import type { Tradutor } from "@/lib/i18n/tradutor";
import { autorizar } from "@/lib/sessao";
import { AppLink } from "../atoms/AppLink";
import { TurmaPainel } from "./AreaDoAluno";
import { MaterialDoAluno } from "./MaterialDoAluno";
import styles from "./aluno.module.css";

/* "Ver como aluno": prévia da área do aluno para o ADMIN, só leitura. Ou "como o aluno X" (o que ele enxerga, com o certificado dele) ou
   "como um aluno da turma Y" (o conteúdo da turma, sem aluno de verdade). Não cria conta, não pede o aceite do aviso e não grava nada: o
   formulário de comentário nem aparece. Os arquivos saem por /api/aluno/arquivo?previa=..., que também confere que quem pede é ADMIN. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Parametros = Record<string, string | string[] | undefined>;

interface Sujeito {
  quem: Quem;
  /** Texto do aviso: "como Maria" ou "como um aluno da turma X". */
  rotulo: string;
  /** Parte da URL das páginas de prévia (?aluno=… ou ?turma=…) e o valor do `previa` da API de arquivos. */
  consulta: string;
  previaApi: string;
}

/** Só o ADMIN. Quem não é volta para a área do aluno; um alvo inexistente vira null. */
export async function sujeitoDaPrevia(params: Parametros, locale: Locale): Promise<Sujeito | null> {
  const auth = await autorizar("alunos:gerir");
  if (!auth.ok) redirect(comPrefixo(locale, "/sou-aluno"));
  const idAluno = String(params.aluno ?? "");
  const idTurma = String(params.turma ?? "");
  if (UUID.test(idAluno)) {
    const [a] = await db.select({ id: alunos.id, email: alunos.email, nome: alunos.nome }).from(alunos).where(eq(alunos.id, idAluno));
    return a ? { quem: { id: a.id, email: a.email }, rotulo: `como ${a.nome}`, consulta: `aluno=${a.id}`, previaApi: `aluno:${a.id}` } : null;
  }
  if (UUID.test(idTurma)) {
    const [t] = await db.select({ id: turmas.id, titulo: turmas.titulo, curto: turmas.tituloCurto }).from(turmas).where(eq(turmas.id, idTurma));
    return t ? { quem: { id: ID_PREVIA, email: "", turmaIds: [t.id] }, rotulo: `como um aluno da turma ${t.curto ?? t.titulo}`, consulta: `turma=${t.id}`, previaApi: `turma:${t.id}` } : null;
  }
  return null;
}

function Aviso({ rotulo }: { rotulo: string }) {
  return (
    <aside className={styles.previa} role="note">
      <strong>Prévia do ADMIN: você está vendo a área do aluno {rotulo}.</strong>
      <span>Somente leitura: nada do que você fizer aqui é salvo e não dá para comentar. Os alunos não são avisados.</span>
      <Link href="/admin/alunos" prefetch={false}>
        Voltar ao painel
      </Link>
    </aside>
  );
}

export async function PreviaDaArea({ locale, tr, searchParams }: { locale: Locale; tr: Tradutor; searchParams: Promise<Parametros> }) {
  const s = await sujeitoDaPrevia(await searchParams, locale);
  if (!s) return <p>Escolha um aluno ou uma turma em /admin/alunos para ver a área do aluno.</p>;
  const turmasDoAluno = await conteudoDoAluno(s.quem, locale);
  return (
    <div className={styles.painel}>
      <Aviso rotulo={s.rotulo} />
      {turmasDoAluno.length === 0 && <p>{tr("Aluno.semTurmas")}</p>}
      {turmasDoAluno.map((t) => (
        <TurmaPainel key={t.id} turma={t} locale={locale} tr={tr} hrefMaterial={(id) => `/sou-aluno/previa/material/${id}?${s.consulta}`} sufixoArquivo={`&previa=${s.previaApi}`} />
      ))}
    </div>
  );
}

export async function PreviaDoMaterial({ locale, tr, id, searchParams }: { locale: Locale; tr: Tradutor; id: string; searchParams: Promise<Parametros> }) {
  const s = await sujeitoDaPrevia(await searchParams, locale);
  if (!s) return <p>Escolha um aluno ou uma turma em /admin/alunos.</p>;
  const material = await materialDoAluno(s.quem, id, locale);
  if (!material) return <p>Este material não está visível para {s.rotulo.replace(/^como /, "")} (oculto, agendado ou de outra turma).</p>;
  return (
    <div className={styles.painel}>
      <Aviso rotulo={s.rotulo} />
      <MaterialDoAluno material={material} locale={locale} tr={tr} previa={{ voltar: `/sou-aluno/previa?${s.consulta}`, sufixoArquivo: `&previa=${s.previaApi}` }} />
      <AppLink href={`/sou-aluno/previa?${s.consulta}`}>{tr("Aluno.materialVoltar")}</AppLink>
    </div>
  );
}
