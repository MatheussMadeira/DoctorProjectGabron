"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { alternarBloqueio, alternarComentarioOculto, enviarNovaSenha, excluirCertificado, excluirComentario, gerarAcessos, reenviarCodigo, salvarCertificado, type EstadoAdminAlunos } from "@/app/(painel)/admin/acoes-alunos";
import type { AlunoAdmin, ComentarioAdmin } from "@/lib/admin-alunos";
import { ICON } from "@/lib/icon";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Alert } from "../molecules/Alert";
import { AdminCard } from "../molecules/AdminCard";
import { AdminTable } from "./AdminTable";
import { CampoArquivo } from "./CampoArquivo";
import styles from "../admin.module.css";

/* Área do aluno no painel: lista de alunos (código, bloqueio, nova senha, certificados) e moderação dos comentários. */

const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export function AlunosAdmin({ alunos }: { alunos: AlunoAdmin[] }) {
  const [retorno, setRetorno] = useState<EstadoAdminAlunos | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [certAluno, setCertAluno] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const executar = (fn: () => Promise<EstadoAdminAlunos>) =>
    iniciar(async () => {
      setRetorno(await fn());
    });
  const aluno = alunos.find((a) => a.id === certAluno) ?? null;

  return (
    <div className={styles.pilha}>
      <p className={styles.muted}>
        O acesso nasce quando a inscrição é confirmada: o aluno recebe por e-mail um código de primeiro acesso (um só, para sempre). Quem já tem conta só ganha a turma nova. Para alunos confirmados antes da área existir, use o botão abaixo.
      </p>
      <div className={styles.acoesLinha}>
        {confirmando ? (
          <>
            <Button type="button" size="sm" disabled={ocupado} onClick={() => { setConfirmando(false); executar(gerarAcessos); }}>
              Confirmar: criar acessos e enviar códigos
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" variant="secondary" disabled={ocupado} onClick={() => setConfirmando(true)}>
            Gerar acessos dos confirmados
          </Button>
        )}
      </div>
      {retorno?.erro && (
        <Alert tone="danger" title="Não foi possível concluir">
          {retorno.erro}
        </Alert>
      )}
      {retorno?.ok && retorno.mensagem && (
        <Alert tone="success" title="Pronto">
          {retorno.mensagem}
        </Alert>
      )}
      <AdminTable
        vazio="Nenhum aluno ainda. Os acessos aparecem quando uma inscrição é confirmada."
        linhas={alunos}
        colunas={[
          { key: "nome", label: "Aluno", render: (a) => (<div className={styles.nomeCelula}><strong>{a.nome}</strong><span>{a.email}</span></div>) },
          {
            key: "situacao",
            label: "Acesso",
            render: (a) =>
              a.situacao === "bloqueado" ? (
                <Badge tone="danger">Bloqueado</Badge>
              ) : a.situacao === "ativo" ? (
                <Badge tone="success">Conta criada</Badge>
              ) : a.emailDoCodigo === "FALHOU" ? (
                <Badge tone="danger">Código não enviado</Badge>
              ) : (
                <Badge tone="warning">Aguardando criar a conta</Badge>
              ),
          },
          { key: "turmas", label: "Turmas", render: (a) => (a.turmas.length ? a.turmas.map((t) => t.titulo).join(", ") : "—") },
          { key: "ultimo", label: "Último acesso", render: (a) => quando(a.ultimoAcessoEm) },
        ]}
        acoes={(a) => (
          <div className={styles.acoesLinha}>
            {a.situacao === "aguardando" && (
              <Button type="button" size="sm" variant="secondary" disabled={ocupado} onClick={() => executar(() => reenviarCodigo(a.id))}>
                Reenviar código
              </Button>
            )}
            {a.situacao === "ativo" && (
              <Button type="button" size="sm" variant="secondary" disabled={ocupado} onClick={() => executar(() => enviarNovaSenha(a.id))}>
                Link de nova senha
              </Button>
            )}
            {/* <a> simples (não next/link): abre em outra aba e não pré-carrega a prévia de cada linha */}
            <a className="ap-btn ap-btn-secondary ap-btn-sm" href={`/sou-aluno/previa?aluno=${a.id}`} target="_blank" rel="noopener noreferrer">
              Ver como aluno
            </a>
            <Button type="button" size="sm" variant="secondary" onClick={() => setCertAluno(certAluno === a.id ? null : a.id)}>
              Certificados
            </Button>
            <Button type="button" size="sm" variant={a.situacao === "bloqueado" ? "secondary" : "ghost"} disabled={ocupado} onClick={() => executar(() => alternarBloqueio(a.id))}>
              {a.situacao === "bloqueado" ? "Liberar" : "Bloquear"}
            </Button>
          </div>
        )}
      />
      {aluno && (
        <AdminCard titulo={`Certificados de ${aluno.nome}`}>
          <p className={styles.nota}>PDF por turma, enviado à mão. O aluno baixa pela área dele; o endereço do arquivo não aparece para ele.</p>
          {aluno.turmas.length === 0 && <p className={styles.muted}>Este aluno não tem turma com inscrição confirmada.</p>}
          {aluno.turmas.map((t) => (
            <div key={t.id} className={styles.cartaoItem}>
              <strong>{t.titulo}</strong>
              {t.certificado ? (
                <div className={styles.acoesLinha}>
                  <Badge tone="success">Enviado</Badge>
                  <span className={styles.nota}>{t.certificado.nome}</span>
                  <button type="button" className={styles.iconeBotao} aria-label={`Remover o certificado de ${aluno.nome} em ${t.titulo}`} onClick={() => executar(() => excluirCertificado(t.certificado!.id))}>
                    <Trash2 {...ICON} size={18} />
                  </button>
                </div>
              ) : (
                <span className={styles.nota}>Ainda sem certificado.</span>
              )}
              <CampoArquivo rotulo={t.certificado ? "Trocar o PDF" : "Enviar o PDF"} aceitar="pdf" aoEnviar={(f) => executar(() => salvarCertificado(aluno.id, t.id, f.url, f.nome))} />
            </div>
          ))}
        </AdminCard>
      )}
    </div>
  );
}

export function ComentariosAdmin({ comentarios }: { comentarios: ComentarioAdmin[] }) {
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const executar = (fn: () => Promise<EstadoAdminAlunos>) =>
    iniciar(async () => {
      setErro((await fn()).erro ?? null);
      setConfirmando(null);
    });
  return (
    <div className={styles.pilha}>
      <p className={styles.muted}>Os comentários mais recentes das discussões de caso. Ocultar tira da área dos alunos sem apagar; excluir apaga de vez.</p>
      {erro && (
        <Alert tone="danger" title="Não foi possível concluir">
          {erro}
        </Alert>
      )}
      <AdminTable
        vazio="Nenhum comentário ainda."
        linhas={comentarios}
        colunas={[
          { key: "texto", label: "Comentário", render: (c) => (<div className={styles.nomeCelula}><strong>{c.aluno}</strong><span>{c.texto}</span></div>) },
          { key: "material", label: "Em", render: (c) => c.material },
          { key: "em", label: "Quando", render: (c) => quando(c.em) },
          { key: "oculto", label: "Situação", render: (c) => <Badge tone={c.oculto ? "neutral" : "success"}>{c.oculto ? "Oculto" : "Visível"}</Badge> },
        ]}
        acoes={(c) => (
          <div className={styles.acoesLinha}>
            <button type="button" className={styles.iconeBotao} aria-label={`${c.oculto ? "Mostrar" : "Ocultar"} o comentário de ${c.aluno}`} onClick={() => executar(() => alternarComentarioOculto(c.id))}>
              {c.oculto ? <Eye {...ICON} size={18} /> : <EyeOff {...ICON} size={18} />}
            </button>
            {confirmando === c.id ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirComentario(c.id))}>
                Confirmar exclusão
              </Button>
            ) : (
              <button type="button" className={styles.iconeBotao} aria-label={`Excluir o comentário de ${c.aluno}`} onClick={() => setConfirmando(c.id)}>
                <Trash2 {...ICON} size={18} />
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}
