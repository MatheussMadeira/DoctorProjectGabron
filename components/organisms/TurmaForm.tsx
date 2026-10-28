"use client";

import { useActionState, useState } from "react";
import Image from "@/components/atoms/ImagemSegura";
import { Alert } from "../molecules/Alert";
import { FaqEditor } from "../molecules/FaqEditor";
import { ProgramacaoEditor } from "../molecules/ProgramacaoEditor";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { AdminCard } from "../molecules/AdminCard";
import { Button } from "../atoms/Button";
import { EventCard } from "./EventCard";
import { EventSummary } from "./EventSummary";
import { FotoDialog } from "./FotoDialog";
import type { DiaProgramacao, PerguntaFaq } from "@/db/schema";
import type { EstadoTurma } from "@/lib/turma-form";
import { precoParaCentavos } from "@/lib/turma-form";
import { calcularStatus } from "@/lib/status";
import { BIBLIOTECA_FOTOS } from "@/lib/fotos";
import { formatarPreco } from "@/lib/preco";
import styles from "../admin.module.css";

export interface TurmaFormValores {
  titulo: string;
  tituloCurto: string;
  resumo: string;
  descricao: string;
  modalidade: "PRESENCIAL" | "ONLINE";
  publicacao: "RASCUNHO" | "EM_BREVE" | "PUBLICADO";
  inicio: string;
  fim: string;
  horario: string;
  cidade: string;
  local: string;
  vagas: string;
  preco: string;
  parcelamento: string;
  fotoUrl: string;
  fotoAlt: string;
  publicoAlvo: string;
  aprendizados: string;
  programacao: DiaProgramacao[];
  faq: PerguntaFaq[];
}

export const TURMA_NOVA: TurmaFormValores = {
  titulo: "",
  tituloCurto: "",
  resumo: "",
  descricao: "",
  modalidade: "PRESENCIAL",
  publicacao: "RASCUNHO",
  inicio: "",
  fim: "",
  horario: "",
  cidade: "Belo Horizonte, MG",
  local: "Local a definir",
  vagas: "12",
  preco: "",
  parcelamento: "",
  fotoUrl: BIBLIOTECA_FOTOS[0].src,
  fotoAlt: BIBLIOTECA_FOTOS[0].alt,
  publicoAlvo: "",
  aprendizados: "",
  programacao: [{ titulo: "Dia 1", itens: [{ title: "" }] }],
  faq: [],
};

import { ProfessoresDaTurma, type ProfessorOpcao } from "./ProfessoresDaTurma";

export interface TurmaFormProps {
  /** Server Action já ligada ao id (ou a null, ao criar): (estado, formData) → estado. */
  acao: (anterior: EstadoTurma, formData: FormData) => Promise<EstadoTurma>;
  valores: TurmaFormValores;
  /** Inscrições que já ocupam vagas (só há ao editar); alimenta o aviso de vagas e a prévia. */
  ocupadas?: number;
  listaEspera?: number;
  /** Todos os professores cadastrados e quais já conduzem esta turma (na ordem). */
  professores?: ProfessorOpcao[];
  professoresDaTurma?: string[];
}

export function TurmaForm({ acao, valores, ocupadas = 0, listaEspera = 0, professores = [], professoresDaTurma = [] }: TurmaFormProps) {
  const [estado, enviar, pendente] = useActionState(acao, {} as EstadoTurma);
  const erros = estado.erros ?? {};

  const [v, setV] = useState(valores);
  const [fotoAberta, setFotoAberta] = useState(false);
  const campo = <K extends keyof TurmaFormValores>(k: K) => ({
    name: k as string,
    value: v[k] as string,
    onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })),
    error: erros[k as string],
  });

  // Prévia: a mesma regra de status do site, aplicada ao que está digitado.
  const vagas = Math.max(0, parseInt(v.vagas, 10) || 0);
  const publicacaoPrevia = v.publicacao === "RASCUNHO" ? "PUBLICADO" : v.publicacao;
  const status = (v.inicio && calcularStatus({ publicacao: publicacaoPrevia, inicio: v.inicio, fim: v.fim || null, vagas, ocupadas })) || "aberto";
  const centavos = precoParaCentavos(v.preco);
  const preco = typeof centavos === "string" ? "—" : formatarPreco(centavos);
  const modalidade = v.modalidade === "ONLINE" ? "Online" : "Presencial";

  return (
    <div className={styles.editor}>
      <form action={enviar} className={styles.formulario} noValidate>
        {estado.erroGeral && (
          <Alert tone="danger" title="Não foi possível salvar">
            {estado.erroGeral}
          </Alert>
        )}

        <AdminCard titulo="Turma">
          <TextField label="Título" required {...campo("titulo")} />
          <TextField label="Título curto" {...campo("tituloCurto")} hint='Usado nas faixas de chamada, ex.: "Módulo essencial". Vazio = usa o título.' />
          <div className={styles.linha}>
            <Select label="Modalidade" required options={[{ value: "PRESENCIAL", label: "Presencial" }, { value: "ONLINE", label: "Online" }]} {...campo("modalidade")} />
            <Select
              label="Publicação"
              required
              options={[{ value: "RASCUNHO", label: "Rascunho" }, { value: "EM_BREVE", label: "Em breve (sem inscrições)" }, { value: "PUBLICADO", label: "Publicado" }]}
              hint="Rascunho não aparece no site."
              {...campo("publicacao")}
            />
          </div>
          <TextField label="Resumo" multiline rows={2} {...campo("resumo")} hint="Uma frase. Aparece no cartão da página inicial ao passar o mouse." />
          <TextField label="Descrição" multiline rows={5} {...campo("descricao")} hint='Vai para a seção "Sobre a turma". Separe os parágrafos com uma linha em branco.' />
        </AdminCard>

        <AdminCard titulo="Data, local e vagas">
          <div className={styles.linha}>
            <TextField label="Início" type="date" required {...campo("inicio")} />
            <TextField label="Fim" type="date" {...campo("fim")} hint="Deixe vazio se for um dia só." />
            <div className={styles.larga}>
              <TextField label="Horário" {...campo("horario")} hint='Ex.: "8h às 18h".' />
            </div>
          </div>
          <div className={styles.linha}>
            <TextField label="Cidade" required {...campo("cidade")} hint='Online: "Ao vivo".' />
            <TextField label="Local" {...campo("local")} />
          </div>
          <div className={styles.linha}>
            <TextField
              label="Vagas"
              type="number"
              min={0}
              required
              {...campo("vagas")}
              hint={ocupadas ? `${ocupadas} ${ocupadas === 1 ? "vaga ocupada" : "vagas ocupadas"}${listaEspera ? ` · ${listaEspera} na lista de espera` : ""}.` : "Nenhuma inscrição ainda."}
            />
            <TextField label="Preço" {...campo("preco")} hint="Vazio = mostra o placeholder R$ 0.000 no site." />
            <div className={styles.larga}>
              <TextField label="Parcelamento" {...campo("parcelamento")} hint='Ex.: "ou 10x de R$ 000".' />
            </div>
          </div>
          <Alert tone="info" title="O status de vagas é automático">
            Com 3 vagas ou menos, a turma mostra &quot;Últimas vagas&quot;. Sem vagas, vira &quot;Esgotado&quot; e o formulário passa a ser lista de espera.
          </Alert>
        </AdminCard>

        <AdminCard titulo="Foto">
          <input type="hidden" name="fotoUrl" value={v.fotoUrl} />
          <input type="hidden" name="fotoAlt" value={v.fotoAlt} />
          <div className={styles.foto}>
            <Image src={v.fotoUrl} alt={v.fotoAlt} width={480} height={300} />
            <div className={styles.fotoTexto}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setFotoAberta(true)}>
                Trocar foto
              </Button>
              <p className={styles.nota}>16:10, a partir de 1600 px de largura. Sem fotos de pacientes ou de antes e depois.</p>
              {(erros.fotoUrl || erros.fotoAlt) && <p className="ap-hint ap-hint-error">{erros.fotoUrl ?? erros.fotoAlt}</p>}
            </div>
          </div>
        </AdminCard>

        <AdminCard titulo="Professores desta turma">
          <p className={styles.nota}>Aparecem na seção &quot;Professores&quot; da página da turma, na ordem marcada. O cadastro fica em Configurações › Professores.</p>
          <ProfessoresDaTurma todos={professores} selecionados={professoresDaTurma} />
        </AdminCard>

        <AdminCard titulo="Conteúdo da página">
          <TextField label="Para quem é" multiline rows={4} {...campo("publicoAlvo")} hint="Uma linha por público." />
          <TextField label="O que você vai aprender" multiline rows={5} {...campo("aprendizados")} hint="Um tópico por linha." />
        </AdminCard>

        <AdminCard titulo="Programação">
          <ProgramacaoEditor name="programacao" inicial={valores.programacao} />
          {erros.programacao && <p className="ap-hint ap-hint-error">{erros.programacao}</p>}
        </AdminCard>

        <AdminCard titulo="Perguntas frequentes">
          <FaqEditor name="faq" inicial={valores.faq} />
          {erros.faq && <p className="ap-hint ap-hint-error">{erros.faq}</p>}
        </AdminCard>

        <div className={styles.rodape}>
          <Button variant="ghost" href="/admin/agenda">
            Cancelar
          </Button>
          <Button type="submit" name="acao" value="rascunho" variant="secondary" disabled={pendente}>
            Salvar rascunho
          </Button>
          <Button type="submit" name="acao" value="publicar" arrow disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar e publicar"}
          </Button>
        </div>
      </form>

      <div className={styles.previa}>
        <p className="ap-eyebrow">Como aparece no site</p>
        <EventCard
          title={v.titulo || "Título da turma"}
          href="#"
          start={v.inicio}
          end={v.fim || undefined}
          time={v.horario}
          city={v.cidade}
          modality={modalidade}
          seats={`${vagas} vagas`}
          price={preco}
          status={status}
          summary={v.resumo}
          image={v.fotoUrl}
          imageAlt={v.fotoAlt}
        />
        <EventSummary
          start={v.inicio}
          end={v.fim || undefined}
          time={v.horario}
          venue={v.local}
          city={v.cidade}
          modality={modalidade}
          seatsTotal={vagas || undefined}
          seatsTaken={ocupadas}
          price={preco}
          installment={v.parcelamento || undefined}
          status={status}
          bar={false}
        />
      </div>

      <FotoDialog
        aberto={fotoAberta}
        atual={{ url: v.fotoUrl, alt: v.fotoAlt }}
        onFechar={() => setFotoAberta(false)}
        onUsar={(f) => {
          setV((x) => ({ ...x, fotoUrl: f.url, fotoAlt: f.alt }));
          setFotoAberta(false);
        }}
      />
    </div>
  );
}
