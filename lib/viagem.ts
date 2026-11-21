import { cacheLife, cacheTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { viagemChegada, viagemChegadaTraducoes, viagemLocais, viagemLocaisTraducoes, type CategoriaViagem, type IconeChegada } from "@/db/schema";
import { sobrepor } from "./i18n/estrutura";
import { LOCALE_PADRAO, tagIdioma, type Locale } from "./i18n/idiomas";
import { distanciaKm } from "./viagem-geo";

/* Leituras públicas da Travel info (/viagem): em cache, com tag. Quem salva no admin chama updateTag(TAG_VIAGEM). */

export const TAG_VIAGEM = "viagem";

export interface LocalViagem {
  id: string;
  categoria: CategoriaViagem;
  nome: string;
  descricao: string;
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  fotoUrl: string | null;
  fotoAlt: string | null;
  site: string | null;
  telefone: string | null;
  faixaPreco: number | null;
  /** Dia (AAAA-MM-DD) da última atualização. */
  atualizadoEm: string;
  /** Distância em linha reta até cada local do curso que tem coordenadas (só para hotéis, restaurantes e turismo). */
  distancias: Array<{ nome: string; km: number }>;
}

export interface ItemChegada {
  id: string;
  icone: IconeChegada;
  titulo: string;
  texto: string;
}

/** Locais visíveis, agrupados por categoria e na ordem do admin, no idioma (o que faltar da tradução vem em português). */
export async function listarLocaisViagem(locale: Locale = LOCALE_PADRAO): Promise<Record<CategoriaViagem, LocalViagem[]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_VIAGEM, tagIdioma(locale));
  const linhas = await db.select().from(viagemLocais).where(eq(viagemLocais.visivel, true)).orderBy(asc(viagemLocais.ordem), asc(viagemLocais.nome));
  const trad = locale === LOCALE_PADRAO ? [] : await db.select().from(viagemLocaisTraducoes).where(eq(viagemLocaisTraducoes.locale, locale));
  const porId = new Map(trad.map((t) => [t.localId, t.conteudo]));
  const sedes = linhas.filter((l) => l.categoria === "LOCAL" && l.latitude != null && l.longitude != null);

  const saida: Record<CategoriaViagem, LocalViagem[]> = { LOCAL: [], HOTEL: [], RESTAURANTE: [], TURISMO: [] };
  for (const l of linhas) {
    const base = {
      id: l.id,
      categoria: l.categoria,
      nome: l.nome,
      descricao: l.descricao,
      endereco: l.endereco,
      latitude: l.latitude,
      longitude: l.longitude,
      fotoUrl: l.fotoUrl,
      fotoAlt: l.fotoAlt,
      site: l.site,
      telefone: l.telefone,
      faixaPreco: l.faixaPreco,
      atualizadoEm: l.updatedAt.toISOString().slice(0, 10),
      distancias:
        l.categoria === "LOCAL" || l.latitude == null || l.longitude == null
          ? []
          : sedes.map((s) => ({ nome: s.nome, km: distanciaKm({ latitude: l.latitude!, longitude: l.longitude! }, { latitude: s.latitude!, longitude: s.longitude! }) })),
    };
    saida[l.categoria].push(sobrepor(base, porId.get(l.id), ["descricao", "fotoAlt"]));
  }
  return saida;
}

/** Itens do "Como chegar", na ordem do admin, no idioma. */
export async function listarChegadaViagem(locale: Locale = LOCALE_PADRAO): Promise<ItemChegada[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_VIAGEM, tagIdioma(locale));
  const linhas = await db.select().from(viagemChegada).where(eq(viagemChegada.visivel, true)).orderBy(asc(viagemChegada.ordem), asc(viagemChegada.createdAt));
  const trad = locale === LOCALE_PADRAO ? [] : await db.select().from(viagemChegadaTraducoes).where(eq(viagemChegadaTraducoes.locale, locale));
  const porId = new Map(trad.map((t) => [t.chegadaId, t.conteudo]));
  return linhas.map((l) => sobrepor({ id: l.id, icone: l.icone, titulo: l.titulo, texto: l.texto }, porId.get(l.id), ["titulo", "texto"]));
}
