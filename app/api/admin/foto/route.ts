import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { FOTO_REGRAS } from "@/lib/fotos";
import { autorizar } from "@/lib/sessao";

/* Envio de foto da turma para o Vercel Blob. O navegador envia o arquivo direto ao Blob (fotos de até 5 MB passam
   do limite de corpo das funções da Vercel); este Route Handler só gera o token, e só para quem pode editar turmas.
   Precisa de BLOB_READ_WRITE_TOKEN (crie um Blob store no projeto da Vercel). */
export async function POST(request: Request) {
  const corpo = (await request.json()) as HandleUploadBody;
  try {
    const resposta = await handleUpload({
      body: corpo,
      request,
      onBeforeGenerateToken: async () => {
        const auth = await autorizar("turma:editar");
        if (!auth.ok) throw new Error(auth.erro);
        return {
          // Só o arquivo final (WebP já recortado e reduzido pelo navegador): qualquer outra coisa é recusada aqui.
          allowedContentTypes: [FOTO_REGRAS.tipoFinal],
          maximumSizeInBytes: FOTO_REGRAS.maxFinalBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ usuarioId: auth.usuario.id }),
        };
      },
      // Sem onUploadCompleted de propósito: a URL só entra no banco quando a turma é salva, e o callback exigiria
      // uma URL pública (falha em localhost, "no callbackUrl could be determined").
    });
    return NextResponse.json(resposta);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao preparar o envio." }, { status: 400 });
  }
}
