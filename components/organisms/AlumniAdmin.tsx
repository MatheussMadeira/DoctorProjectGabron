"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { criarAlumniTurmaDaAgenda, excluirAlumni, excluirAlumniTurma, importarAlunosDaTurma, moverAlumniTurma, salvarAlumni, salvarAlumniTurma } from "@/app/(painel)/admin/acoes-alumni";
import type { AlumniAdmin, AlumniTurmaAdmin } from "@/lib/admin-alumni";
import type { EstadoAlumni } from "@/lib/alumni-form";
import type { DadosDeTraducao } from "@/lib/i18n/admin";
import { enviarSemLimpar } from "@/lib/enviar-sem-limpar";
import { ICON } from "@/lib/icon";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import { Alert } from "../molecules/Alert";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { AdminTable } from "./AdminTable";
import { CampoFoto } from "./CampoFoto";
import { CampoLocalizacao, type ValorLocalizacao } from "./CampoLocalizacao";
import { CampoVideo } from "./CampoVideo";
import { TraducoesAdmin } from "./TraducoesAdmin";
import styles from "../admin.module.css";

/* Alumni no painel: "Turmas realizadas" (a página de cada turma que já aconteceu) e "Alunos" (quem aparece no mapa).
   Aluno só aparece no site com "Mostrar no site" E a data da autorização por escrito. */

const dataBr = (d: string | null) => (d ? d.split("-").reverse().join("/") : "");

/* ------------------------------ Turmas realizadas ------------------------------ */

function FormularioTurma({ turma, aoCancelar }: { turma: AlumniTurmaAdmin | null; aoCancelar: () => void }) {
  const idSalvo = useRef<string | null>(turma?.id ?? null);
  const [estado, enviar, pendente] = useActionState(async (anterior: EstadoAlumni, formData: FormData) => {
    const r = await salvarAlumniTurma(idSalvo.current, anterior, formData);
    if (r.id) idSalvo.current = r.id;
    return r;
  }, {} as EstadoAlumni);
  const erros = estado.erros ?? {};
  const [v, setV] = useState({
    titulo: turma?.titulo ?? "",
    dataInicio: turma?.dataInicio ?? "",
    dataFim: turma?.dataFim ?? "",
    cidade: turma?.cidade ?? "",
    resumo: turma?.resumo ?? "",
    numeroAlunos: turma?.numeroAlunos != null ? String(turma.numeroAlunos) : "",
    visivel: turma?.visivel ?? true,
  });
  const campo = (k: "titulo" | "dataInicio" | "dataFim" | "cidade" | "resumo" | "numeroAlunos") => ({ value: v[k], onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })) });
  const [foto, setFoto] = useState({ url: turma?.fotoUrl ?? "", alt: turma?.fotoAlt ?? "" });
  const [video, setVideo] = useState({ url: turma?.videoUrl ?? "", legenda: turma?.videoLegendaUrl ?? "" });
  const [importando, iniciarImportacao] = useTransition();
  const [importacao, setImportacao] = useState<(EstadoAlumni & { semCoordenadas?: number }) | null>(null);

  return (
    <form onSubmit={(e) => enviarSemLimpar(e, enviar)} className={styles.cartaoForm} noValidate aria-label={turma ? `Editar ${turma.titulo}` : "Nova turma realizada"}>
      <h2 className={styles.titulo}>{turma ? "Editar turma realizada" : "Nova turma realizada"}</h2>
      {estado.erroGeral && (
        <Alert tone="danger" title="Não foi possível salvar">
          {estado.erroGeral}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title="Turma salva">
          O site já mostra as mudanças. A DeepL preparou os rascunhos de tradução.
        </Alert>
      )}
      <input type="hidden" name="turmaId" value={turma?.turmaId ?? ""} />
      {erros.turmaId && <p className="ap-hint ap-hint-error">{erros.turmaId}</p>}
      <TextField label="Nome da turma" name="titulo" required {...campo("titulo")} error={erros.titulo} hint="Ex.: Turma de novembro de 2026." />
      <div className={styles.linha}>
        <TextField label="Início" name="dataInicio" type="date" {...campo("dataInicio")} error={erros.dataInicio} />
        <TextField label="Fim" name="dataFim" type="date" {...campo("dataFim")} error={erros.dataFim} />
      </div>
      <TextField label="Cidade" name="cidade" {...campo("cidade")} error={erros.cidade} />
      <TextField label="Número de alunos" name="numeroAlunos" inputMode="numeric" {...campo("numeroAlunos")} error={erros.numeroAlunos} />
      <TextField label="Resumo" name="resumo" multiline rows={4} {...campo("resumo")} error={erros.resumo} hint="Duas ou três frases sobre como foi a turma." />
      <CampoFoto url={foto.url} alt={foto.alt} aoMudar={setFoto} nomeParaAlt={v.titulo} prefixoAlt="Foto da turma" formato="paisagem" titulo="Foto da turma" erro={erros.fotoUrl} />
      <CampoVideo url={video.url} legenda={video.legenda} aoMudar={(p) => setVideo((x) => ({ url: p.url ?? x.url, legenda: p.legenda ?? x.legenda }))} erros={erros} />
      <Checkbox name="visivel" label="Mostrar no site" checked={v.visivel} onChange={(e) => setV((x) => ({ ...x, visivel: e.target.checked }))} />
      <div className={styles.rodape}>
        <Button type="button" variant="ghost" onClick={aoCancelar}>
          {turma ? "Cancelar" : "Limpar"}
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando e traduzindo…" : "Salvar turma"}
        </Button>
      </div>
      {turma?.turmaId && (
        <div className={styles.pilhaCurta}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={importando}
            onClick={() => iniciarImportacao(async () => setImportacao(await importarAlunosDaTurma(turma.id)))}
          >
            {importando ? "Importando…" : "Importar alunos confirmados desta turma"}
          </Button>
          <span className={styles.nota}>Traz as inscrições confirmadas, com cidade e estado. Entram ocultos e sem autorização, na aba Alunos.</span>
          {importacao?.erroGeral && <p className="ap-hint ap-hint-error">{importacao.erroGeral}</p>}
          {importacao?.ok && (
            <p className="ap-hint">
              {importacao.importados ? `${importacao.importados} aluno(s) importado(s).` : "Nenhum aluno novo para importar."}
              {importacao.semCoordenadas ? ` ${importacao.semCoordenadas} sem coordenadas: complete na aba Alunos com "Buscar no mapa".` : ""}
            </p>
          )}
        </div>
      )}
    </form>
  );
}

export function AlumniTurmasAdmin({
  turmas,
  encerradas,
  traducoes = {},
}: {
  turmas: AlumniTurmaAdmin[];
  /** Turmas da agenda que já aconteceram e ainda não estão na Alumni. */
  encerradas: Array<{ id: string; titulo: string; inicio: string; cidade: string }>;
  traducoes?: Record<string, DadosDeTraducao>;
}) {
  const [editando, setEditando] = useState<AlumniTurmaAdmin | null>(null);
  const [versao, setVersao] = useState(0);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const executar = (fn: () => Promise<{ erro?: string; erroGeral?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      setErro(r.erro ?? r.erroGeral ?? null);
      setConfirmando(null);
    });
  const novo = () => {
    setEditando(null);
    setVersao((x) => x + 1);
  };

  return (
    <div className={styles.professores}>
      <div className={styles.professoresLista}>
        {encerradas.length > 0 && (
          <Alert tone="warning" title="Turmas que já aconteceram e ainda não estão na Alumni">
            <ul className={styles.pilhaCurta}>
              {encerradas.map((t) => (
                <li key={t.id}>
                  {t.titulo} · {dataBr(t.inicio)} · {t.cidade}{" "}
                  <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => criarAlumniTurmaDaAgenda(t.id))}>
                    Adicionar à Alumni
                  </Button>
                </li>
              ))}
            </ul>
          </Alert>
        )}
        <p className={styles.muted}>As turmas aparecem no site da mais recente para a mais antiga. Uma turma de antes do site pode ser cadastrada à mão.</p>
        {erro && (
          <Alert tone="danger" title="Não foi possível concluir">
            {erro}
          </Alert>
        )}
        <AdminTable
          vazio="Nenhuma turma realizada cadastrada ainda."
          linhas={turmas}
          colunas={[
            { key: "titulo", label: "Turma", render: (t) => (<div className={styles.nomeCelula}><strong>{t.titulo}</strong><span>{[dataBr(t.dataInicio), t.cidade].filter(Boolean).join(" · ")}</span></div>) },
            { key: "alunos", label: "Alunos", render: (t) => `${t.autorizados} de ${t.alunos} no site` },
            { key: "visivel", label: "No site", render: (t) => <Badge tone={t.visivel ? "success" : "neutral"}>{t.visivel ? "Visível" : "Oculta"}</Badge> },
          ]}
          acoes={(t) => {
            const i = turmas.findIndex((x) => x.id === t.id);
            return (
              <div className={styles.acoesLinha}>
                <button type="button" className={styles.iconeBotao} aria-label={`Subir ${t.titulo}`} disabled={i === 0} onClick={() => executar(() => moverAlumniTurma(t.id, "sobe"))}>
                  <ArrowUp {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Descer ${t.titulo}`} disabled={i === turmas.length - 1} onClick={() => executar(() => moverAlumniTurma(t.id, "desce"))}>
                  <ArrowDown {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Editar ${t.titulo}`} onClick={() => { setEditando(t); setVersao((x) => x + 1); }}>
                  <Pencil {...ICON} size={18} />
                </button>
                {confirmando === t.id ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirAlumniTurma(t.id))}>
                    Confirmar exclusão
                  </Button>
                ) : (
                  <button type="button" className={styles.iconeBotao} aria-label={`Excluir ${t.titulo}`} onClick={() => setConfirmando(t.id)}>
                    <Trash2 {...ICON} size={18} />
                  </button>
                )}
              </div>
            );
          }}
        />
      </div>
      <div className={styles.professoresForm}>
        <Button type="button" size="sm" variant="secondary" onClick={novo}>
          Nova turma realizada
        </Button>
        {editando && traducoes[editando.id] && <TraducoesAdmin key={`${editando.id}-${versao}`} dados={traducoes[editando.id]} />}
        <FormularioTurma key={`${editando?.id ?? "novo"}-${versao}`} turma={editando} aoCancelar={novo} />
      </div>
    </div>
  );
}

/* ------------------------------ Alunos do mapa ------------------------------ */

function FormularioAluno({ aluno, turmas, aoCancelar }: { aluno: AlumniAdmin | null; turmas: AlumniTurmaAdmin[]; aoCancelar: () => void }) {
  const idSalvo = useRef<string | null>(aluno?.id ?? null);
  const [estado, enviar, pendente] = useActionState(async (anterior: EstadoAlumni, formData: FormData) => {
    const r = await salvarAlumni(idSalvo.current, anterior, formData);
    if (r.id) idSalvo.current = r.id;
    return r;
  }, {} as EstadoAlumni);
  const erros = estado.erros ?? {};
  const [v, setV] = useState({
    nome: aluno?.nome ?? "",
    profissao: aluno?.profissao ?? "",
    alumniTurmaId: aluno?.alumniTurmaId ?? "",
    autorizacao: aluno?.autorizacaoRecebidaEm ?? "",
    visivel: aluno?.visivel ?? false,
  });
  const [loc, setLoc] = useState<ValorLocalizacao>({
    cidade: aluno?.cidade ?? "",
    uf: aluno?.uf ?? "",
    pais: aluno?.pais ?? "BR",
    latitude: aluno?.latitude != null ? String(aluno.latitude) : "",
    longitude: aluno?.longitude != null ? String(aluno.longitude) : "",
  });
  const [foto, setFoto] = useState({ url: aluno?.fotoUrl ?? "", alt: aluno?.fotoAlt ?? "" });

  return (
    <form onSubmit={(e) => enviarSemLimpar(e, enviar)} className={styles.cartaoForm} noValidate aria-label={aluno ? `Editar ${aluno.nome}` : "Novo aluno"}>
      <h2 className={styles.titulo}>{aluno ? "Editar aluno" : "Novo aluno"}</h2>
      {estado.erroGeral && (
        <Alert tone="danger" title="Não foi possível salvar">
          {estado.erroGeral}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title="Aluno salvo">
          {v.visivel ? "O site já mostra as mudanças." : "Continua oculto no site."}
        </Alert>
      )}
      <TextField label="Nome" name="nome" required value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} error={erros.nome} />
      <TextField label="Profissão" name="profissao" value={v.profissao} onChange={(e) => setV((x) => ({ ...x, profissao: e.target.value }))} error={erros.profissao} />
      <Select label="Turma" name="alumniTurmaId" value={v.alumniTurmaId} onChange={(e) => setV((x) => ({ ...x, alumniTurmaId: e.target.value }))} options={[{ value: "", label: "Sem turma" }, ...turmas.map((t) => ({ value: t.id, label: t.titulo }))]} error={erros.alumniTurmaId} />
      <CampoLocalizacao valor={loc} aoMudar={(p) => setLoc((x) => ({ ...x, ...p }))} erros={erros} />
      <CampoFoto url={foto.url} alt={foto.alt} aoMudar={setFoto} nomeParaAlt={v.nome} titulo="Foto do aluno" inicial={(v.nome.trim()[0] || "?").toUpperCase()} erro={erros.fotoUrl} />
      <TextField
        label="Autorização recebida em"
        name="autorizacaoRecebidaEm"
        type="date"
        value={v.autorizacao}
        onChange={(e) => setV((x) => ({ ...x, autorizacao: e.target.value }))}
        error={erros.autorizacaoRecebidaEm}
        hint="Data em que o aluno autorizou o uso do nome (e da foto) por escrito. Sem ela, o aluno não aparece no site."
      />
      <Checkbox name="visivel" label="Mostrar no site e no mapa" checked={v.visivel} onChange={(e) => setV((x) => ({ ...x, visivel: e.target.checked }))} />
      <div className={styles.rodape}>
        <Button type="button" variant="ghost" onClick={aoCancelar}>
          {aluno ? "Cancelar" : "Limpar"}
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar aluno"}
        </Button>
      </div>
    </form>
  );
}

export function AlumniAlunosAdmin({ alunos, turmas, traducoes = {} }: { alunos: AlumniAdmin[]; turmas: AlumniTurmaAdmin[]; traducoes?: Record<string, DadosDeTraducao> }) {
  const [editando, setEditando] = useState<AlumniAdmin | null>(null);
  const [versao, setVersao] = useState(0);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const executar = (fn: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      setErro((await fn()).erro ?? null);
      setConfirmando(null);
    });
  const novo = () => {
    setEditando(null);
    setVersao((x) => x + 1);
  };

  return (
    <div className={styles.professores}>
      <div className={styles.professoresLista}>
        <p className={styles.muted}>Cada aluno vira um pin no mapa. Só aparece quem está visível E tem a data da autorização por escrito.</p>
        {erro && (
          <Alert tone="danger" title="Não foi possível concluir">
            {erro}
          </Alert>
        )}
        <AdminTable
          vazio="Nenhum aluno cadastrado ainda."
          linhas={alunos}
          colunas={[
            { key: "nome", label: "Aluno", render: (a) => (<div className={styles.nomeCelula}><strong>{a.nome}</strong><span>{[a.cidade, a.uf, a.turma].filter(Boolean).join(" · ")}</span></div>) },
            { key: "mapa", label: "Mapa", render: (a) => (a.latitude != null ? <Badge tone="success">Com coordenadas</Badge> : <Badge tone="warning">Sem coordenadas</Badge>) },
            {
              key: "situacao",
              label: "No site",
              render: (a) => (a.visivel && a.autorizacaoRecebidaEm ? <Badge tone="success">Visível</Badge> : a.visivel ? <Badge tone="warning">Falta a autorização</Badge> : a.autorizacaoRecebidaEm ? <Badge tone="neutral">Oculto</Badge> : <Badge tone="warning">Sem autorização</Badge>),
            },
          ]}
          acoes={(a) => (
            <div className={styles.acoesLinha}>
              <button type="button" className={styles.iconeBotao} aria-label={`Editar ${a.nome}`} onClick={() => { setEditando(a); setVersao((x) => x + 1); }}>
                <Pencil {...ICON} size={18} />
              </button>
              {confirmando === a.id ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirAlumni(a.id))}>
                  Confirmar exclusão
                </Button>
              ) : (
                <button type="button" className={styles.iconeBotao} aria-label={`Excluir ${a.nome}`} onClick={() => setConfirmando(a.id)}>
                  <Trash2 {...ICON} size={18} />
                </button>
              )}
            </div>
          )}
        />
      </div>
      <div className={styles.professoresForm}>
        <Button type="button" size="sm" variant="secondary" onClick={novo}>
          Novo aluno
        </Button>
        {editando && traducoes[editando.id] && <TraducoesAdmin key={`${editando.id}-${versao}`} dados={traducoes[editando.id]} />}
        <FormularioAluno key={`${editando?.id ?? "novo"}-${versao}`} aluno={editando} turmas={turmas} aoCancelar={novo} />
      </div>
    </div>
  );
}
