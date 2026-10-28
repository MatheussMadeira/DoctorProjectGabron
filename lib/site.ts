/* Dados do site. Navegação e textos fixos ficam aqui; os dados de contato são editados pela
   Dra. em Configurações, ficam no banco (tabela `configuracoes`) e chegam por lib/configuracoes.ts.
   O que ainda não foi preenchido continua como placeholder explícito (ver CLAUDE.md). */

export const NAV_LINKS = [
  { label: "Início", href: "/" },
  { label: "Sobre o curso", href: "/sobre-o-curso" },
  { label: "Agenda de cursos", href: "/agenda" },
  { label: "Contato", href: "/contato" },
];

export const HEADER_CTA = { label: "Próximas turmas", href: "/agenda" };

export const NOME_DO_CURSO = "ReabToxin";

/** Valores de partida: o que aparece enquanto a Dra. não preenche Configurações. */
export const SITE_PADRAO = {
  telefone: "+55 31 0000-0000",
  whatsapp: "5531000000000",
  instagram: "@perfil",
  email: "contato@dominio.com.br",
  enderecoLinha1: "Rua, número, sala · Bairro",
  enderecoLinha2: "Belo Horizonte — MG · CEP 00000-000",
  horario: "Segunda a sexta, 00h às 00h",
};

export type CamposSite = keyof typeof SITE_PADRAO;
export type LinhaConfiguracao = Partial<Record<CamposSite, string | null>>;

export interface DadosSite {
  telefone: string;
  /** `tel:` só com dígitos. */
  telefoneHref: string;
  /** Só dígitos com o código do país, para wa.me. */
  whatsapp: string;
  instagram: string;
  instagramUrl: string;
  email: string;
  enderecoLinhas: [string, string];
  enderecoCurto: string;
  horario: string;
  /** Linha legal do rodapé. */
  legal: string;
}

const preenchido = (v: string | null | undefined, padrao: string) => (v && v.trim() ? v.trim() : padrao);

/** Junta o que está no banco com os placeholders. */
export function montarSite(linha: LinhaConfiguracao | null, ano = new Date().getFullYear()): DadosSite {
  const v = (campo: CamposSite) => preenchido(linha?.[campo], SITE_PADRAO[campo]);
  const telefone = v("telefone");
  const instagram = v("instagram").startsWith("@") ? v("instagram") : `@${v("instagram")}`;
  const l1 = v("enderecoLinha1");
  const l2 = v("enderecoLinha2");
  const padrao = l1 === SITE_PADRAO.enderecoLinha1 && l2 === SITE_PADRAO.enderecoLinha2;
  return {
    telefone,
    telefoneHref: `tel:${telefone.replace(/[^\d+]/g, "")}`,
    whatsapp: v("whatsapp").replace(/\D/g, ""),
    instagram,
    instagramUrl: `https://instagram.com/${instagram.slice(1)}`,
    email: v("email"),
    enderecoLinhas: [l1, l2],
    enderecoCurto: padrao ? "Local das turmas, Belo Horizonte — MG" : `${l1}, ${l2}`,
    horario: v("horario"),
    legal: `© ${ano} ${NOME_DO_CURSO} · Formação em toxina botulínica · Belo Horizonte, MG`,
  };
}

/** Texto que ainda é placeholder (grupo só de zeros como "00000", "a confirmar", domínio de exemplo): nunca vai para dados estruturados nem para o Google.
    Um número real que apenas contém zeros ("30000-000", "99000-0000") não conta. */
export const ehPlaceholder = (texto: string | null | undefined) =>
  !texto || /(?<![\d-])0{3,}(?!\d)|a confirmar|dominio\.com\.br|exemplo\.invalid|^@perfil$|^Rua, número|^Nome d[oa] (professor|professora|aluno|aluna)/i.test(texto);

export function footerDe(site: DadosSite) {
  return {
    phone: site.telefone,
    email: site.email,
    address: site.enderecoCurto,
    instagram: site.instagram,
    links: [...NAV_LINKS.slice(1), { label: "Política de privacidade", href: "/politica-de-privacidade" }],
    legal: site.legal,
  };
}
