import type { Publicacao } from "@/db/schema";
import type { EventStatus } from "./agenda";
import { hojeISO } from "./datas";

export type { Publicacao };

export interface DadosStatus {
  publicacao: Publicacao;
  inicio: string;
  fim?: string | null;
  vagas: number;
  /** Inscrições em AGUARDANDO_PAGAMENTO, REGISTRO_A_CONFERIR ou CONFIRMADA. */
  ocupadas: number;
}

/** Vagas que sobram para acionar o selo "Últimas vagas". */
export const LIMITE_ULTIMAS_VAGAS = 3;

/**
 * Status público de uma turma. É sempre calculado, nunca marcado à mão
 * (ver "Status público de uma turma" na especificação). `null` = não aparece no site.
 */
export function calcularStatus(t: DadosStatus, hoje = hojeISO()): EventStatus | null {
  if (t.publicacao === "RASCUNHO") return null;
  if ((t.fim ?? t.inicio) < hoje) return "encerrado";
  if (t.publicacao === "EM_BREVE") return "em-breve";
  if (t.ocupadas >= t.vagas) return "esgotado";
  if (t.vagas - t.ocupadas <= LIMITE_ULTIMAS_VAGAS) return "ultimas";
  return "aberto";
}
