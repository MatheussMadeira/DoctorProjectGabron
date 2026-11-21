"use server";

import { revalidatePath, updateTag } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { viagemChegada, viagemLocais } from "@/db/schema";
import { traduzirNaHora } from "@/lib/i18n/traduzir";
import { autorizar } from "@/lib/sessao";
import { TAG_VIAGEM } from "@/lib/viagem";
import { chegadaSchema, errosPorCampo, localSchema, type EstadoViagem } from "@/lib/viagem-form";

/* Travel info: só o ADMIN. Tudo expira a tag na hora (o site público acompanha) e a DeepL traduz o que mudou. */

const atualizar = () => {
  updateTag(TAG_VIAGEM);
  revalidatePath("/admin/viagem");
};

/** Cria (id = null) ou atualiza um local (local do curso, hotel, restaurante ou ponto turístico). */
export async function salvarLocal(id: string | null, _anterior: EstadoViagem, formData: FormData): Promise<EstadoViagem> {
  const auth = await autorizar("viagem:gerir");
  if (!auth.ok) return { erroGeral: auth.erro };

  const parsed = localSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erros: errosPorCampo(parsed.error), erroGeral: "Revise os campos marcados e salve de novo." };
  const d = parsed.data;
  if ((d.latitude == null) !== (d.longitude == null)) return { erros: { latitude: "Preencha latitude e longitude, ou deixe as duas vazias." }, erroGeral: "Revise os campos marcados e salve de novo." };
  // Com foto, a descrição dela é obrigatória (leitor de tela).
  if (d.fotoUrl && !d.fotoAlt) d.fotoAlt = `Foto de ${d.nome}`;

  const valores = {
    categoria: d.categoria,
    nome: d.nome,
    descricao: d.descricao,
    endereco: d.endereco,
    latitude: d.latitude,
    longitude: d.longitude,
    fotoUrl: d.fotoUrl || null,
    fotoAlt: d.fotoUrl ? d.fotoAlt : null,
    site: d.site || null,
    telefone: d.telefone || null,
    faixaPreco: d.faixaPreco,
    visivel: d.visivel === "on",
    updatedAt: new Date(),
  };

  let salvoId = id;
  if (id) {
    const [existe] = await db.update(viagemLocais).set(valores).where(eq(viagemLocais.id, id)).returning({ id: viagemLocais.id });
    if (!existe) return { erroGeral: "Este local não existe mais." };
  } else {
    const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${viagemLocais.ordem}), -1) + 1` }).from(viagemLocais).where(eq(viagemLocais.categoria, d.categoria));
    const [novo] = await db.insert(viagemLocais).values({ ...valores, ordem: proxima }).returning({ id: viagemLocais.id });
    salvoId = novo.id;
  }
  if (salvoId) await traduzirNaHora("localViagem", salvoId);
  atualizar();
  return { ok: true, id: salvoId ?? undefined };
}

export async function excluirLocal(id: string): Promise<{ erro?: string }> {
  const auth = await autorizar("viagem:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(viagemLocais).where(eq(viagemLocais.id, id));
  atualizar();
  return {};
}

/** Sobe ou desce um local dentro da própria categoria. */
export async function moverLocal(id: string, direcao: "sobe" | "desce"): Promise<{ erro?: string }> {
  const auth = await autorizar("viagem:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const [atual] = await db.select({ categoria: viagemLocais.categoria }).from(viagemLocais).where(eq(viagemLocais.id, id));
  if (!atual) return {};
  const lista = await db.select({ id: viagemLocais.id }).from(viagemLocais).where(eq(viagemLocais.categoria, atual.categoria)).orderBy(asc(viagemLocais.ordem), asc(viagemLocais.nome));
  const i = lista.findIndex((l) => l.id === id);
  const j = direcao === "sobe" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return {};
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await db.transaction(async (tx) => {
    for (const [ordem, l] of lista.entries()) await tx.update(viagemLocais).set({ ordem }).where(and(eq(viagemLocais.id, l.id)));
  });
  atualizar();
  return {};
}

export async function salvarChegada(id: string | null, _anterior: EstadoViagem, formData: FormData): Promise<EstadoViagem> {
  const auth = await autorizar("viagem:gerir");
  if (!auth.ok) return { erroGeral: auth.erro };

  const parsed = chegadaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erros: errosPorCampo(parsed.error), erroGeral: "Revise os campos marcados e salve de novo." };
  const d = parsed.data;
  const valores = { icone: d.icone, titulo: d.titulo, texto: d.texto, visivel: d.visivel === "on", updatedAt: new Date() };

  let salvoId = id;
  if (id) {
    const [existe] = await db.update(viagemChegada).set(valores).where(eq(viagemChegada.id, id)).returning({ id: viagemChegada.id });
    if (!existe) return { erroGeral: "Este item não existe mais." };
  } else {
    const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${viagemChegada.ordem}), -1) + 1` }).from(viagemChegada);
    const [novo] = await db.insert(viagemChegada).values({ ...valores, ordem: proxima }).returning({ id: viagemChegada.id });
    salvoId = novo.id;
  }
  if (salvoId) await traduzirNaHora("chegadaViagem", salvoId);
  atualizar();
  return { ok: true, id: salvoId ?? undefined };
}

export async function excluirChegada(id: string): Promise<{ erro?: string }> {
  const auth = await autorizar("viagem:gerir");
  if (!auth.ok) return { erro: auth.erro };
  await db.delete(viagemChegada).where(eq(viagemChegada.id, id));
  atualizar();
  return {};
}

export async function moverChegada(id: string, direcao: "sobe" | "desce"): Promise<{ erro?: string }> {
  const auth = await autorizar("viagem:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const lista = await db.select({ id: viagemChegada.id }).from(viagemChegada).orderBy(asc(viagemChegada.ordem), asc(viagemChegada.createdAt));
  const i = lista.findIndex((l) => l.id === id);
  const j = direcao === "sobe" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return {};
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await db.transaction(async (tx) => {
    for (const [ordem, l] of lista.entries()) await tx.update(viagemChegada).set({ ordem }).where(eq(viagemChegada.id, l.id));
  });
  atualizar();
  return {};
}

export interface ResultadoBusca {
  rotulo: string;
  latitude: number;
  longitude: number;
}

/**
 * Busca um endereço no OpenStreetMap (Nominatim, gratuito e sem chave) para preencher latitude, longitude e endereço.
 * Uso manual no painel, uma busca por clique (a política do Nominatim limita a 1 por segundo e exige identificar o aplicativo).
 */
export async function buscarEndereco(consulta: string): Promise<{ resultados?: ResultadoBusca[]; erro?: string }> {
  const auth = await autorizar("viagem:gerir");
  if (!auth.ok) return { erro: auth.erro };
  const q = consulta.trim();
  if (q.length < 4) return { erro: "Digite o endereço ou o nome do lugar." };
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=0&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { "User-Agent": "ReabToxinSite/1.0 (painel administrativo)", "Accept-Language": "pt-BR" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!r.ok) return { erro: "O serviço de mapas não respondeu agora. Tente de novo em instantes ou preencha as coordenadas à mão." };
    const json = (await r.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const resultados = json.map((j) => ({ rotulo: j.display_name, latitude: Number(j.lat), longitude: Number(j.lon) })).filter((j) => Number.isFinite(j.latitude) && Number.isFinite(j.longitude));
    return resultados.length ? { resultados } : { erro: "Nenhum endereço encontrado. Tente acrescentar a cidade ou o bairro." };
  } catch {
    return { erro: "O serviço de mapas não respondeu agora. Tente de novo em instantes ou preencha as coordenadas à mão." };
  }
}
