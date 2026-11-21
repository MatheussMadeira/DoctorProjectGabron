import type { Conteudo, TipoSecao } from "./campos";
import type { TextosDoCurso } from "../textos-curso-base";
import type { Tradutor } from "../i18n/tradutor";

/* As páginas editáveis (Início e Sobre o curso) e as seções de cada uma, na ordem padrão. O conteúdo padrão de cada seção sai dos textos que
   o site já tinha (messages + textos do curso): enquanto uma seção não foi publicada no editor, o site continua igual a antes. */

export type PaginaSlug = "inicio" | "sobre-o-curso";
export const PAGINAS_EDITAVEIS: PaginaSlug[] = ["inicio", "sobre-o-curso"];

export interface DefSecao {
  chave: string;
  tipo: TipoSecao;
  /** Nome na lista de seções do editor. */
  rotulo: string;
  /** Leva o número (01, 02…) no cabeçalho; a numeração segue a ordem das seções visíveis. */
  numerada?: boolean;
  /** O corpo da seção são dados vivos (turmas, professores…): o editor muda só o cabeçalho, a ordem e a visibilidade. */
  dados?: boolean;
  /** Para onde vai o link abaixo da lista (seções com dados). */
  linkHref?: string;
}

export const PAGINAS: Record<PaginaSlug, { rotulo: string; caminho: string; secoes: DefSecao[] }> = {
  inicio: {
    rotulo: "Início",
    caminho: "/",
    secoes: [
      { chave: "topo", tipo: "hero", rotulo: "Topo da página" },
      { chave: "curso", tipo: "curso", rotulo: "Como é a formação", numerada: true },
      { chave: "turmas", tipo: "cabecalho", rotulo: "Próximas turmas", numerada: true, dados: true, linkHref: "/agenda" },
      { chave: "professores", tipo: "cabecalho", rotulo: "Professores", numerada: true, dados: true, linkHref: "/sobre-o-curso#professores" },
      { chave: "numeros", tipo: "numeros", rotulo: "O curso em números" },
      { chave: "depoimentos", tipo: "cabecalho", rotulo: "Depoimentos", numerada: true, dados: true, linkHref: "/alumni-reabtoxin" },
    ],
  },
  "sobre-o-curso": {
    rotulo: "Sobre o curso",
    caminho: "/sobre-o-curso",
    secoes: [
      { chave: "topo", tipo: "hero", rotulo: "Topo da página" },
      { chave: "proposta", tipo: "proposta", rotulo: "A proposta", numerada: true },
      { chave: "professores", tipo: "cabecalho", rotulo: "Professores", numerada: true, dados: true },
      { chave: "galeria", tipo: "cabecalho", rotulo: "Galeria", numerada: true, dados: true },
      { chave: "valores", tipo: "valores", rotulo: "Valores", numerada: true },
    ],
  },
};

export const ehPagina = (v: string): v is PaginaSlug => v in PAGINAS;
export const defDaSecao = (pagina: PaginaSlug, chave: string) => PAGINAS[pagina].secoes.find((s) => s.chave === chave);

/** O conteúdo de uma seção quando ainda não foi publicado nada: vem dos textos que o site já usava, no idioma do `tr`. */
export function conteudoPadrao(pagina: PaginaSlug, chave: string, tr: Tradutor, curso: TextosDoCurso): Conteudo {
  const pilares = curso.pilares.itens.map((p) => ({ titulo: p.titulo, texto: p.texto }));
  if (pagina === "inicio") {
    switch (chave) {
      case "topo":
        return {
          sobretitulo: curso.topo.sobretitulo,
          titulo: curso.topo.titulo,
          frase: curso.topo.frase,
          foto: { url: curso.topo.fotoUrl, alt: curso.topo.fotoAlt },
          botao1Rotulo: tr("Comum.verAgenda"),
          botao1Link: "/agenda",
          botao2Rotulo: tr("Comum.conhecaCurso"),
          botao2Link: "/sobre-o-curso",
        };
      case "curso":
        return {
          eyebrow: tr("Home.cursoEyebrow"),
          titulo: tr("Home.cursoTitulo"),
          lead: curso.proposta.paragrafos[0] ?? "",
          pilares: pilares.slice(0, 3),
          foto: { url: "/images/anatomia-quadril.webp", alt: tr("Home.fotoCursoAlt") },
          botaoRotulo: tr("Comum.conhecaCurso"),
          botaoLink: "/sobre-o-curso",
        };
      case "turmas":
        return { eyebrow: tr("Home.turmasEyebrow"), titulo: tr("Home.turmasTitulo"), lead: tr("Home.turmasLead"), linkRotulo: tr("Home.verAgendaCompleta") };
      case "professores":
        return { eyebrow: tr("Home.professoresEyebrow"), titulo: tr("Home.professoresTitulo"), lead: "", linkRotulo: tr("Home.conhecaProfessores") };
      case "numeros":
        return { eyebrow: tr("Home.numerosEyebrow"), titulo: tr("Home.numerosTitulo"), itens: curso.numeros.itens.map((n) => ({ valor: n.valor, rotulo: n.rotulo })) };
      case "depoimentos":
        return { eyebrow: tr("Home.depoimentosEyebrow"), titulo: tr("Home.depoimentosTitulo"), lead: "", linkRotulo: tr("Home.verTodosDepoimentos") };
    }
  } else {
    switch (chave) {
      case "topo":
        return {
          sobretitulo: tr("Sobre.heroEyebrow"),
          titulo: curso.topo.titulo,
          frase: tr("Sobre.heroLead"),
          foto: { url: "/images/boneco-articulado.webp", alt: tr("Sobre.heroImagemAlt") },
          botao1Rotulo: tr("Comum.verAgenda"),
          botao1Link: "/agenda",
          botao2Rotulo: tr("Sobre.falarEquipe"),
          botao2Link: "/contato",
        };
      case "proposta":
        return { eyebrow: tr("Sobre.propostaEyebrow"), titulo: tr("Sobre.propostaTitulo"), paragrafos: curso.proposta.paragrafos.map((texto) => ({ texto })), pilares };
      case "professores":
        return { eyebrow: tr("Sobre.professoresEyebrow"), titulo: tr("Sobre.professoresTitulo"), lead: "", linkRotulo: "" };
      case "galeria":
        return { eyebrow: tr("Sobre.galeriaEyebrow"), titulo: tr("Sobre.galeriaTitulo"), lead: tr("Sobre.galeriaLead"), linkRotulo: "" };
      case "valores":
        return { eyebrow: tr("Sobre.valoresEyebrow"), titulo: curso.valores.titulo, frase: curso.valores.frase };
    }
  }
  return {};
}
