"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { excluirMaterial, excluirModulo, moverMaterial, moverModulo, salvarMaterial, salvarModulo, type EstadoAdminAlunos } from "@/app/(painel)/admin/acoes-alunos";
import type { MaterialAdmin, ModuloAdmin } from "@/lib/admin-alunos";
import { enviarSemLimpar } from "@/lib/enviar-sem-limpar";
import type { DadosDeTraducao } from "@/lib/i18n/admin";
import { ICON } from "@/lib/icon";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import { Alert } from "../molecules/Alert";
import { AdminCard } from "../molecules/AdminCard";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { CampoArquivo } from "./CampoArquivo";
import { CampoVideo } from "./CampoVideo";
import { TraducoesAdmin } from "./TraducoesAdmin";
import styles from "../admin.module.css";

/* Materiais de uma turma: módulos (com a ordem) e, dentro de cada um, PDFs, discussões de caso (texto, imagens e comentários) e vídeos.
   Cada material pode ter publicação agendada e avisar os alunos por e-mail quando sair. As traduções saem da DeepL ao salvar. */

const TIPOS = [
  { value: "PDF", label: "Documento (PDF)" },
  { value: "CASO", label: "Discussão de caso (texto e imagens, com comentários)" },
  { value: "VIDEO", label: "Vídeo" },
];
const ROTULO_TIPO = Object.fromEntries(TIPOS.map((t) => [t.value, t.value === "PDF" ? "PDF" : t.value === "CASO" ? "Caso" : "Vídeo"]));

type Edicao = { tipo: "modulo"; modulo: ModuloAdmin | null } | { tipo: "material"; moduloId: string; material: MaterialAdmin | null };

/* ------------------------------ Formulário de módulo ------------------------------ */

function FormularioModulo({ turmaId, modulo, aoCancelar }: { turmaId: string; modulo: ModuloAdmin | null; aoCancelar: () => void }) {
  const idSalvo = useRef<string | null>(modulo?.id ?? null);
  const [estado, enviar, pendente] = useActionState(async (anterior: EstadoAdminAlunos, formData: FormData) => {
    const r = await salvarModulo(turmaId, idSalvo.current, anterior, formData);
    if (r.id) idSalvo.current = r.id;
    return r;
  }, {} as EstadoAdminAlunos);
  const erros = estado.erros ?? {};
  const [v, setV] = useState({ titulo: modulo?.titulo ?? "", descricao: modulo?.descricao ?? "", visivel: modulo?.visivel ?? true });
  return (
    <form onSubmit={(e) => enviarSemLimpar(e, enviar)} className={styles.cartaoForm} noValidate aria-label={modulo ? `Editar o módulo ${modulo.titulo}` : "Novo módulo"}>
      <h2 className={styles.titulo}>{modulo ? "Editar módulo" : "Novo módulo"}</h2>
      {estado.erro && (
        <Alert tone="danger" title="Não foi possível salvar">
          {estado.erro}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title="Módulo salvo">
          A DeepL preparou os rascunhos de tradução.
        </Alert>
      )}
      <TextField label="Título do módulo" name="titulo" required value={v.titulo} onChange={(e) => setV((x) => ({ ...x, titulo: e.target.value }))} error={erros.titulo} hint="Ex.: Anatomia aplicada, Casos clínicos, Material de apoio." />
      <TextField label="Descrição" name="descricao" multiline rows={3} value={v.descricao} onChange={(e) => setV((x) => ({ ...x, descricao: e.target.value }))} error={erros.descricao} />
      <input type="hidden" name="visivel" value={v.visivel ? "on" : ""} />
      <Checkbox label="Mostrar aos alunos" checked={v.visivel} onChange={(e) => setV((x) => ({ ...x, visivel: e.target.checked }))} />
      <div className={styles.rodape}>
        <Button type="button" variant="ghost" onClick={aoCancelar}>
          Fechar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando e traduzindo…" : "Salvar módulo"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------ Formulário de material ------------------------------ */

function FormularioMaterial({ moduloId, material, aoCancelar }: { moduloId: string; material: MaterialAdmin | null; aoCancelar: () => void }) {
  const idSalvo = useRef<string | null>(material?.id ?? null);
  const [estado, enviar, pendente] = useActionState(async (anterior: EstadoAdminAlunos, formData: FormData) => {
    const r = await salvarMaterial(moduloId, idSalvo.current, anterior, formData);
    if (r.id) idSalvo.current = r.id;
    return r;
  }, {} as EstadoAdminAlunos);
  const erros = estado.erros ?? {};
  const [v, setV] = useState({
    tipo: material?.tipo ?? "PDF",
    titulo: material?.titulo ?? "",
    texto: material?.texto ?? "",
    publicarEm: material?.publicarEm ?? "",
    visivel: material?.visivel ?? true,
    avisar: material?.avisar ?? true,
  });
  const [arquivo, setArquivo] = useState<{ url: string; nome: string } | null>(null);
  const [imagens, setImagens] = useState(material?.imagens ?? []);
  const [video, setVideo] = useState({ url: material?.videoUrl ?? "", legenda: material?.videoLegendaUrl ?? "" });

  return (
    <form onSubmit={(e) => enviarSemLimpar(e, enviar)} className={styles.cartaoForm} noValidate aria-label={material ? `Editar ${material.titulo}` : "Novo material"}>
      <h2 className={styles.titulo}>{material ? "Editar material" : "Novo material"}</h2>
      {estado.erro && (
        <Alert tone="danger" title="Não foi possível salvar">
          {estado.erro}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title="Material salvo">
          {v.visivel && !v.publicarEm ? "Já aparece para os alunos." : "Salvo."} A DeepL preparou os rascunhos de tradução.
        </Alert>
      )}
      <Select label="Tipo" name="tipo" required value={v.tipo} onChange={(e) => setV((x) => ({ ...x, tipo: e.target.value as typeof x.tipo }))} options={TIPOS} error={erros.tipo} />
      <TextField label="Título" name="titulo" required value={v.titulo} onChange={(e) => setV((x) => ({ ...x, titulo: e.target.value }))} error={erros.titulo} />
      <TextField
        label={v.tipo === "CASO" ? "Caso (texto)" : "Texto de apoio"}
        name="texto"
        multiline
        rows={v.tipo === "CASO" ? 9 : 4}
        value={v.texto}
        onChange={(e) => setV((x) => ({ ...x, texto: e.target.value }))}
        error={erros.texto}
        hint="Uma linha em branco separa os parágrafos. Não coloque nome nem dado que identifique pacientes."
      />

      {v.tipo === "PDF" && (
        <div className={styles.pilhaCurta}>
          <input type="hidden" name="arquivoUrl" value={arquivo?.url ?? ""} />
          <input type="hidden" name="arquivoNome" value={arquivo?.nome ?? ""} />
          <span className={styles.nota}>{arquivo ? `Novo arquivo: ${arquivo.nome}` : material?.temArquivo ? `Arquivo atual: ${material.arquivoNome ?? "PDF"}` : "Nenhum arquivo enviado."}</span>
          <CampoArquivo rotulo={material?.temArquivo || arquivo ? "Trocar o PDF" : "Enviar o PDF"} aceitar="pdf" aoEnviar={setArquivo} />
          {erros.arquivoUrl && <p className="ap-hint ap-hint-error">{erros.arquivoUrl}</p>}
        </div>
      )}

      {v.tipo === "CASO" && (
        <div className={styles.pilhaCurta}>
          <input type="hidden" name="imagens" value={JSON.stringify(imagens)} />
          <span className={styles.nota}>Imagens do caso (até 12). Cada uma precisa de uma descrição para leitor de tela. Só os alunos veem; o endereço do arquivo não aparece para eles.</span>
          {imagens.map((img, i) => (
            <div key={`${img.url}-${i}`} className={styles.cartaoItem}>
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia direta no painel */}
              <img src={img.url} alt={img.alt || `Imagem ${i + 1}`} style={{ maxWidth: 220, height: "auto" }} />
              <TextField label={`Descrição da imagem ${i + 1}`} value={img.alt} onChange={(e) => setImagens((l) => l.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
              <Button type="button" variant="ghost" size="sm" onClick={() => setImagens((l) => l.filter((_, j) => j !== i))}>
                Remover a imagem {i + 1}
              </Button>
            </div>
          ))}
          <CampoArquivo rotulo="Adicionar imagem" aceitar="imagem" desabilitado={imagens.length >= 12} aoEnviar={(f) => setImagens((l) => [...l, { url: f.url, alt: "" }])} />
          {erros.imagens && <p className="ap-hint ap-hint-error">{erros.imagens}</p>}
        </div>
      )}

      {(v.tipo === "VIDEO" || v.tipo === "CASO") && <CampoVideo url={video.url} legenda={video.legenda} aoMudar={(p) => setVideo((x) => ({ url: p.url ?? x.url, legenda: p.legenda ?? x.legenda }))} erros={erros} />}

      <TextField
        label="Publicar em (horário de Brasília)"
        name="publicarEm"
        type="datetime-local"
        value={v.publicarEm}
        onChange={(e) => setV((x) => ({ ...x, publicarEm: e.target.value }))}
        error={erros.publicarEm}
        hint="Vazio = publica agora. Com data futura, o material só aparece para os alunos nessa hora."
      />
      <input type="hidden" name="visivel" value={v.visivel ? "on" : ""} />
      <Checkbox label="Mostrar aos alunos" checked={v.visivel} onChange={(e) => setV((x) => ({ ...x, visivel: e.target.checked }))} />
      <input type="hidden" name="avisar" value={v.avisar ? "on" : ""} />
      <Checkbox label="Avisar os alunos por e-mail quando sair" checked={v.avisar} onChange={(e) => setV((x) => ({ ...x, avisar: e.target.checked }))} hint={material?.notificado ? "Os alunos já foram avisados deste material." : undefined} />
      <div className={styles.rodape}>
        <Button type="button" variant="ghost" onClick={aoCancelar}>
          Fechar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando e traduzindo…" : "Salvar material"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------ Tela ------------------------------ */

export function MateriaisAdmin({
  turmas,
  turmaId,
  modulos,
  traducoesModulos = {},
  traducoesMateriais = {},
}: {
  turmas: Array<{ id: string; titulo: string; inicio: string }>;
  turmaId: string | null;
  modulos: ModuloAdmin[];
  traducoesModulos?: Record<string, DadosDeTraducao>;
  traducoesMateriais?: Record<string, DadosDeTraducao>;
}) {
  const router = useRouter();
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [versao, setVersao] = useState(0);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const executar = (fn: () => Promise<EstadoAdminAlunos>) =>
    iniciar(async () => {
      setErro((await fn()).erro ?? null);
      setConfirmando(null);
    });
  const abrir = (e: Edicao | null) => {
    setEdicao(e);
    setVersao((x) => x + 1);
  };

  return (
    <div className={styles.pilha}>
      <Select
        label="Turma"
        value={turmaId ?? ""}
        onChange={(e) => {
          abrir(null);
          router.replace(`/admin/alunos?aba=materiais&turma=${e.target.value}`);
        }}
        options={turmas.map((t) => ({ value: t.id, label: `${t.titulo} · ${t.inicio.split("-").reverse().join("/")}` }))}
        placeholder="Escolha a turma"
      />
      {turmaId && (
        <div>
          <a className="ap-btn ap-btn-secondary ap-btn-sm" href={`/sou-aluno/previa?turma=${turmaId}`} target="_blank" rel="noopener noreferrer">
            Ver como aluno desta turma
          </a>
          <span className={styles.nota}> Abre a área do aluno em modo leitura, em outra aba, com o que os alunos da turma enxergam.</span>
        </div>
      )}
      {!turmaId && <p className={styles.muted}>Escolha uma turma para ver e cadastrar os materiais. Quem tem inscrição confirmada nela vê o conteúdo na área do aluno.</p>}
      {turmaId && (
        <div className={styles.professores}>
          <div className={styles.professoresLista}>
            <div>
              <Button type="button" size="sm" variant="secondary" onClick={() => abrir({ tipo: "modulo", modulo: null })}>
                Novo módulo
              </Button>
            </div>
            {erro && (
              <Alert tone="danger" title="Não foi possível concluir">
                {erro}
              </Alert>
            )}
            {modulos.length === 0 && <p className={styles.muted}>Nenhum módulo ainda. Crie o primeiro para começar a publicar materiais.</p>}
            {modulos.map((m, i) => (
              <AdminCard key={m.id} titulo={m.titulo}>
                <div className={styles.acoesLinha}>
                  {!m.visivel && <Badge tone="neutral">Oculto</Badge>}
                  <button type="button" className={styles.iconeBotao} aria-label={`Subir o módulo ${m.titulo}`} disabled={i === 0} onClick={() => executar(() => moverModulo(m.id, "sobe"))}>
                    <ArrowUp {...ICON} size={18} />
                  </button>
                  <button type="button" className={styles.iconeBotao} aria-label={`Descer o módulo ${m.titulo}`} disabled={i === modulos.length - 1} onClick={() => executar(() => moverModulo(m.id, "desce"))}>
                    <ArrowDown {...ICON} size={18} />
                  </button>
                  <button type="button" className={styles.iconeBotao} aria-label={`Editar o módulo ${m.titulo}`} onClick={() => abrir({ tipo: "modulo", modulo: m })}>
                    <Pencil {...ICON} size={18} />
                  </button>
                  {confirmando === m.id ? (
                    <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirModulo(m.id))}>
                      Confirmar: apaga o módulo e os materiais
                    </Button>
                  ) : (
                    <button type="button" className={styles.iconeBotao} aria-label={`Excluir o módulo ${m.titulo}`} onClick={() => setConfirmando(m.id)}>
                      <Trash2 {...ICON} size={18} />
                    </button>
                  )}
                </div>
                {m.materiais.length === 0 && <p className={styles.nota}>Sem materiais.</p>}
                {m.materiais.map((x, j) => (
                  <div key={x.id} className={styles.cartaoItem}>
                    <div className={styles.acoesLinha}>
                      <strong>{x.titulo}</strong>
                      <Badge tone="neutral">{ROTULO_TIPO[x.tipo]}</Badge>
                      {!x.visivel ? <Badge tone="neutral">Oculto</Badge> : x.agendado ? <Badge tone="warning">Agendado</Badge> : <Badge tone="success">Publicado</Badge>}
                      {x.tipo === "CASO" && <span className={styles.nota}>{x.comentarios} comentário(s)</span>}
                    </div>
                    <div className={styles.acoesLinha}>
                      <button type="button" className={styles.iconeBotao} aria-label={`Subir ${x.titulo}`} disabled={j === 0} onClick={() => executar(() => moverMaterial(x.id, "sobe"))}>
                        <ArrowUp {...ICON} size={18} />
                      </button>
                      <button type="button" className={styles.iconeBotao} aria-label={`Descer ${x.titulo}`} disabled={j === m.materiais.length - 1} onClick={() => executar(() => moverMaterial(x.id, "desce"))}>
                        <ArrowDown {...ICON} size={18} />
                      </button>
                      <button type="button" className={styles.iconeBotao} aria-label={`Editar ${x.titulo}`} onClick={() => abrir({ tipo: "material", moduloId: m.id, material: x })}>
                        <Pencil {...ICON} size={18} />
                      </button>
                      {confirmando === x.id ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirMaterial(x.id))}>
                          Confirmar exclusão
                        </Button>
                      ) : (
                        <button type="button" className={styles.iconeBotao} aria-label={`Excluir ${x.titulo}`} onClick={() => setConfirmando(x.id)}>
                          <Trash2 {...ICON} size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div>
                  <Button type="button" size="sm" variant="secondary" onClick={() => abrir({ tipo: "material", moduloId: m.id, material: null })}>
                    Novo material em “{m.titulo}”
                  </Button>
                </div>
              </AdminCard>
            ))}
          </div>
          <div className={styles.professoresForm}>
            {edicao?.tipo === "modulo" && (
              <>
                {edicao.modulo && traducoesModulos[edicao.modulo.id] && <TraducoesAdmin key={`tm-${edicao.modulo.id}-${versao}`} dados={traducoesModulos[edicao.modulo.id]} />}
                <FormularioModulo key={`m-${edicao.modulo?.id ?? "novo"}-${versao}`} turmaId={turmaId} modulo={edicao.modulo} aoCancelar={() => abrir(null)} />
              </>
            )}
            {edicao?.tipo === "material" && (
              <>
                {edicao.material && traducoesMateriais[edicao.material.id] && <TraducoesAdmin key={`tx-${edicao.material.id}-${versao}`} dados={traducoesMateriais[edicao.material.id]} />}
                <FormularioMaterial key={`x-${edicao.material?.id ?? "novo"}-${versao}`} moduloId={edicao.moduloId} material={edicao.material} aoCancelar={() => abrir(null)} />
              </>
            )}
            {!edicao && <p className={styles.muted}>Escolha “Novo módulo” ou edite um item da lista.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
