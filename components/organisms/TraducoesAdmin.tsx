"use client";

import { useState, useTransition } from "react";
import { salvarTraducao, traduzirDeNovo, type EstadoTraducao } from "@/app/(painel)/admin/acoes-i18n";
import type { DadosDeTraducao, TraducaoSerial } from "@/lib/i18n/admin";
import { extrairTextos } from "@/lib/i18n/estrutura";
import { IDIOMAS, IDIOMAS_TRADUZIDOS, type Locale } from "@/lib/i18n/idiomas";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import { Alert } from "../molecules/Alert";
import { TextField } from "../molecules/TextField";
import styles from "../admin.module.css";

/* Abas por idioma (PT / EN / ES / FR / IT / DE / ZH) para revisar as traduções de uma entidade. O português é só leitura (vem do
   formulário acima); cada aba mostra o selo "tradução automática, não revisada" até alguém marcar "revisada". */

type Situacao = "sem" | "automatica" | "desatualizada" | "revisada";

const situacaoDe = (t: TraducaoSerial | undefined): Situacao => (!t ? "sem" : t.precisaRevisar ? "desatualizada" : t.status === "revisada" ? "revisada" : "automatica");

function Aba({ dados, locale }: { dados: DadosDeTraducao; locale: Locale }) {
  const traducao = dados.traducoes.find((t) => t.locale === locale);
  const situacao = situacaoDe(traducao);
  const campos = Object.entries(dados.origem);
  // Textos por campo, na ordem do português; o que ainda não foi traduzido começa vazio.
  const inicial = Object.fromEntries(campos.map(([campo, pt]) => [campo, extrairTextos(pt).map((_, i) => extrairTextos(traducao?.conteudo[campo] ?? null)[i] ?? "")]));
  const [valores, setValores] = useState<Record<string, string[]>>(inicial);
  const [revisada, setRevisada] = useState(situacao === "revisada");
  const [estado, setEstado] = useState<EstadoTraducao>({});
  const [pendente, iniciar] = useTransition();

  const mudar = (campo: string, i: number, v: string) => setValores((a) => ({ ...a, [campo]: a[campo].map((x, j) => (j === i ? v : x)) }));

  return (
    <div className={styles.pilha} role="tabpanel" aria-label={IDIOMAS[locale].nome}>
      <div className={styles.linhaTraducao}>
        <Badge tone={situacao === "revisada" ? "success" : situacao === "sem" ? "neutral" : "warning"}>
          {situacao === "revisada" ? "Revisada" : situacao === "sem" ? "Sem tradução: o site mostra o português" : "Tradução automática, não revisada"}
        </Badge>
        {traducao && <span className={styles.nota}>Atualizada em {new Date(traducao.atualizadaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</span>}
      </div>
      {situacao === "desatualizada" && (
        <Alert tone="warning" title="Precisa revisar de novo">
          O português mudou depois da última revisão. A tradução automática nova já está no site no lugar da revisada; confira e marque como revisada.
        </Alert>
      )}
      {estado.erro && (
        <Alert tone="danger" title="Não foi possível concluir">
          {estado.erro}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title="Pronto">
          {estado.mensagem}
        </Alert>
      )}
      {campos.length === 0 && <p className={styles.muted}>Ainda não há texto em português para traduzir.</p>}
      {campos.map(([campo, pt]) => {
        const textosPt = extrairTextos(pt);
        return (
          <fieldset key={campo} className={styles.campoTraducao}>
            <legend>{dados.rotulos[campo] ?? campo}</legend>
            {textosPt.map((textoPt, i) => (
              <div key={i} className={styles.parTraducao}>
                <p className={styles.nota} lang="pt-BR">
                  <span className="ap-sr">Em português: </span>
                  {textoPt}
                </p>
                <TextField
                  label={textosPt.length > 1 ? `${dados.rotulos[campo] ?? campo} (${i + 1})` : (dados.rotulos[campo] ?? campo)}
                  multiline={textoPt.length > 90 || textoPt.includes("\n")}
                  rows={Math.min(8, Math.max(2, Math.ceil(textoPt.length / 80)))}
                  lang={IDIOMAS[locale].lang}
                  value={valores[campo]?.[i] ?? ""}
                  onChange={(e) => mudar(campo, i, e.target.value)}
                />
              </div>
            ))}
          </fieldset>
        );
      })}
      {campos.length > 0 && (
        <div className={styles.rodape}>
          <Checkbox label="Marcar como revisada" hint="Tira o selo de tradução automática. Se o português mudar depois, ela volta a ser rascunho." checked={revisada} onChange={(e) => setRevisada(e.target.checked)} />
          <Button
            type="button"
            variant="ghost"
            disabled={pendente}
            onClick={() => {
              if (traducao?.status === "revisada" && !window.confirm("Isto troca a tradução revisada por uma automática nova. Continuar?")) return;
              iniciar(async () => setEstado(await traduzirDeNovo(dados.entidade, dados.id, locale)));
            }}
          >
            Traduzir de novo com a DeepL
          </Button>
          <Button type="button" disabled={pendente} onClick={() => iniciar(async () => setEstado(await salvarTraducao(dados.entidade, dados.id, locale, valores, revisada)))}>
            {pendente ? "Salvando…" : "Salvar tradução"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function TraducoesAdmin({ dados }: { dados: DadosDeTraducao }) {
  const [locale, setLocale] = useState<Locale>("en");
  return (
    <section className={styles.cartaoTraducoes} aria-label="Traduções">
      <h3 className={styles.titulo}>Traduções</h3>
      <p className={styles.nota}>O português é a fonte. Ao salvar, a DeepL traduz o que mudou; confira aqui. Sem tradução, o site mostra o português.</p>
      <div className={styles.abasIdioma} role="tablist" aria-label="Idioma da tradução">
        <button type="button" role="tab" aria-selected="false" disabled className={styles.abaIdioma} title="O português é editado no formulário">
          PT
        </button>
        {IDIOMAS_TRADUZIDOS.map((l) => {
          const s = situacaoDe(dados.traducoes.find((t) => t.locale === l));
          return (
            <button key={l} type="button" role="tab" aria-selected={locale === l} className={styles.abaIdioma} onClick={() => setLocale(l)}>
              {IDIOMAS[l].sigla}
              <span className={styles.pontoSituacao} data-situacao={s} aria-label={s === "revisada" ? "revisada" : s === "sem" ? "sem tradução" : "não revisada"} />
            </button>
          );
        })}
      </div>
      <Aba key={locale} dados={dados} locale={locale} />
    </section>
  );
}
