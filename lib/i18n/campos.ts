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
  alumni,
  alumniTraducoes,
  alumniTurmas,
  alumniTurmasTraducoes,
  alunoMateriais,
  alunoMateriaisTraducoes,
  alunoModulos,
  alunoModulosTraducoes,
  siteSecoes,
  siteSecoesTraducoes,
  viagemChegada,
  viagemChegadaTraducoes,
  viagemLocais,
  viagemLocaisTraducoes,
} from "@/db/schema";
import { TAG_GALERIA, TAG_PROFESSORES } from "../professores";
import { TAG_TURMAS, tagTurma } from "../turmas";
import { TAG_CONFIGURACOES } from "../configuracoes";
import { TAG_CURSO } from "../textos-curso";
import { TAG_VIAGEM } from "../viagem";
import { TAG_ALUMNI } from "../alumni";
import { TAG_PAGINAS } from "../site-secoes/leitura";

/* Registro das entidades que têm versão por idioma: de onde vem o português, onde ficam as traduções e quais tags de cache expirar. */

export type Entidade = "turma" | "professor" | "foto" | "config" | "textoCurso" | "depoimento" | "localViagem" | "chegadaViagem" | "alumniTurma" | "alumni" | "alunoModulo" | "alunoMaterial" | "secaoPagina";
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
      return d ? { profissao: d.profissao, cidade: d.cidade, texto: d.texto, fotoAlt: d.fotoAlt } : null;
    },
    async tags() {
      return [TAG_CURSO];
    },
    rotulos: { profissao: "Profissão", cidade: "Cidade", texto: "Depoimento", fotoAlt: "Texto alternativo da foto" },
  },
  localViagem: {
    tabela: viagemLocaisTraducoes,
    colId: viagemLocaisTraducoes.localId,
    async lerOrigem(id) {
      const l = await um(db.select().from(viagemLocais).where(eq(viagemLocais.id, String(id))));
      return l ? { descricao: l.descricao, fotoAlt: l.fotoAlt } : null;
    },
    async tags() {
      return [TAG_VIAGEM];
    },
    rotulos: { descricao: "Descrição", fotoAlt: "Texto alternativo da foto" },
  },
  chegadaViagem: {
    tabela: viagemChegadaTraducoes,
    colId: viagemChegadaTraducoes.chegadaId,
    async lerOrigem(id) {
      const c = await um(db.select().from(viagemChegada).where(eq(viagemChegada.id, String(id))));
      return c ? { titulo: c.titulo, texto: c.texto } : null;
    },
    async tags() {
      return [TAG_VIAGEM];
    },
    rotulos: { titulo: "Título", texto: "Texto" },
  },
  alumniTurma: {
    tabela: alumniTurmasTraducoes,
    colId: alumniTurmasTraducoes.alumniTurmaId,
    async lerOrigem(id) {
      const t = await um(db.select().from(alumniTurmas).where(eq(alumniTurmas.id, String(id))));
      return t ? { titulo: t.titulo, resumo: t.resumo, fotoAlt: t.fotoAlt } : null;
    },
    async tags() {
      return [TAG_ALUMNI];
    },
    rotulos: { titulo: "Título", resumo: "Resumo", fotoAlt: "Texto alternativo da foto" },
  },
  alumni: {
    tabela: alumniTraducoes,
    colId: alumniTraducoes.alumniId,
    async lerOrigem(id) {
      const a = await um(db.select().from(alumni).where(eq(alumni.id, String(id))));
      return a ? { profissao: a.profissao, fotoAlt: a.fotoAlt } : null;
    },
    async tags() {
      return [TAG_ALUMNI];
    },
    rotulos: { profissao: "Profissão", fotoAlt: "Texto alternativo da foto" },
  },
  alunoModulo: {
    tabela: alunoModulosTraducoes,
    colId: alunoModulosTraducoes.moduloId,
    async lerOrigem(id) {
      const m = await um(db.select().from(alunoModulos).where(eq(alunoModulos.id, String(id))));
      return m ? { titulo: m.titulo, descricao: m.descricao } : null;
    },
    // A área do aluno lê direto do banco (por sessão, sem cache): não há tag para expirar.
    async tags() {
      return [];
    },
    rotulos: { titulo: "Título", descricao: "Descrição" },
  },
  alunoMaterial: {
    tabela: alunoMateriaisTraducoes,
    colId: alunoMateriaisTraducoes.materialId,
    async lerOrigem(id) {
      const m = await um(db.select().from(alunoMateriais).where(eq(alunoMateriais.id, String(id))));
      return m ? { titulo: m.titulo, texto: m.texto, imagens: m.imagens } : null;
    },
    async tags() {
      return [];
    },
    rotulos: { titulo: "Título", texto: "Texto", imagens: "Descrição das imagens" },
  },
  // Seção das páginas Início e Sobre (editor visual): a tradução é do conteúdo PUBLICADO.
  secaoPagina: {
    tabela: siteSecoesTraducoes,
    colId: siteSecoesTraducoes.secaoId,
    async lerOrigem(id) {
      const s = await um(db.select().from(siteSecoes).where(eq(siteSecoes.id, String(id))));
      return s?.publicado ? { ...s.publicado } : null;
    },
    async tags() {
      return [TAG_PAGINAS];
    },
    rotulos: {
      sobretitulo: "Sobretítulo",
      eyebrow: "Sobretítulo",
      titulo: "Título",
      frase: "Texto de abertura",
      lead: "Texto",
      foto: "Foto (descrição)",
      botao1Rotulo: "Botão principal",
      botao2Rotulo: "Botão secundário",
      botaoRotulo: "Botão",
      linkRotulo: "Link abaixo da lista",
      pilares: "Pilares",
      itens: "Itens",
      paragrafos: "Parágrafos",
    },
  },
};

export type CondicaoDeId = (e: DefinicaoEntidade, id: IdEntidade) => SQL;
export const condicaoDeId = (e: DefinicaoEntidade, id: IdEntidade) => eq(e.colId, id as never);
