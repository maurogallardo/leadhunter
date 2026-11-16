// Unión de dos registros del mismo negocio.
//
// Reglas (decididas por Mauro: "gana lo existente"):
// - Si el existente tiene un campo vacío y el nuevo lo trae, se completa.
// - Si los dos tienen el mismo dato, se queda y se suman las fuentes.
// - Si tienen datos DISTINTOS, se queda el existente. Excepciones:
//   * nombre y dirección: si el texto nuevo contiene al viejo y lo amplía
//     ("Av. Siempreviva 742" -> "Av. Siempreviva 742, Córdoba"), gana el nuevo.
//   * rating y reseñas: se toman del registro con más reseñas (más actual).
//   Las excepciones NO se aplican si el dato existente fue cargado a mano.
// - notas, descartado y motivo_descarte son solo de Mauro: siempre se
//   conserva lo existente.
// - Un dato cuya fuente incluye "manual" no se pisa nunca.
// - "fuentes" queda con qué fuente aportó cada dato.
// No modifica los objetos recibidos: devuelve un lead nuevo.

import { claveDeNombre } from './nombres.js';
import { estaVacio, FUENTE_MANUAL, type Fuentes, type Lead } from './tipos.js';
import { puntoDe } from './ubicacion.js';

/** Campos simples: se completan si están vacíos; si no, gana lo existente. */
const CAMPOS_SIMPLES = [
  'persona_contacto',
  'rubro_id',
  'telefono_fijo',
  'celular',
  'telefono_sin_clasificar',
  'whatsapp',
  'email',
  'instagram',
  'sitio_web',
  'localidad',
  'provincia',
  'pais',
  'google_place_id',
] as const satisfies readonly (keyof Lead)[];

/** Campos de texto que se pueden ampliar con una versión más completa. */
const CAMPOS_AMPLIABLES = ['nombre', 'direccion'] as const satisfies readonly (keyof Lead)[];

type CampoTexto = (typeof CAMPOS_SIMPLES)[number] | (typeof CAMPOS_AMPLIABLES)[number];

export function unirLeads(existente: Lead, nuevo: Lead): Lead {
  const fuentesE = normalizarFuentes(existente.fuentes);
  const fuentesN = normalizarFuentes(nuevo.fuentes);
  const fuentes: Fuentes = { ...fuentesE };
  const unido: Lead = { ...existente, fuentes };

  const esManual = (campo: string): boolean => (fuentesE[campo] ?? []).includes(FUENTE_MANUAL);

  // Campos de texto
  for (const campo of [...CAMPOS_SIMPLES, ...CAMPOS_AMPLIABLES] as CampoTexto[]) {
    const valorE = existente[campo];
    const valorN = nuevo[campo];
    if (estaVacio(valorN)) continue;

    if (estaVacio(valorE)) {
      asignar(unido, campo, valorN);
      fijarFuentes(fuentes, campo, fuentesN[campo]);
    } else if (claveDeNombre(String(valorE)) === claveDeNombre(String(valorN))) {
      fijarFuentes(fuentes, campo, sumar(fuentesE[campo], fuentesN[campo]));
    } else if (
      (CAMPOS_AMPLIABLES as readonly string[]).includes(campo) &&
      !esManual(campo) &&
      amplia(String(valorN), String(valorE))
    ) {
      asignar(unido, campo, valorN);
      fijarFuentes(fuentes, campo, sumar(fuentesE[campo], fuentesN[campo]));
    }
    // Si no: datos distintos, gana lo existente (no se toca).
  }

  // Coordenadas: van de a par. Se completan solo si el existente no las tiene.
  const puntoE = puntoDe(existente);
  const puntoN = puntoDe(nuevo);
  if (!puntoE && puntoN) {
    unido.lat = puntoN.lat;
    unido.lng = puntoN.lng;
    fijarFuentes(fuentes, 'lat', fuentesN['lat']);
    fijarFuentes(fuentes, 'lng', fuentesN['lng']);
  } else if (puntoE && puntoN && puntoE.lat === puntoN.lat && puntoE.lng === puntoN.lng) {
    fijarFuentes(fuentes, 'lat', sumar(fuentesE['lat'], fuentesN['lat']));
    fijarFuentes(fuentes, 'lng', sumar(fuentesE['lng'], fuentesN['lng']));
  }

  // Rating y reseñas: del registro con más reseñas (salvo dato manual).
  const resenasE = numeroONull(existente.resenas);
  const resenasN = numeroONull(nuevo.resenas);
  const nuevoTieneMasResenas = resenasN !== null && (resenasE === null || resenasN > resenasE);
  if (nuevoTieneMasResenas && !esManual('resenas') && !esManual('rating')) {
    unido.resenas = resenasN;
    fijarFuentes(fuentes, 'resenas', fuentesN['resenas']);
    if (numeroONull(nuevo.rating) !== null) {
      unido.rating = nuevo.rating ?? null;
      fijarFuentes(fuentes, 'rating', fuentesN['rating']);
    }
  } else if (numeroONull(existente.rating) === null && numeroONull(nuevo.rating) !== null) {
    unido.rating = nuevo.rating ?? null;
    fijarFuentes(fuentes, 'rating', fuentesN['rating']);
  }

  // Campos solo de Mauro: siempre lo existente.
  unido.notas = existente.notas ?? null;
  unido.descartado = existente.descartado ?? false;
  unido.motivo_descarte = existente.motivo_descarte ?? null;

  return unido;
}

/** true si "nuevo" contiene a "viejo" y es más largo (ignora tildes, mayúsculas y signos). */
function amplia(nuevo: string, viejo: string): boolean {
  const claveNuevo = claveDeNombre(nuevo);
  const claveViejo = claveDeNombre(viejo);
  return claveViejo !== '' && claveNuevo.length > claveViejo.length && claveNuevo.includes(claveViejo);
}

function asignar(lead: Lead, campo: CampoTexto, valor: Lead[CampoTexto]): void {
  (lead as unknown as Record<string, unknown>)[campo] = valor;
}

function fijarFuentes(fuentes: Fuentes, campo: string, lista: string[] | undefined): void {
  if (lista && lista.length > 0) fuentes[campo] = lista;
}

function sumar(a: string[] | undefined, b: string[] | undefined): string[] {
  return [...new Set([...(a ?? []), ...(b ?? [])])];
}

function numeroONull(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/** Acepta fuentes guardadas como lista o como texto suelto y las deja como listas. */
function normalizarFuentes(fuentes: unknown): Fuentes {
  const resultado: Fuentes = {};
  if (!fuentes || typeof fuentes !== 'object' || Array.isArray(fuentes)) return resultado;
  for (const [campo, valor] of Object.entries(fuentes as Record<string, unknown>)) {
    if (Array.isArray(valor)) {
      const lista = valor.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
      if (lista.length > 0) resultado[campo] = [...new Set(lista)];
    } else if (typeof valor === 'string' && valor.trim() !== '') {
      resultado[campo] = [valor];
    }
  }
  return resultado;
}
