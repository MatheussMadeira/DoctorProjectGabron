"use client";

import { useRouter } from "next/navigation";
import { Tabs, type TabItem } from "./Tabs";

/** Abas de uma página do painel: a aba fica na URL (?aba=), então dá para recarregar e compartilhar o link. */
export function ConfiguracoesTabsBase({ items, valor, base, rotulo }: { items: TabItem[]; valor: string; base: string; rotulo: string }) {
  const router = useRouter();
  return <Tabs items={items} value={valor} label={rotulo} onChange={(v) => router.replace(`${base}?aba=${v}`)} />;
}

/** Abas de Configurações. */
export function ConfiguracoesTabs({ items, valor }: { items: TabItem[]; valor: string }) {
  return <ConfiguracoesTabsBase items={items} valor={valor} base="/admin/configuracoes" rotulo="Seções das configurações" />;
}
