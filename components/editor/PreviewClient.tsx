"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { numerar, renderizarSecao } from "@/components/site-secoes/renderers";
import type { Tradutor } from "@/lib/i18n/tradutor";
import { anotarSecao, contador } from "@/lib/site-secoes/anotar";
import { defDaSecao, type PaginaSlug } from "@/lib/site-secoes/paginas";
import { desembrulhar, embrulhar, type MsgDaPrevia, type MsgDoEditor, type SecaoEstado, type Selecao } from "@/lib/site-secoes/protocolo";

/* A página real em modo edição, dentro do iframe do editor. Renderiza as seções com o MESMO código do site (renderers), com o conteúdo que o
   editor manda por postMessage; marca o que é editável (anotar.ts) e devolve cliques e digitação. As seções com dados vivos chegam prontas do
   servidor (`slots`). Texto edita no lugar; foto pede a troca ao editor; link nenhum navega aqui dentro. */

const ESTILO = `
[data-previa] .ap-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
[data-previa] [data-edit-path] { cursor: text; outline: 2px dashed transparent; outline-offset: 3px; position: relative; }
[data-previa] [data-edit-kind="image"] { cursor: pointer; }
[data-previa] [data-edit-path]:hover { outline-color: var(--brand-azul-pedra); }
[data-previa] [data-edit-path][data-ativo="true"] { outline-color: var(--ink); }
[data-previa] [data-edit-path]:hover::after, [data-previa] [data-edit-path][data-ativo="true"]::after {
  content: attr(data-edit-label); position: absolute; left: 0; top: -28px; z-index: 30; background: var(--ink); color: var(--ink-inverse);
  font: 600 12px/18px var(--font-sans); padding: 3px 8px; white-space: nowrap; pointer-events: none; max-width: 90vw; overflow: hidden; text-overflow: ellipsis;
}
[data-previa] [data-editor-section] { position: relative; }
[data-previa] [data-editor-section][data-selecionada="true"] { box-shadow: inset 0 0 0 3px var(--brand-azul-pedra); }
[data-previa] [data-editor-oculta], [data-previa] [data-editor-vazia] {
  padding: var(--space-5); text-align: center; background: var(--surface-sunken); border: 2px dashed var(--line-strong); color: var(--ink-muted); font: 600 15px/22px var(--font-sans);
}
[data-previa] [contenteditable] { outline-color: var(--ink) !important; background: color-mix(in srgb, var(--accent) 25%, transparent); }
`;

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export function PreviewClient({ pagina, inicial, slots, nProfessores, chamada }: { pagina: PaginaSlug; inicial: SecaoEstado[]; slots: Record<string, ReactNode | null>; nProfessores: number; chamada: ReactNode | null }) {
  const t = useTranslations();
  const tr = useCallback((chave: string, valores?: Record<string, string | number>) => t(chave as never, valores as never), [t]) as Tradutor;
  const [secoes, setSecoes] = useState(inicial);
  const [selecionada, setSelecionada] = useState<Selecao | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const editando = useRef<string | null>(null);
  const pendente = useRef<Extract<MsgDoEditor, { tipo: "estado" }> | null>(null);

  const enviar = useCallback((msg: MsgDaPrevia) => window.parent.postMessage(embrulhar(msg), window.location.origin), []);

  // Mensagens do editor. Enquanto o texto está sendo digitado AQUI, o estado novo espera (senão o React reescreveria o texto e o cursor pularia).
  useEffect(() => {
    const ao = (e: MessageEvent) => {
      const m = desembrulhar<MsgDoEditor>(e, window.parent);
      if (!m) return;
      if (m.tipo === "estado") {
        if (editando.current) pendente.current = m;
        else {
          setSecoes(m.secoes);
          setSelecionada(m.selecionada);
        }
      } else if (m.tipo === "rolar") {
        raiz.current?.querySelector(`[data-editor-section="${m.chave}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("message", ao);
    // Nenhum link do site navega aqui dentro (cabeçalho, rodapé, botões).
    const semLinks = (e: MouseEvent) => {
      if ((e.target as Element).closest?.("a[href]")) e.preventDefault();
    };
    document.addEventListener("click", semLinks, true);
    enviar({ tipo: "pronta" });
    return () => {
      window.removeEventListener("message", ao);
      document.removeEventListener("click", semLinks, true);
    };
  }, [enviar]);

  // Marca o que é editável, depois de cada renderização.
  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    for (const s of secoes) {
      const bloco = el.querySelector<HTMLElement>(`[data-editor-section="${s.chave}"]`);
      if (bloco && s.visivel) anotarSecao(bloco, s.tipo, s.conteudo);
    }
    el.querySelectorAll("[data-ativo]").forEach((x) => x.removeAttribute("data-ativo"));
    if (selecionada?.caminho) el.querySelector(`[data-editor-section="${selecionada.chave}"] [data-edit-path="${selecionada.caminho}"]`)?.setAttribute("data-ativo", "true");
  }, [secoes, selecionada]);

  function iniciarEdicao(el: HTMLElement, chave: string, caminho: string) {
    if (el.isContentEditable) return;
    const max = Number(el.getAttribute("data-edit-max")) || undefined;
    const rotulo = (el.getAttribute("data-edit-label") ?? "").split(" · ")[0];
    editando.current = `${chave}|${caminho}`;
    el.contentEditable = "plaintext-only";
    if (!el.isContentEditable) el.contentEditable = "true";
    el.spellcheck = false;
    el.focus();

    const aoDigitar = () => {
      // textContent (e não innerText): o innerText devolve o texto já em CAIXA ALTA quando o CSS põe `text-transform: uppercase`.
      let valor = norm(el.textContent ?? "");
      if (max && valor.length > max) {
        valor = valor.slice(0, max);
        el.textContent = valor;
        const faixa = document.createRange();
        faixa.selectNodeContents(el);
        faixa.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(faixa);
      }
      el.setAttribute("data-edit-label", contador(rotulo, valor.length, max));
      enviar({ tipo: "texto-ao-vivo", chave, caminho, valor });
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        el.blur();
      }
    };
    const terminar = () => {
      el.removeEventListener("input", aoDigitar);
      el.removeEventListener("keydown", aoTeclar);
      el.removeEventListener("blur", terminar);
      el.contentEditable = "false";
      el.removeAttribute("contenteditable");
      editando.current = null;
      enviar({ tipo: "texto-fim" });
      if (pendente.current) {
        setSecoes(pendente.current.secoes);
        setSelecionada(pendente.current.selecionada);
        pendente.current = null;
      }
    };
    el.addEventListener("input", aoDigitar);
    el.addEventListener("keydown", aoTeclar);
    el.addEventListener("blur", terminar);
  }

  function aoClicar(e: React.MouseEvent) {
    const alvo = (e.target as Element).closest<HTMLElement>("[data-edit-path]");
    const bloco = (e.target as Element).closest<HTMLElement>("[data-editor-section]");
    if (!bloco) return;
    const chave = bloco.getAttribute("data-editor-section")!;
    if (alvo?.isContentEditable) return; // já está editando este texto: o clique só move o cursor
    e.preventDefault();
    if (!alvo) {
      setSelecionada({ chave });
      enviar({ tipo: "selecionar", chave });
      return;
    }
    const caminho = alvo.getAttribute("data-edit-path")!;
    setSelecionada({ chave, caminho });
    enviar({ tipo: "selecionar", chave, caminho });
    if (alvo.getAttribute("data-edit-kind") === "image") enviar({ tipo: "trocar-foto", chave, caminho });
    else iniciarEdicao(alvo, chave, caminho);
  }

  const visiveis = secoes.filter((s) => s.visivel);
  const numeros = numerar(
    visiveis.map((s) => ({ def: defDaSecao(pagina, s.chave)! })),
    slots,
  );
  const ctx = { pagina, tr, slots, nProfessores, numeros };

  return (
    <div ref={raiz} data-previa onClick={aoClicar}>
      <style>{ESTILO}</style>
      {secoes.map((s) => {
        const def = defDaSecao(pagina, s.chave);
        if (!def) return null;
        if (!s.visivel) {
          return (
            <div key={s.chave} data-editor-section={s.chave} data-selecionada={selecionada?.chave === s.chave}>
              <div data-editor-oculta>Seção oculta: {s.rotulo}</div>
            </div>
          );
        }
        const no = renderizarSecao(def, s.conteudo, ctx);
        return (
          <div key={s.chave} data-editor-section={s.chave} data-selecionada={selecionada?.chave === s.chave}>
            {no ?? <div data-editor-vazia>{s.rotulo}: ainda não há o que mostrar (cadastre os itens nas outras telas do painel).</div>}
          </div>
        );
      })}
      <Fragment>{chamada}</Fragment>
    </div>
  );
}
