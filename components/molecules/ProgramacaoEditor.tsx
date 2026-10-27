"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ICON } from "@/lib/icon";
import type { DiaProgramacao } from "@/db/schema";
import { Button } from "../atoms/Button";
import { TextField } from "./TextField";
import styles from "../admin.module.css";

/** Editor da programação: dias, e em cada dia as atividades (horário, atividade, descrição, duração). Envia JSON no campo `name`. */
export function ProgramacaoEditor({ name, inicial }: { name: string; inicial: DiaProgramacao[] }) {
  const [dias, setDias] = useState<DiaProgramacao[]>(inicial);

  const trocarDia = (i: number, parte: Partial<DiaProgramacao>) => setDias((d) => d.map((x, k) => (k === i ? { ...x, ...parte } : x)));
  const trocarItem = (i: number, j: number, parte: Partial<DiaProgramacao["itens"][number]>) =>
    setDias((d) => d.map((x, k) => (k === i ? { ...x, itens: x.itens.map((it, m) => (m === j ? { ...it, ...parte } : it)) } : x)));

  return (
    <div className={styles.pilha}>
      <input type="hidden" name={name} value={JSON.stringify(dias)} />
      {dias.map((dia, i) => (
        <div key={i} className={styles.dia}>
          <TextField label={`Título do dia ${i + 1}`} value={dia.titulo} onChange={(e) => trocarDia(i, { titulo: e.target.value })} hint='Ex.: "Dia 1 · Sábado, 21 de novembro"' />
          {dia.itens.map((it, j) => (
            <div key={j} className={styles.item}>
              <TextField label="Horário" value={it.time ?? ""} onChange={(e) => trocarItem(i, j, { time: e.target.value })} />
              <TextField label="Atividade" value={it.title} onChange={(e) => trocarItem(i, j, { title: e.target.value })} />
              <TextField label="Descrição" value={it.description ?? ""} onChange={(e) => trocarItem(i, j, { description: e.target.value })} />
              <TextField label="Duração" value={it.duration ?? ""} onChange={(e) => trocarItem(i, j, { duration: e.target.value })} />
              <button type="button" className="ap-icon-btn ap-icon-danger" aria-label={`Remover a atividade ${j + 1} do dia ${i + 1}`} onClick={() => trocarDia(i, { itens: dia.itens.filter((_, m) => m !== j) })}>
                <Trash2 {...ICON} size={18} />
              </button>
            </div>
          ))}
          <div className={styles.botoes}>
            <Button type="button" variant="ghost" size="sm" icon={<Plus {...ICON} size={18} />} onClick={() => trocarDia(i, { itens: [...dia.itens, { title: "" }] })}>
              Adicionar atividade
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDias((d) => d.filter((_, k) => k !== i))}>
              Remover o dia {i + 1}
            </Button>
          </div>
        </div>
      ))}
      <div className={styles.botoes}>
        <Button type="button" variant="ghost" size="sm" icon={<Plus {...ICON} size={18} />} onClick={() => setDias((d) => [...d, { titulo: `Dia ${d.length + 1}`, itens: [{ title: "" }] }])}>
          Adicionar dia
        </Button>
      </div>
    </div>
  );
}
