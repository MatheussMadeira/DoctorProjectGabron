"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { excluirDepoimento, moverDepoimento, salvarDepoimento, type EstadoDepoimento } from "@/app/(painel)/admin/acoes-curso";
import type { DepoimentoAdmin } from "@/lib/admin-professores";
import type { DadosDeTraducao } from "@/lib/i18n/admin";
import { enviarSemLimpar } from "@/lib/enviar-sem-limpar";
import { ICON } from "@/lib/icon";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import { Alert } from "../molecules/Alert";
import { Tabs } from "../molecules/Tabs";
import { TextField } from "../molecules/TextField";
import { AdminTable } from "./AdminTable";
import { CampoFoto } from "./CampoFoto";
import { CampoLocalizacao, type ValorLocalizacao } from "./CampoLocalizacao";
import { CampoVideo } from "./CampoVideo";
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
  const [v, setV] = useState({ nome: depoimento?.nome ?? "", profissao: depoimento?.profissao ?? "", cidade: depoimento?.cidade ?? "", texto: depoimento?.texto ?? "", autorizacao: depoimento?.autorizacaoRecebidaEm ?? (depoimento?.pendente ? (depoimento.consentimentoEm ?? "") : ""), visivel: depoimento?.visivel ?? true });
  const pendenteDoSite = !!depoimento?.pendente;
  const [loc, setLoc] = useState<ValorLocalizacao>({
    cidade: depoimento?.cidade ?? "",
    uf: depoimento?.uf ?? "",
    pais: depoimento?.pais ?? "BR",
    latitude: depoimento?.latitude != null ? String(depoimento.latitude) : "",
    longitude: depoimento?.longitude != null ? String(depoimento.longitude) : "",
  });
  const [foto, setFoto] = useState({ url: depoimento?.fotoUrl ?? "", alt: depoimento?.fotoAlt ?? "" });
  const [video, setVideo] = useState({ url: depoimento?.videoUrl ?? "", legenda: depoimento?.videoLegendaUrl ?? "" });
  const campo = (k: "nome" | "profissao" | "cidade" | "texto" | "autorizacao") => ({ value: v[k], onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })) });

  return (
    <form onSubmit={(e) => enviarSemLimpar(e, enviar)} className={styles.cartaoForm} noValidate aria-label={depoimento ? `Editar depoimento de ${depoimento.nome}` : "Novo depoimento"}>
      <h2 className={styles.titulo}>{depoimento ? "Editar depoimento" : "Novo depoimento"}</h2>
      {estado.erroGeral && (
        <Alert tone="danger" title="Não foi possível salvar">
          {estado.erroGeral}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title={estado.aprovado ? "Depoimento aprovado e publicado" : pendenteDoSite ? "Rascunho salvo" : "Depoimento salvo"}>
          {estado.aprovado ? "Já aparece no site. A DeepL preparou os rascunhos de tradução." : pendenteDoSite ? "Continua pendente: não aparece no site." : "A DeepL preparou os rascunhos de tradução."}
        </Alert>
      )}
      {pendenteDoSite && depoimento && (
        <Alert tone="warning" title="Enviado pelo site, aguardando aprovação">
          {depoimento.email ? `E-mail: ${depoimento.email}. ` : ""}
          {depoimento.consentimentoEm ? `A pessoa marcou a autorização de publicação em ${depoimento.consentimentoEm.split("-").reverse().join("/")}. ` : ""}
          {depoimento.idioma && depoimento.idioma !== "pt-BR" ? `Escrito na versão do site em ${depoimento.idioma}: traduza para o português antes de aprovar. ` : ""}
          Edite o texto se precisar e confirme a data da autorização para aprovar.
        </Alert>
      )}
      <TextField label="Nome" name="nome" required {...campo("nome")} error={erros.nome} />
      <TextField label="Profissão" name="profissao" required {...campo("profissao")} error={erros.profissao} />
      <TextField label="Depoimento" name="texto" multiline rows={5} required {...campo("texto")} error={erros.texto} />
      <CampoLocalizacao valor={loc} aoMudar={(p) => setLoc((x) => ({ ...x, ...p }))} erros={erros} />
      <p className={styles.nota}>A cidade, o estado e as coordenadas colocam este aluno no mapa da página Alumni.</p>
      <CampoFoto url={foto.url} alt={foto.alt} aoMudar={setFoto} nomeParaAlt={v.nome} titulo="Foto do aluno" inicial={(v.nome.trim()[0] || "?").toUpperCase()} erro={erros.fotoUrl} />
      <CampoVideo url={video.url} legenda={video.legenda} aoMudar={(p) => setVideo((x) => ({ url: p.url ?? x.url, legenda: p.legenda ?? x.legenda }))} erros={erros} />
      <TextField
        label={pendenteDoSite ? "Autorização recebida em (obrigatória para aprovar)" : "Autorização recebida em"}
        name="autorizacaoRecebidaEm"
        type="date"
        {...campo("autorizacao")}
        error={erros.autorizacaoRecebidaEm}
        hint="Data em que a pessoa autorizou o uso por escrito. Sem ela, o depoimento não aparece no site."
      />
      {!pendenteDoSite && <Checkbox name="visivel" label="Mostrar no site" checked={v.visivel} onChange={(e) => setV((x) => ({ ...x, visivel: e.target.checked }))} />}
      <div className={styles.rodape}>
        {pendenteDoSite ? (
          <>
            <Button type="submit" name="acao" value="salvar" variant="secondary" disabled={pendente}>
              Salvar sem aprovar
            </Button>
            <Button type="submit" name="acao" value="aprovar" disabled={pendente}>
              {pendente ? "Publicando e traduzindo…" : "Aprovar e publicar"}
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando e traduzindo…" : "Salvar depoimento"}
          </Button>
        )}
      </div>
    </form>
  );
}

export function DepoimentosAdmin({ depoimentos, traducoes = {} }: { depoimentos: DepoimentoAdmin[]; traducoes?: Record<string, DadosDeTraducao> }) {
  const [editando, setEditando] = useState<DepoimentoAdmin | null>(null);
  const [versao, setVersao] = useState(0);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<"publicados" | "pendentes">("publicados");
  const pendentes = depoimentos.filter((d) => d.pendente);
  const publicados = depoimentos.filter((d) => !d.pendente);
  const lista = aba === "pendentes" ? pendentes : publicados;
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
        <Tabs
          label="Depoimentos"
          value={aba}
          onChange={(v) => {
            setAba(v as "publicados" | "pendentes");
            setEditando(null);
            setVersao((x) => x + 1);
          }}
          items={[
            { value: "publicados", label: "Publicados", count: publicados.length },
            { value: "pendentes", label: "Pendentes", count: pendentes.length },
          ]}
        />
        <AdminTable
          vazio={aba === "pendentes" ? "Nenhum depoimento aguardando aprovação." : "Nenhum depoimento cadastrado ainda."}
          linhas={lista}
          colunas={[
            { key: "nome", label: "Depoimento", render: (d) => (<div className={styles.nomeCelula}><strong>{d.nome}</strong><span>{d.profissao} · {d.cidade}</span></div>) },
            {
              key: "situacao",
              label: "No site",
              render: (d) => (d.pendente ? <Badge tone="warning">Aguardando aprovação</Badge> : d.visivel && d.autorizacaoRecebidaEm ? <Badge tone="success">Visível</Badge> : d.visivel ? <Badge tone="warning">Falta a autorização</Badge> : <Badge tone="neutral">Oculto</Badge>),
            },
          ]}
          acoes={(d) => {
            const i = lista.findIndex((x) => x.id === d.id);
            return (
              <div className={styles.acoesLinha}>
                {!d.pendente && (
                  <>
                    <button type="button" className={styles.iconeBotao} aria-label={`Subir o depoimento de ${d.nome}`} disabled={i === 0} onClick={() => executar(() => moverDepoimento(d.id, "sobe"))}>
                      <ArrowUp {...ICON} size={18} />
                    </button>
                    <button type="button" className={styles.iconeBotao} aria-label={`Descer o depoimento de ${d.nome}`} disabled={i === lista.length - 1} onClick={() => executar(() => moverDepoimento(d.id, "desce"))}>
                      <ArrowDown {...ICON} size={18} />
                    </button>
                  </>
                )}
                <button type="button" className={styles.iconeBotao} aria-label={`Editar o depoimento de ${d.nome}`} onClick={() => { setEditando(d); setVersao((x) => x + 1); }}>
                  <Pencil {...ICON} size={18} />
                </button>
                {confirmando === d.id ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirDepoimento(d.id))}>
                    {d.pendente ? "Confirmar recusa" : "Confirmar exclusão"}
                  </Button>
                ) : (
                  <button type="button" className={styles.iconeBotao} aria-label={`${d.pendente ? "Recusar" : "Excluir"} o depoimento de ${d.nome}`} onClick={() => setConfirmando(d.id)}>
                    <Trash2 {...ICON} size={18} />
                  </button>
                )}
              </div>
            );
          }}
        />
      </div>
      <div className={styles.professoresForm}>
        {aba === "publicados" && (
          <Button type="button" size="sm" variant="secondary" onClick={() => { setEditando(null); setVersao((x) => x + 1); }}>
            Novo depoimento
          </Button>
        )}
        {editando && traducoes[editando.id] && <TraducoesAdmin key={`${editando.id}-${versao}`} dados={traducoes[editando.id]} />}
        {(aba === "publicados" || editando) && <Formulario key={`${editando?.id ?? "novo"}-${versao}`} depoimento={editando} />}
      </div>
    </div>
  );
}
