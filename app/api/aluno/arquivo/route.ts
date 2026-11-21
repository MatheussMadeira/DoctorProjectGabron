import { eq } from "drizzle-orm";
import { db } from "@/db";
import { alunos } from "@/db/schema";
import { arquivoDoAluno, type TipoArquivo } from "@/lib/aluno-conteudo";
import { ARQUIVO_BLOB } from "@/lib/aluno-form";
import { ID_PREVIA } from "@/lib/aluno-conteudo";
import { alunoAtual } from "@/lib/aluno-sessao";
import { autorizar } from "@/lib/sessao";

/* Entrega os arquivos privados da área do aluno (PDF, imagens de caso e certificado). O endereço do Blob nunca vai para o navegador:
   a cada pedido o site confere a sessão e o acesso do aluno e repassa o arquivo. Sem sessão ou sem acesso, 404 (não diz se o arquivo existe). */
const TIPOS: TipoArquivo[] = ["material", "imagem", "certificado"];

const naoEncontrado = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") as TipoArquivo | null;
  const id = url.searchParams.get("id") ?? "";
  const indice = Number(url.searchParams.get("i") ?? 0);
  if (!tipo || !TIPOS.includes(tipo) || !/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(indice) || indice < 0) return naoEncontrado();

  // Prévia do ADMIN ("Ver como aluno"): ?previa=aluno:<id> ou ?previa=turma:<id>, só para quem gerencia a área do aluno.
  const previa = url.searchParams.get("previa");
  let aluno: { id: string; email: string; turmaIds?: string[] } | null = null;
  if (previa) {
    const m = /^(aluno|turma):([0-9a-f-]{36})$/i.exec(previa);
    if (!m || !(await autorizar("alunos:gerir")).ok) return naoEncontrado();
    if (m[1] === "turma") aluno = { id: ID_PREVIA, email: "", turmaIds: [m[2]] };
    else {
      const [a] = await db.select({ id: alunos.id, email: alunos.email }).from(alunos).where(eq(alunos.id, m[2]));
      aluno = a ?? null;
    }
  } else {
    aluno = await alunoAtual();
  }
  if (!aluno) return naoEncontrado();
  const arquivo = await arquivoDoAluno(aluno, tipo, id, indice);
  // Só se busca no nosso Blob (nada de endereço qualquer).
  if (!arquivo || !ARQUIVO_BLOB.test(arquivo.url)) return naoEncontrado();

  const origem = await fetch(arquivo.url, { cache: "no-store" }).catch(() => null);
  if (!origem?.ok || !origem.body) return naoEncontrado();
  const cabecalhos = new Headers({
    "Content-Type": origem.headers.get("content-type") ?? "application/octet-stream",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(arquivo.nome)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  });
  const tamanho = origem.headers.get("content-length");
  if (tamanho) cabecalhos.set("Content-Length", tamanho);
  return new Response(origem.body, { headers: cabecalhos });
}
