"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ICON } from "@/lib/icon";
import { Checkbox } from "../atoms/Checkbox";
import styles from "../admin.module.css";

export interface ProfessorOpcao {
  id: string;
  nome: string;
  funcao: string;
  visivel: boolean;
}

/** Editar turma › Professores desta turma: marca quem conduz e define a ordem (sobe/desce). Envia os campos `professorId` na ordem da tela. */
export function ProfessoresDaTurma({ todos, selecionados }: { todos: ProfessorOpcao[]; selecionados: string[] }) {
  const [ordem, setOrdem] = useState<string[]>(selecionados);
  const porId = new Map(todos.map((p) => [p.id, p]));
  const marcados = ordem.filter((id) => porId.has(id));
  const livres = todos.filter((p) => !marcados.includes(p.id));

  const alternar = (id: string, ligado: boolean) => setOrdem((atual) => (ligado ? [...atual.filter((x) => x !== id), id] : atual.filter((x) => x !== id)));
  const mover = (id: string, d: -1 | 1) =>
    setOrdem((atual) => {
      const i = atual.indexOf(id);
      const j = i + d;
      if (i < 0 || j < 0 || j >= atual.length) return atual;
      const copia = [...atual];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  if (!todos.length) return <p className={styles.muted}>Nenhum professor cadastrado ainda. O cadastro fica em Configurações › Professores.</p>;

  return (
    <div className={styles.profTurma}>
      {marcados.map((id, i) => {
        const p = porId.get(id)!;
        return (
          <div key={id} className={styles.profTurmaLinha}>
            <Checkbox label={p.nome} hint={p.visivel ? `${i + 1}º · ${p.funcao}` : `${i + 1}º · ${p.funcao} · Oculto no site`} checked onChange={() => alternar(id, false)} />
            <input type="hidden" name="professorId" value={id} />
            <div className={styles.acoesLinha}>
              <button type="button" className={styles.iconeBotao} aria-label={`Subir ${p.nome}`} disabled={i === 0} onClick={() => mover(id, -1)}>
                <ArrowUp {...ICON} size={18} />
              </button>
              <button type="button" className={styles.iconeBotao} aria-label={`Descer ${p.nome}`} disabled={i === marcados.length - 1} onClick={() => mover(id, 1)}>
                <ArrowDown {...ICON} size={18} />
              </button>
            </div>
          </div>
        );
      })}
      {livres.map((p) => (
        <Checkbox key={p.id} label={p.nome} hint={p.visivel ? p.funcao : `${p.funcao} · Oculto no site`} checked={false} onChange={() => alternar(p.id, true)} />
      ))}
    </div>
  );
}
