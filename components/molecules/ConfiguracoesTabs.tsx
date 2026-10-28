"use client";

import { useRouter } from "next/navigation";
import { Tabs, type TabItem } from "./Tabs";

/** Abas de Configurações: a aba fica na URL (?aba=), então dá para recarregar e compartilhar o link. */
export function ConfiguracoesTabs({ items, valor }: { items: TabItem[]; valor: string }) {
  const router = useRouter();
  return <Tabs items={items} value={valor} label="Seções das configurações" onChange={(v) => router.replace(`/admin/configuracoes?aba=${v}`)} />;
}
