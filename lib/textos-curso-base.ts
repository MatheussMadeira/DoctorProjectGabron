/* Formas, limites e textos padrão dos textos do curso (sem dependências do Next: o seed e os testes também usam). */

export const TAG_CURSO = "curso";

export interface TopoDaHome {
  sobretitulo: string;
  titulo: string;
  frase: string;
  fotoUrl: string;
  fotoAlt: string;
}
export interface Pilar {
  titulo: string;
  texto: string;
}
export interface Numero {
  valor: string;
  rotulo: string;
}
export interface TextosDoCurso {
  topo: TopoDaHome;
  proposta: { paragrafos: string[] };
  pilares: { itens: Pilar[] };
  numeros: { itens: Numero[] };
  valores: { titulo: string; frase: string };
}
export type Bloco = keyof TextosDoCurso;
export const BLOCOS: Bloco[] = ["topo", "proposta", "pilares", "numeros", "valores"];

/** Limites do que o admin pode cadastrar. */
export const LIMITES_CURSO = { pilaresMin: 3, pilaresMax: 5, numeros: 4, paragrafos: 2 } as const;

export const TEXTOS_PADRAO: TextosDoCurso = {
  topo: {
    sobretitulo: "Formação em toxina botulínica",
    titulo: "ReabToxin",
    frase: "Curso prático de toxina botulínica para médicos, dentistas, biomédicos e outros profissionais da saúde, com base anatômica e prática supervisionada.",
    fotoUrl: "/images/maos.webp",
    fotoAlt: "Mãos em luvas preparando uma aplicação",
  },
  proposta: {
    paragrafos: [
      "Primeiro parágrafo sobre o curso: de onde vem a proposta, a ligação com a reabilitação e o que o profissional leva para a rotina.",
      "Segundo parágrafo: o formato das turmas, como teoria e prática se combinam e o acompanhamento oferecido pelos professores.",
    ],
  },
  pilares: {
    itens: [
      { titulo: "Base anatômica", texto: "Cada técnica parte da anatomia aplicada e do critério de indicação." },
      { titulo: "Prática supervisionada", texto: "As aplicações são acompanhadas pelos professores, com orientação individual." },
      { titulo: "Segurança antes de tudo", texto: "Critérios para indicar ou não o procedimento e conduta diante de intercorrências." },
      { titulo: "Depois do curso", texto: "Como funciona o contato com os professores depois da turma: a confirmar." },
    ],
  },
  numeros: {
    itens: [
      { valor: "00", rotulo: "Turmas realizadas" },
      { valor: "00", rotulo: "Profissionais formados" },
      { valor: "00", rotulo: "Horas de prática por turma" },
      { valor: "00", rotulo: "Professores" },
    ],
  },
  valores: { titulo: "Equilíbrio, cuidado, paciência", frase: "Ouvir com atenção, decidir com critério e acompanhar cada etapa, em sala e na prática." },
};

