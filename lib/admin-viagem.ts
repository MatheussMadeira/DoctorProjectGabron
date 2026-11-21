import { asc } from "drizzle-orm";
import { db } from "@/db";
import { viagemChegada, viagemLocais, type CategoriaViagem, type IconeChegada } from "@/db/schema";

/* Leituras do painel (Travel info): tudo, inclusive o que está oculto. */

export interface LocalViagemAdmin {
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
  visivel: boolean;
}

export async function listarLocaisAdmin(): Promise<LocalViagemAdmin[]> {
  return db
    .select({
      id: viagemLocais.id,
      categoria: viagemLocais.categoria,
      nome: viagemLocais.nome,
      descricao: viagemLocais.descricao,
      endereco: viagemLocais.endereco,
      latitude: viagemLocais.latitude,
      longitude: viagemLocais.longitude,
      fotoUrl: viagemLocais.fotoUrl,
      fotoAlt: viagemLocais.fotoAlt,
      site: viagemLocais.site,
      telefone: viagemLocais.telefone,
      faixaPreco: viagemLocais.faixaPreco,
      visivel: viagemLocais.visivel,
    })
    .from(viagemLocais)
    .orderBy(asc(viagemLocais.categoria), asc(viagemLocais.ordem), asc(viagemLocais.nome));
}

export interface ChegadaAdmin {
  id: string;
  icone: IconeChegada;
  titulo: string;
  texto: string;
  visivel: boolean;
}

export async function listarChegadaAdmin(): Promise<ChegadaAdmin[]> {
  return db.select({ id: viagemChegada.id, icone: viagemChegada.icone, titulo: viagemChegada.titulo, texto: viagemChegada.texto, visivel: viagemChegada.visivel }).from(viagemChegada).orderBy(asc(viagemChegada.ordem), asc(viagemChegada.createdAt));
}
