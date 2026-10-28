import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/atoms";
import { TurmaForm, type TurmaFormValores } from "@/components/organisms";
import { idsDeProfessoresDaTurma, listarProfessoresAdmin } from "@/lib/admin-professores";
import { obterTurmaAdmin } from "@/lib/admin-turmas";
import { centavosParaPreco } from "@/lib/turma-form";
import { exigirPermissao } from "@/lib/sessao";
import { salvarTurma } from "../../acoes-turma";
import { PaginaAdmin } from "../../pagina";

export const metadata: Metadata = { title: "Editar data" };

export default async function EditarTurmaPage({ params }: PageProps<"/admin/agenda/[id]">) {
  const [usuario, { id }] = await Promise.all([exigirPermissao("turma:editar"), params]);
  const [t, professores, escolhidos] = await Promise.all([obterTurmaAdmin(id), listarProfessoresAdmin(), idsDeProfessoresDaTurma(id)]);
  if (!t) notFound();

  const valores: TurmaFormValores = {
    titulo: t.titulo,
    tituloCurto: t.tituloCurto ?? "",
    resumo: t.resumo,
    descricao: t.descricao,
    modalidade: t.modalidade,
    publicacao: t.publicacao,
    inicio: t.inicio,
    fim: t.fim ?? "",
    horario: t.horario,
    cidade: t.cidade,
    local: t.local ?? "",
    vagas: String(t.vagas),
    preco: centavosParaPreco(t.precoCentavos),
    parcelamento: t.parcelamento ?? "",
    fotoUrl: t.fotoUrl,
    fotoAlt: t.fotoAlt,
    publicoAlvo: t.publicoAlvo.join("\n"),
    aprendizados: t.aprendizados.join("\n"),
    programacao: t.programacao,
    faq: t.faq,
  };

  return (
    <PaginaAdmin
      usuario={usuario}
      ativo="agenda"
      titulo="Editar data"
      acoes={
        <Button size="sm" variant="ghost" href="/admin/agenda">
          Voltar para a agenda
        </Button>
      }
    >
      {/* key: ao abrir outra data, o formulário recomeça com os valores dela. */}
      <TurmaForm key={t.id} acao={salvarTurma.bind(null, t.id)} valores={valores} ocupadas={t.ocupadas} listaEspera={t.listaEspera} professores={professores} professoresDaTurma={escolhidos} />
    </PaginaAdmin>
  );
}
