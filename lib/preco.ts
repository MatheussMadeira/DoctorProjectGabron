/** Valor ainda não definido pela Dra.: placeholder explícito. */
export const PRECO_PLACEHOLDER = "R$ 0.000";

export const formatarPreco = (centavos: number | null) =>
  centavos == null ? PRECO_PLACEHOLDER : `R$ ${(centavos / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
