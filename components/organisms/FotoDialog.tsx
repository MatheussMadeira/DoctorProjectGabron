"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { Upload } from "lucide-react";
import { ICON } from "@/lib/icon";
import { BIBLIOTECA_FOTOS, FOTO_REGRAS } from "@/lib/fotos";
import { Button } from "../atoms/Button";
import { Alert } from "../molecules/Alert";
import { TextField } from "../molecules/TextField";
import styles from "../admin.module.css";

export interface FotoDialogProps {
  aberto: boolean;
  atual: { url: string; alt: string };
  onFechar: () => void;
  onUsar: (foto: { url: string; alt: string }) => void;
  /** Endereço do Route Handler que gera o token de envio (Vercel Blob). */
  enviarPara?: string;
}

/** Confere tipo, tamanho, largura e proporção antes de enviar. Devolve a mensagem de erro, ou null se serve. */
async function validarArquivo(arquivo: File): Promise<string | null> {
  if (!(FOTO_REGRAS.tipos as readonly string[]).includes(arquivo.type)) return "Use uma foto JPG ou WebP.";
  if (arquivo.size > FOTO_REGRAS.maxBytes) return "A foto passa de 5 MB. Reduza o arquivo e tente de novo.";
  const imagem = await createImageBitmap(arquivo).catch(() => null);
  if (!imagem) return "Não foi possível abrir esta imagem.";
  const { width, height } = imagem;
  imagem.close();
  if (width < FOTO_REGRAS.larguraMinima) return `A foto tem ${width} px de largura. Use uma de ${FOTO_REGRAS.larguraMinima} px ou mais.`;
  if (Math.abs(width / height - FOTO_REGRAS.proporcao) > FOTO_REGRAS.tolerancia) return `A foto tem proporção ${(width / height).toFixed(2)}:1. Corte no formato 16:10 (1,6:1) antes de enviar.`;
  return null;
}

export function FotoDialog({ aberto, atual, onFechar, onUsar, enviarPara = "/api/admin/foto" }: FotoDialogProps) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState(atual.url);
  const [alt, setAlt] = useState(atual.alt);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Abre e fecha o <dialog> nativo (foco preso dentro, Esc fecha) conforme a prop.
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberto && !d.open) {
      setUrl(atual.url);
      setAlt(atual.alt);
      setErro(null);
      d.showModal();
    }
    if (!aberto && d.open) d.close();
  }, [aberto, atual.url, atual.alt]);

  async function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    const problema = await validarArquivo(arquivo);
    if (problema) return setErro(problema);
    setEnviando(true);
    try {
      const blob = await upload(arquivo.name, arquivo, { access: "public", handleUploadUrl: enviarPara, contentType: arquivo.type });
      setUrl(blob.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErro(/token|BLOB|configur/i.test(msg) ? "O armazenamento de fotos ainda não está configurado (falta o BLOB_READ_WRITE_TOKEN na Vercel). Por enquanto, escolha uma foto da biblioteca." : "Não foi possível enviar a foto. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const podeUsar = !!url && alt.trim().length > 0 && !enviando;

  return (
    <dialog ref={dialogo} className={`${styles.dialogo} ${styles.dialogoLargo}`} aria-labelledby="dlg-foto-titulo" onClose={onFechar}>
      <div className={styles.dialogoCorpo}>
        <div className={styles.loginCabeca}>
          <p className="ap-eyebrow">Foto da turma</p>
          <h2 id="dlg-foto-titulo" className={styles.dialogoTitulo}>
            Trocar foto
          </h2>
        </div>

        <label className={styles.soltar} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void escolherArquivo(e.dataTransfer.files[0]); }}>
          <Upload {...ICON} size={28} className="ap-icon-accent" />
          <span className={styles.soltarTitulo}>{enviando ? "Enviando…" : "Arraste uma foto até aqui ou clique para escolher"}</span>
          <span className={styles.nota}>JPG ou WebP, formato 16:10, a partir de 1600 px de largura, até 5 MB.</span>
          <input type="file" accept="image/jpeg,image/webp" disabled={enviando} onChange={(e) => void escolherArquivo(e.target.files?.[0])} />
        </label>

        {erro && (
          <Alert tone="danger" title="Esta foto não pode ser usada">
            {erro}
          </Alert>
        )}

        <div className={styles.pilhaCurta}>
          <p className="ap-eyebrow">Ou escolha da biblioteca da marca</p>
          <div className={styles.biblioteca}>
            {BIBLIOTECA_FOTOS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={styles.miniatura}
                aria-pressed={url === f.src}
                aria-label={f.alt}
                onClick={() => {
                  setUrl(f.src);
                  setAlt(f.alt);
                  setErro(null);
                }}
              >
                <Image src={f.src} alt="" width={320} height={200} />
              </button>
            ))}
          </div>
        </div>

        <TextField label="Texto alternativo" required value={alt} onChange={(e) => setAlt(e.target.value)} hint="Descreva a foto para quem usa leitor de tela." />
        <Alert tone="info" title="Regras de publicidade médica">
          Sem fotos de pacientes, de antes e depois ou de resultados de procedimentos.
        </Alert>

        <div className={styles.rodape}>
          <Button type="button" variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" disabled={!podeUsar} onClick={() => onUsar({ url, alt: alt.trim() })}>
            Usar esta foto
          </Button>
        </div>
      </div>
    </dialog>
  );
}
