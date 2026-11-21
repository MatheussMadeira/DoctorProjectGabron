"use client";

import { useRef, useState } from "react";
import { interpretarVideo } from "@/lib/video";
import { Button } from "../atoms/Button";
import { TextField } from "../molecules/TextField";
import styles from "../admin.module.css";

/** Vídeo de feedback: link do YouTube/Vimeo, ou envio de um arquivo MP4 direto para o Cloudinary (o navegador envia; o servidor só assina). */
export function CampoVideo({
  url,
  legenda,
  aoMudar,
  erros = {},
}: {
  url: string;
  legenda: string;
  aoMudar: (parcial: { url?: string; legenda?: string }) => void;
  erros?: Record<string, string>;
}) {
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const info = interpretarVideo(url);

  async function enviar(arquivo: File) {
    setErroEnvio(null);
    if (arquivo.size > 100 * 1024 * 1024) return setErroEnvio("O vídeo passa de 100 MB. Comprima o arquivo ou use um link do YouTube/Vimeo.");
    try {
      const resp = await fetch("/api/admin/video", { method: "POST" });
      const dados = (await resp.json()) as { error?: string; cloudName: string; apiKey: string; timestamp: number; assinatura: string; pasta: string; formatos: string };
      if (!resp.ok) return setErroEnvio(dados.error ?? "Não foi possível preparar o envio.");
      const corpo = new FormData();
      corpo.append("file", arquivo);
      corpo.append("api_key", dados.apiKey);
      corpo.append("timestamp", String(dados.timestamp));
      corpo.append("signature", dados.assinatura);
      corpo.append("folder", dados.pasta);
      corpo.append("allowed_formats", dados.formatos);
      const link = await new Promise<string>((resolver, rejeitar) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${dados.cloudName}/video/upload`);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgresso(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText) as { secure_url?: string; error?: { message: string } };
            if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) resolver(json.secure_url);
            else rejeitar(new Error(json.error?.message ?? "O Cloudinary recusou o arquivo."));
          } catch {
            rejeitar(new Error("Resposta inesperada do Cloudinary."));
          }
        };
        xhr.onerror = () => rejeitar(new Error("Falha de conexão durante o envio."));
        setProgresso(0);
        xhr.send(corpo);
      });
      aoMudar({ url: link });
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : "Não foi possível enviar o vídeo.");
    } finally {
      setProgresso(null);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className={styles.pilhaCurta}>
      <TextField
        label="Vídeo (opcional)"
        name="videoUrl"
        type="url"
        value={url}
        onChange={(e) => aoMudar({ url: e.target.value })}
        error={erros.videoUrl}
        hint="Cole um link do YouTube ou do Vimeo, ou envie um arquivo MP4 abaixo."
      />
      <div className={styles.pilhaCurta}>
        <input ref={entrada} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
        <Button type="button" variant="secondary" size="sm" disabled={progresso !== null} onClick={() => entrada.current?.click()}>
          {progresso !== null ? `Enviando… ${progresso}%` : "Enviar arquivo de vídeo"}
        </Button>
        <span className={styles.nota}>MP4, WebM ou MOV, até 100 MB. O arquivo vai para o Cloudinary.</span>
        {erroEnvio && <p className="ap-hint ap-hint-error">{erroEnvio}</p>}
        {url && info && <span className={styles.nota}>Vídeo reconhecido: {info.tipo === "arquivo" ? "arquivo de vídeo" : info.tipo === "youtube" ? "YouTube" : "Vimeo"}.</span>}
        {url && (
          <Button type="button" variant="ghost" size="sm" onClick={() => aoMudar({ url: "", legenda: "" })}>
            Remover vídeo
          </Button>
        )}
      </div>
      {info?.tipo === "arquivo" && (
        <TextField
          label="Legenda (opcional)"
          name="videoLegendaUrl"
          type="url"
          value={legenda}
          onChange={(e) => aoMudar({ legenda: e.target.value })}
          error={erros.videoLegendaUrl}
          hint="Endereço de um arquivo .vtt (legenda em português). Quem usa leitor de tela ou assiste sem som agradece."
        />
      )}
    </div>
  );
}
