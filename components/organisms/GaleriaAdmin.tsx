"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { Upload } from "lucide-react";
import { ICON } from "@/lib/icon";
import { salvarGaleria } from "@/app/(painel)/admin/acoes-professores";
import type { FotoGaleriaAdmin } from "@/lib/admin-professores";
import { abrirFoto, ErroDeFoto, prepararFoto } from "@/lib/foto-cliente";
import { FOTO_REGRAS, MENSAGENS_FOTO, tipoAceito } from "@/lib/fotos";
import { Button } from "../atoms/Button";
import type { DadosDeTraducao } from "@/lib/i18n/admin";
import { Alert } from "../molecules/Alert";
import { TraducoesAdmin } from "./TraducoesAdmin";
import { TextField } from "../molecules/TextField";
import styles from "../admin.module.css";

/* Configurações › Galeria: várias fotos de uma vez, descrição obrigatória em cada uma, ordem e remoção.
   O navegador prepara cada foto (reduz, converte para WebP, tira EXIF e GPS) antes de enviar; só o WebP final vai para o Blob. */

interface Item {
  chave: string;
  url: string;
  alt: string;
}

let contador = 0;
const novaChave = () => `f${Date.now()}-${++contador}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function GaleriaAdmin({ fotos: iniciais, enviarPara = "/api/admin/foto", traducoes = {} }: { fotos: FotoGaleriaAdmin[]; enviarPara?: string; traducoes?: Record<string, DadosDeTraducao> }) {
  const [itens, setItens] = useState<Item[]>(() => iniciais.map((f) => ({ chave: f.id, url: f.url, alt: f.alt })));
  const [enviando, setEnviando] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [resultado, setResultado] = useState<{ ok?: boolean; erro?: string; erros?: Record<number, string> }>({});
  const [salvando, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  async function adicionar(arquivos: FileList | File[]) {
    const lista = Array.from(arquivos);
    const falhas: string[] = [];
    setResultado({});
    for (const [n, arquivo] of lista.entries()) {
      setEnviando(`Enviando foto ${n + 1} de ${lista.length}…`);
      try {
        if (!tipoAceito(arquivo)) throw new ErroDeFoto(MENSAGENS_FOTO.tipoInvalido);
        if (arquivo.size > FOTO_REGRAS.maxOriginalBytes) throw new ErroDeFoto(MENSAGENS_FOTO.grandeDemais);
        const { url: temporaria, imagem } = await abrirFoto(arquivo);
        try {
          const foto = await prepararFoto(imagem, { x: 0, y: 0, width: imagem.naturalWidth, height: imagem.naturalHeight }, "livre");
          const blob = await upload(`galeria-${Date.now()}-${n}.webp`, foto.blob, { access: "public", handleUploadUrl: enviarPara, contentType: FOTO_REGRAS.tipoFinal });
          setItens((atual) => [...atual, { chave: novaChave(), url: blob.url, alt: "" }]);
        } finally {
          URL.revokeObjectURL(temporaria);
        }
      } catch (e) {
        const msg = e instanceof ErroDeFoto ? e.message : e instanceof Error && /token|BLOB|configur/i.test(e.message) ? MENSAGENS_FOTO.semArmazenamento : MENSAGENS_FOTO.naoEnviou;
        falhas.push(`${arquivo.name}: ${msg}`);
      }
    }
    setEnviando(null);
    setAvisos(falhas);
  }

  const mover = (i: number, d: -1 | 1) =>
    setItens((atual) => {
      const j = i + d;
      if (j < 0 || j >= atual.length) return atual;
      const copia = [...atual];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  const semDescricao = itens.filter((f) => f.alt.trim().length < 3).length;

  function salvar() {
    iniciar(async () => {
      setResultado(await salvarGaleria(itens.map((f) => ({ id: UUID.test(f.chave) ? f.chave : undefined, url: f.url, alt: f.alt }))));
    });
  }

  return (
    <div className={styles.pilha}>
      <Alert tone="info" title="Fotos das turmas">
        Mostre aulas, materiais e o ambiente do curso. Sem fotos de pacientes, de antes e depois ou de resultados (regra do CFM). A primeira foto aparece maior na galeria de &quot;Sobre o curso&quot;.
      </Alert>

      <label
        className={styles.soltar}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void adicionar(e.dataTransfer.files);
        }}
      >
        <Upload {...ICON} size={28} className="ap-icon-accent" />
        <span className={styles.soltarTitulo}>{enviando ?? "Adicionar fotos"}</span>
        <span className={styles.nota}>Arraste várias fotos de uma vez ou clique para escolher. Pode ser do celular (JPG, PNG ou HEIC).</span>
        <input
          ref={entrada}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          disabled={!!enviando}
          onChange={(e) => {
            const arquivos = e.target.files ? Array.from(e.target.files) : [];
            e.target.value = "";
            if (arquivos.length) void adicionar(arquivos);
          }}
        />
      </label>

      {avisos.length > 0 && (
        <Alert tone="danger" title="Algumas fotos não foram adicionadas">
          <ul className={styles.listaAvisos}>
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Alert>
      )}

      {itens.length === 0 ? (
        <p className={styles.muted}>Nenhuma foto na galeria ainda.</p>
      ) : (
        <ul className={styles.galeriaGrade}>
          {itens.map((f, i) => (
            <li key={f.chave} className={styles.galeriaItem}>
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia direta da foto no painel */}
              <img src={f.url} alt={f.alt || `Foto ${i + 1}, sem descrição ainda`} className={styles.galeriaImg} />
              <div className={styles.galeriaCorpo}>
                <span className={styles.galeriaPosicao}>{i === 0 ? "Foto 1 · destaque" : `Foto ${i + 1}`}</span>
                <TextField
                  label="Descrição da foto"
                  required
                  value={f.alt}
                  onChange={(e) => setItens((atual) => atual.map((x) => (x.chave === f.chave ? { ...x, alt: e.target.value } : x)))}
                  error={resultado.erros?.[i]}
                  hint="Para quem usa leitor de tela."
                />
                {traducoes[f.chave] && (
                  <details>
                    <summary>Traduções da descrição</summary>
                    <TraducoesAdmin dados={traducoes[f.chave]} />
                  </details>
                )}
                <div className={styles.acoesLinha}>
                  <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => mover(i, -1)}>
                    Subir
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={i === itens.length - 1} onClick={() => mover(i, 1)}>
                    Descer
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setItens((atual) => atual.filter((x) => x.chave !== f.chave))}>
                    Remover
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {resultado.erro && (
        <Alert tone="danger" title="Não foi possível salvar">
          {resultado.erro}
        </Alert>
      )}
      {resultado.ok && (
        <Alert tone="success" title="Galeria salva">
          O site já mostra as fotos na ordem escolhida.
        </Alert>
      )}
      <div className={styles.rodape}>
        {semDescricao > 0 && <span className={styles.nota}>{semDescricao === 1 ? "Falta descrever 1 foto." : `Faltam descrever ${semDescricao} fotos.`}</span>}
        <Button type="button" disabled={salvando || !!enviando || semDescricao > 0} onClick={salvar}>
          {salvando ? "Salvando…" : "Salvar galeria"}
        </Button>
      </div>
    </div>
  );
}
