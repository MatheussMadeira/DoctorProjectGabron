"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { itemVazio, type Campo, type Conteudo, type Foto } from "@/lib/site-secoes/campos";
import { ICON } from "@/lib/icon";
import { Button } from "../atoms/Button";
import { TextField } from "../molecules/TextField";
import { FotoDialog } from "../organisms/FotoDialog";
import styles from "./editor.module.css";

/* O painel da direita: um campo para cada item de CAMPOS[tipo] da seção selecionada, com rótulo, limite (contador), dica e erro. Tudo que muda
   vira `aoMudar(caminho, valor)`; o editor aplica no rascunho e a prévia acompanha na hora. */

type Mudar = (caminho: string, valor: unknown) => void;
type Erros = Record<string, string>;

function CampoFoto({ campo, valor, caminho, aoMudar, erros }: { campo: Extract<Campo, { tipo: "foto" }>; valor: Foto; caminho: string; aoMudar: Mudar; erros: Erros }) {
  const [aberto, setAberto] = useState(false);
  const f = valor ?? { url: "", alt: "" };
  return (
    <div className={styles.campoFoto}>
      <span className={styles.rotulo}>{campo.rotulo}</span>
      <div className={styles.fotoLinha}>
        {f.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia direta da foto no painel
          <img src={f.url} alt={f.alt || "Foto atual"} className={styles.fotoMiniatura} />
        ) : (
          <div className={`${styles.fotoMiniatura} ${styles.fotoVazia}`} aria-hidden="true" />
        )}
        <Button type="button" variant="secondary" size="sm" onClick={() => setAberto(true)}>
          {f.url ? "Trocar foto" : "Escolher foto"}
        </Button>
      </div>
      <TextField label="Descrição da foto" value={f.alt} onChange={(e) => aoMudar(caminho, { ...f, alt: e.target.value })} error={erros[`${caminho}.alt`]} hint={`Para leitor de tela. ${f.alt.length}/200`} />
      {(erros[`${caminho}.url`] || erros[caminho]) && <p className="ap-hint ap-hint-error">{erros[`${caminho}.url`] ?? erros[caminho]}</p>}
      <FotoDialog
        aberto={aberto}
        atual={{ url: f.url, alt: f.alt }}
        formato={campo.proporcao === "paisagem" ? "paisagem" : "retrato"}
        titulo={campo.rotulo}
        onFechar={() => setAberto(false)}
        onUsar={(nova) => {
          aoMudar(caminho, { url: nova.url, alt: nova.alt || f.alt });
          setAberto(false);
        }}
      />
    </div>
  );
}

export function CampoEditor({ campo, valor, caminho, aoMudar, erros }: { campo: Campo; valor: unknown; caminho: string; aoMudar: Mudar; erros: Erros }) {
  if (campo.tipo === "texto" || campo.tipo === "link") {
    const v = typeof valor === "string" ? valor : "";
    const max = campo.tipo === "texto" ? campo.max : 200;
    return (
      <TextField
        label={campo.rotulo}
        value={v}
        multiline={campo.tipo === "texto" && campo.multilinha}
        rows={campo.tipo === "texto" && campo.multilinha ? 4 : undefined}
        onChange={(e) => aoMudar(caminho, e.target.value)}
        error={erros[caminho]}
        hint={`${campo.dica ? `${campo.dica} · ` : ""}${v.length}/${max}`}
        data-campo={caminho}
      />
    );
  }
  if (campo.tipo === "foto") return <CampoFoto campo={campo} valor={valor as Foto} caminho={caminho} aoMudar={aoMudar} erros={erros} />;

  const itens = Array.isArray(valor) ? (valor as Conteudo[]) : [];
  const mover = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= itens.length) return;
    const novo = [...itens];
    [novo[i], novo[j]] = [novo[j], novo[i]];
    aoMudar(caminho, novo);
  };
  return (
    <fieldset className={styles.lista}>
      <legend className={styles.rotulo}>
        {campo.rotulo} <span className={styles.nota}>({campo.min === campo.max ? campo.min : `${campo.min} a ${campo.max}`})</span>
      </legend>
      {erros[caminho] && <p className="ap-hint ap-hint-error">{erros[caminho]}</p>}
      {itens.map((item, i) => (
        <div key={i} className={styles.item}>
          <div className={styles.itemTopo}>
            <strong>
              {campo.singular} {i + 1}
            </strong>
            <span className={styles.itemAcoes}>
              <button type="button" className={styles.iconeBotao} aria-label={`Subir ${campo.singular.toLowerCase()} ${i + 1}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                <ArrowUp {...ICON} size={16} />
              </button>
              <button type="button" className={styles.iconeBotao} aria-label={`Descer ${campo.singular.toLowerCase()} ${i + 1}`} disabled={i === itens.length - 1} onClick={() => mover(i, 1)}>
                <ArrowDown {...ICON} size={16} />
              </button>
              <button type="button" className={styles.iconeBotao} aria-label={`Remover ${campo.singular.toLowerCase()} ${i + 1}`} disabled={itens.length <= campo.min} onClick={() => aoMudar(caminho, itens.filter((_, j) => j !== i))}>
                <Trash2 {...ICON} size={16} />
              </button>
            </span>
          </div>
          {campo.itens.map((sub) => (
            <CampoEditor key={sub.chave} campo={sub} valor={item?.[sub.chave]} caminho={`${caminho}.${i}.${sub.chave}`} aoMudar={aoMudar} erros={erros} />
          ))}
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" disabled={itens.length >= campo.max} onClick={() => aoMudar(caminho, [...itens, itemVazio(campo.itens)])}>
        <Plus {...ICON} size={16} aria-hidden="true" /> Adicionar {campo.singular.toLowerCase()}
      </Button>
    </fieldset>
  );
}
