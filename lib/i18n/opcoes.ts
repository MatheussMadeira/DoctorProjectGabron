/* Opções dos selects dos formulários públicos. O valor gravado no banco é SEMPRE o canônico, em português (é o que a equipe lê no painel
   e na planilha); só o rótulo mostrado muda com o idioma (namespace "Opcoes" de messages/). Sem dependências: o cliente pode importar. */

export interface Opcao {
  /** Valor canônico (português): vai no formulário e para o banco. */
  valor: string;
  /** Chave do rótulo em messages (Opcoes.profissoes.<chave> etc.). */
  chave: string;
}

export const PROFISSOES_OPCOES: Opcao[] = [
  { valor: "Médico(a)", chave: "medico" },
  { valor: "Cirurgião(ã)-dentista", chave: "dentista" },
  { valor: "Biomédico(a)", chave: "biomedico" },
  { valor: "Farmacêutico(a)", chave: "farmaceutico" },
  { valor: "Outra profissão habilitada", chave: "outra" },
];

export const CONSELHOS_OPCOES: Opcao[] = ["CRM", "CRO", "CRBM", "CRF", "Outro"].map((v) => ({ valor: v, chave: v }));

export const ASSUNTOS_OPCOES: Opcao[] = [
  { valor: "Inscrições e turmas", chave: "inscricoes" },
  { valor: "Pagamento", chave: "pagamento" },
  { valor: "Turma para grupo ou instituição", chave: "grupo" },
  { valor: "Outro assunto", chave: "outro" },
];

export const VALORES_PROFISSOES = PROFISSOES_OPCOES.map((o) => o.valor);
export const VALORES_CONSELHOS = CONSELHOS_OPCOES.map((o) => o.valor);
export const VALORES_ASSUNTOS = ASSUNTOS_OPCOES.map((o) => o.valor);

/** Opções no formato do <Select>: valor canônico + rótulo traduzido. `rotulo(chave)` vem de useTranslations("Opcoes.profissoes") etc. */
export const comoOpcoes = (lista: Opcao[], rotulo: (chave: string) => string) => lista.map((o) => ({ value: o.valor, label: rotulo(o.chave) }));
