/* Tipos dos formulários públicos. Sem dependências do servidor, para o cliente poder importar. */

export interface EstadoFormulario {
  ok?: boolean;
  /** Inscrição que entrou na lista de espera (turma lotada no momento de gravar). */
  listaEspera?: boolean;
  erroGeral?: string;
  /** Mensagem por campo, no tom da tela TurmaErro.dc.html: diz o que fazer. */
  erros?: Record<string, string>;
  /** O carimbo de tempo venceu (aba aberta há muito tempo): o formulário pede um novo e reenvia sozinho, esperando estes milissegundos antes. Nunca vira mensagem de erro. */
  renovarCarimbo?: number;
  /** O que a pessoa digitou, devolvido para o formulário não ficar vazio depois de um erro. */
  valores?: Record<string, string>;
}

/** Campo escondido que só robô preenche. O nome é de propósito sem sentido: nenhum navegador, gerenciador de senhas ou
    extensão de autopreenchimento reconhece "campo_hp_7k". Nomes como website, url, empresa, telefone ou e-mail
    SÃO preenchidos sozinhos pelo Chrome, e uma pessoa real perdia o envio (falso sucesso). */
export const CAMPO_ARMADILHA = "campo_hp_7k";

/** Carimbo de tempo assinado pelo servidor, preenchido pelo navegador ao abrir o formulário (ver lib/carimbo.ts). */
export const CAMPO_CARIMBO = "carimbo_form";
