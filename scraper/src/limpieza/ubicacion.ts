// Distancias entre puntos del mapa.

export interface Punto {
  lat: number;
  lng: number;
}

/** Radio medio de la Tierra en metros. */
const RADIO_TIERRA_METROS = 6_371_008.8;

const aRadianes = (grados: number): number => (grados * Math.PI) / 180;

/** Distancia en metros entre dos puntos (fórmula de Haversine). */
export function distanciaMetros(a: Punto, b: Punto): number {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Devuelve el punto si lat y lng son números válidos; si no, null. */
export function puntoDe(dato: { lat?: number | null; lng?: number | null }): Punto | null {
  const { lat, lng } = dato;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
