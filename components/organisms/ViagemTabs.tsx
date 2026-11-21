"use client";

import { useState, type ReactNode } from "react";
import { Tabs, type TabItem } from "../molecules/Tabs";

/* Abas da Travel info (Local, Como chegar, Hotéis…). Os painéis chegam prontos do servidor e ficam todos no HTML; só o da aba ativa aparece. */
export function ViagemTabs({ abas, paineis, rotulo }: { abas: TabItem[]; paineis: Record<string, ReactNode>; rotulo: string }) {
  const primeira = typeof abas[0] === "string" ? abas[0] : abas[0].value;
  const [ativa, setAtiva] = useState(primeira);
  return (
    <div>
      <Tabs items={abas} value={ativa} label={rotulo} onChange={setAtiva} />
      {abas.map((a) => {
        const v = typeof a === "string" ? a : a.value;
        return (
          <div key={v} role="tabpanel" hidden={ativa !== v} aria-label={typeof a === "string" ? a : a.label}>
            {paineis[v]}
          </div>
        );
      })}
    </div>
  );
}
