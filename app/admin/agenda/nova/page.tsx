import type { Metadata } from "next";
import { Button } from "@/components/atoms";
import { TURMA_NOVA, TurmaForm } from "@/components/organisms";
import { exigirPermissao } from "@/lib/sessao";
import { salvarTurma } from "../../acoes-turma";
import { PaginaAdmin } from "../../pagina";

export const metadata: Metadata = { title: "Nova data" };

export default async function NovaTurmaPage() {
  const usuario = await exigirPermissao("turma:criar");
  return (
    <PaginaAdmin
      usuario={usuario}
      ativo="agenda"
      titulo="Nova data"
      acoes={
        <Button size="sm" variant="ghost" href="/admin/agenda">
          Voltar para a agenda
        </Button>
      }
    >
      <TurmaForm acao={salvarTurma.bind(null, null)} valores={TURMA_NOVA} />
    </PaginaAdmin>
  );
}
