import { eq, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  configuracoes,
  configuracoesTraducoes,
  depoimentos,
  depoimentosTraducoes,
  fotosGaleria,
  fotosGaleriaTraducoes,
  professores,
  professoresTraducoes,
  textosCurso,
  textosCursoTraducoes,
  turmas,
  turmasTraducoes,
} from "@/db/schema";
import { TAG_GALERIA, TAG_PROFESSORES } from "../professores";
import { TAG_TURMAS, tagTurma } from "../turmas";
import { TAG_CONFIGURACOES } from "../configuracoes";
import { TAG_CURSO } from "../textos-curso";

/* Registro das entidades que têm versão por idioma: de onde vem o português, onde ficam as traduções e quais tags de cache expirar. */

export type Entidade = "turma" | "professor" | "foto" | "config" | "textoCurso" | "depoimento";
export type IdEntidade = string | number;

export interface DefinicaoEntidade {
  /** Tabela `<nome>_traducoes` e a coluna que aponta para a entidade. */
  tabela: PgTable;
  colId: PgColumn;
  /** O português de cada campo traduzível (campo → valor), ou null se a entidade não existe mais. */
  lerOrigem(id: IdEntidade): Promise<Record<string, unknown> | null>;
  /** Tags de cache que mudam quando uma tradução muda. */
  tags(id: IdEntidade): Promise<string[]>;
  /** Rótulos dos campos no formulário de revisão. */
  rotulos: Record<string, string>;
}

const um = async <T>(consulta: Promise<T[]>) => (await consulta)[0] ?? null;

export const ENTIDADES: Record<Entidade, DefinicaoEntidade> = {
  turma: {
    tabela: turmasTraducoes,
    colId: turmasTraducoes.turmaId,
    async lerOrigem(id) {
      const t = await um(db.select().from(turmas).where(eq(turmas.id, String(id))));
      if (!t) return null;
      return {
        titulo: t.titulo,
        tituloCurto: t.tituloCurto,
        resumo: t.resumo,
        descricao: t.descricao,
        horario: t.horario,
        cidade: t.cidade,
        local: t.local,
        parcelamento: t.parcelamento,
        fotoAlt: t.fotoAlt,
        publicoAlvo: t.publicoAlvo,
        aprendizados: t.aprendizados,
        programacao: t.programacao,
        faq: t.faq,
      };
    },
    async tags(id) {
      const t = await um(db.select({ slug: turmas.slug }).from(turmas).where(eq(turmas.id, String(id))));
      return t ? [tagTurma(t.slug), TAG_TURMAS] : [TAG_TURMAS];
    },
    rotulos: {
      titulo: "Título",
      tituloCurto: "Título curto",
      resumo: "Resumo",
      descricao: "Descrição",
      horario: "Horário",
      cidade: "Cidade",
      local: "Local",
      parcelamento: "Parcelamento",
      fotoAlt: "Texto alternativo da foto",
      publicoAlvo: "Para quem é",
      aprendizados: "O que você vai aprender",
      programacao: "Programação",
      faq: "Perguntas frequentes",
    },
  },
  professor: {
    tabela: professoresTraducoes,
    colId: professoresTraducoes.professorId,
    async lerOrigem(id) {
      const p = await um(db.select().from(professores).where(eq(professores.id, String(id))));
      return p ? { funcao: p.funcao, bio: p.bio, fotoAlt: p.fotoAlt } : null;
    },
    async tags() {
      return [TAG_PROFESSORES];
    },
    rotulos: { funcao: "Especialidade", bio: "Mini bio", fotoAlt: "Texto alternativo da foto" },
  },
  foto: {
    tabela: fotosGaleriaTraducoes,
    colId: fotosGaleriaTraducoes.fotoId,
    async lerOrigem(id) {
      const f = await um(db.select().from(fotosGaleria).where(eq(fotosGaleria.id, String(id))));
      return f ? { alt: f.alt } : null;
    },
    async tags() {
      return [TAG_GALERIA];
    },
    rotulos: { alt: "Descrição da foto" },
  },
  config: {
    tabela: configuracoesTraducoes,
    colId: configuracoesTraducoes.configId,
    async lerOrigem(id) {
      const c = await um(db.select().from(configuracoes).where(eq(configuracoes.id, Number(id))));
      return c ? { horario: c.horario } : null;
    },
    async tags() {
      return [TAG_CONFIGURACOES];
    },
    rotulos: { horario: "Horário de atendimento" },
  },
  textoCurso: {
    tabela: textosCursoTraducoes,
    colId: textosCursoTraducoes.bloco,
    async lerOrigem(id) {
      const b = await um(db.select().from(textosCurso).where(eq(textosCurso.bloco, String(id))));
      if (!b) return null;
      // A foto (fotoUrl) e qualquer outro endereço não são texto: ficam de fora, vêm sempre do registro em português.
      const texto: Record<string, unknown> = { ...b.conteudo };
      delete texto.fotoUrl;
      return texto;
    },
    async tags() {
      return [TAG_CURSO];
    },
    rotulos: { sobretitulo: "Sobretítulo", titulo: "Título", frase: "Frase", fotoAlt: "Texto alternativo da foto", paragrafos: "Parágrafos", itens: "Itens" },
  },
  depoimento: {
    tabela: depoimentosTraducoes,
    colId: depoimentosTraducoes.depoimentoId,
    async lerOrigem(id) {
      const d = await um(db.select().from(depoimentos).where(eq(depoimentos.id, String(id))));
      return d ? { profissao: d.profissao, cidade: d.cidade, texto: d.texto } : null;
    },
    async tags() {
      return [TAG_CURSO];
    },
    rotulos: { profissao: "Profissão", cidade: "Cidade", texto: "Depoimento" },
  },
};

export type CondicaoDeId = (e: DefinicaoEntidade, id: IdEntidade) => SQL;
export const condicaoDeId = (e: DefinicaoEntidade, id: IdEntidade) => eq(e.colId, id as never);
