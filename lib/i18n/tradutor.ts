/** Função de tradução como as páginas a recebem de `getTranslations({ locale })` (chaves completas: "Status.aberto"). */
export type Tradutor = (chave: string, valores?: Record<string, string | number>) => string;
