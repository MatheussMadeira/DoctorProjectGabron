/* Latitude e longitude de uma cidade pelo OpenStreetMap (Nominatim: gratuito e sem chave). Uso manual no painel: a política do serviço limita
   a 1 busca por segundo e exige identificar o aplicativo. Vale como ponto de partida; o ADMIN pode ajustar as coordenadas à mão. */

export interface Local {
  rotulo: string;
  latitude: number;
  longitude: number;
}

const CABECALHOS = { "User-Agent": "ReabToxinSite/1.0 (painel administrativo)", "Accept-Language": "pt-BR" };

export async function buscarLocais(consulta: string, opcoes: { pais?: string; limite?: number } = {}): Promise<{ locais?: Local[]; erro?: string }> {
  const q = consulta.trim();
  if (q.length < 3) return { erro: "Digite a cidade (e o estado ou país)." };
  try {
    const params = new URLSearchParams({ format: "jsonv2", limit: String(opcoes.limite ?? 5), addressdetails: "0", q });
    if (opcoes.pais) params.set("countrycodes", opcoes.pais.toLowerCase());
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: CABECALHOS, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!r.ok) return { erro: "O serviço de mapas não respondeu agora. Tente de novo em instantes ou preencha as coordenadas à mão." };
    const json = (await r.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const locais = json.map((j) => ({ rotulo: j.display_name, latitude: Number(j.lat), longitude: Number(j.lon) })).filter((j) => Number.isFinite(j.latitude) && Number.isFinite(j.longitude));
    return locais.length ? { locais } : { erro: "Nenhum lugar encontrado. Confira o nome da cidade e do estado." };
  } catch {
    return { erro: "O serviço de mapas não respondeu agora. Tente de novo em instantes ou preencha as coordenadas à mão." };
  }
}

/** A cidade, no estado e país, como uma consulta só. */
export const consultaDeCidade = (cidade: string, uf: string | null | undefined, pais: string | null | undefined) =>
  [cidade, uf, !pais || pais === "BR" ? "Brasil" : pais].filter(Boolean).join(", ");
