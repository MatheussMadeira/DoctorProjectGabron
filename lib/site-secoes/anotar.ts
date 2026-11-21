import { CAMPOS, folhasDeTexto, fotosDoConteudo, type Conteudo, type TipoSecao } from "./campos";

/**
 * Marca no DOM da prévia o que é editável. Os componentes do site recebem texto puro por props (não sabem que existe editor), então a ligação
 * é feita DEPOIS de renderizar: cada texto do conteúdo é procurado no elemento que o mostra, e cada foto pelo endereço (ou pela descrição).
 * O que não tem correspondência segura (texto quebrado em vários elementos, valor repetido) continua editável pelo painel da direita.
 */
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const ATRIBUTOS = ["data-edit-path", "data-edit-label", "data-edit-kind", "data-edit-max"];

export function limparAnotacoes(raiz: ParentNode) {
  raiz.querySelectorAll("[data-edit-path]").forEach((el) => ATRIBUTOS.forEach((a) => el.removeAttribute(a)));
}

const textoProprio = (el: Element) =>
  norm(
    Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join(""),
  );

/** Endereço da imagem como está no conteúdo: o <img> do next/image guarda o original no parâmetro `url`. */
function origemDaImagem(img: HTMLImageElement): string {
  const src = img.getAttribute("src") ?? "";
  try {
    return new URL(src, window.location.href).searchParams.get("url") ?? src;
  } catch {
    return src;
  }
}

export const contador = (rotulo: string, tamanho: number, max?: number) => (max ? `${rotulo} · ${tamanho}/${max}` : rotulo);

export function anotarSecao(raiz: HTMLElement, tipo: TipoSecao, conteudo: Conteudo) {
  limparAnotacoes(raiz);
  const campos = CAMPOS[tipo];

  const pendentes = folhasDeTexto(campos, conteudo).map((f) => ({ ...f, valor: norm(f.valor), usado: false }));
  const caminhante = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT);
  for (let n = caminhante.nextNode() as Element | null; n; n = caminhante.nextNode() as Element | null) {
    if (n.closest("svg, script, style, [data-edit-path]")) continue;
    const texto = textoProprio(n);
    if (!texto) continue;
    const folha = pendentes.find((p) => !p.usado && p.valor === texto);
    if (!folha) continue;
    folha.usado = true;
    n.setAttribute("data-edit-path", folha.caminho);
    n.setAttribute("data-edit-kind", "text");
    if (folha.max) n.setAttribute("data-edit-max", String(folha.max));
    n.setAttribute("data-edit-label", contador(folha.rotulo, folha.valor.length, folha.max));
  }

  const imagens = Array.from(raiz.querySelectorAll<HTMLImageElement>("img"));
  const usadas = new Set<HTMLImageElement>();
  for (const f of fotosDoConteudo(campos, conteudo)) {
    const alvo = imagens.find((i) => !usadas.has(i) && origemDaImagem(i) === f.foto.url) ?? imagens.find((i) => !usadas.has(i) && norm(i.alt) === norm(f.foto.alt) && !!f.foto.alt);
    if (!alvo) continue;
    usadas.add(alvo);
    const moldura = (alvo.closest("figure") as HTMLElement | null) ?? alvo;
    moldura.setAttribute("data-edit-path", f.caminho);
    moldura.setAttribute("data-edit-kind", "image");
    moldura.setAttribute("data-edit-label", `${f.rotulo} · Trocar foto`);
  }
}
