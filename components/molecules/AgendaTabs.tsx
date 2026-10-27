"use client";

import { useRouter } from "next/navigation";
import { Tabs, type TabItem } from "./Tabs";

/** Abas da agenda do painel: o filtro fica na URL (?filtro=), então dá para compartilhar e recarregar. */
export function AgendaTabs({ items, valor }: { items: TabItem[]; valor: string }) {
  const router = useRouter();
  return <Tabs items={items} value={valor} label="Filtrar datas" onChange={(v) => router.replace(v === "proximas" ? "/admin/agenda" : `/admin/agenda?filtro=${v}`)} />;
}
