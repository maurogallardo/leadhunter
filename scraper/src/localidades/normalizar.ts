// Normalización de nombres de localidades y provincias para comparar.
// "Guiñazú" y "Guiñazu" -> "guinazu"; "Río Tercero" con un carácter
// invisible en el medio (viene así en la fuente oficial) -> "rio tercero".

/** Saca caracteres invisibles (ej. guion suave U+00AD) y deja espacios simples. */
export function limpiarNombreOficial(texto: string): string {
  return texto.replace(/\p{Cf}/gu, '').replace(/\s+/g, ' ').trim();
}

/** Minúsculas, sin tildes, sin invisibles, signos como espacio y espacios simples. */
export function normalizarNombre(texto: string | null | undefined): string {
  if (typeof texto !== 'string') return '';
  return texto
    .replace(/\p{Cf}/gu, '') // primero los invisibles: "Rí­o" -> "Río"
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // tildes y diéresis (ñ -> n)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Provincia normalizada, sin "provincia de" adelante ni "province" atrás. */
export function normalizarProvincia(texto: string | null | undefined): string {
  return normalizarNombre(texto).replace(/^provincia de /, '').replace(/ province$/, '');
}
