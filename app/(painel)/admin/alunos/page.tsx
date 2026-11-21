import type { Metadata } from "next";
import { ConfiguracoesTabsBase } from "@/components/molecules/ConfiguracoesTabs";
import { AlunosAdmin, ComentariosAdmin } from "@/components/organisms/AlunosAdmin";
import { MateriaisAdmin } from "@/components/organisms/MateriaisAdmin";
import { listarAlunosAdmin, listarComentariosAdmin, listarModulosAdmin, listarTurmasParaMateriais } from "@/lib/admin-alunos";
import { dadosDeTraducao, type DadosDeTraducao } from "@/lib/i18n/admin";
import { pode } from "@/lib/permissoes";
import { exigirSessao } from "@/lib/sessao";
import { PaginaAdmin } from "../pagina";
import styles from "@/components/admin.module.css";

export const metadata: Metadata = { title: "Alunos" };

const ABAS = ["alunos", "materiais", "comentarios"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AlunosAdminPage({ searchParams }: PageProps<"/admin/alunos">) {
  const [usuario, params] = await Promise.all([exigirSessao(), searchParams]);
  const pedida = String(params.aba ?? "");
  const aba = (ABAS as readonly string[]).includes(pedida) ? (pedida as (typeof ABAS)[number]) : "alunos";
  const admin = pode(usuario.papel, "alunos:gerir");
  const turmaPedida = String(params.turma ?? "");

  const [alunos, turmas, comentarios] = admin
    ? await Promise.all([aba === "alunos" ? listarAlunosAdmin() : Promise.resolve([]), aba === "materiais" ? listarTurmasParaMateriais() : Promise.resolve([]), aba === "comentarios" ? listarComentariosAdmin() : Promise.resolve([])])
    : [[], [], []];
  const turmaId = admin && aba === "materiais" && UUID.test(turmaPedida) && turmas.some((t) => t.id === turmaPedida) ? turmaPedida : null;
  const modulos = turmaId ? await listarModulosAdmin(turmaId) : [];
  const traducoesModulos: Record<string, DadosDeTraducao> = {};
  const traducoesMateriais: Record<string, DadosDeTraducao> = {};
  for (const m of modulos) {
    const d = await dadosDeTraducao("alunoModulo", m.id);
    if (d) traducoesModulos[m.id] = d;
    for (const x of m.materiais) {
      const t = await dadosDeTraducao("alunoMaterial", x.id);
      if (t) traducoesMateriais[x.id] = t;
    }
  }

  return (
    <PaginaAdmin usuario={usuario} ativo="alunos" titulo="Alunos">
      <div className={styles.pilha}>
        {!admin && <p className={styles.muted}>Só administradores editam a área do aluno.</p>}
        {admin && (
          <>
            <ConfiguracoesTabsBase
              base="/admin/alunos"
              valor={aba}
              rotulo="Seções da área do aluno"
              items={[
                { value: "alunos", label: "Alunos" },
                { value: "materiais", label: "Materiais" },
                { value: "comentarios", label: "Comentários" },
              ]}
            />
            {aba === "alunos" && <AlunosAdmin alunos={alunos} />}
            {aba === "materiais" && <MateriaisAdmin turmas={turmas} turmaId={turmaId} modulos={modulos} traducoesModulos={traducoesModulos} traducoesMateriais={traducoesMateriais} />}
            {aba === "comentarios" && <ComentariosAdmin comentarios={comentarios} />}
          </>
        )}
      </div>
    </PaginaAdmin>
  );
}
