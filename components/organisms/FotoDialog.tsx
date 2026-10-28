"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "@/components/atoms/ImagemSegura";
import Cropper from "react-easy-crop";
import { upload } from "@vercel/blob/client";
import { Upload } from "lucide-react";
import { ICON } from "@/lib/icon";
import { BIBLIOTECA_FOTOS, FOTO_REGRAS, FORMATOS_FOTO, MENSAGENS_FOTO, recorteEhPequeno, tipoAceito, type FormatoFoto } from "@/lib/fotos";
import { abrirFoto, ErroDeFoto, prepararFoto, type AreaDoRecorte, type FotoPreparada } from "@/lib/foto-cliente";
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
  /** "paisagem" (16:10, turma) ou "retrato" (4:5, professor). */
  formato?: Exclude<FormatoFoto, "livre">;
  /** Mostra a biblioteca da marca (só faz sentido para a foto da turma). */
  biblioteca?: boolean;
  /** Pede o texto alternativo no diálogo (a foto do professor usa "Foto de <nome>"). */
  pedirDescricao?: boolean;
  titulo?: string;
}

type Etapa = "escolher" | "ajustar";

/** Foto aberta para ajuste: a imagem que o navegador sabe mostrar e o endereço temporário dela. */
interface Aberta {
  url: string;
  imagem: HTMLImageElement;
}

/* Fluxo: escolher a foto (ou da biblioteca) → ajustar o enquadramento (moldura fixa, arrastável, com zoom e teclado)
   → o navegador recorta, reduz, converte para WebP e tira os metadados → só esse arquivo final vai para o Blob. */
export function FotoDialog({ aberto, atual, onFechar, onUsar, enviarPara = "/api/admin/foto", formato = "paisagem", biblioteca = true, pedirDescricao = true, titulo = "Trocar foto" }: FotoDialogProps) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState(atual.url);
  const [alt, setAlt] = useState(atual.alt);
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("escolher");
  const [aberta, setAberta] = useState<Aberta | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [posicao, setPosicao] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<AreaDoRecorte | null>(null);
  const [enviando, setEnviando] = useState(false);
  /** Foto já recortada que espera a resposta ao aviso de "foto pequena". */
  const [pequena, setPequena] = useState<FotoPreparada | null>(null);

  const descartarAberta = useCallback(() => {
    setAberta((a) => {
      if (a) URL.revokeObjectURL(a.url);
      return null;
    });
    setArea(null);
    setPequena(null);
    setPosicao({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // Abre e fecha o <dialog> nativo (foco preso dentro, Esc fecha) conforme a prop.
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberto && !d.open) {
      setUrl(atual.url);
      setAlt(atual.alt);
      setErro(null);
      setEtapa("escolher");
      descartarAberta();
      d.showModal();
    }
    if (!aberto && d.open) d.close();
  }, [aberto, atual.url, atual.alt, descartarAberta]);

  async function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    if (!tipoAceito(arquivo)) return setErro(MENSAGENS_FOTO.tipoInvalido);
    if (arquivo.size > FOTO_REGRAS.maxOriginalBytes) return setErro(MENSAGENS_FOTO.grandeDemais);
    setAbrindo(true);
    try {
      descartarAberta();
      setAberta(await abrirFoto(arquivo));
      setEtapa("ajustar");
    } catch (e) {
      setErro(e instanceof ErroDeFoto ? e.message : MENSAGENS_FOTO.naoAbriu);
    } finally {
      setAbrindo(false);
    }
  }

  async function enviarPreparada(foto: FotoPreparada) {
    setEnviando(true);
    try {
      const blob = await upload(`${formato === "retrato" ? "professor" : "turma"}-${Date.now()}.webp`, foto.blob, { access: "public", handleUploadUrl: enviarPara, contentType: FOTO_REGRAS.tipoFinal });
      setUrl(blob.url);
      descartarAberta();
      setEtapa("escolher");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErro(/token|BLOB|configur/i.test(msg) ? MENSAGENS_FOTO.semArmazenamento : MENSAGENS_FOTO.naoEnviou);
      setPequena(null);
    } finally {
      setEnviando(false);
    }
  }

  /** "Usar este enquadramento": prepara a foto (recorta, reduz, converte) e envia; foto pequena pede confirmação antes. */
  async function aplicarRecorte() {
    if (!aberta || !area) return;
    setErro(null);
    setEnviando(true);
    try {
      const foto = await prepararFoto(aberta.imagem, area, formato);
      if (recorteEhPequeno(foto.larguraDoRecorte, formato)) {
        setPequena(foto);
        setEnviando(false);
        return;
      }
      await enviarPreparada(foto);
    } catch (e) {
      setErro(e instanceof ErroDeFoto ? e.message : MENSAGENS_FOTO.naoPreparou);
      setEnviando(false);
    }
  }

  const ocupado = enviando || abrindo;
  const podeUsar = !!url && (!pedirDescricao || alt.trim().length > 0) && !ocupado;

  return (
    <dialog ref={dialogo} className={`${styles.dialogo} ${styles.dialogoLargo}`} aria-labelledby="dlg-foto-titulo" onClose={onFechar}>
      <div className={styles.dialogoCorpo}>
        <div className={styles.loginCabeca}>
          <p className="ap-eyebrow">Foto da turma</p>
          <h2 id="dlg-foto-titulo" className={styles.dialogoTitulo}>
            {titulo}
          </h2>
          <p className={styles.muted}>Escolha uma foto e ajuste o enquadramento.</p>
        </div>

        {erro && (
          <Alert tone="danger" title="Esta foto não pode ser usada">
            {erro}
          </Alert>
        )}

        {etapa === "escolher" && (
          <>
            <label
              className={styles.soltar}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void escolherArquivo(e.dataTransfer.files[0]);
              }}
            >
              <Upload {...ICON} size={28} className="ap-icon-accent" />
              <span className={styles.soltarTitulo}>{abrindo ? "Abrindo a foto…" : "Arraste uma foto até aqui ou clique para escolher"}</span>
              <span className={styles.nota}>Pode ser do celular ou do computador (JPG, PNG ou HEIC do iPhone). A gente ajusta o tamanho.</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                disabled={ocupado}
                onChange={(e) => {
                  void escolherArquivo(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>

            {biblioteca && (
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
            )}

            {url && !BIBLIOTECA_FOTOS.some((f) => f.src === url) && (
              <div className={styles.pilhaCurta}>
                <p className="ap-eyebrow">Foto enviada</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- prévia direta do arquivo recém-enviado */}
                <img src={url} alt="Prévia da foto enviada" className={styles.previaFoto} style={{ aspectRatio: formato === "retrato" ? "4 / 5" : undefined, maxWidth: formato === "retrato" ? 240 : undefined }} />
              </div>
            )}

            {pedirDescricao && <TextField label="Texto alternativo" required value={alt} onChange={(e) => setAlt(e.target.value)} hint="Descreva a foto para quem usa leitor de tela." />}
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
          </>
        )}

        {etapa === "ajustar" && aberta && (
          <>
            <div className={styles.recorte} data-testid="recorte">
              <Cropper
                image={aberta.url}
                crop={posicao}
                zoom={zoom}
                minZoom={1}
                maxZoom={4}
                aspect={FORMATOS_FOTO[formato].proporcao}
                keyboardStep={10}
                onCropChange={setPosicao}
                onZoomChange={setZoom}
                onCropComplete={(_percentual, pixels) => setArea(pixels)}
              />
            </div>
            <p className={styles.nota}>Arraste a foto para escolher o enquadramento, ou clique nela e use as setas do teclado. A moldura é fixa.</p>
            <div className={styles.zoom}>
              <label htmlFor="foto-zoom">Aproximar</label>
              <input id="foto-zoom" type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} disabled={ocupado} />
            </div>

            {pequena && (
              <Alert tone="warning" title="Foto pequena">
                {MENSAGENS_FOTO.pequena}
              </Alert>
            )}

            <div className={styles.rodape}>
              <Button
                type="button"
                variant="ghost"
                disabled={ocupado}
                onClick={() => {
                  descartarAberta();
                  setEtapa("escolher");
                }}
              >
                Escolher outra foto
              </Button>
              {pequena ? (
                <Button type="button" disabled={ocupado} onClick={() => void enviarPreparada(pequena)}>
                  {enviando ? "Enviando…" : "Usar mesmo assim"}
                </Button>
              ) : (
                <Button type="button" disabled={ocupado || !area} onClick={() => void aplicarRecorte()}>
                  {enviando ? "Preparando a foto…" : "Usar este enquadramento"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
