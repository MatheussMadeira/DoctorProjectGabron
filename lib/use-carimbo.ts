"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { obterCarimbo } from "./carimbo-acao";
import type { EstadoFormulario } from "./formularios-tipos";

/* Carimbo de tempo do formulário (ver lib/carimbo.ts), do lado do navegador.
   - Pede o carimbo ao abrir.
   - Aba aberta de um dia para o outro: ao voltar a ficar visível depois de muito tempo, pede um carimbo novo sozinho.
   - Se mesmo assim o servidor responder que o carimbo venceu (mais de 12 h), a pessoa não vê erro: pede um carimbo novo em
     segundo plano, espera o tempo mínimo e reenvia o formulário sozinho. Só avisa se o reenvio também falhar. */

/** Carimbo com mais que isso é renovado quando a aba volta a ficar visível. */
const IDADE_PARA_RENOVAR_MS = 60 * 60 * 1000;
const MAX_REENVIOS = 2;

const instanteDe = (carimbo: string) => Number(carimbo.split(".")[0]);

export function useCarimbo(estado: EstadoFormulario): {
  carimbo: string;
  formRef: RefObject<HTMLFormElement | null>;
  /** Renovando o carimbo e reenviando em segundo plano: o botão fica como "Enviando…". */
  renovando: boolean;
  /** O reenvio automático não resolveu: mostrar o aviso de recarregar. */
  falhou: boolean;
} {
  const [carimbo, setCarimbo] = useState("");
  const [renovando, setRenovando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const atual = useRef("");
  const reenvios = useRef(0);

  const renovar = useCallback(() => {
    return obterCarimbo().then((novo) => {
      atual.current = novo;
      setCarimbo(novo);
    });
  }, []);

  useEffect(() => {
    obterCarimbo()
      .then((novo) => {
        atual.current = novo;
        setCarimbo(novo);
      })
      .catch(() => {});
  }, []);

  // Voltou à aba depois de muito tempo: carimbo novo, sem a pessoa perceber.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      if (!atual.current || Date.now() - instanteDe(atual.current) > IDADE_PARA_RENOVAR_MS) renovar().catch(() => {});
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [renovar]);

  // O servidor disse que o carimbo venceu: renova, espera o mínimo e reenvia.
  useEffect(() => {
    if (estado.renovarCarimbo === undefined) {
      if (estado.ok || estado.erroGeral || estado.erros) reenvios.current = 0;
      return;
    }
    if (reenvios.current >= MAX_REENVIOS) {
      setFalhou(true);
      return;
    }
    reenvios.current += 1;
    let vivo = true;
    setFalhou(false);
    setRenovando(true);
    (async () => {
      try {
        await renovar();
        await new Promise((r) => setTimeout(r, estado.renovarCarimbo));
        if (vivo) formRef.current?.requestSubmit();
      } catch {
        if (vivo) setFalhou(true);
      } finally {
        if (vivo) setRenovando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [estado, renovar]);

  return { carimbo, formRef, renovando, falhou };
}
