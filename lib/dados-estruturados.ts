import type { DadosSite } from "./site";
import { ehPlaceholder, NOME_DA_MEDICA } from "./site";
import type { Turma } from "./turmas";

/* Dados estruturados (schema.org, JSON-LD). Regra: nada de placeholder sai daqui. CRM, telefone, endereço e preço só
   entram quando a Dra. já preencheu de verdade; senão o campo some, em vez de publicar "CRM-MG 00000" no Google. */

type Json = Record<string, unknown>;

const limpar = (o: Json): Json => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));

/** A Dra. como Physician (página da clínica e início). */
export function medicoLd(site: DadosSite, base: string): Json {
  const real = (v: string) => (ehPlaceholder(v) ? undefined : v);
  const enderecoReal = !ehPlaceholder(site.enderecoLinhas[0]) && !ehPlaceholder(site.enderecoLinhas[1]);
  const registros = [real(site.crm), real(site.rqe)].filter(Boolean) as string[];
  return limpar({
    "@context": "https://schema.org",
    "@type": "Physician",
    "@id": `${base}/#medica`,
    name: NOME_DA_MEDICA,
    jobTitle: "Médica Fisiatra",
    url: base,
    image: `${base}/images/retrato-dra-ana-paula.webp`,
    description: "Medicina física e reabilitação em Belo Horizonte e turmas de toxina botulínica para profissionais da saúde.",
    telephone: real(site.telefone),
    email: real(site.email),
    address: enderecoReal
      ? { "@type": "PostalAddress", streetAddress: site.enderecoLinhas[0], addressLocality: "Belo Horizonte", addressRegion: "MG", addressCountry: "BR" }
      : { "@type": "PostalAddress", addressLocality: "Belo Horizonte", addressRegion: "MG", addressCountry: "BR" },
    sameAs: real(site.instagram) ? [site.instagramUrl] : undefined,
    identifier: registros.length ? registros.map((valor) => ({ "@type": "PropertyValue", name: valor.split(/\s|-/)[0], value: valor })) : undefined,
  });
}

/** Uma turma como Event. Preço só se já houver valor real; "em breve" não leva oferta. */
export function eventoLd(turma: Turma, site: DadosSite, base: string): Json {
  const online = turma.modalidade === "Online";
  const url = `${base}/agenda/${turma.slug}`;
  const imagem = turma.fotoUrl.startsWith("http") ? turma.fotoUrl : `${base}${turma.fotoUrl}`;
  const disponibilidade = turma.status === "esgotado" ? "https://schema.org/SoldOut" : turma.status === "encerrado" ? "https://schema.org/Discontinued" : "https://schema.org/InStock";
  const [cidade, uf] = turma.cidade.split(",").map((p) => p.trim());

  return limpar({
    "@context": "https://schema.org",
    "@type": "Event",
    name: turma.titulo,
    description: turma.resumo,
    url,
    image: [imagem],
    startDate: turma.inicio,
    endDate: turma.fim ?? turma.inicio,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
    location: online
      ? { "@type": "VirtualLocation", url }
      : { "@type": "Place", name: turma.local ?? turma.cidade, address: { "@type": "PostalAddress", addressLocality: cidade, addressRegion: uf, addressCountry: "BR" } },
    organizer: { "@type": "Physician", name: NOME_DA_MEDICA, url: base },
    performer: { "@type": "Physician", name: NOME_DA_MEDICA },
    offers:
      turma.status !== "em-breve" && turma.precoCentavos != null
        ? { "@type": "Offer", url, price: (turma.precoCentavos / 100).toFixed(2), priceCurrency: "BRL", availability: disponibilidade }
        : undefined,
  });
}
