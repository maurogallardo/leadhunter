// Normalización de teléfonos argentinos.
//
// Reglas (no adivinar):
// - +54 9 ... (o 54 9 / 0054 9)                      -> celular
// - formato nacional con "15" después del área        -> celular (+54 9 área número)
//   (la librería ya hace esa conversión: 0351 15 555-0123 -> +5493515550123)
// - formato nacional con 0 + área y la librería dice
//   "línea fija"                                      -> fijo
// - cualquier otro número válido (sin 0 ni 15, +54 sin 9, 0800, extranjero)
//                                                     -> sin_clasificar
//   (ej. "351 555-0123" puede ser un fijo o un celular escrito sin el 15)
// - no se encuentra un número válido                  -> invalido
//
// Usa la metadata "max" de libphonenumber-js porque getType() solo
// funciona con esa metadata.

import { findPhoneNumbersInText } from 'libphonenumber-js/max';

export type TipoTelefono = 'celular' | 'fijo' | 'sin_clasificar' | 'invalido';

export interface TelefonoNormalizado {
  /** Número en formato internacional (+54...), o null si es inválido. */
  e164: string | null;
  tipo: TipoTelefono;
}

const PAIS_POR_DEFECTO = 'AR';

const INVALIDO: TelefonoNormalizado = { e164: null, tipo: 'invalido' };

/**
 * Normaliza un teléfono escrito de cualquier forma (espacios, guiones,
 * paréntesis, puntos, prefijos 0 / +54 / 54 / 0054, texto alrededor).
 * Si el texto trae varios números, usa el primero válido.
 */
export function normalizarTelefono(texto: string | null | undefined): TelefonoNormalizado {
  if (typeof texto !== 'string' || texto.trim() === '') return INVALIDO;

  const encontrado = findPhoneNumbersInText(texto, PAIS_POR_DEFECTO).find((n) => n.number.isValid());
  if (!encontrado) return INVALIDO;

  const numero = encontrado.number;
  const e164 = numero.number;
  const tipoLibreria = numero.getType();
  const esArgentino = numero.country === 'AR';

  if (esArgentino && tipoLibreria === 'MOBILE') {
    return { e164, tipo: 'celular' };
  }

  // Fijo solo si estaba escrito en formato nacional con el 0 adelante.
  const fragmento = texto.slice(encontrado.startsAt, encontrado.endsAt);
  if (esArgentino && tipoLibreria === 'FIXED_LINE' && escritoConCeroNacional(fragmento)) {
    return { e164, tipo: 'fijo' };
  }

  return { e164, tipo: 'sin_clasificar' };
}

/** true si el número está escrito como "0 + área" (no "+54", no "00..."). */
function escritoConCeroNacional(fragmento: string): boolean {
  if (fragmento.trimStart().startsWith('+')) return false;
  const digitos = fragmento.replace(/\D/g, '');
  return digitos.startsWith('0') && !digitos.startsWith('00');
}

/**
 * Link de WhatsApp para un celular argentino ya normalizado (+549...).
 * Devuelve null si no es un celular argentino válido en formato E.164.
 */
export function linkWhatsapp(celularE164: string | null | undefined): string | null {
  if (typeof celularE164 !== 'string') return null;
  const numero = celularE164.trim();
  if (!/^\+549\d{10}$/.test(numero)) return null;

  const normalizado = normalizarTelefono(numero);
  if (normalizado.tipo !== 'celular' || normalizado.e164 !== numero) return null;

  return `https://wa.me/${numero.slice(1)}`;
}
