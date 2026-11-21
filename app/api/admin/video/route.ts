import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { autorizar } from "@/lib/sessao";

/* Envio de vídeo de feedback para o Cloudinary. O navegador envia o arquivo direto ao Cloudinary (um vídeo passa do limite de corpo das
   funções da Vercel); este Route Handler só assina o envio, e só para quem gerencia a Alumni. Precisa de CLOUDINARY_CLOUD_NAME,
   CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET. Sem elas, o painel avisa e o ADMIN cola um link do YouTube ou do Vimeo. */
const PASTA = "reabtoxin/alumni";
const FORMATOS = "mp4,webm,mov";

export async function POST() {
  const auth = await autorizar("alumni:gerir");
  if (!auth.ok) return NextResponse.json({ error: auth.erro }, { status: 403 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "O envio de vídeo ainda não está configurado (faltam as chaves do Cloudinary). Cole um link do YouTube ou do Vimeo." }, { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Os parâmetros assinados, em ordem alfabética, mais o segredo (nunca sai do servidor).
  const assinatura = createHash("sha1").update(`allowed_formats=${FORMATOS}&folder=${PASTA}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  return NextResponse.json({ cloudName, apiKey, timestamp, assinatura, pasta: PASTA, formatos: FORMATOS });
}
