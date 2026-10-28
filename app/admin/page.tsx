import type { Metadata } from "next";
import { Eye, Pencil, Plus } from "lucide-react";
import { ICON } from "@/lib/icon";
import { Alert } from "@/components/molecules/Alert";
import { KpiCard } from "@/components/molecules/AdminCard";
import { AppLink, Badge, Button } from "@/components/atoms";
import { AdminTable } from "@/components/organisms";
import { inscricoesRecentes, listarTurmasAdmin, totalARConferir } from "@/lib/admin-turmas";
import { STATUS } from "@/lib/agenda";
import { formatarDataCurta } from "@/lib/datas";
import { resumoDeDescartes } from "@/lib/descartes";
import { exigirSessao } from "@/lib/sessao";
import { PaginaAdmin } from "./pagina";
import styles from "@/components/admin.module.css";

export const metadata: Metadata = { title: "Painel" };

const dataBR = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);

export default async function PainelPage({ searchParams }: PageProps<"/admin">) {
  const [usuario, params] = await Promise.all([exigirSessao(), searchParams]);
  const souAdmin = usuario.papel === "ADMIN";
  const [turmas, recentes, aConferir, descartes] = await Promise.all([listarTurmasAdmin(), inscricoesRecentes(4), totalARConferir(), souAdmin ? resumoDeDescartes(7) : Promise.resolve([])]);
  const descartados = (motivo: string) => descartes.filter((d) => d.motivo === motivo).reduce((n, d) => n + d.total, 0);

  const proximas = turmas.filter((t) => t.status !== "rascunho" && t.status !== "encerrado");
  const inscritos = proximas.reduce((n, t) => n + t.ocupadas, 0);
  // "Em breve" ainda não abriu vagas: não entra na conta de vagas livres.
  const vagasLivres = proximas.filter((t) => t.status !== "em-breve").reduce((n, t) => n + Math.max(0, t.vagas - t.ocupadas), 0);

  return (
    <PaginaAdmin
      usuario={usuario}
      ativo="painel"
      titulo="Painel"
      acoes={
        <Button size="sm" href="/admin/agenda/nova" icon={<Plus {...ICON} size={18} />}>
          Nova data
        </Button>
      }
    >
      <div className={styles.pilha}>
        {params.aviso === "sem-permissao" && (
          <Alert tone="warning" title="Sem permissão">
            O seu acesso não inclui essa área. Fale com a Dra. se precisar dela.
          </Alert>
        )}
        <p className={styles.muted}>Resumo das próximas turmas. Os números vêm das datas e inscrições cadastradas.</p>

        <div className={styles.kpis}>
          <KpiCard rotulo="Próximas turmas" valor={proximas.length} nota="Publicadas e ainda por acontecer" />
          <KpiCard rotulo="Inscritos" valor={inscritos} nota="Nas próximas turmas" />
          <KpiCard rotulo="Vagas livres" valor={vagasLivres} nota="Somando as turmas com inscrições abertas" />
          <KpiCard rotulo="A conferir" valor={aConferir} nota="Registros no conselho" />
        </div>

        {souAdmin && (
          <div className={styles.pilha}>
            <h2 className={styles.titulo}>Envios barrados nos formulários (7 dias)</h2>
            <div className={styles.kpis}>
              <KpiCard rotulo="Parecem robô" valor={descartados("ARMADILHA")} nota="Campo escondido preenchido" />
              <KpiCard rotulo="Rápido demais" valor={descartados("TEMPO")} nota="Enviado em menos de 2 segundos" />
              <KpiCard rotulo="Sem carimbo" valor={descartados("CARIMBO")} nota="Envio direto ou página aberta há mais de 12 horas" />
              <KpiCard rotulo="Limite de envios" valor={descartados("LIMITE")} nota="Muitas tentativas do mesmo visitante" />
            </div>
            <p className={styles.nota}>
              Se “Rápido demais”, “Sem carimbo” ou “Limite de envios” subirem sem explicação, pessoas reais podem estar sendo barradas: avise quem cuida do site. Erros de preenchimento (campo vazio ou inválido) não entram nesta conta; somaram {descartados("VALIDACAO")}.
            </p>
          </div>
        )}

        <div className={styles.colunas}>
          <div className={styles.colunaGrande}>
            <h2 className={styles.titulo}>Próximas turmas</h2>
            <AdminTable
              vazio="Nenhuma turma publicada por enquanto."
              linhas={proximas.slice(0, 4)}
              colunas={[
                { key: "titulo", label: "Turma" },
                { key: "data", label: "Data", render: (t) => formatarDataCurta(t.inicio, t.fim) },
                { key: "inscritos", label: "Inscritos", align: "right", render: (t) => `${t.ocupadas} / ${t.vagas}` },
                { key: "status", label: "Status", render: (t) => <Badge tone={t.status === "rascunho" ? "neutral" : STATUS[t.status].tone}>{t.status === "rascunho" ? "Rascunho" : STATUS[t.status].label}</Badge> },
              ]}
              acoes={(t) => (
                <>
                  <AppLink className={styles.iconeLink} href={`/admin/inscricoes?turma=${t.id}`} aria-label={`Ver inscrições: ${t.titulo}`}>
                    <Eye {...ICON} size={18} />
                  </AppLink>
                  <AppLink className={styles.iconeLink} href={`/admin/agenda/${t.id}`} aria-label={`Editar: ${t.titulo}`}>
                    <Pencil {...ICON} size={18} />
                  </AppLink>
                </>
              )}
            />
          </div>
          <div className={styles.colunaPequena}>
            <h2 className={styles.titulo}>Inscrições recentes</h2>
            <AdminTable
              vazio="Nenhuma inscrição ainda. Elas aparecem aqui assim que chegarem."
              linhas={recentes}
              colunas={[
                { key: "nome", label: "Nome" },
                { key: "turma", label: "Turma", render: (r) => `${r.turma ?? r.titulo} · ${formatarDataCurta(r.inicio).slice(0, 5)}` },
                { key: "data", label: "Data", render: (r) => dataBR(r.createdAt) },
              ]}
            />
          </div>
        </div>
      </div>
    </PaginaAdmin>
  );
}
