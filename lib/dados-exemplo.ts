/* Dados de exemplo, tirados dos arquivos .dc.html de design/.
   As turmas daqui só alimentam o seed do banco (db/seed.ts); as páginas leem do banco.
   O conteúdo institucional (credenciais, depoimentos, perguntas) ainda vem daqui, como placeholder explícito. */

import type { Publicacao } from "./status";
import type { ItemProgramacao } from "@/db/schema";

export interface TurmaExemplo {
  slug: string;
  titulo: string;
  /** Versão curta para faixas de chamada ("Módulo essencial"). */
  tituloCurto: string;
  resumo: string;
  descricao: string[];
  modalidade: "Presencial" | "Online";
  publicacao: Publicacao;
  inicio: string;
  fim?: string;
  horario: string;
  /** Presencial: "Belo Horizonte, MG". Online: "Ao vivo". */
  cidade: string;
  local?: string;
  vagas: number;
  /** Faz as vezes da contagem de inscrições ocupadas (fase 4 conta no banco). */
  inscritos: number;
  /** Texto de exibição. O valor real entra como `precoCentavos` na fase 4. */
  preco: string;
  parcelamento?: string;
  fotoUrl: string;
  fotoAlt: string;
  publicoAlvo: string[];
  aprendizados: string[];
  programacao: Array<{ titulo: string; itens: ItemProgramacao[] }>;
  faq: Array<{ q: string; a: string }>;
}

const PUBLICO_ALVO = ["Médicos", "Cirurgiões-dentistas", "Biomédicos", "Outra profissão a confirmar"];

const APRENDIZADOS = [
  "Anatomia aplicada e pontos de referência",
  "Avaliação, indicações e contraindicações",
  "Diluição, dose e técnicas de aplicação",
  "Prevenção e conduta em intercorrências",
  "Documentação, consentimento e acompanhamento",
];

const FAQ_TURMA = [
  { q: "Recebo certificado?", a: "Resposta a confirmar: tipo de certificado, carga horária (00 horas) e quando é entregue." },
  { q: "O material está incluso?", a: "Resposta a confirmar: o que está incluso no valor (produto para a prática, apostila, alimentação) e o que você precisa levar." },
  { q: "Quais são as formas de pagamento?", a: "Resposta a confirmar: Pix, boleto ou cartão em até 10x de R$ 000. Os dados de pagamento chegam por e-mail depois da inscrição." },
  { q: "E se eu precisar cancelar?", a: "Resposta a confirmar: prazos de cancelamento, reembolso e transferência para outra turma." },
];

const PROGRAMACAO_ESSENCIAL = [
  {
    titulo: "Dia 1 · Sábado, 21 de novembro",
    itens: [
      { time: "08:00", title: "Recepção e credenciamento" },
      { time: "08:30", title: "Anatomia aplicada", description: "Musculatura, pontos de referência e planejamento.", duration: "2h" },
      { time: "10:45", title: "Avaliação e indicação", description: "Indicações, contraindicações e consentimento.", duration: "1h45" },
      { time: "12:30", title: "Almoço" },
      { time: "14:00", title: "Diluição, dose e técnica", description: "Preparo do produto e técnicas de aplicação.", duration: "2h" },
      { time: "16:15", title: "Prática supervisionada", description: "Primeiras aplicações com acompanhamento individual.", duration: "1h45" },
    ],
  },
  {
    titulo: "Dia 2 · Domingo, 22 de novembro",
    itens: [
      { time: "08:00", title: "Revisão do primeiro dia" },
      { time: "08:30", title: "Intercorrências", description: "Prevenção, reconhecimento e conduta.", duration: "2h" },
      { time: "10:45", title: "Documentação e acompanhamento", description: "Registro, retorno e comunicação com o paciente.", duration: "1h45" },
      { time: "12:30", title: "Almoço" },
      { time: "14:00", title: "Prática supervisionada", description: "Aplicações acompanhadas de perto pela Dra.", duration: "3h30" },
      { time: "17:30", title: "Encerramento e certificados" },
    ],
  },
];

/** Programação genérica, a confirmar com a Dra., para as turmas de um dia. */
const PROGRAMACAO_UM_DIA = (titulo: string) => [
  {
    titulo,
    itens: [
      { time: "00:00", title: "Abertura" },
      { time: "00:00", title: "Conteúdo principal", description: "Descrição a confirmar com a Dra.", duration: "0h" },
      { time: "00:00", title: "Encerramento" },
    ],
  },
];

const DESCRICAO_PLACEHOLDER = [
  "Primeiro parágrafo de descrição da turma: o objetivo, o formato e como o conteúdo se liga à prática.",
  "Segundo parágrafo: o que diferencia a formação, o tamanho da turma e o acompanhamento da Dra.",
];

export const TURMAS_EXEMPLO: TurmaExemplo[] = [
  {
    slug: "anatomia-out-2026",
    titulo: "Anatomia aplicada à toxina",
    tituloCurto: "Anatomia aplicada",
    resumo: "Encontro online sobre a anatomia que sustenta cada ponto de aplicação.",
    descricao: DESCRICAO_PLACEHOLDER,
    modalidade: "Online",
    publicacao: "PUBLICADO",
    inicio: "2026-10-08",
    horario: "19h às 22h",
    cidade: "Ao vivo",
    vagas: 30,
    inscritos: 30,
    preco: "R$ 0.000",
    fotoUrl: "/images/anatomia-quadril.webp",
    fotoAlt: "Modelo anatômico do quadril",
    publicoAlvo: PUBLICO_ALVO,
    aprendizados: APRENDIZADOS,
    programacao: PROGRAMACAO_UM_DIA("Quinta-feira, 8 de outubro"),
    faq: FAQ_TURMA,
  },
  {
    slug: "planejamento-out-2026",
    titulo: "Planejamento e marcação de pontos",
    tituloCurto: "Planejamento e marcação",
    resumo: "Encontro online sobre como planejar e marcar os pontos antes de aplicar.",
    descricao: DESCRICAO_PLACEHOLDER,
    modalidade: "Online",
    publicacao: "PUBLICADO",
    inicio: "2026-10-30",
    horario: "19h às 22h",
    cidade: "Ao vivo",
    vagas: 30,
    inscritos: 11,
    preco: "R$ 0.000",
    fotoUrl: "/images/maos.webp",
    fotoAlt: "Mãos em luvas preparando uma aplicação",
    publicoAlvo: PUBLICO_ALVO,
    aprendizados: APRENDIZADOS,
    programacao: PROGRAMACAO_UM_DIA("Sexta-feira, 30 de outubro"),
    faq: FAQ_TURMA,
  },
  {
    slug: "modulo-essencial-nov-2026",
    titulo: "Toxina botulínica — módulo essencial",
    tituloCurto: "Módulo essencial",
    resumo: "Fundamentos, anatomia aplicada e prática supervisionada.",
    descricao: [
      "Primeiro parágrafo de descrição da turma: o objetivo do módulo essencial, o formato em dois dias e como as aulas teóricas se ligam à prática.",
      "Segundo parágrafo: o que diferencia a formação, o tamanho da turma e o acompanhamento da Dra. durante a prática supervisionada.",
    ],
    modalidade: "Presencial",
    publicacao: "PUBLICADO",
    inicio: "2026-11-21",
    fim: "2026-11-22",
    horario: "8h às 18h",
    cidade: "Belo Horizonte, MG",
    local: "Local a definir",
    vagas: 12,
    inscritos: 5,
    preco: "R$ 0.000",
    parcelamento: "ou 10x de R$ 000",
    fotoUrl: "/images/maos.webp",
    fotoAlt: "Mãos em luvas preparando uma aplicação",
    publicoAlvo: PUBLICO_ALVO,
    aprendizados: APRENDIZADOS,
    programacao: PROGRAMACAO_ESSENCIAL,
    faq: FAQ_TURMA,
  },
  {
    slug: "anatomia-nov-2026",
    titulo: "Anatomia aplicada à toxina",
    tituloCurto: "Anatomia aplicada",
    resumo: "Encontro online sobre a anatomia que sustenta cada ponto de aplicação.",
    descricao: DESCRICAO_PLACEHOLDER,
    modalidade: "Online",
    publicacao: "PUBLICADO",
    inicio: "2026-11-28",
    horario: "19h às 22h",
    cidade: "Ao vivo",
    vagas: 30,
    inscritos: 30,
    preco: "R$ 0.000",
    fotoUrl: "/images/anatomia-quadril.webp",
    fotoAlt: "Modelo anatômico do quadril",
    publicoAlvo: PUBLICO_ALVO,
    aprendizados: APRENDIZADOS,
    programacao: PROGRAMACAO_UM_DIA("Sábado, 28 de novembro"),
    faq: FAQ_TURMA,
  },
  {
    slug: "avancado-dez-2026",
    titulo: "Aplicação avançada e intercorrências",
    tituloCurto: "Aplicação avançada",
    resumo: "Para quem já aplica e quer aprofundar a conduta em intercorrências.",
    descricao: DESCRICAO_PLACEHOLDER,
    modalidade: "Presencial",
    publicacao: "PUBLICADO",
    inicio: "2026-12-05",
    horario: "8h às 17h",
    cidade: "Belo Horizonte, MG",
    local: "Local a definir",
    vagas: 12,
    inscritos: 9,
    preco: "R$ 0.000",
    parcelamento: "ou 10x de R$ 000",
    fotoUrl: "/images/luvas.webp",
    fotoAlt: "Luvas cirúrgicas sobre bancada",
    publicoAlvo: PUBLICO_ALVO,
    aprendizados: APRENDIZADOS,
    programacao: PROGRAMACAO_UM_DIA("Sábado, 5 de dezembro"),
    faq: FAQ_TURMA,
  },
  {
    slug: "modulo-essencial-dez-2026",
    titulo: "Toxina botulínica — módulo essencial",
    tituloCurto: "Módulo essencial",
    resumo: "Nova turma do módulo essencial. Inscrições abrem em breve.",
    descricao: DESCRICAO_PLACEHOLDER,
    modalidade: "Presencial",
    publicacao: "EM_BREVE",
    inicio: "2026-12-12",
    fim: "2026-12-13",
    horario: "Horário a definir",
    cidade: "Belo Horizonte, MG",
    vagas: 0,
    inscritos: 0,
    preco: "R$ 0.000",
    fotoUrl: "/images/anatomia-quadril.webp",
    fotoAlt: "Modelo anatômico do quadril",
    publicoAlvo: PUBLICO_ALVO,
    aprendizados: APRENDIZADOS,
    programacao: PROGRAMACAO_UM_DIA("Programação a confirmar"),
    faq: FAQ_TURMA,
  },
];

/* ---------- Conteúdo institucional ---------- */

export const CREDENCIAIS = [
  "Especialista em Medicina Física e Reabilitação — instituição a confirmar",
  "Título ou formação complementar",
  "Sociedade ou associação de que faz parte",
];

export const NUMEROS_TRAJETORIA = [
  { value: "00", label: "Anos de experiência" },
  { value: "00", label: "Turmas realizadas" },
  { value: "00", label: "Profissionais formados" },
  { value: "00", label: "Horas de prática por turma" },
];

export const DEPOIMENTOS = [
  { quote: "Texto do depoimento, autorizado por escrito. Fala da formação, da didática e do acompanhamento durante a prática.", name: "Nome da aluna", role: "Profissão · Cidade" },
  { quote: "Texto do depoimento, autorizado por escrito. Conta como foi a turma e o que mudou na rotina de trabalho.", name: "Nome do aluno", role: "Profissão · Cidade" },
  { quote: "Texto do depoimento, autorizado por escrito. Comenta a organização do curso e o suporte depois das aulas.", name: "Nome da aluna", role: "Profissão · Cidade" },
];

export const FAQ_CLINICA = [
  { q: "O que devo levar na primeira consulta?", a: "Um documento com foto, os exames recentes (imagens e laudos) e a lista dos medicamentos que você usa." },
  { q: "A clínica atende convênio?", a: "Resposta a confirmar com a clínica: convênios aceitos ou atendimento particular com recibo para reembolso." },
  { q: "Quanto tempo dura a consulta?", a: "Resposta a confirmar com a clínica: duração média da primeira consulta e dos retornos." },
  { q: "Como faço para agendar?", a: "Pelo WhatsApp ou pelo formulário da página Contato. A equipe confirma o horário com você." },
];

export const PROFISSOES = ["Médico(a)", "Cirurgião(ã)-dentista", "Biomédico(a)", "Farmacêutico(a)", "Outra profissão habilitada"];
export const CONSELHOS = ["CRM", "CRO", "CRBM", "CRF", "Outro"];
export const ASSUNTOS_CONTATO = ["Consulta na clínica", "Turmas de toxina botulínica", "Outro assunto"];
