// Convierte una fila del CSV de gosom/google-maps-scraper (v1.19.0) en un lead.
//
// Columnas que usamos (nombres exactos del CSV, ver gmaps/entry.go CsvHeaders):
//   title, address, website, phone, review_count, review_rating,
//   latitude, longitude, place_id, complete_address, emails
// La columna "category" existe pero la tabla leads no tiene dónde guardarla:
// se ignora.
//
// Formatos que escribe gosom (leídos de su código):
// - review_rating, latitude, longitude: número con 6 decimales ("4.500000").
//   Si Google no tiene el dato, escribe "0.000000": eso se toma como vacío.
// - review_count: número entero ("12").
// - complete_address: JSON con borough, street, city, postal_code, state,
//   country (country es un código de dos letras, ej. "AR").
// - emails: lista separada por ", " (solo si se corre gosom con -email).
//
// No se inventan datos: lo que no se puede leer queda vacío.

import { limpiarEmail } from './emails.js';
import { linkWhatsapp, normalizarTelefono } from './telefonos.js';
import type { Fuentes, Lead } from './tipos.js';
import { puntoDe } from './ubicacion.js';

export const FUENTE_GOSOM = 'gosom';

/** Una fila del CSV: nombre de columna -> texto. */
export type FilaGosom = Record<string, string | undefined>;

interface DireccionCompleta {
  city?: unknown;
  state?: unknown;
  country?: unknown;
}

/** Códigos de país que sabemos traducir. */
const PAISES: Record<string, string> = { AR: 'Argentina' };

/** Devuelve el lead, o null si la fila no tiene nombre. */
export function mapearFilaGosom(fila: FilaGosom): Lead | null {
  const nombre = texto(fila['title']);
  if (!nombre) return null;

  const fuentes: Fuentes = {};
  const lead: Lead = { nombre, fuentes };
  const anotar = (campo: string): void => {
    fuentes[campo] = [FUENTE_GOSOM];
  };
  anotar('nombre');

  // Teléfono
  const telefono = normalizarTelefono(fila['phone']);
  if (telefono.e164) {
    if (telefono.tipo === 'celular') {
      lead.celular = telefono.e164;
      anotar('celular');
      // Supuesto: el celular de un negocio se ofrece como link de WhatsApp.
      // No se verifica que el número tenga WhatsApp.
      const link = linkWhatsapp(telefono.e164);
      if (link) {
        lead.whatsapp = link;
        anotar('whatsapp');
      }
    } else if (telefono.tipo === 'fijo') {
      lead.telefono_fijo = telefono.e164;
      anotar('telefono_fijo');
    } else {
      lead.telefono_sin_clasificar = telefono.e164;
      anotar('telefono_sin_clasificar');
    }
  }

  // Email (primer email válido de la lista)
  const email = (fila['emails'] ?? '')
    .split(',')
    .map((e) => limpiarEmail(e))
    .find((e): e is string => e !== null);
  if (email) {
    lead.email = email;
    anotar('email');
  }

  // Sitio web
  const sitio = texto(fila['website']);
  if (sitio) {
    lead.sitio_web = sitio;
    anotar('sitio_web');
  }

  // Dirección
  const direccion = texto(fila['address']);
  if (direccion) {
    lead.direccion = direccion;
    anotar('direccion');
  }

  // Localidad, provincia y país desde la dirección completa (si viene)
  const completa = leerDireccionCompleta(fila['complete_address']);
  if (completa) {
    const localidad = texto(completa.city);
    const provincia = texto(completa.state);
    const codigoPais = texto(completa.country)?.toUpperCase();
    if (localidad) {
      lead.localidad = localidad;
      anotar('localidad');
    }
    if (provincia) {
      lead.provincia = provincia;
      anotar('provincia');
    }
    if (codigoPais) {
      lead.pais = PAISES[codigoPais] ?? codigoPais;
      anotar('pais');
    }
  }

  // Coordenadas ("0.000000" en las dos = sin dato)
  const lat = numero(fila['latitude']);
  const lng = numero(fila['longitude']);
  const punto = lat !== null && lng !== null && !(lat === 0 && lng === 0) ? puntoDe({ lat, lng }) : null;
  if (punto) {
    lead.lat = punto.lat;
    lead.lng = punto.lng;
    anotar('lat');
    anotar('lng');
  }

  // Reseñas y rating (rating fuera de 1 a 5 = sin dato)
  const resenas = numero(fila['review_count']);
  if (resenas !== null && Number.isInteger(resenas) && resenas >= 0) {
    lead.resenas = resenas;
    anotar('resenas');
  }
  const rating = numero(fila['review_rating']);
  if (rating !== null && rating >= 1 && rating <= 5) {
    lead.rating = rating;
    anotar('rating');
  }

  // Lugar de Google
  const placeId = texto(fila['place_id']);
  if (placeId) {
    lead.google_place_id = placeId;
    anotar('google_place_id');
  }

  return lead;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.replace(/\s+/g, ' ').trim();
  return limpio === '' ? null : limpio;
}

function numero(valor: string | undefined): number | null {
  const limpio = texto(valor);
  if (limpio === null) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function leerDireccionCompleta(valor: string | undefined): DireccionCompleta | null {
  const limpio = texto(valor);
  if (!limpio) return null;
  try {
    const datos: unknown = JSON.parse(limpio);
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null;
    return datos as DireccionCompleta;
  } catch {
    return null;
  }
}
