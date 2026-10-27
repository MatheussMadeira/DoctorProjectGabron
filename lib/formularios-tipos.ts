/* Tipos dos formulários públicos. Sem dependências do servidor, para o cliente poder importar. */

export interface EstadoFormulario {
  ok?: boolean;
  /** Inscrição que entrou na lista de espera (turma lotada no momento de gravar). */
  listaEspera?: boolean;
  erroGeral?: string;
  /** Mensagem por campo, no tom da tela TurmaErro.dc.html: diz o que fazer. */
  erros?: Record<string, string>;
  /** O que a pessoa digitou, devolvido para o formulário não ficar vazio depois de um erro. */
  valores?: Record<string, string>;
}

/** Campo escondido que só robô preenche. */
export const CAMPO_ARMADILHA = "website";
