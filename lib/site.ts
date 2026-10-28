/* Dados do site. Navegação e textos fixos ficam aqui; os dados de contato são editados pela
   Dra. em Configurações, ficam no banco (tabela `configuracoes`) e chegam por lib/configuracoes.ts.
   O que ainda não foi preenchido continua como placeholder explícito (ver CLAUDE.md). */

import type { Tradutor } from "./i18n/tradutor";

/** Itens do menu: `chave` aponta para messages ("Header.nav.<chave>"). */
export const NAV_ITENS = [
  { chave: "inicio", href: "/" },
  { chave: "sobre", href: "/sobre-o-curso" },
  { chave: "agenda", href: "/agenda" },
  { chave: "contato", href: "/contato" },
] as const;

/** Menu e chamada do Header no idioma da página. */
export function menuDoHeader(tr: Tradutor) {
  return { links: NAV_ITENS.map((i) => ({ label: tr(`Header.nav.${i.chave}`), href: i.href })), cta: { label: tr("Header.cta"), href: "/agenda" } };
}

/* Versões em português, para o painel e a página de componentes (/dev), que não passam pelo next-intl. */
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
  /** Endereço ainda no placeholder: o rodapé mostra o texto traduzido ("Footer.enderecoPadrao"). */
  enderecoPadrao: boolean;
  horario: string;
  /** Ano do rodapé legal (calculado dentro do cache, para a página não ler a data). */
  ano: number;
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
    enderecoPadrao: padrao,
    horario: v("horario"),
    ano,
    legal: `© ${ano} ${NOME_DO_CURSO} · Formação em toxina botulínica · Belo Horizonte, MG`,
  };
}

/** Texto que ainda é placeholder (grupo só de zeros como "00000", "a confirmar", domínio de exemplo): nunca vai para dados estruturados nem para o Google.
    Um número real que apenas contém zeros ("30000-000", "99000-0000") não conta. */
export const ehPlaceholder = (texto: string | null | undefined) =>
  !texto || /(?<![\d-])0{3,}(?!\d)|a confirmar|dominio\.com\.br|exemplo\.invalid|^@perfil$|^Rua, número|^Nome d[oa] (professor|professora|aluno|aluna)/i.test(texto);

/** Propriedades do Footer. Com `tr`, os textos vêm de messages; sem ele, em português (painel e /dev). */
export function footerDe(site: DadosSite, tr?: Tradutor) {
  if (!tr) {
    return {
      phone: site.telefone,
      email: site.email,
      address: site.enderecoCurto,
      instagram: site.instagram,
      links: [...NAV_LINKS.slice(1), { label: "Política de privacidade", href: "/politica-de-privacidade" }],
      legal: site.legal,
    };
  }
  return {
    phone: site.telefone,
    email: site.email,
    address: site.enderecoPadrao ? tr("Footer.enderecoPadrao") : site.enderecoCurto,
    instagram: site.instagram,
    links: [...NAV_ITENS.slice(1).map((i) => ({ label: tr(`Header.nav.${i.chave}`), href: i.href })), { label: tr("Footer.privacidade"), href: "/politica-de-privacidade" }],
    legal: tr("Footer.legal", { ano: site.ano }),
    rotulos: { navegacao: tr("Footer.navegacao"), contato: tr("Footer.contato"), rodape: tr("Footer.rodape") },
  };
}
