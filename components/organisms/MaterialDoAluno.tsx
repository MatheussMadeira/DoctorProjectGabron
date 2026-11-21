import { ArrowLeft, FileText } from "lucide-react";
import { ICON } from "@/lib/icon";
import { IDIOMAS, type Locale } from "@/lib/i18n/idiomas";
import type { Tradutor } from "@/lib/i18n/tradutor";
import type { MaterialCompleto } from "@/lib/aluno-conteudo";
import { AppLink } from "../atoms/AppLink";
import { ComentarioForm } from "./ComentarioForm";
import { VideoFeedback } from "./VideoFeedback";
import styles from "./aluno.module.css";

/* Um material da área do aluno: PDF (abre pelo site, sem mostrar o endereço do arquivo), discussão de caso (texto, imagens e comentários)
   ou vídeo. As imagens e o PDF vêm de /api/aluno/arquivo, que confere a sessão a cada pedido. */
export function MaterialDoAluno({ material, locale, tr, previa }: { material: MaterialCompleto; locale: Locale; tr: Tradutor; previa?: { voltar: string; sufixoArquivo: string } }) {
  const quando = new Intl.DateTimeFormat(IDIOMAS[locale].intl, { dateStyle: "medium", timeStyle: "short" });
  const paragrafos = material.texto.split(/\n{2,}/).filter(Boolean);
  const arquivo = (tipo: string, extra = "") => `/api/aluno/arquivo?tipo=${tipo}&id=${material.id}${extra}${previa?.sufixoArquivo ?? ""}`;
  return (
    <article className={styles.leitura}>
      <AppLink href={previa?.voltar ?? "/sou-aluno"} className={styles.meta}>
        <ArrowLeft {...ICON} size={16} aria-hidden="true" /> {tr("Aluno.materialVoltar")}
      </AppLink>
      <p className={styles.meta}>
        {material.turma.titulo} · {material.modulo.titulo}
      </p>
      <h2>{material.titulo}</h2>

      {paragrafos.length > 0 && (
        <div className={styles.paragrafos}>
          {paragrafos.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {material.arquivoNome && (
        <p>
          <a className={styles.certificado} href={arquivo("material")} target="_blank" rel="noopener noreferrer">
            <FileText {...ICON} size={20} aria-hidden="true" /> {tr("Aluno.baixarPdf")}: {material.arquivoNome}
          </a>
        </p>
      )}

      {material.videoUrl && <VideoFeedback url={material.videoUrl} legendaUrl={material.videoLegendaUrl} titulo={material.titulo} />}

      {material.imagens.length > 0 && (
        <ul className={styles.imagens}>
          {material.imagens.map((img) => (
            <li key={img.indice}>
              <figure style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem privada: vem de /api/aluno/arquivo com a sessão; o otimizador do Next não envia o cookie */}
                <img src={arquivo("imagem", `&i=${img.indice}`)} alt={img.alt} loading="lazy" />
                <figcaption>{tr("Aluno.imagemDe", { n: img.indice + 1, total: material.imagens.length })}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}

      {material.tipo === "CASO" && (
        <section className={styles.comentarios} aria-labelledby="comentarios-titulo">
          <h3 id="comentarios-titulo" className={styles.moduloTitulo}>
            {tr("Aluno.comentariosTitulo")}
          </h3>
          {material.comentarios.length === 0 && <p className={styles.meta}>{tr("Aluno.comentariosVazio")}</p>}
          {material.comentarios.map((c) => (
            <figure key={c.id} className={styles.comentario}>
              <figcaption className={styles.comentarioAutor}>
                <strong>{c.nome}</strong>
                <span className={styles.meta}>{quando.format(new Date(c.em))}</span>
              </figcaption>
              <p>{c.texto}</p>
            </figure>
          ))}
          {!previa && <ComentarioForm materialId={material.id} />}
        </section>
      )}
    </article>
  );
}
