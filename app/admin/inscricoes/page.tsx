import type { Metadata } from "next";
import { Alert } from "@/components/molecules/Alert";
import { exigirPermissao } from "@/lib/sessao";
import { PaginaAdmin } from "../pagina";

export const metadata: Metadata = { title: "Inscrições" };

/* A lista de inscrições (filtro por turma, situação editável, CSV) entra na Fase 6, junto com a inscrição pelo site. */
export default async function InscricoesAdminPage() {
  const usuario = await exigirPermissao("inscricao:gerir");
  return (
    <PaginaAdmin usuario={usuario} ativo="inscricoes" titulo="Inscrições">
      <Alert tone="info" title="Disponível na próxima etapa">
        As inscrições feitas pelo site aparecem aqui, por turma, com a situação de cada pessoa e a exportação em planilha. Os totais de vagas já aparecem no Painel e na Agenda.
      </Alert>
    </PaginaAdmin>
  );
}
