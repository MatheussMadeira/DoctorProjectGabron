/* Funções puras da Travel info: distância entre dois pontos e os links de mapa (sem chave de API e sem custo). */

export interface Ponto {
  latitude: number;
  longitude: number;
}

/** Distância em linha reta (km) entre dois pontos, pela fórmula de haversine. */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Link "abrir no Google Maps": por coordenadas quando há, senão pela busca do endereço. */
export function linkDoMapa(local: { nome: string; endereco: string; latitude: number | null; longitude: number | null }): string {
  const consulta = local.latitude != null && local.longitude != null ? `${local.latitude},${local.longitude}` : [local.nome, local.endereco].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

/** Mapa do OpenStreetMap para embutir (gratuito, sem chave). O quadro mostra cerca de 600 m ao redor do ponto. */
export function mapaEmbutido(p: Ponto): string {
  const d = 0.006;
  const bbox = [p.longitude - d, p.latitude - d, p.longitude + d, p.latitude + d].map((n) => n.toFixed(5)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.latitude.toFixed(5)}%2C${p.longitude.toFixed(5)}`;
}
