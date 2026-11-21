"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { geoArea, geoDistance, geoGraticule10, geoMercator, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { FeatureCollection } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { estadoPorCodarea } from "@/lib/brasil";
import { reducedMotion, useInView } from "@/lib/motion";
import type { PinAlumni } from "@/lib/alumni";
import Image from "@/components/atoms/ImagemSegura";
import styles from "./alumni.module.css";

/* Mapa interativo da Alumni, em SVG (d3-geo, sem WebGL): o Brasil por estados e um globo que gira, com um pin em cada cidade de onde veio
   alguém. Passar o mouse, focar com o teclado ou tocar mostra quem é; tocar fixa o cartão. Os dados do mapa só são baixados quando a seção
   aparece na tela. Quem não usa mouse tem a lista por local logo abaixo (a mesma informação). Respeita "reduzir movimento". */

interface Grupo {
  chave: string;
  latitude: number;
  longitude: number;
  cidade: string;
  uf: string | null;
  pais: string;
  pessoas: PinAlumni[];
}

type Dados = { brasil: FeatureCollection; terra: GeoPermissibleObjects; fronteiras: GeoPermissibleObjects };

/** O GeoJSON padrão desenha o contorno externo no sentido anti-horário, e o d3-geo espera o contrário: sem corrigir, o estado vira "o globo inteiro menos o estado"
    e o mapa encolhe. Se a área passa de meia esfera, inverte o sentido de todos os anéis. */
function corrigirSentido(colecao: FeatureCollection): FeatureCollection {
  const inverter = (aneis: number[][][]) => aneis.map((a) => [...a].reverse());
  return {
    ...colecao,
    features: colecao.features.map((f) => {
      if (geoArea(f) <= 2 * Math.PI) return f;
      const g = f.geometry;
      if (g.type === "Polygon") return { ...f, geometry: { ...g, coordinates: inverter(g.coordinates) } };
      if (g.type === "MultiPolygon") return { ...f, geometry: { ...g, coordinates: g.coordinates.map(inverter) } };
      return f;
    }),
  };
}

const L_BR = 700;
const A_BR = 720;
const TAM_GLOBO = 640;
const ROTACAO_INICIAL: [number, number] = [50, 15];

function agrupar(pins: PinAlumni[]): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const p of pins) {
    const chave = `${p.latitude.toFixed(2)},${p.longitude.toFixed(2)}`;
    const g = mapa.get(chave) ?? { chave, latitude: p.latitude, longitude: p.longitude, cidade: p.cidade, uf: p.uf, pais: p.pais, pessoas: [] };
    g.pessoas.push(p);
    mapa.set(chave, g);
  }
  return [...mapa.values()];
}

export function MapaAlumni({ pins }: { pins: PinAlumni[] }) {
  const t = useTranslations("Alumni");
  const raiz = useRef<HTMLDivElement>(null);
  const visivel = useInView(raiz, 0.15);
  const [dados, setDados] = useState<Dados | null>(null);
  const [modo, setModo] = useState<"brasil" | "mundo">("brasil");
  const [rot, setRot] = useState<[number, number]>(ROTACAO_INICIAL);
  const [arrastando, setArrastando] = useState(false);
  const [sobre, setSobre] = useState<string | null>(null);
  const [fixo, setFixo] = useState<string | null>(null);
  const [naTela, setNaTela] = useState(false);
  const arrasto = useRef<{ x: number; y: number; rot: [number, number] } | null>(null);
  const movimentoReduzido = useMemo(() => (typeof window === "undefined" ? false : reducedMotion()), []);

  // Os dados só descem quando a seção aparece.
  useEffect(() => {
    if (!visivel || dados) return;
    let cancelado = false;
    (async () => {
      const [brasil, mundo] = await Promise.all([fetch("/mapas/brasil-estados.geojson").then(async (r) => corrigirSentido((await r.json()) as FeatureCollection)), import("world-atlas/countries-110m.json")]);
      if (cancelado) return;
      const topo = (mundo.default ?? mundo) as unknown as Topology<{ countries: GeometryCollection; land: GeometryCollection }>;
      setDados({
        brasil,
        terra: feature(topo, topo.objects.land) as unknown as GeoPermissibleObjects,
        fronteiras: mesh(topo, topo.objects.countries, (a, b) => a !== b) as unknown as GeoPermissibleObjects,
      });
    })().catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [visivel, dados]);

  // O globo só gira enquanto está na tela.
  useEffect(() => {
    const el = raiz.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const o = new IntersectionObserver(([e]) => setNaTela(e.isIntersecting), { threshold: 0.2 });
    o.observe(el);
    return () => o.disconnect();
  }, []);

  const parado = !!(sobre || fixo) || arrastando || movimentoReduzido || !naTela || modo !== "mundo";
  useEffect(() => {
    if (parado || !dados) return;
    let raf = 0;
    const passo = () => {
      setRot((r) => [r[0] + 0.14, r[1]]);
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [parado, dados]);

  const grupos = useMemo(() => agrupar(pins), [pins]);
  const gruposBr = useMemo(() => grupos.filter((g) => g.pais === "BR"), [grupos]);
  const porUf = useMemo(() => {
    const n: Record<string, number> = {};
    for (const g of gruposBr) if (g.uf) n[g.uf] = (n[g.uf] ?? 0) + g.pessoas.length;
    return n;
  }, [gruposBr]);

  const geometria = useMemo(() => {
    if (!dados) return null;
    if (modo === "brasil") {
      const proj = geoMercator().fitExtent(
        [
          [24, 24],
          [L_BR - 24, A_BR - 24],
        ],
        dados.brasil,
      );
      return { proj, caminho: geoPath(proj), largura: L_BR, altura: A_BR };
    }
    const proj = geoOrthographic()
      .scale(TAM_GLOBO / 2 - 10)
      .translate([TAM_GLOBO / 2, TAM_GLOBO / 2])
      .rotate([rot[0], rot[1]])
      .clipAngle(90);
    return { proj, caminho: geoPath(proj), largura: TAM_GLOBO, altura: TAM_GLOBO };
  }, [dados, modo, rot]);

  const grade = useMemo(() => geoGraticule10(), []);

  const posicao = useCallback(
    (g: Grupo): { x: number; y: number } | null => {
      if (!geometria) return null;
      if (modo === "mundo" && geoDistance([g.longitude, g.latitude], [-rot[0], -rot[1]]) > Math.PI / 2 - 0.06) return null;
      const p = geometria.proj([g.longitude, g.latitude]);
      return p ? { x: p[0], y: p[1] } : null;
    },
    [geometria, modo, rot],
  );

  const lista = modo === "brasil" ? gruposBr : grupos;
  const abertoChave = fixo ?? sobre;
  const aberto = lista.find((g) => g.chave === abertoChave) ?? null;
  const posAberto = aberto ? posicao(aberto) : null;

  // Esc fecha o cartão (também o que abriu por foco ou mouse); clicar fora fecha o que está fixo.
  useEffect(() => {
    if (!abertoChave) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setFixo(null);
      setSobre(null);
    };
    const fora = (e: MouseEvent) => !(e.target as Element).closest?.(`.${styles.palco}`) && setFixo(null);
    document.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", fora);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fora);
    };
  }, [abertoChave]);

  const totalPessoas = pins.length;
  const rotulo = (g: Grupo) => `${[g.cidade, g.uf ?? (g.pais !== "BR" ? g.pais : null)].filter(Boolean).join(", ")}: ${t("mapaPessoas", { n: g.pessoas.length })}`;

  return (
    <div ref={raiz} className={styles.mapa} data-theme="escuro" data-pronto={!!dados} data-modo={modo}>
      <div className={styles.barra}>
        <h3 className={styles.titulo}>{t("mapaTitulo")}</h3>
        <div className={styles.modos} role="group" aria-label={t("mapaTitulo")}>
          <button type="button" aria-pressed={modo === "brasil"} onClick={() => { setModo("brasil"); setFixo(null); setSobre(null); }}>
            {t("mapaBrasil")}
          </button>
          <button type="button" aria-pressed={modo === "mundo"} onClick={() => { setModo("mundo"); setFixo(null); setSobre(null); }}>
            {t("mapaMundo")}
          </button>
        </div>
      </div>

      <div className={styles.palco} data-modo={modo}>
        {!dados || !geometria ? (
          <p className={styles.carregando} role="status">
            {t("mapaCarregando")}
          </p>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${geometria.largura} ${geometria.altura}`}
              className={styles.svg}
              role="group"
              aria-label={t("mapaResumo", { n: totalPessoas })}
              onPointerDown={(e) => {
                if (modo !== "mundo" || (e.target as Element).closest("[data-pin]")) return;
                arrasto.current = { x: e.clientX, y: e.clientY, rot };
                setArrastando(true);
                (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!arrasto.current) return;
                const a = arrasto.current;
                setRot([a.rot[0] + (e.clientX - a.x) * 0.35, Math.max(-75, Math.min(75, a.rot[1] - (e.clientY - a.y) * 0.35))]);
              }}
              onPointerUp={() => {
                arrasto.current = null;
                setArrastando(false);
              }}
            >
              <defs>
                <filter id="brilho-pin" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3.5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="atmosfera" cx="50%" cy="50%" r="50%">
                  <stop offset="86%" stopColor="var(--accent)" stopOpacity="0.0" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.35" />
                </radialGradient>
              </defs>

              {modo === "mundo" && (
                <>
                  <circle cx={TAM_GLOBO / 2} cy={TAM_GLOBO / 2} r={TAM_GLOBO / 2 - 2} fill="url(#atmosfera)" />
                  <path d={geometria.caminho({ type: "Sphere" }) ?? ""} className={styles.oceano} />
                  <path d={geometria.caminho(grade) ?? ""} className={styles.grade} />
                  <path d={geometria.caminho(dados.terra) ?? ""} className={styles.terra} />
                  <path d={geometria.caminho(dados.fronteiras) ?? ""} className={styles.fronteiras} />
                </>
              )}

              {modo === "brasil" &&
                dados.brasil.features.map((f, i) => {
                  const estado = estadoPorCodarea(String((f.properties as { codarea?: string } | null)?.codarea ?? ""));
                  const n = estado ? porUf[estado.sigla] ?? 0 : 0;
                  return (
                    <path
                      key={i}
                      d={geometria.caminho(f) ?? ""}
                      className={n > 0 ? styles.estadoComAluno : styles.estado}
                      style={{ ["--i" as string]: i }}
                    >
                      {estado && <title>{n > 0 ? `${estado.nome}: ${t("mapaPessoas", { n: n })}` : estado.nome}</title>}
                    </path>
                  );
                })}

              {lista.map((g, i) => {
                const p = posicao(g);
                if (!p) return null;
                const ativo = g.chave === abertoChave;
                const raio = (g.pessoas.length > 1 ? 10 : 6) + (ativo ? 2 : 0);
                return (
                  <g key={g.chave} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
                  <g
                    data-pin
                    className={styles.pin}
                    data-ativo={ativo}
                    style={{ ["--i" as string]: i }}
                    tabIndex={0}
                    role="button"
                    aria-label={rotulo(g)}
                    aria-expanded={ativo}
                    onMouseEnter={() => setSobre(g.chave)}
                    onMouseLeave={() => setSobre((s) => (s === g.chave ? null : s))}
                    onFocus={() => setSobre(g.chave)}
                    onBlur={() => setSobre((s) => (s === g.chave ? null : s))}
                    onClick={() => setFixo((f) => (f === g.chave ? null : g.chave))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setFixo((f) => (f === g.chave ? null : g.chave));
                      }
                    }}
                  >
                    <circle r={raio + 5} className={styles.pinOnda} />
                    <circle r={raio} className={styles.pinPonto} filter="url(#brilho-pin)" />
                    {g.pessoas.length > 1 && (
                      <text className={styles.pinNumero} y={3.5} textAnchor="middle" aria-hidden="true">
                        {g.pessoas.length}
                      </text>
                    )}
                  </g>
                  </g>
                );
              })}
            </svg>

            {aberto && posAberto && (
              <div
                className={styles.cartao}
                role="dialog"
                aria-label={rotulo(aberto)}
                data-abaixo={posAberto.y / geometria.altura < 0.38}
                data-direita={posAberto.x / geometria.largura > 0.62}
                data-esquerda={posAberto.x / geometria.largura < 0.28}
                style={{ left: `${(posAberto.x / geometria.largura) * 100}%`, top: `${(posAberto.y / geometria.altura) * 100}%` }}
                onMouseEnter={() => setSobre(aberto.chave)}
                onMouseLeave={() => setSobre(null)}
              >
                {fixo && (
                  <button type="button" className={styles.cartaoFechar} aria-label={t("fechar")} onClick={() => setFixo(null)}>
                    ×
                  </button>
                )}
                <p className={styles.cartaoLocal}>{[aberto.cidade, aberto.uf ?? (aberto.pais !== "BR" ? aberto.pais : null)].filter(Boolean).join(", ")}</p>
                <ul className={styles.cartaoLista}>
                  {aberto.pessoas.slice(0, 5).map((p) => (
                    <li key={p.id} className={styles.cartaoPessoa}>
                      {p.fotoUrl ? <Image src={p.fotoUrl} alt={p.fotoAlt ?? ""} width={44} height={44} className={styles.cartaoFoto} /> : <span className={styles.cartaoInicial} aria-hidden="true">{p.nome.trim()[0]}</span>}
                      <span>
                        <strong>{p.nome}</strong>
                        {p.profissao && <span className={styles.cartaoProfissao}>{p.profissao}</span>}
                        {p.depoimentoId && (
                          <a href={`#depoimento-${p.depoimentoId}`} className={styles.cartaoLink} onClick={() => setFixo(null)}>
                            {t("lerDepoimento")}
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {aberto.pessoas.length > 5 && <p className={styles.cartaoMais}>{t("outrosN", { n: aberto.pessoas.length - 5 })}</p>}
              </div>
            )}
            {modo === "mundo" && <p className={styles.dica}>{t("arrastar")}</p>}
          </>
        )}
      </div>
    </div>
  );
}
