import { comPrefixo, IDIOMAS, LOCALE_PADRAO, type Locale } from "./i18n/idiomas";
import type { ProfessorPublico } from "./professores";
import type { DadosSite } from "./site";
import { ehPlaceholder, NOME_DO_CURSO } from "./site";
import type { Turma } from "./turmas";

/* Dados estruturados (schema.org, JSON-LD). Regra: nada de placeholder sai daqui. Telefone, endereço, preço e professores
   só entram quando já foram preenchidos de verdade; senão o campo some, em vez de publicar "00000" no Google.
   O site é do curso ReabToxin (Organization); cada turma vira um Course e um EducationEvent. */

type Json = Record<string, unknown>;

const limpar = (o: Json): Json => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length)));
const real = (v: string) => (ehPlaceholder(v) ? undefined : v);

/** Pessoas de verdade: professor ainda com nome de exemplo ("Nome do professor") não vai para o Google. */
const pessoas = (professores: ProfessorPublico[], base: string): Json[] =>
  professores
    .filter((p) => !ehPlaceholder(p.nome))
    .map((p) => limpar({ "@type": "Person", name: p.nome, jobTitle: real(p.funcao), image: p.fotoUrl ? (p.fotoUrl.startsWith("http") ? p.fotoUrl : `${base}${p.fotoUrl}`) : undefined }));

const organizador = (base: string): Json => ({ "@type": "Organization", "@id": `${base}/#organizacao`, name: NOME_DO_CURSO, url: base });

/** O curso ReabToxin como Organization (início e Sobre o curso). */
export function organizacaoLd(site: DadosSite, base: string, locale: Locale = LOCALE_PADRAO, descricao = "Curso prático de toxina botulínica para profissionais da saúde, com base anatômica e prática supervisionada."): Json {
  const enderecoReal = !ehPlaceholder(site.enderecoLinhas[0]) && !ehPlaceholder(site.enderecoLinhas[1]);
  return limpar({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organizacao`,
    name: NOME_DO_CURSO,
    url: `${base}${comPrefixo(locale, "/")}`,
    image: `${base}/og.png`,
    description: descricao,
    inLanguage: IDIOMAS[locale].hreflang,
    telephone: real(site.telefone),
    email: real(site.email),
    address: enderecoReal
      ? { "@type": "PostalAddress", streetAddress: site.enderecoLinhas[0], addressLocality: "Belo Horizonte", addressRegion: "MG", addressCountry: "BR" }
      : { "@type": "PostalAddress", addressLocality: "Belo Horizonte", addressRegion: "MG", addressCountry: "BR" },
    sameAs: real(site.instagram) ? [site.instagramUrl] : undefined,
  });
}

function imagemDe(turma: Turma, base: string) {
  return turma.fotoUrl.startsWith("http") ? turma.fotoUrl : `${base}${turma.fotoUrl}`;
}

function localDe(turma: Turma, url: string): Json {
  const [cidade, uf] = turma.cidade.split(",").map((p) => p.trim());
  return turma.modalidade === "Online"
    ? { "@type": "VirtualLocation", url }
    : { "@type": "Place", name: turma.local ?? turma.cidade, address: { "@type": "PostalAddress", addressLocality: cidade, addressRegion: uf, addressCountry: "BR" } };
}

/** Uma turma como Course (a formação) com a turma como CourseInstance. */
export function cursoLd(turma: Turma, professores: ProfessorPublico[], base: string, locale: Locale = LOCALE_PADRAO): Json {
  const online = turma.modalidade === "Online";
  const url = `${base}${comPrefixo(locale, `/agenda/${turma.slug}`)}`;
  return limpar({
    "@context": "https://schema.org",
    "@type": "Course",
    name: turma.titulo,
    description: turma.resumo,
    url,
    image: [imagemDe(turma, base)],
    inLanguage: IDIOMAS[locale].hreflang,
    provider: organizador(base),
    hasCourseInstance: limpar({
      "@type": "CourseInstance",
      courseMode: online ? "online" : "onsite",
      startDate: turma.inicio,
      endDate: turma.fim ?? turma.inicio,
      location: localDe(turma, url),
      instructor: pessoas(professores, base),
    }),
  });
}

/** Uma turma como EducationEvent. Preço só se já houver valor real; "em breve" não leva oferta. */
export function eventoLd(turma: Turma, professores: ProfessorPublico[], base: string, locale: Locale = LOCALE_PADRAO): Json {
  const online = turma.modalidade === "Online";
  const url = `${base}${comPrefixo(locale, `/agenda/${turma.slug}`)}`;
  const disponibilidade = turma.status === "esgotado" ? "https://schema.org/SoldOut" : turma.status === "encerrado" ? "https://schema.org/Discontinued" : "https://schema.org/InStock";
  return limpar({
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    inLanguage: IDIOMAS[locale].hreflang,
    name: turma.titulo,
    description: turma.resumo,
    url,
    image: [imagemDe(turma, base)],
    startDate: turma.inicio,
    endDate: turma.fim ?? turma.inicio,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
    location: localDe(turma, url),
    organizer: organizador(base),
    performer: pessoas(professores, base),
    offers:
      turma.status !== "em-breve" && turma.precoCentavos != null
        ? { "@type": "Offer", url, price: (turma.precoCentavos / 100).toFixed(2), priceCurrency: "BRL", availability: disponibilidade }
        : undefined,
  });
}
