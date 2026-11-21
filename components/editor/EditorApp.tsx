"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, Monitor, Redo2, Smartphone, Undo2 } from "lucide-react";
import { abrirPagina, descartarAlteracoes, liberarPagina, publicar, renovarPagina, salvarRascunho, traducoesDaSecao } from "@/app/(painel)/admin/acoes-editor";
import type { DadosDeTraducao } from "@/lib/i18n/admin";
import { ICON } from "@/lib/icon";
import { CAMPOS, comValorEm, fotosDoConteudo, type Conteudo, type Foto } from "@/lib/site-secoes/campos";
import type { PaginaEditor } from "@/lib/site-secoes/editor";
import { desfazer, empurrar, iniciarHistoria, podeDesfazer, podeRefazer, refazer } from "@/lib/site-secoes/historia";
import { PAGINAS, PAGINAS_EDITAVEIS, type PaginaSlug } from "@/lib/site-secoes/paginas";
import { desembrulhar, embrulhar, type MsgDaPrevia, type MsgDoEditor, type SecaoEstado, type Selecao } from "@/lib/site-secoes/protocolo";
import { Button } from "../atoms/Button";
import { Alert } from "../molecules/Alert";
import { FotoDialog } from "../organisms/FotoDialog";
import { TraducoesAdmin } from "../organisms/TraducoesAdmin";
import { CampoEditor } from "./PainelCampos";
import styles from "./editor.module.css";

/* Editor visual de Início e Sobre o curso. Esquerda: seções (ordem e visibilidade). Centro: a página real num iframe, com o rascunho. Direita: os
   campos da seção selecionada (gerados de CAMPOS). Rascunho salvo sozinho (~1 s), desfazer/refazer, uma pessoa por vez em cada página, Publicar. */

type Erros = Record<string, Record<string, string>>;
type Estado = { secoes: SecaoEstado[] };
type Situacao = "pronto" | "salvando" | "salvo" | "erro";

const paraEstado = (p: PaginaEditor): Estado => ({ secoes: p.secoes.map((s) => ({ chave: s.chave, tipo: s.tipo, rotulo: s.rotulo, visivel: s.visivel, conteudo: s.conteudo })) });

export function EditorApp({ inicial }: { inicial: PaginaEditor }) {
  const pagina: PaginaSlug = inicial.pagina;
  const ids = useMemo(() => Object.fromEntries(inicial.secoes.map((s) => [s.chave, s.id])), [inicial]);
  const [h, setH] = useState(() => iniciarHistoria<Estado>(paraEstado(inicial)));
  const secoes = h.presente.secoes;
  const [selecionada, setSelecionada] = useState<Selecao | null>(null);
  const [situacao, setSituacao] = useState<Situacao>("pronto");
  const [erros, setErros] = useState<Erros>({});
  const [alteracoes, setAlteracoes] = useState(inicial.alteracoes);
  const [celular, setCelular] = useState(false);
  const [ocupadaPor, setOcupadaPor] = useState<string | null>(null);
  const [pausado, setPausado] = useState(false);
  const [mensagem, setMensagem] = useState<{ tom: "success" | "danger"; texto: string } | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [fotoAlvo, setFotoAlvo] = useState<{ chave: string; caminho: string; foto: Foto; rotulo: string; proporcao: "retrato" | "paisagem" } | null>(null);
  const [aba, setAba] = useState<"campos" | "traducoes">("campos");
  const [trad, setTrad] = useState<{ chave: string; dados: DadosDeTraducao | null } | null>(null);
  const router = useRouter();
  const [ultima, setUltima] = useState(inicial.ultimaPublicacao);

  const iframe = useRef<HTMLIFrameElement>(null);
  const palco = useRef<HTMLElement>(null);
  const [medida, setMedida] = useState({ largura: 0, altura: 0 });
  const pronta = useRef(false);
  const token = useRef("");
  const primeiraVez = useRef(true);
  const ultimaEdicao = useRef(0);

  const alterar = useCallback((f: (x: typeof h) => typeof h) => {
    setSituacao("salvando");
    setH(f);
  }, []);

  const secaoAtual = secoes.find((s) => s.chave === selecionada?.chave) ?? null;
  const bloqueado = !!ocupadaPor || pausado;

  /* --- reserva: uma pessoa por vez --- */
  useEffect(() => {
    token.current = crypto.randomUUID();
    let vivo = true;
    (async () => {
      const r = await abrirPagina(pagina, token.current);
      if (!vivo) return;
      if (!r.ok) setOcupadaPor(r.ocupadaPor ?? "outra pessoa");
    })();
    const batimento = setInterval(async () => {
      if (!(await renovarPagina(pagina, token.current))) setPausado(true);
    }, 15_000);
    return () => {
      vivo = false;
      clearInterval(batimento);
      void liberarPagina(pagina, token.current);
    };
  }, [pagina]);

  /* --- tamanho do palco (a prévia é reduzida para caber) --- */
  useEffect(() => {
    const el = palco.current;
    if (!el) return;
    const medir = () => setMedida({ largura: el.clientWidth, altura: el.clientHeight });
    medir();
    const o = new ResizeObserver(medir);
    o.observe(el);
    return () => o.disconnect();
  }, []);
  const larguraLogica = celular ? 390 : 1280;
  const escala = medida.largura ? Math.min(1, (medida.largura - 32) / larguraLogica) : 1;
  const alturaLogica = medida.altura ? Math.max(400, (medida.altura - 32) / escala) : 700;

  /* --- prévia: manda o estado --- */
  const mandar = useCallback((msg: MsgDoEditor) => iframe.current?.contentWindow?.postMessage(embrulhar(msg), window.location.origin), []);
  useEffect(() => {
    if (pronta.current) mandar({ tipo: "estado", secoes, selecionada });
  }, [secoes, selecionada, mandar]);

  /* --- prévia: ouve --- */
  const editar = useCallback((chave: string, caminho: string, valor: unknown, juntar = true) => {
    ultimaEdicao.current = Date.now();
    setSituacao("salvando");
    setH((x) => {
      const proximo = { secoes: x.presente.secoes.map((s) => (s.chave === chave ? { ...s, conteudo: comValorEm(s.conteudo, caminho, valor) as Conteudo } : s)) };
      return empurrar(x, proximo, juntar ? `${chave}|${caminho}` : null);
    });
  }, []);

  useEffect(() => {
    const ao = (e: MessageEvent) => {
      const m = desembrulhar<MsgDaPrevia>(e, iframe.current?.contentWindow ?? null);
      if (!m) return;
      if (m.tipo === "pronta") {
        pronta.current = true;
        mandar({ tipo: "estado", secoes, selecionada });
      } else if (m.tipo === "selecionar") {
        setSelecionada({ chave: m.chave, caminho: m.caminho });
        setAba("campos");
      } else if (m.tipo === "texto-ao-vivo") {
        if (!bloqueado) editar(m.chave, m.caminho, m.valor);
      } else if (m.tipo === "trocar-foto") {
        const s = secoes.find((x) => x.chave === m.chave);
        const f = s && fotosDoConteudo(CAMPOS[s.tipo], s.conteudo).find((x) => x.caminho === m.caminho);
        if (f && !bloqueado) setFotoAlvo({ chave: m.chave, caminho: m.caminho, foto: f.foto, rotulo: f.rotulo, proporcao: f.proporcao });
      }
    };
    window.addEventListener("message", ao);
    return () => window.removeEventListener("message", ao);
  }, [secoes, selecionada, mandar, editar, bloqueado]);

  /* --- rascunho automático (~1 s depois da última mudança) --- */
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    if (bloqueado) return;
    const espera = setTimeout(async () => {
      const r = await salvarRascunho(pagina, token.current, secoes.map((s) => ({ chave: s.chave, visivel: s.visivel, conteudo: s.conteudo })));
      if (r.perdeu) {
        setPausado(true);
        setSituacao("erro");
        return;
      }
      setErros(r.erros ?? {});
      if (r.alteracoes !== undefined) setAlteracoes(r.alteracoes);
      setSituacao(r.ok ? "salvo" : "erro");
    }, 1000);
    return () => clearTimeout(espera);
  }, [h.presente, pagina, bloqueado]); // eslint-disable-line react-hooks/exhaustive-deps -- `secoes` vem de h.presente

  /* --- traduções da seção selecionada (só existem depois de publicar) --- */
  useEffect(() => {
    if (aba !== "traducoes" || !secaoAtual) return;
    let vivo = true;
    const chave = `${secaoAtual.chave}|${ultima?.em ?? ""}`;
    traducoesDaSecao(ids[secaoAtual.chave]).then((d) => vivo && setTrad({ chave, dados: d }));
    return () => {
      vivo = false;
    };
  }, [aba, secaoAtual?.chave, ids, ultima?.em]); // eslint-disable-line react-hooks/exhaustive-deps

  /* --- ações --- */
  const mudarSecao = (chave: string, f: (s: SecaoEstado) => SecaoEstado) => alterar((x) => empurrar(x, { secoes: x.presente.secoes.map((s) => (s.chave === chave ? f(s) : s)) }));
  const moverSecao = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= secoes.length) return;
    alterar((x) => {
      const novo = [...x.presente.secoes];
      [novo[i], novo[j]] = [novo[j], novo[i]];
      return empurrar(x, { secoes: novo });
    });
  };
  const escolher = (chave: string) => {
    setSelecionada({ chave });
    setAba("campos");
    mandar({ tipo: "rolar", chave });
  };

  async function aoPublicar() {
    setPublicando(true);
    setMensagem(null);
    // Garante que o rascunho mais recente chegou ao servidor antes de publicar.
    const salvo = await salvarRascunho(pagina, token.current, secoes.map((s) => ({ chave: s.chave, visivel: s.visivel, conteudo: s.conteudo })));
    if (salvo.perdeu) {
      setPausado(true);
      setPublicando(false);
      return;
    }
    if (!salvo.ok) {
      setErros(salvo.erros ?? {});
      setMensagem({ tom: "danger", texto: "Há campos inválidos: corrija os marcados antes de publicar." });
      setPublicando(false);
      return;
    }
    const r = await publicar(pagina, token.current);
    setPublicando(false);
    if (r.perdeu) return setPausado(true);
    if (!r.ok) {
      setErros(r.erros ?? {});
      return setMensagem({ tom: "danger", texto: r.erro ?? "Não foi possível publicar." });
    }
    setErros({});
    setAlteracoes(0);
    setUltima({ em: new Date().toISOString(), por: "você" });
    setMensagem({ tom: "success", texto: "Alterações publicadas. Já estão no site; as traduções foram preparadas como rascunho (revise na aba Traduções)." });
  }

  async function aoDescartar() {
    setMensagem(null);
    const r = await descartarAlteracoes(pagina, token.current);
    if (r.perdeu) return setPausado(true);
    if (!r.ok || !r.pagina) return setMensagem({ tom: "danger", texto: r.erro ?? "Não foi possível descartar." });
    primeiraVez.current = true;
    setH(iniciarHistoria(paraEstado(r.pagina)));
    setAlteracoes(r.pagina.alteracoes);
    setErros({});
    setSituacao("pronto");
  }

  const textoStatus = bloqueado ? "Edição pausada" : situacao === "salvando" ? "Salvando…" : situacao === "erro" ? "Corrija os campos marcados" : alteracoes > 0 ? `${alteracoes} ${alteracoes === 1 ? "seção com alteração" : "seções com alterações"} não publicada${alteracoes === 1 ? "" : "s"}` : "Tudo publicado";

  if (ocupadaPor) {
    return (
      <div className={styles.bloqueio}>
        <h1 className={styles.titulo}>Esta página está sendo editada</h1>
        <p>{ocupadaPor} está com {PAGINAS[pagina].rotulo} aberta no editor. Só uma pessoa edita cada página por vez, para ninguém apagar o trabalho do outro.</p>
        <p>
          <Link href="/admin" prefetch={false}>
            Voltar ao painel
          </Link>{" "}
          ou tente de novo em alguns minutos.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tela} data-editor>
      <header className={styles.barra}>
        <Link href="/admin" prefetch={false} className={styles.barraBotao} aria-label="Voltar ao painel">
          <ArrowLeft {...ICON} size={18} aria-hidden="true" /> Painel
        </Link>
        <label className={styles.barraGrupo}>
          <span className="ap-sr-only-edit">Editando a página</span>
          <select value={pagina} aria-label="Página em edição" onChange={(e) => router.push(`/admin/editor?pagina=${e.target.value}`)}>
            {PAGINAS_EDITAVEIS.map((p) => (
              <option key={p} value={p}>
                Editando: {PAGINAS[p].rotulo}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.barraGrupo} role="group" aria-label="Tamanho da tela">
          <button type="button" className={styles.barraBotao} aria-pressed={!celular} onClick={() => setCelular(false)}>
            <Monitor {...ICON} size={18} aria-hidden="true" /> Computador
          </button>
          <button type="button" className={styles.barraBotao} aria-pressed={celular} onClick={() => setCelular(true)}>
            <Smartphone {...ICON} size={18} aria-hidden="true" /> Celular
          </button>
        </div>
        <div className={styles.barraGrupo}>
          <button type="button" className={styles.barraBotao} aria-label="Desfazer" disabled={!podeDesfazer(h) || bloqueado} onClick={() => alterar(desfazer)}>
            <Undo2 {...ICON} size={18} aria-hidden="true" />
          </button>
          <button type="button" className={styles.barraBotao} aria-label="Refazer" disabled={!podeRefazer(h) || bloqueado} onClick={() => alterar(refazer)}>
            <Redo2 {...ICON} size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.barraDireita}>
          <span className={styles.status} role="status" aria-live="polite">
            {textoStatus}
          </span>
          {alteracoes > 0 && (
            <button type="button" className={styles.barraBotao} disabled={bloqueado} onClick={aoDescartar}>
              Descartar alterações
            </button>
          )}
          <a className={styles.barraBotao} href={PAGINAS[pagina].caminho} target="_blank" rel="noopener noreferrer">
            Ver no site
          </a>
          <button type="button" className={`${styles.barraBotao} ${styles.publicar}`} disabled={bloqueado || publicando || situacao === "salvando"} onClick={aoPublicar}>
            {publicando ? "Publicando…" : "Publicar alterações"}
          </button>
        </div>
      </header>

      <div className={styles.corpo}>
        <nav className={`${styles.coluna} ${styles.colunaEsquerda}`} aria-label="Seções da página">
          <h2 className={styles.titulo}>Seções</h2>
          <ul className={styles.secoes}>
            {secoes.map((s, i) => (
              <li key={s.chave} className={styles.secao} data-selecionada={selecionada?.chave === s.chave} data-oculta={!s.visivel}>
                <button type="button" className={styles.secaoNome} onClick={() => escolher(s.chave)} aria-current={selecionada?.chave === s.chave ? "true" : undefined}>
                  {s.rotulo}
                </button>
                {alteracoes > 0 && inicial.secoes.find((x) => x.chave === s.chave)?.alterada && <span className={styles.ponto} title="Alterada" />}
                <button type="button" className={styles.iconeBotao} aria-label={`Subir a seção ${s.rotulo}`} disabled={i === 0 || bloqueado} onClick={() => moverSecao(i, -1)}>
                  <ArrowUp {...ICON} size={16} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Descer a seção ${s.rotulo}`} disabled={i === secoes.length - 1 || bloqueado} onClick={() => moverSecao(i, 1)}>
                  <ArrowDown {...ICON} size={16} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={s.visivel ? `Esconder a seção ${s.rotulo}` : `Mostrar a seção ${s.rotulo}`} aria-pressed={!s.visivel} disabled={bloqueado} onClick={() => mudarSecao(s.chave, (x) => ({ ...x, visivel: !x.visivel }))}>
                  {s.visivel ? <Eye {...ICON} size={16} /> : <EyeOff {...ICON} size={16} />}
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.nota}>Cabeçalho e rodapé são os mesmos em todas as páginas. As turmas, os professores, a galeria e os depoimentos mudam nas telas deles; aqui você edita o título e a ordem de cada bloco.</p>
          {ultima && <p className={styles.nota}>Última publicação: {new Date(ultima.em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}, por {ultima.por}.</p>}
        </nav>

        <main ref={palco} className={styles.palco} aria-label="Prévia da página">
          <div className={styles.encaixe} style={{ width: larguraLogica * escala, height: alturaLogica * escala }}>
            <iframe
              ref={iframe}
              className={styles.moldura}
              data-celular={celular}
              title="Prévia da página com o rascunho"
              src={`/admin/editor/preview/${pagina}`}
              style={{ width: larguraLogica, height: alturaLogica, transform: `scale(${escala})` }}
            />
          </div>
        </main>

        <aside className={`${styles.coluna} ${styles.colunaDireita}`} aria-label="Campos da seção">
          {pausado && (
            <Alert tone="danger" title="Edição pausada">
              Outra aba ou outra pessoa assumiu esta página (ou a conexão caiu). Recarregue para voltar a editar.
            </Alert>
          )}
          {mensagem && (
            <Alert tone={mensagem.tom} title={mensagem.tom === "success" ? "Publicado" : "Atenção"}>
              {mensagem.texto}
            </Alert>
          )}
          {!secaoAtual && <p className={styles.nota}>Escolha uma seção na lista ou clique num texto ou numa foto da prévia para editar.</p>}
          {secaoAtual && (
            <>
              <h2 className={styles.titulo}>{secaoAtual.rotulo}</h2>
              <div className={styles.abas} role="tablist" aria-label="Conteúdo da seção">
                <Button type="button" size="sm" variant={aba === "campos" ? "primary" : "ghost"} role="tab" aria-selected={aba === "campos"} onClick={() => setAba("campos")}>
                  Campos
                </Button>
                <Button type="button" size="sm" variant={aba === "traducoes" ? "primary" : "ghost"} role="tab" aria-selected={aba === "traducoes"} onClick={() => setAba("traducoes")}>
                  Traduções
                </Button>
              </div>
              {aba === "campos" &&
                CAMPOS[secaoAtual.tipo].map((c) => (
                  <CampoEditor key={`${secaoAtual.chave}-${c.chave}`} campo={c} valor={secaoAtual.conteudo[c.chave]} caminho={c.chave} aoMudar={(caminho, valor) => !bloqueado && editar(secaoAtual.chave, caminho, valor, typeof valor === "string")} erros={erros[secaoAtual.chave] ?? {}} />
                ))}
              {aba === "traducoes" && (
                <>
                  <p className={styles.nota}>As traduções saem da DeepL ao publicar, a partir do texto publicado. Aqui você confere e marca como revisada.</p>
                  {trad?.chave !== `${secaoAtual.chave}|${ultima?.em ?? ""}` && <p className={styles.nota}>Carregando…</p>}
                  {trad?.chave === `${secaoAtual.chave}|${ultima?.em ?? ""}` && trad.dados === null && <p className={styles.nota}>Esta seção ainda não foi publicada: publique para gerar as traduções.</p>}
                  {trad?.chave === `${secaoAtual.chave}|${ultima?.em ?? ""}` && trad.dados && <TraducoesAdmin key={trad.chave} dados={trad.dados} />}
                </>
              )}
            </>
          )}
        </aside>
      </div>

      {fotoAlvo && (
        <FotoDialog
          aberto
          atual={{ url: fotoAlvo.foto.url, alt: fotoAlvo.foto.alt }}
          formato={fotoAlvo.proporcao === "paisagem" ? "paisagem" : "retrato"}
          titulo={fotoAlvo.rotulo}
          onFechar={() => setFotoAlvo(null)}
          onUsar={(nova) => {
            editar(fotoAlvo.chave, fotoAlvo.caminho, { url: nova.url, alt: nova.alt || fotoAlvo.foto.alt }, false);
            setFotoAlvo(null);
          }}
        />
      )}
    </div>
  );
}
