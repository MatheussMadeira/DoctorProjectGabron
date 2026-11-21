import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { autorizar } from "@/lib/sessao";

/* Envio de arquivos da área do aluno (PDF, imagens de caso, certificados) para o Vercel Blob. O navegador envia direto ao Blob (um PDF passa do
   limite de corpo das funções da Vercel); este Route Handler só gera o token, e só para o ADMIN. O endereço fica no banco e NUNCA vai para
   o navegador do aluno: o site entrega o arquivo por /api/aluno/arquivo, depois de conferir a sessão. */
const TIPOS = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function POST(request: Request) {
  const corpo = (await request.json()) as HandleUploadBody;
  try {
    const resposta = await handleUpload({
      body: corpo,
      request,
      onBeforeGenerateToken: async () => {
        const auth = await autorizar("alunos:gerir");
        if (!auth.ok) throw new Error(auth.erro);
        return { allowedContentTypes: TIPOS, maximumSizeInBytes: 25 * 1024 * 1024, addRandomSuffix: true, tokenPayload: JSON.stringify({ usuarioId: auth.usuario.id }) };
      },
    });
    return NextResponse.json(resposta);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao preparar o envio." }, { status: 400 });
  }
}
