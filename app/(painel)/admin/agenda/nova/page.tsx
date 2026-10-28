import type { Metadata } from "next";
import { Button } from "@/components/atoms";
import { TURMA_NOVA, TurmaForm } from "@/components/organisms";
import { listarProfessoresAdmin } from "@/lib/admin-professores";
import { exigirPermissao } from "@/lib/sessao";
import { salvarTurma } from "../../acoes-turma";
import { PaginaAdmin } from "../../pagina";

export const metadata: Metadata = { title: "Nova data" };

export default async function NovaTurmaPage() {
  // Primeiro a sessão (dado de requisição), depois o banco: no build, consulta antes disso é tratada como valor instável.
  const usuario = await exigirPermissao("turma:criar");
  const professores = await listarProfessoresAdmin();
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
      <TurmaForm acao={salvarTurma.bind(null, null)} valores={TURMA_NOVA} professores={professores} />
    </PaginaAdmin>
  );
}
