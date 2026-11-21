import type { Metadata } from "next";
import { ConfiguracoesTabsBase } from "@/components/molecules/ConfiguracoesTabs";
import { AlumniAlunosAdmin, AlumniTurmasAdmin } from "@/components/organisms/AlumniAdmin";
import { listarAlumniAdmin, listarAlumniTurmasAdmin } from "@/lib/admin-alumni";
import { dadosDeTraducao, type DadosDeTraducao } from "@/lib/i18n/admin";
import { pode } from "@/lib/permissoes";
import { exigirSessao } from "@/lib/sessao";
import { turmasEncerradasSemAlumni } from "../acoes-alumni";
import { PaginaAdmin } from "../pagina";
import styles from "@/components/admin.module.css";

export const metadata: Metadata = { title: "Alumni" };

const ABAS = ["turmas", "alunos"] as const;

export default async function AlumniAdminPage({ searchParams }: PageProps<"/admin/alumni">) {
  const [usuario, params] = await Promise.all([exigirSessao(), searchParams]);
  const pedida = String(params.aba ?? "");
  const aba = (ABAS as readonly string[]).includes(pedida) ? (pedida as (typeof ABAS)[number]) : "turmas";
  const admin = pode(usuario.papel, "alumni:gerir");

  const [turmas, alunos, encerradas] = admin ? await Promise.all([listarAlumniTurmasAdmin(), listarAlumniAdmin(), turmasEncerradasSemAlumni()]) : [[], [], []];
  const traducoesTurmas: Record<string, DadosDeTraducao> = {};
  const traducoesAlunos: Record<string, DadosDeTraducao> = {};
  if (admin && aba === "turmas") for (const t of turmas) { const d = await dadosDeTraducao("alumniTurma", t.id); if (d) traducoesTurmas[t.id] = d; }
  if (admin && aba === "alunos") for (const a of alunos) { const d = await dadosDeTraducao("alumni", a.id); if (d) traducoesAlunos[a.id] = d; }

  return (
    <PaginaAdmin usuario={usuario} ativo="alumni" titulo="Alumni">
      <div className={styles.pilha}>
        {!admin && <p className={styles.muted}>Só administradores editam a Alumni.</p>}
        {admin && (
          <>
            <ConfiguracoesTabsBase
              base="/admin/alumni"
              valor={aba}
              rotulo="Seções da Alumni"
              items={[
                { value: "turmas", label: "Turmas realizadas", count: turmas.length },
                { value: "alunos", label: "Alunos no mapa", count: alunos.length },
              ]}
            />
            <p className={styles.muted}>Os depoimentos (com cidade, foto e vídeo) são cadastrados em Configurações › Curso.</p>
            {aba === "turmas" && <AlumniTurmasAdmin turmas={turmas} encerradas={encerradas} traducoes={traducoesTurmas} />}
            {aba === "alunos" && <AlumniAlunosAdmin alunos={alunos} turmas={turmas} traducoes={traducoesAlunos} />}
          </>
        )}
      </div>
    </PaginaAdmin>
  );
}
