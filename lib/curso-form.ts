import { z } from "zod";
import { fotoValida } from "./turma-form";
import { LIMITES_CURSO } from "./textos-curso-base";

/* Validação dos textos do curso (Configurações › Curso). */

const texto = (max: number, vazio: string) => z.string().trim().min(1, vazio).max(max, `Use no máximo ${max} caracteres.`);

export const cursoSchema = z.object({
  topo: z.object({
    sobretitulo: texto(120, "Digite o sobretítulo."),
    titulo: texto(120, "Digite o título."),
    frase: texto(400, "Digite a frase."),
    fotoUrl: z.string().trim().refine(fotoValida, "Escolha uma foto."),
    fotoAlt: texto(200, "Descreva a foto."),
  }),
  proposta: z.object({ paragrafos: z.array(texto(1200, "Escreva o parágrafo.")).length(LIMITES_CURSO.paragrafos, "A proposta tem 2 parágrafos.") }),
  pilares: z.object({
    itens: z
      .array(z.object({ titulo: texto(80, "Digite o título do pilar."), texto: texto(240, "Escreva o texto do pilar.") }))
      .min(LIMITES_CURSO.pilaresMin, `Use de ${LIMITES_CURSO.pilaresMin} a ${LIMITES_CURSO.pilaresMax} pilares.`)
      .max(LIMITES_CURSO.pilaresMax, `Use de ${LIMITES_CURSO.pilaresMin} a ${LIMITES_CURSO.pilaresMax} pilares.`),
  }),
  numeros: z.object({ itens: z.array(z.object({ valor: texto(12, "Digite o número."), rotulo: texto(60, "Digite o rótulo.") })).length(LIMITES_CURSO.numeros, "Os números são 4 itens.") }),
  valores: z.object({ titulo: texto(120, "Digite o título."), frase: texto(400, "Digite a frase.") }),
});

