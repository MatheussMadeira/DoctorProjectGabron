/* Dados do site. Conteúdo que ainda não existe fica como placeholder explícito (ver CLAUDE.md). */

export const SITE = {
  nome: "Dra. Ana Paula Fonseca",
  whatsapp: "5531000000000",
  telefone: "+55 31 0000-0000",
  telefoneHref: "tel:553100000000",
  email: "contato@dominio.com.br",
  instagram: "@perfil",
  enderecoLinhas: ["Rua, número, sala · Bairro", "Belo Horizonte — MG · CEP 00000-000"],
  enderecoCurto: "Endereço da clínica, Belo Horizonte — MG",
  horario: "Segunda a sexta, 00h às 00h",
};

export const NAV_LINKS = [
  { label: "Início", href: "/" },
  { label: "Sobre a Dra.", href: "/sobre" },
  { label: "Clínica", href: "/clinica" },
  { label: "Agenda de cursos", href: "/agenda" },
  { label: "Contato", href: "/contato" },
];

export const HEADER_CTA = { label: "Próximas turmas", href: "/agenda" };

export const FOOTER = {
  phone: SITE.telefone,
  email: SITE.email,
  address: SITE.enderecoCurto,
  instagram: SITE.instagram,
  links: [...NAV_LINKS.slice(1), { label: "Política de privacidade", href: "/politica-de-privacidade" }],
  legal: "© 2026 Dra. Ana Paula Fonseca · Médica Fisiatra · CRM-MG 00000 · RQE 00000",
};
