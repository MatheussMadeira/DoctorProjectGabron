import type { Metadata } from "next";
import { Alert } from "@/components/molecules/Alert";
import { AdminCard } from "@/components/molecules/AdminCard";
import { Badge } from "@/components/atoms";
import { AdminTable, EmailsDaLinha, FiltroTurma, SituacaoSelect } from "@/components/organisms";
import { listarInscricoes, listarMensagens } from "@/lib/admin-inscricoes";
import { listarTurmasAdmin } from "@/lib/admin-turmas";
import { STATUS } from "@/lib/agenda";
import { formatarDataCurta } from "@/lib/datas";
import { ROTULO_SITUACAO, TOM_SITUACAO } from "@/lib/situacoes";
import { exigirPermissao } from "@/lib/sessao";
import { PaginaAdmin } from "../pagina";
import { alterarSituacao, reenviarEmail } from "./acoes";
import styles from "@/components/admin.module.css";

export const metadata: Metadata = { title: "Inscrições" };

const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function InscricoesAdminPage({ searchParams }: PageProps<"/admin/inscricoes">) {
  const [usuario, params] = await Promise.all([exigirPermissao("inscricao:gerir"), searchParams]);
  const turmas = (await listarTurmasAdmin()).filter((t) => t.status !== "rascunho");
  const mensagens = await listarMensagens();

  // Sem ?turma=, abre a próxima turma que ainda não aconteceu (ou a mais recente).
  const escolhida = turmas.find((t) => t.id === params.turma) ?? turmas.find((t) => t.status !== "encerrado") ?? turmas[turmas.length - 1];
  const linhas = escolhida ? await listarInscricoes(escolhida.id) : [];

  return (
    <PaginaAdmin
      usuario={usuario}
      ativo="inscricoes"
      titulo="Inscrições"
      acoes={
        escolhida && (
          <a className="ap-btn ap-btn-secondary ap-btn-sm" href={`/admin/inscricoes/exportar?turma=${escolhida.id}`} download>
            <span className="ap-btn-label">Exportar planilha</span>
          </a>
        )
      }
    >
      <div className={styles.pilha}>
        {!escolhida ? (
          <Alert tone="info" title="Nenhuma turma publicada">
            Quando houver turmas publicadas, as inscrições feitas pelo site aparecem aqui.
          </Alert>
        ) : (
          <>
            <div className={styles.filtro}>
              <FiltroTurma
                valor={escolhida.id}
                opcoes={turmas.map((t) => ({ value: t.id, label: `${t.tituloCurto ?? t.titulo} · ${formatarDataCurta(t.inicio, t.fim)}` }))}
              />
              <div className={styles.resumo}>
                <Badge tone={STATUS[escolhida.status as keyof typeof STATUS].tone}>{STATUS[escolhida.status as keyof typeof STATUS].label}</Badge>
                <span>
                  <strong>{escolhida.ocupadas}</strong> de {escolhida.vagas} vagas preenchidas · {escolhida.listaEspera} na lista de espera
                </span>
              </div>
            </div>

            <AdminTable
              vazio="Nenhuma inscrição nesta turma ainda. Elas aparecem aqui assim que chegarem."
              linhas={linhas}
              colunas={[
                { key: "nome", label: "Nome", render: (i) => (<div className={styles.nomeCelula}><strong>{i.nome}</strong><span>{i.email}</span></div>) },
                { key: "profissao", label: "Profissão" },
                { key: "registro", label: "Registro", render: (i) => `${i.conselho} ${i.registro}` },
                { key: "telefone", label: "Contato" },
                { key: "createdAt", label: "Inscrição", render: (i) => (<div className={styles.nomeCelula}><strong>{dataHora.format(i.createdAt)}</strong><span>Aceite da política: {dataHora.format(i.aceitePrivacidadeEm)}</span></div>) },
                {
                  key: "situacao",
                  label: "Situação",
                  render: (i) => (
                    <div className={styles.pilhaCurta}>
                      <Badge tone={TOM_SITUACAO[i.situacao]} icon={false}>
                        {ROTULO_SITUACAO[i.situacao]}
                      </Badge>
                      <SituacaoSelect situacao={i.situacao} rotulo={i.nome} acao={alterarSituacao.bind(null, i.id)} />
                    </div>
                  ),
                },
                { key: "emails", label: "E-mails", render: (i) => <EmailsDaLinha emails={i.emails} acao={reenviarEmail} /> },
              ]}
            />
            <p className={styles.nota}>Confira o registro no conselho antes de confirmar cada vaga.</p>
          </>
        )}

        <AdminCard titulo="Mensagens de contato">
          <p className={styles.muted}>As últimas mensagens do formulário de contato. Se o aviso por e-mail falhar, a mensagem continua aqui e dá para reenviar.</p>
          <AdminTable
            vazio="Nenhuma mensagem ainda."
            linhas={mensagens}
            colunas={[
              { key: "nome", label: "Nome", render: (m) => (<div className={styles.nomeCelula}><strong>{m.nome}</strong><span>{m.email}</span></div>) },
              { key: "assunto", label: "Assunto" },
              { key: "mensagem", label: "Mensagem", render: (m) => (m.mensagem ? (m.mensagem.length > 120 ? `${m.mensagem.slice(0, 120)}…` : m.mensagem) : "Sem mensagem") },
              { key: "createdAt", label: "Data", render: (m) => dataHora.format(m.createdAt) },
              { key: "emails", label: "E-mail", render: (m) => <EmailsDaLinha emails={m.emails} acao={reenviarEmail} /> },
            ]}
          />
        </AdminCard>
      </div>
    </PaginaAdmin>
  );
}
