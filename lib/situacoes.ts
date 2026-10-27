import type { Situacao } from "@/db/schema";

/** Rótulos e tons das situações de inscrição. Sem dependências de servidor: o cliente também usa. */
export const ROTULO_SITUACAO: Record<Situacao, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  REGISTRO_A_CONFERIR: "Registro a conferir",
  CONFIRMADA: "Confirmada",
  LISTA_ESPERA: "Lista de espera",
  CANCELADA: "Cancelada",
};

export const TOM_SITUACAO: Record<Situacao, "success" | "warning" | "neutral" | "danger"> = {
  CONFIRMADA: "success",
  AGUARDANDO_PAGAMENTO: "warning",
  REGISTRO_A_CONFERIR: "neutral",
  LISTA_ESPERA: "neutral",
  CANCELADA: "danger",
};

export const SITUACOES_ORDEM: Situacao[] = ["AGUARDANDO_PAGAMENTO", "REGISTRO_A_CONFERIR", "CONFIRMADA", "LISTA_ESPERA", "CANCELADA"];
