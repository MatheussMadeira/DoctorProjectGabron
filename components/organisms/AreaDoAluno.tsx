import { FileText, GraduationCap, MessagesSquare, PlayCircle } from "lucide-react";
import type { ComponentType } from "react";
import { aceitarAviso, sairAluno } from "@/app/(site)/[locale]/sou-aluno/acoes";
import { precisaAceitar } from "@/lib/aluno";
import { conteudoDoAluno, type TurmaDoAluno } from "@/lib/aluno-conteudo";
import { alunoAtual } from "@/lib/aluno-sessao";
import { ICON } from "@/lib/icon";
import { IDIOMAS, type Locale } from "@/lib/i18n/idiomas";
import type { Tradutor } from "@/lib/i18n/tradutor";
import { AppLink } from "../atoms/AppLink";
import { Button } from "../atoms/Button";
import { AcessoAluno } from "./AcessoAluno";
import styles from "./aluno.module.css";

/* A página /sou-aluno depois do cabeçalho: entrada (sem sessão), aviso de confidencialidade (primeira vez) ou o painel com as turmas, os
   módulos, os materiais e o certificado. Lê o cookie, então roda só na requisição (a página põe isto dentro de um Suspense). */

const ICONE: Record<string, ComponentType<Record<string, unknown>>> = { PDF: FileText, CASO: MessagesSquare, VIDEO: PlayCircle };
const ROTULO_TIPO: Record<string, string> = { PDF: "Aluno.tipoPdf", CASO: "Aluno.tipoCaso", VIDEO: "Aluno.tipoVideo" };

export async function AreaDoAluno({ locale, tr, searchParams }: { locale: Locale; tr: Tradutor; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [aluno, params] = await Promise.all([alunoAtual(), searchParams]);
  if (!aluno) return <AcessoAluno abaInicial={params.aba === "primeiro-acesso" ? "primeiro-acesso" : "entrar"} />;

  const sair = (
    <form action={sairAluno}>
      <input type="hidden" name="idioma" value={locale} />
      <Button type="submit" variant="ghost" size="sm">
        {tr("Aluno.sair")}
      </Button>
    </form>
  );

  if (precisaAceitar(aluno)) {
    return (
      <section className={styles.aviso} aria-labelledby="aviso-titulo">
        <h2 id="aviso-titulo" className={styles.avisoTitulo}>
          {tr("Aluno.avisoTitulo")}
        </h2>
        <p>{tr("Aluno.avisoTexto1")}</p>
        <p>{tr("Aluno.avisoTexto2")}</p>
        <div className={styles.avisoAcoes}>
          <form action={aceitarAviso}>
            <input type="hidden" name="idioma" value={locale} />
            <Button type="submit" size="lg" arrow>
              {tr("Aluno.avisoConcordo")}
            </Button>
          </form>
          <form action={sairAluno}>
            <input type="hidden" name="idioma" value={locale} />
            <Button type="submit" variant="ghost">
              {tr("Aluno.avisoSair")}
            </Button>
          </form>
        </div>
      </section>
    );
  }

  const turmas = await conteudoDoAluno(aluno, locale);
  return (
    <div className={styles.painel}>
      <div className={styles.topo}>
        <p className={styles.ola}>{tr("Aluno.painelOla", { nome: aluno.nome })}</p>
        {sair}
      </div>
      {turmas.length === 0 && <p>{tr("Aluno.semTurmas")}</p>}
      {turmas.map((t) => (
        <TurmaPainel key={t.id} turma={t} locale={locale} tr={tr} />
      ))}
    </div>
  );
}

export function TurmaPainel({ turma, locale, tr, hrefMaterial = (id) => `/sou-aluno/material/${id}`, sufixoArquivo = "" }: { turma: TurmaDoAluno; locale: Locale; tr: Tradutor; hrefMaterial?: (id: string) => string; sufixoArquivo?: string }) {
  const data = new Intl.DateTimeFormat(IDIOMAS[locale].intl, { dateStyle: "long", timeZone: "UTC" });
  const dia = (iso: string) => data.format(new Date(`${iso}T12:00:00Z`));
  return (
    <section className={styles.turma} aria-labelledby={`turma-${turma.id}`}>
      <header className={styles.turmaTopo}>
        <div>
          <h2 id={`turma-${turma.id}`} className={styles.turmaTitulo}>
            {turma.titulo}
          </h2>
          <p className={styles.meta}>{tr("Aluno.turmaDe", { data: dia(turma.inicio) })}</p>
        </div>
        {turma.certificado && (
          <a className={styles.certificado} href={`/api/aluno/arquivo?tipo=certificado&id=${turma.certificado.id}${sufixoArquivo}`} target="_blank" rel="noopener noreferrer">
            <GraduationCap {...ICON} size={20} aria-hidden="true" /> {tr("Aluno.certificado")}
          </a>
        )}
      </header>
      {turma.modulos.length === 0 && <p className={styles.meta}>{tr("Aluno.semMateriais")}</p>}
      {turma.modulos.map((m) => (
        <div key={m.id} className={styles.modulo}>
          <h3 className={styles.moduloTitulo}>{m.titulo}</h3>
          {m.descricao && <p className={styles.meta}>{m.descricao}</p>}
          <ul className={styles.materiais}>
            {m.materiais.map((x) => {
              const I = ICONE[x.tipo] ?? FileText;
              return (
                <li key={x.id}>
                  <AppLink href={hrefMaterial(x.id)} className={styles.material}>
                    <I {...ICON} size={22} aria-hidden="true" />
                    <span>
                      <strong>{x.titulo}</strong>
                      <span className={styles.meta}>
                        {tr(ROTULO_TIPO[x.tipo])} · {tr("Aluno.publicadoEm", { data: dia(x.em) })}
                      </span>
                    </span>
                  </AppLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
