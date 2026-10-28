"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { excluirDepoimento, moverDepoimento, salvarDepoimento, type EstadoDepoimento } from "@/app/(painel)/admin/acoes-curso";
import type { DepoimentoAdmin } from "@/lib/admin-professores";
import type { DadosDeTraducao } from "@/lib/i18n/admin";
import { ICON } from "@/lib/icon";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import { Alert } from "../molecules/Alert";
import { TextField } from "../molecules/TextField";
import { AdminTable } from "./AdminTable";
import { TraducoesAdmin } from "./TraducoesAdmin";
import styles from "../admin.module.css";

/* Configurações › Curso › Depoimentos. Só aparece no site o depoimento visível E com a data da autorização por escrito. */

function Formulario({ depoimento }: { depoimento: DepoimentoAdmin | null }) {
  const idSalvo = useRef<string | null>(depoimento?.id ?? null);
  const [estado, enviar, pendente] = useActionState(async (anterior: EstadoDepoimento, formData: FormData) => {
    const r = await salvarDepoimento(idSalvo.current, anterior, formData);
    if (r.id) idSalvo.current = r.id;
    return r;
  }, {} as EstadoDepoimento);
  const erros = estado.erros ?? {};
  // Controlados: o React 19 limpa os campos não controlados depois de uma ação, e um erro apagaria o que foi digitado.
  const [v, setV] = useState({ nome: depoimento?.nome ?? "", profissao: depoimento?.profissao ?? "", cidade: depoimento?.cidade ?? "", texto: depoimento?.texto ?? "", autorizacao: depoimento?.autorizacaoRecebidaEm ?? "", visivel: depoimento?.visivel ?? true });
  const campo = (k: "nome" | "profissao" | "cidade" | "texto" | "autorizacao") => ({ value: v[k], onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })) });

  return (
    <form action={enviar} className={styles.cartaoForm} noValidate aria-label={depoimento ? `Editar depoimento de ${depoimento.nome}` : "Novo depoimento"}>
      <h2 className={styles.titulo}>{depoimento ? "Editar depoimento" : "Novo depoimento"}</h2>
      {estado.erroGeral && (
        <Alert tone="danger" title="Não foi possível salvar">
          {estado.erroGeral}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title="Depoimento salvo">
          A DeepL preparou os rascunhos de tradução.
        </Alert>
      )}
      <TextField label="Nome" name="nome" required {...campo("nome")} error={erros.nome} />
      <TextField label="Profissão" name="profissao" required {...campo("profissao")} error={erros.profissao} />
      <TextField label="Cidade" name="cidade" required {...campo("cidade")} error={erros.cidade} />
      <TextField label="Depoimento" name="texto" multiline rows={5} required {...campo("texto")} error={erros.texto} />
      <TextField
        label="Autorização recebida em"
        name="autorizacaoRecebidaEm"
        type="date"
        {...campo("autorizacao")}
        error={erros.autorizacaoRecebidaEm}
        hint="Data em que a pessoa autorizou o uso por escrito. Sem ela, o depoimento não aparece no site."
      />
      <Checkbox name="visivel" label="Mostrar no site" checked={v.visivel} onChange={(e) => setV((x) => ({ ...x, visivel: e.target.checked }))} />
      <div className={styles.rodape}>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando e traduzindo…" : "Salvar depoimento"}
        </Button>
      </div>
    </form>
  );
}

export function DepoimentosAdmin({ depoimentos, traducoes = {} }: { depoimentos: DepoimentoAdmin[]; traducoes?: Record<string, DadosDeTraducao> }) {
  const [editando, setEditando] = useState<DepoimentoAdmin | null>(null);
  const [versao, setVersao] = useState(0);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const executar = (fn: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      setErro((await fn()).erro ?? null);
      setConfirmando(null);
    });

  return (
    <div className={styles.professores}>
      <div className={styles.professoresLista}>
        {erro && (
          <Alert tone="danger" title="Não foi possível concluir">
            {erro}
          </Alert>
        )}
        <AdminTable
          vazio="Nenhum depoimento cadastrado ainda."
          linhas={depoimentos}
          colunas={[
            { key: "nome", label: "Depoimento", render: (d) => (<div className={styles.nomeCelula}><strong>{d.nome}</strong><span>{d.profissao} · {d.cidade}</span></div>) },
            {
              key: "situacao",
              label: "No site",
              render: (d) => (d.visivel && d.autorizacaoRecebidaEm ? <Badge tone="success">Visível</Badge> : d.visivel ? <Badge tone="warning">Falta a autorização</Badge> : <Badge tone="neutral">Oculto</Badge>),
            },
          ]}
          acoes={(d) => {
            const i = depoimentos.findIndex((x) => x.id === d.id);
            return (
              <div className={styles.acoesLinha}>
                <button type="button" className={styles.iconeBotao} aria-label={`Subir o depoimento de ${d.nome}`} disabled={i === 0} onClick={() => executar(() => moverDepoimento(d.id, "sobe"))}>
                  <ArrowUp {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Descer o depoimento de ${d.nome}`} disabled={i === depoimentos.length - 1} onClick={() => executar(() => moverDepoimento(d.id, "desce"))}>
                  <ArrowDown {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Editar o depoimento de ${d.nome}`} onClick={() => { setEditando(d); setVersao((x) => x + 1); }}>
                  <Pencil {...ICON} size={18} />
                </button>
                {confirmando === d.id ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirDepoimento(d.id))}>
                    Confirmar exclusão
                  </Button>
                ) : (
                  <button type="button" className={styles.iconeBotao} aria-label={`Excluir o depoimento de ${d.nome}`} onClick={() => setConfirmando(d.id)}>
                    <Trash2 {...ICON} size={18} />
                  </button>
                )}
              </div>
            );
          }}
        />
      </div>
      <div className={styles.professoresForm}>
        <Button type="button" size="sm" variant="secondary" onClick={() => { setEditando(null); setVersao((x) => x + 1); }}>
          Novo depoimento
        </Button>
        {editando && traducoes[editando.id] && <TraducoesAdmin key={`${editando.id}-${versao}`} dados={traducoes[editando.id]} />}
        <Formulario key={`${editando?.id ?? "novo"}-${versao}`} depoimento={editando} />
      </div>
    </div>
  );
}
