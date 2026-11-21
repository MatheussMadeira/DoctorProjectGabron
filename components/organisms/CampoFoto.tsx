"use client";

import { useState } from "react";
import { Button } from "../atoms/Button";
import { FotoDialog } from "./FotoDialog";
import styles from "../admin.module.css";

/** Foto opcional do formulário (prévia, enviar, trocar, remover). O arquivo vai para o Vercel Blob pelo FotoDialog; a descrição da foto vem do nome. */
export function CampoFoto({
  url,
  alt,
  aoMudar,
  nomeParaAlt,
  prefixoAlt = "Foto de",
  formato = "retrato",
  titulo = "Foto",
  inicial = "?",
  erro,
}: {
  url: string;
  alt: string;
  aoMudar: (foto: { url: string; alt: string }) => void;
  /** Nome usado na descrição da foto ("Foto de Maria"). */
  nomeParaAlt: string;
  prefixoAlt?: string;
  formato?: "retrato" | "paisagem";
  titulo?: string;
  inicial?: string;
  erro?: string;
}) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <input type="hidden" name="fotoUrl" value={url} />
      <input type="hidden" name="fotoAlt" value={alt} />
      <div className={styles.fotoRetrato}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia direta da foto no painel
          <img src={url} alt={alt || "Foto atual"} className={styles.fotoRetratoImg} />
        ) : (
          <div className={`${styles.fotoRetratoImg} ${styles.fotoRetratoVazia}`} aria-hidden="true">
            {inicial}
          </div>
        )}
        <div className={styles.pilhaCurta}>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAberta(true)}>
            {url ? "Trocar foto" : "Enviar foto"}
          </Button>
          {url && (
            <Button type="button" variant="ghost" size="sm" onClick={() => aoMudar({ url: "", alt: "" })}>
              Remover foto
            </Button>
          )}
          <span className={styles.nota}>{formato === "retrato" ? "Retrato vertical." : "Foto horizontal."} Você ajusta o enquadramento. A foto é opcional.</span>
          {erro && <p className="ap-hint ap-hint-error">{erro}</p>}
        </div>
      </div>
      <FotoDialog
        aberto={aberta}
        atual={{ url, alt: "" }}
        formato={formato}
        biblioteca={false}
        pedirDescricao={false}
        titulo={titulo}
        onFechar={() => setAberta(false)}
        onUsar={(f) => {
          aoMudar({ url: f.url, alt: nomeParaAlt.trim() ? `${prefixoAlt} ${nomeParaAlt.trim()}` : titulo });
          setAberta(false);
        }}
      />
    </>
  );
}
