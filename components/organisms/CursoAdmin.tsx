"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { salvarCurso, type EstadoCurso } from "@/app/(painel)/admin/acoes-curso";
import { ICON } from "@/lib/icon";
import type { DadosDeTraducao } from "@/lib/i18n/admin";
import { BLOCOS, LIMITES_CURSO, type Bloco, type TextosDoCurso } from "@/lib/textos-curso-base";
import { Button } from "../atoms/Button";
import { Alert } from "../molecules/Alert";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { AdminCard } from "../molecules/AdminCard";
import { FotoDialog } from "./FotoDialog";
import { TraducoesAdmin } from "./TraducoesAdmin";
import styles from "../admin.module.css";

const ROTULO_BLOCO: Record<Bloco, string> = { topo: "Topo da home", proposta: "Proposta", pilares: "Pilares", numeros: "Números", valores: "Valores" };

/* Configurações › Curso: os textos editáveis do site (topo da home, proposta, pilares, números e valores). O português é editado aqui;
   as outras línguas saem da DeepL ao salvar e são revisadas na seção "Traduções" abaixo. */
export function CursoAdmin({ textos, traducoes }: { textos: TextosDoCurso; traducoes: Partial<Record<Bloco, DadosDeTraducao>> }) {
  const [d, setD] = useState<TextosDoCurso>(textos);
  const [estado, setEstado] = useState<EstadoCurso>({});
  const [salvando, iniciar] = useTransition();
  const [fotoAberta, setFotoAberta] = useState(false);
  const [blocoTraducao, setBlocoTraducao] = useState<Bloco>("topo");
  const erros = estado.erros ?? {};

  const topo = (campo: keyof TextosDoCurso["topo"], valor: string) => setD((x) => ({ ...x, topo: { ...x.topo, [campo]: valor } }));
  const mudarPilar = (i: number, campo: "titulo" | "texto", valor: string) => setD((x) => ({ ...x, pilares: { itens: x.pilares.itens.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)) } }));
  const moverPilar = (i: number, delta: -1 | 1) =>
    setD((x) => {
      const j = i + delta;
      if (j < 0 || j >= x.pilares.itens.length) return x;
      const itens = [...x.pilares.itens];
      [itens[i], itens[j]] = [itens[j], itens[i]];
      return { ...x, pilares: { itens } };
    });

  return (
    <div className={styles.pilha}>
      <form
        className={styles.pilha}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => setEstado(await salvarCurso(d)));
        }}
      >
        {estado.erro && (
          <Alert tone="danger" title="Não foi possível salvar">
            {estado.erro}
          </Alert>
        )}
        {estado.ok && (
          <Alert tone="success" title="Textos salvos">
            O site já mostra os novos textos. A DeepL preparou os rascunhos de tradução; revise abaixo.
          </Alert>
        )}

        <AdminCard titulo="Topo da home">
          <TextField label="Sobretítulo" value={d.topo.sobretitulo} onChange={(e) => topo("sobretitulo", e.target.value)} error={erros["topo.sobretitulo"]} />
          <TextField label="Título" value={d.topo.titulo} onChange={(e) => topo("titulo", e.target.value)} error={erros["topo.titulo"]} />
          <TextField label="Frase" multiline rows={3} value={d.topo.frase} onChange={(e) => topo("frase", e.target.value)} error={erros["topo.frase"]} />
          <div className={styles.fotoRetrato}>
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia direta no painel */}
            <img src={d.topo.fotoUrl} alt={d.topo.fotoAlt} className={styles.fotoRetratoImg} />
            <div className={styles.pilhaCurta}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setFotoAberta(true)}>
                Trocar foto
              </Button>
              <span className={styles.nota}>Retrato vertical. Você ajusta o enquadramento.</span>
              {(erros["topo.fotoUrl"] || erros["topo.fotoAlt"]) && <p className="ap-hint ap-hint-error">{erros["topo.fotoUrl"] ?? erros["topo.fotoAlt"]}</p>}
            </div>
          </div>
        </AdminCard>

        <AdminCard titulo="Proposta">
          {d.proposta.paragrafos.map((p, i) => (
            <TextField
              key={i}
              label={`Parágrafo ${i + 1}`}
              multiline
              rows={4}
              value={p}
              onChange={(e) => setD((x) => ({ ...x, proposta: { paragrafos: x.proposta.paragrafos.map((q, j) => (j === i ? e.target.value : q)) } }))}
              error={erros[`proposta.paragrafos.${i}`]}
            />
          ))}
        </AdminCard>

        <AdminCard titulo="Pilares">
          <p className={styles.nota}>
            De {LIMITES_CURSO.pilaresMin} a {LIMITES_CURSO.pilaresMax} pilares, na ordem em que aparecem. Na home entram os 3 primeiros.
          </p>
          {erros["pilares.itens"] && <p className="ap-hint ap-hint-error">{erros["pilares.itens"]}</p>}
          {d.pilares.itens.map((p, i) => (
            <div key={i} className={styles.cartaoItem}>
              <div className={styles.acoesLinha}>
                <span className={styles.galeriaPosicao}>Pilar {i + 1}</span>
                <button type="button" className={styles.iconeBotao} aria-label={`Subir o pilar ${i + 1}`} disabled={i === 0} onClick={() => moverPilar(i, -1)}>
                  <ArrowUp {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Descer o pilar ${i + 1}`} disabled={i === d.pilares.itens.length - 1} onClick={() => moverPilar(i, 1)}>
                  <ArrowDown {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Remover o pilar ${i + 1}`} disabled={d.pilares.itens.length <= LIMITES_CURSO.pilaresMin} onClick={() => setD((x) => ({ ...x, pilares: { itens: x.pilares.itens.filter((_, j) => j !== i) } }))}>
                  <Trash2 {...ICON} size={18} />
                </button>
              </div>
              <TextField label="Título" value={p.titulo} onChange={(e) => mudarPilar(i, "titulo", e.target.value)} error={erros[`pilares.itens.${i}.titulo`]} />
              <TextField label="Texto" multiline rows={2} value={p.texto} onChange={(e) => mudarPilar(i, "texto", e.target.value)} error={erros[`pilares.itens.${i}.texto`]} />
            </div>
          ))}
          <div>
            <Button type="button" variant="secondary" size="sm" disabled={d.pilares.itens.length >= LIMITES_CURSO.pilaresMax} onClick={() => setD((x) => ({ ...x, pilares: { itens: [...x.pilares.itens, { titulo: "", texto: "" }] } }))}>
              Adicionar pilar
            </Button>
          </div>
        </AdminCard>

        <AdminCard titulo="Números">
          <p className={styles.nota}>Os 4 números da faixa &quot;O curso em números&quot; da home.</p>
          {d.numeros.itens.map((n, i) => (
            <div key={i} className={styles.linha}>
              <TextField label={`Número ${i + 1}`} value={n.valor} onChange={(e) => setD((x) => ({ ...x, numeros: { itens: x.numeros.itens.map((m, j) => (j === i ? { ...m, valor: e.target.value } : m)) } }))} error={erros[`numeros.itens.${i}.valor`]} />
              <div className={styles.larga}>
                <TextField label="Rótulo" value={n.rotulo} onChange={(e) => setD((x) => ({ ...x, numeros: { itens: x.numeros.itens.map((m, j) => (j === i ? { ...m, rotulo: e.target.value } : m)) } }))} error={erros[`numeros.itens.${i}.rotulo`]} />
              </div>
            </div>
          ))}
        </AdminCard>

        <AdminCard titulo="Valores">
          <TextField label="Título" value={d.valores.titulo} onChange={(e) => setD((x) => ({ ...x, valores: { ...x.valores, titulo: e.target.value } }))} error={erros["valores.titulo"]} />
          <TextField label="Frase" multiline rows={3} value={d.valores.frase} onChange={(e) => setD((x) => ({ ...x, valores: { ...x.valores, frase: e.target.value } }))} error={erros["valores.frase"]} />
        </AdminCard>

        <div className={styles.rodape}>
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando e traduzindo…" : "Salvar textos do curso"}
          </Button>
        </div>
      </form>

      <FotoDialog
        aberto={fotoAberta}
        atual={{ url: d.topo.fotoUrl, alt: d.topo.fotoAlt }}
        formato="retrato"
        titulo="Foto do topo da home"
        onFechar={() => setFotoAberta(false)}
        onUsar={(f) => {
          setD((x) => ({ ...x, topo: { ...x.topo, fotoUrl: f.url, fotoAlt: f.alt } }));
          setFotoAberta(false);
        }}
      />

      <AdminCard titulo="Traduções dos textos do curso">
        <Select label="Bloco" value={blocoTraducao} onChange={(e) => setBlocoTraducao(e.target.value as Bloco)} options={BLOCOS.map((b) => ({ value: b, label: ROTULO_BLOCO[b] }))} />
        {traducoes[blocoTraducao] ? <TraducoesAdmin key={blocoTraducao} dados={traducoes[blocoTraducao]!} /> : <p className={styles.muted}>Salve os textos para gerar as traduções.</p>}
      </AdminCard>
    </div>
  );
}
