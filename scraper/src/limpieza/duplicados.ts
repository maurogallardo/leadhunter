// Detección de leads repetidos.
//
// Son el mismo negocio si:
// 1. tienen el mismo google_place_id; o
// 2. comparten un teléfono normalizado (celular, fijo o sin clasificar),
//    SALVO que los dos tengan coordenadas y estén a más de 1 km
//    (protección: una cadena puede usar el mismo teléfono en varias sucursales); o
// 3. tienen nombres parecidos Y están a menos de 50 m.
// El sitio web solo NUNCA alcanza (las cadenas comparten web).

import { nombresParecidos } from './nombres.js';
import { normalizarTelefono } from './telefonos.js';
import type { Lead } from './tipos.js';
import { distanciaMetros, puntoDe } from './ubicacion.js';

/** Distancia máxima para unir por nombre parecido. */
export const DISTANCIA_MAXIMA_POR_NOMBRE_METROS = 50;

/** Si comparten teléfono pero están más lejos que esto, NO son el mismo. */
export const DISTANCIA_MAXIMA_POR_TELEFONO_METROS = 1000;

type LeadComparable = Pick<
  Lead,
  'nombre' | 'google_place_id' | 'celular' | 'telefono_fijo' | 'telefono_sin_clasificar' | 'lat' | 'lng'
>;

export function sonMismoNegocio(a: LeadComparable, b: LeadComparable): boolean {
  // 1. Mismo lugar de Google
  const placeA = a.google_place_id?.trim();
  const placeB = b.google_place_id?.trim();
  if (placeA && placeB && placeA === placeB) return true;

  const puntoA = puntoDe(a);
  const puntoB = puntoDe(b);
  const distancia = puntoA && puntoB ? distanciaMetros(puntoA, puntoB) : null;

  // 2. Mismo teléfono (con protección de 1 km)
  const telefonosA = telefonosDe(a);
  const comparteTelefono = [...telefonosDe(b)].some((t) => telefonosA.has(t));
  if (comparteTelefono && (distancia === null || distancia <= DISTANCIA_MAXIMA_POR_TELEFONO_METROS)) {
    return true;
  }

  // 3. Nombre parecido y muy cerca
  if (distancia !== null && distancia < DISTANCIA_MAXIMA_POR_NOMBRE_METROS && nombresParecidos(a.nombre, b.nombre)) {
    return true;
  }

  return false;
}

/** Teléfonos válidos del lead, en formato +54... */
function telefonosDe(lead: LeadComparable): Set<string> {
  const resultado = new Set<string>();
  for (const valor of [lead.celular, lead.telefono_fijo, lead.telefono_sin_clasificar]) {
    const { e164 } = normalizarTelefono(valor);
    if (e164) resultado.add(e164);
  }
  return resultado;
}
