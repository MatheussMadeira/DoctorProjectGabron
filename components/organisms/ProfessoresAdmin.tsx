"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { ICON } from "@/lib/icon";
import { excluirProfessor, moverProfessor, salvarProfessor } from "@/app/(painel)/admin/acoes-professores";
import type { ProfessorAdmin } from "@/lib/admin-professores";
import type { EstadoProfessor } from "@/lib/professor-form";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import { Alert } from "../molecules/Alert";
import { TextField } from "../molecules/TextField";
import { AdminTable } from "./AdminTable";
import type { DadosDeTraducao } from "@/lib/i18n/admin";
import { FotoDialog } from "./FotoDialog";
import { TraducoesAdmin } from "./TraducoesAdmin";
import styles from "../admin.module.css";

/* Configurações › Professores: lista (a ordem da lista é a ordem no site) e formulário de cadastro/edição. */

function FormularioProfessor({ professor, aoCancelar }: { professor: ProfessorAdmin | null; aoCancelar: () => void }) {
  const idSalvo = useRef<string | null>(professor?.id ?? null);
  const [estado, enviar, pendente] = useActionState(async (anterior: EstadoProfessor, formData: FormData) => {
    const r = await salvarProfessor(idSalvo.current, anterior, formData);
    if (r.id) idSalvo.current = r.id; // depois de criar, os próximos "Salvar" atualizam o mesmo professor
    return r;
  }, {} as EstadoProfessor);
  const erros = estado.erros ?? {};
  const [foto, setFoto] = useState({ url: professor?.fotoUrl ?? "", alt: professor?.fotoAlt ?? "" });
  // Campos controlados: o React 19 limpa os campos não controlados depois de uma ação, e um erro de validação apagaria o que a pessoa digitou.
  const [nome, setNome] = useState(professor?.nome ?? "");
  const [funcao, setFuncao] = useState(professor?.funcao ?? "");
  const [registro, setRegistro] = useState(professor?.registro ?? "");
  const [bio, setBio] = useState(professor?.bio ?? "");
  const [visivel, setVisivel] = useState(professor?.visivel ?? true);
  const [fotoAberta, setFotoAberta] = useState(false);
  const inicial = (nome.replace(/^(Dra?\.|Prof\.?|Profa\.?)\s+/i, "").trim()[0] || "?").toUpperCase();

  return (
    <form action={enviar} className={styles.cartaoForm} noValidate aria-label={professor ? `Editar ${professor.nome}` : "Novo professor"}>
      <h2 className={styles.titulo}>{professor ? "Editar professor" : "Novo professor"}</h2>
      {estado.erroGeral && (
        <Alert tone="danger" title="Não foi possível salvar">
          {estado.erroGeral}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title="Professor salvo">
          O site já mostra as mudanças.
        </Alert>
      )}
      <input type="hidden" name="fotoUrl" value={foto.url} />
      <input type="hidden" name="fotoAlt" value={foto.alt} />
      <div className={styles.fotoRetrato}>
        {foto.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia direta da foto no painel
          <img src={foto.url} alt={foto.alt || "Foto atual"} className={styles.fotoRetratoImg} />
        ) : (
          <div className={`${styles.fotoRetratoImg} ${styles.fotoRetratoVazia}`} aria-hidden="true">
            {inicial}
          </div>
        )}
        <div className={styles.pilhaCurta}>
          <Button type="button" variant="secondary" size="sm" onClick={() => setFotoAberta(true)}>
            {foto.url ? "Trocar foto" : "Enviar foto"}
          </Button>
          {foto.url && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setFoto({ url: "", alt: "" })}>
              Remover foto
            </Button>
          )}
          <span className={styles.nota}>Retrato vertical. Você ajusta o enquadramento.</span>
          {erros.fotoUrl && <p className="ap-hint ap-hint-error">{erros.fotoUrl}</p>}
        </div>
      </div>
      <TextField label="Nome" name="nome" required value={nome} onChange={(e) => setNome(e.target.value)} error={erros.nome} />
      <TextField label="Especialidade" name="funcao" required value={funcao} onChange={(e) => setFuncao(e.target.value)} error={erros.funcao} />
      <TextField
        label="Registro profissional"
        name="registro"
        required
        value={registro}
        onChange={(e) => setRegistro(e.target.value)}
        error={erros.registro}
        hint="Médicos: CRM e RQE (obrigatórios pelo CFM). Demais: conselho e número."
      />
      <TextField label="Mini bio" name="bio" multiline rows={4} value={bio} onChange={(e) => setBio(e.target.value)} error={erros.bio} hint="Duas ou três frases. Sem promessa de resultado." />
      <Checkbox name="visivel" label="Mostrar no site" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} />
      <div className={styles.rodape}>
        <Button type="button" variant="ghost" onClick={aoCancelar}>
          {professor ? "Cancelar" : "Limpar"}
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar professor"}
        </Button>
      </div>
      <FotoDialog
        aberto={fotoAberta}
        atual={{ url: foto.url, alt: "" }}
        formato="retrato"
        biblioteca={false}
        pedirDescricao={false}
        titulo="Foto do professor"
        onFechar={() => setFotoAberta(false)}
        onUsar={(f) => {
          setFoto({ url: f.url, alt: nome.trim() ? `Foto de ${nome.trim()}` : "Foto do professor" });
          setFotoAberta(false);
        }}
      />
    </form>
  );
}

export function ProfessoresAdmin({ professores, traducoes = {} }: { professores: ProfessorAdmin[]; traducoes?: Record<string, DadosDeTraducao> }) {
  const [editando, setEditando] = useState<ProfessorAdmin | null>(null);
  const [versao, setVersao] = useState(0);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  const executar = (fn: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      setErro(r.erro ?? null);
      setConfirmando(null);
    });

  return (
    <div className={styles.professores}>
      <div className={styles.professoresLista}>
        <p className={styles.muted}>A ordem da lista é a ordem em que os professores aparecem no site.</p>
        {erro && (
          <Alert tone="danger" title="Não foi possível concluir">
            {erro}
          </Alert>
        )}
        <AdminTable
          vazio="Nenhum professor cadastrado ainda."
          linhas={professores}
          colunas={[
            {
              key: "nome",
              label: "Professor",
              render: (p) => (
                <div className={styles.nomeCelula}>
                  <strong>{p.nome}</strong>
                  <span>{p.funcao}</span>
                </div>
              ),
            },
            { key: "registro", label: "Registro" },
            { key: "turmas", label: "Turmas", render: (p) => (p.turmas ? `${p.turmas} ${p.turmas === 1 ? "turma" : "turmas"}` : "Nenhuma") },
            { key: "visivel", label: "No site", render: (p) => <Badge tone={p.visivel ? "success" : "neutral"}>{p.visivel ? "Visível" : "Oculto"}</Badge> },
          ]}
          acoes={(p) => {
            const i = professores.findIndex((x) => x.id === p.id);
            return (
              <div className={styles.acoesLinha}>
                <button type="button" className={styles.iconeBotao} aria-label={`Subir ${p.nome}`} disabled={i === 0} onClick={() => executar(() => moverProfessor(p.id, "sobe"))}>
                  <ArrowUp {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Descer ${p.nome}`} disabled={i === professores.length - 1} onClick={() => executar(() => moverProfessor(p.id, "desce"))}>
                  <ArrowDown {...ICON} size={18} />
                </button>
                <button
                  type="button"
                  className={styles.iconeBotao}
                  aria-label={`Editar ${p.nome}`}
                  onClick={() => {
                    setEditando(p);
                    setVersao((v) => v + 1);
                  }}
                >
                  <Pencil {...ICON} size={18} />
                </button>
                {confirmando === p.id ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirProfessor(p.id))}>
                    Confirmar exclusão
                  </Button>
                ) : (
                  <button type="button" className={styles.iconeBotao} aria-label={`Excluir ${p.nome}`} onClick={() => setConfirmando(p.id)}>
                    <Trash2 {...ICON} size={18} />
                  </button>
                )}
              </div>
            );
          }}
        />
      </div>
      <div className={styles.professoresForm}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setEditando(null);
            setVersao((v) => v + 1);
          }}
        >
          Novo professor
        </Button>
        {editando && traducoes[editando.id] && <TraducoesAdmin key={`${editando.id}-${versao}`} dados={traducoes[editando.id]} />}
        <FormularioProfessor key={`${editando?.id ?? "novo"}-${versao}`} professor={editando} aoCancelar={() => { setEditando(null); setVersao((v) => v + 1); }} />
      </div>
    </div>
  );
}
