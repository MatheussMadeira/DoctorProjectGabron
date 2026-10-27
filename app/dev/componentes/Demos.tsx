"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/atoms/Badge";
import { Tabs } from "@/components/molecules/Tabs";
import { DataTable } from "@/components/organisms/DataTable";
import { ExcluirTurmaDialog } from "@/components/organisms/ExcluirTurmaDialog";
import { LoginForm } from "@/components/organisms/LoginForm";

/* Demonstrações que precisam de estado ou de funções, só para a página de conferência. */

export function TabsDemo() {
  const [v, setV] = useState("proximas");
  return (
    <Tabs
      value={v}
      onChange={setV}
      items={[
        { value: "proximas", label: "Próximas", count: 3 },
        { value: "rascunhos", label: "Rascunhos", count: 1 },
        { value: "realizadas", label: "Realizadas", count: 8 },
        { value: "todas", label: "Todas" },
      ]}
    />
  );
}

type Row = { id: number; turma: string; data: string; local: string; inscritos: string; status: "aberto" | "ultimas" };

const ROWS: Row[] = [
  { id: 1, turma: "Toxina botulínica · Módulo essencial", data: "14–15 mar 2026", local: "Belo Horizonte", inscritos: "8 / 12", status: "aberto" },
  { id: 2, turma: "Toxina botulínica · Módulo avançado", data: "18 abr 2026", local: "Belo Horizonte", inscritos: "11 / 12", status: "ultimas" },
];

export function DataTableDemo() {
  const noop = () => {};
  return (
    <DataTable
      rows={ROWS}
      onView={noop}
      onEdit={noop}
      onDelete={noop}
      columns={[
        { key: "turma", label: "Turma" },
        { key: "data", label: "Data" },
        { key: "local", label: "Local" },
        { key: "inscritos", label: "Inscritos", align: "right" },
        {
          key: "status",
          label: "Status",
          render: (r) => (r.status === "aberto" ? <Badge tone="success">Inscrições abertas</Badge> : <Badge tone="warning">Últimas vagas</Badge>),
        },
      ]}
    />
  );
}

export function PlusIcon() {
  return <Plus size={18} strokeWidth={1.5} aria-hidden />;
}

export function ExcluirDialogDemo({ podeExcluir }: { podeExcluir: boolean }) {
  const semEfeito = async () => ({});
  return (
    <ExcluirTurmaDialog
      curso="Aplicação avançada e intercorrências"
      data="05/12/2026"
      local="Belo Horizonte, MG"
      inscritos={9}
      podeExcluir={podeExcluir}
      excluir={semEfeito}
      mudarParaRascunho={semEfeito}
    />
  );
}

export function LoginDemo({ erro }: { erro?: "invalida" | "bloqueada" }) {
  return <LoginForm acao={async (anterior) => anterior} estadoInicial={{ erro, email: erro ? "nome@dominio.com.br" : undefined }} />;
}
