/* Estados do Brasil: sigla, nome e o código do IBGE (`codarea` do mapa em public/mapas/brasil-estados.geojson). */
export interface Estado {
  codarea: string;
  sigla: string;
  nome: string;
}

export const ESTADOS: readonly Estado[] = [
  { codarea: "12", sigla: "AC", nome: "Acre" },
  { codarea: "27", sigla: "AL", nome: "Alagoas" },
  { codarea: "16", sigla: "AP", nome: "Amapá" },
  { codarea: "13", sigla: "AM", nome: "Amazonas" },
  { codarea: "29", sigla: "BA", nome: "Bahia" },
  { codarea: "23", sigla: "CE", nome: "Ceará" },
  { codarea: "53", sigla: "DF", nome: "Distrito Federal" },
  { codarea: "32", sigla: "ES", nome: "Espírito Santo" },
  { codarea: "52", sigla: "GO", nome: "Goiás" },
  { codarea: "21", sigla: "MA", nome: "Maranhão" },
  { codarea: "51", sigla: "MT", nome: "Mato Grosso" },
  { codarea: "50", sigla: "MS", nome: "Mato Grosso do Sul" },
  { codarea: "31", sigla: "MG", nome: "Minas Gerais" },
  { codarea: "15", sigla: "PA", nome: "Pará" },
  { codarea: "25", sigla: "PB", nome: "Paraíba" },
  { codarea: "41", sigla: "PR", nome: "Paraná" },
  { codarea: "26", sigla: "PE", nome: "Pernambuco" },
  { codarea: "22", sigla: "PI", nome: "Piauí" },
  { codarea: "33", sigla: "RJ", nome: "Rio de Janeiro" },
  { codarea: "24", sigla: "RN", nome: "Rio Grande do Norte" },
  { codarea: "43", sigla: "RS", nome: "Rio Grande do Sul" },
  { codarea: "11", sigla: "RO", nome: "Rondônia" },
  { codarea: "14", sigla: "RR", nome: "Roraima" },
  { codarea: "42", sigla: "SC", nome: "Santa Catarina" },
  { codarea: "35", sigla: "SP", nome: "São Paulo" },
  { codarea: "28", sigla: "SE", nome: "Sergipe" },
  { codarea: "17", sigla: "TO", nome: "Tocantins" },
];

export const SIGLAS_UF = ESTADOS.map((e) => e.sigla);
export const estadoPorSigla = (sigla: string | null | undefined) => ESTADOS.find((e) => e.sigla === sigla?.toUpperCase());
export const estadoPorCodarea = (codarea: string) => ESTADOS.find((e) => e.codarea === codarea);
