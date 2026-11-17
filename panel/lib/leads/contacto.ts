// Qué se copia con cada botón. Funciones puras.

/** Número internacional válido: + y de 8 a 15 dígitos. */
const E164 = /^\+[1-9]\d{7,14}$/;

/** Deja solo + y dígitos. Devuelve el número si queda en formato internacional. */
function aE164(texto: string): string | null {
  const limpio = texto.replace(/[\s\-().]/g, '');
  const conMas = limpio.startsWith('+') ? limpio : `+${limpio}`;
  return E164.test(conMas) ? conMas : null;
}

/**
 * Número de WhatsApp en formato internacional (ej. +5493511234567).
 * La columna whatsapp guarda un link "https://wa.me/549..."; también se
 * acepta un número suelto. Devuelve null si no hay un número válido.
 */
export function numeroWhatsapp(whatsapp: string | null | undefined): string | null {
  if (typeof whatsapp !== 'string') return null;
  const valor = whatsapp.trim();
  if (valor === '') return null;
  const link = /^(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\/?\?phone=)\/?\+?(\d+)/i.exec(valor);
  if (link) return aE164(link[1]);
  if (/^\+?[\d\s\-().]+$/.test(valor)) return aE164(valor);
  return null;
}

/**
 * Link para abrir WhatsApp con un número (https://wa.me/ + número sin el +).
 * Devuelve null si el número no es válido.
 */
export function linkWhatsapp(numero: string | null | undefined): string | null {
  if (typeof numero !== 'string') return null;
  const e164 = aE164(numero.trim());
  return e164 === null ? null : `https://wa.me/${e164.slice(1)}`;
}

/** Número para copiar (formato internacional) o null si no es válido. */
export function numeroParaCopiar(numero: string | null | undefined): string | null {
  return typeof numero === 'string' ? aE164(numero.trim()) : null;
}

/** Nombre para copiar: la persona de contacto si hay; si no, el nombre del negocio. */
export function nombreParaCopiar(lead: { nombre: string; persona_contacto: string | null }): string {
  const persona = lead.persona_contacto?.trim();
  return persona ? persona : lead.nombre.trim();
}

/** Texto limpio para copiar (null si está vacío). */
export function textoParaCopiar(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

/** Link seguro a un sitio web (solo http/https). Sin esquema se asume https. */
export function linkSitioWeb(valor: string | null | undefined): string | null {
  const texto = textoParaCopiar(valor);
  if (texto === null) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;
  try {
    const url = new URL(conEsquema);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
