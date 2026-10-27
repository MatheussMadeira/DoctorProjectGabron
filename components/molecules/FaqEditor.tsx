"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ICON } from "@/lib/icon";
import type { PerguntaFaq } from "@/db/schema";
import { Button } from "../atoms/Button";
import { TextField } from "./TextField";
import styles from "../admin.module.css";

/** Editor das perguntas frequentes. Envia JSON no campo `name`. */
export function FaqEditor({ name, inicial }: { name: string; inicial: PerguntaFaq[] }) {
  const [perguntas, setPerguntas] = useState<PerguntaFaq[]>(inicial);
  const trocar = (i: number, parte: Partial<PerguntaFaq>) => setPerguntas((p) => p.map((x, k) => (k === i ? { ...x, ...parte } : x)));

  return (
    <div className={styles.pilha}>
      <input type="hidden" name={name} value={JSON.stringify(perguntas)} />
      {perguntas.map((p, i) => (
        <div key={i} className={styles.dia}>
          <TextField label={`Pergunta ${i + 1}`} value={p.q} onChange={(e) => trocar(i, { q: e.target.value })} />
          <TextField label="Resposta" multiline rows={3} value={p.a} onChange={(e) => trocar(i, { a: e.target.value })} />
          <div className={styles.botoes}>
            <button type="button" className="ap-icon-btn ap-icon-danger" aria-label={`Remover a pergunta ${i + 1}`} onClick={() => setPerguntas((x) => x.filter((_, k) => k !== i))}>
              <Trash2 {...ICON} size={18} />
            </button>
          </div>
        </div>
      ))}
      <div className={styles.botoes}>
        <Button type="button" variant="ghost" size="sm" icon={<Plus {...ICON} size={18} />} onClick={() => setPerguntas((x) => [...x, { q: "", a: "" }])}>
          Adicionar pergunta
        </Button>
      </div>
    </div>
  );
}
