import type { Metadata } from "next";
import { Eye, Pencil, Plus } from "lucide-react";
import { ICON } from "@/lib/icon";
import { Alert } from "@/components/molecules/Alert";
import { AgendaTabs } from "@/components/molecules/AgendaTabs";
import { AppLink, Badge, Button } from "@/components/atoms";
import { AdminTable, ExcluirTurmaDialog } from "@/components/organisms";
import { listarTurmasAdmin, type StatusAdmin, type TurmaAdmin } from "@/lib/admin-turmas";
import { STATUS } from "@/lib/agenda";
import { formatarDataCurta } from "@/lib/datas";
import { pode } from "@/lib/permissoes";
import { exigirSessao } from "@/lib/sessao";
import { excluirTurma, mudarParaRascunho } from "../acoes-turma";
import { PaginaAdmin } from "../pagina";
import styles from "@/components/admin.module.css";

export const metadata: Metadata = { title: "Agenda" };

const FILTROS = ["proximas", "rascunhos", "realizadas", "todas"] as const;
type Filtro = (typeof FILTROS)[number];

const AVISOS: Record<string, string> = {
  publicada: "Data salva e publicada.",
  rascunho: "Data salva como rascunho. Ela não aparece no site.",
  excluida: "Data excluída. A página saiu do site e as inscrições ficaram arquivadas.",
};

const rotuloStatus = (s: StatusAdmin) => (s === "rascunho" ? { tone: "neutral" as const, label: "Rascunho" } : STATUS[s]);

const local = (t: TurmaAdmin) => (t.modalidade === "ONLINE" ? "Online · ao vivo" : t.cidade);

export default async function AgendaAdminPage({ searchParams }: PageProps<"/admin/agenda">) {
  const [usuario, params] = await Promise.all([exigirSessao(), searchParams]);
  const turmas = await listarTurmasAdmin();

  const proximas = turmas.filter((t) => t.status !== "rascunho" && t.status !== "encerrado");
  const rascunhos = turmas.filter((t) => t.status === "rascunho");
  const realizadas = turmas.filter((t) => t.status === "encerrado");
  const filtro: Filtro = FILTROS.includes(params.filtro as Filtro) ? (params.filtro as Filtro) : "proximas";
  const linhas = { proximas, rascunhos, realizadas, todas: turmas }[filtro];
  const aviso = typeof params.salvo === "string" ? AVISOS[params.salvo] : undefined;
  const podeExcluir = pode(usuario.papel, "turma:excluir");

  return (
    <PaginaAdmin
      usuario={usuario}
      ativo="agenda"
      titulo="Agenda"
      acoes={
        <Button size="sm" href="/admin/agenda/nova" icon={<Plus {...ICON} size={18} />}>
          Nova data
        </Button>
      }
    >
      <div className={styles.pilha}>
        {aviso && (
          <Alert tone="success" title="Pronto">
            {aviso}
          </Alert>
        )}
        <div className={styles.barra}>
          <AgendaTabs
            valor={filtro}
            items={[
              { value: "proximas", label: "Próximas", count: proximas.length },
              { value: "rascunhos", label: "Rascunhos", count: rascunhos.length },
              { value: "realizadas", label: "Realizadas", count: realizadas.length },
              { value: "todas", label: "Todas", count: turmas.length },
            ]}
          />
          <p className={styles.nota}>&quot;Últimas vagas&quot; e &quot;Esgotado&quot; são calculados pelos inscritos.</p>
        </div>
        <AdminTable
          vazio="Nenhuma data neste filtro."
          linhas={linhas}
          colunas={[
            { key: "titulo", label: "Turma" },
            { key: "data", label: "Data", render: (t) => formatarDataCurta(t.inicio, t.fim) },
            { key: "local", label: "Local", render: local },
            { key: "inscritos", label: "Inscritos", align: "right", render: (t) => `${t.ocupadas} / ${t.vagas}` },
            { key: "status", label: "Status", render: (t) => <Badge tone={rotuloStatus(t.status).tone}>{rotuloStatus(t.status).label}</Badge> },
          ]}
          acoes={(t) => (
            <>
              <AppLink className={styles.iconeLink} href={`/admin/inscricoes?turma=${t.id}`} aria-label={`Ver inscrições: ${t.titulo}`}>
                <Eye {...ICON} size={18} />
              </AppLink>
              <AppLink className={styles.iconeLink} href={`/admin/agenda/${t.id}`} aria-label={`Editar: ${t.titulo}`}>
                <Pencil {...ICON} size={18} />
              </AppLink>
              <ExcluirTurmaDialog
                curso={t.titulo}
                data={formatarDataCurta(t.inicio, t.fim)}
                local={local(t)}
                inscritos={t.ocupadas + t.listaEspera}
                podeExcluir={podeExcluir}
                excluir={excluirTurma.bind(null, t.id)}
                mudarParaRascunho={mudarParaRascunho.bind(null, t.id)}
              />
            </>
          )}
        />
      </div>
    </PaginaAdmin>
  );
}
