"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Button } from "../atoms/Button";
import styles from "../admin.module.css";

/** Envia um PDF ou uma imagem para o Vercel Blob (direto do navegador; /api/admin/material só autoriza). Devolve o endereço e o nome do arquivo. */
export function CampoArquivo({
  rotulo,
  aceitar,
  aoEnviar,
  desabilitado = false,
}: {
  rotulo: string;
  aceitar: "pdf" | "imagem";
  aoEnviar: (arquivo: { url: string; nome: string }) => void;
  desabilitado?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File) {
    setErro(null);
    if (arquivo.size > 25 * 1024 * 1024) return setErro("O arquivo passa de 25 MB.");
    try {
      setProgresso(0);
      const nome = arquivo.name.replace(/[^\w.\-]+/g, "-").slice(-80) || "arquivo";
      const blob = await upload(`aluno/${nome}`, arquivo, { access: "public", handleUploadUrl: "/api/admin/material", contentType: arquivo.type, onUploadProgress: (p) => setProgresso(Math.round(p.percentage)) });
      aoEnviar({ url: blob.url, nome: arquivo.name });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setProgresso(null);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className={styles.pilhaCurta}>
      <input ref={entrada} type="file" hidden accept={aceitar === "pdf" ? "application/pdf" : "image/png,image/jpeg,image/webp"} onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
      <Button type="button" variant="secondary" size="sm" disabled={desabilitado || progresso !== null} onClick={() => entrada.current?.click()}>
        {progresso !== null ? `Enviando… ${progresso}%` : rotulo}
      </Button>
      {erro && <p className="ap-hint ap-hint-error">{erro}</p>}
    </div>
  );
}
