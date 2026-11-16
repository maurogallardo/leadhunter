// Comparación de nombres de negocios.

/**
 * Umbral de similitud (de 0 a 1) para decir que dos nombres son "parecidos".
 * Se mide con el coeficiente de Dice sobre pares de letras.
 * 0.8 acepta diferencias chicas ("Distribuidora Los Andes" vs
 * "Distribuidora Los Andes SRL") y rechaza nombres distintos que comparten
 * una palabra ("Kiosco El Sol" vs "Kiosco La Luna").
 * Ojo: solo, no alcanza para unir dos negocios; siempre se combina con
 * la distancia (menos de 50 m).
 */
export const UMBRAL_NOMBRES_PARECIDOS = 0.8;

/** Minúsculas, sin tildes ni signos, con espacios simples. */
export function claveDeNombre(nombre: string | null | undefined): string {
  if (typeof nombre !== 'string') return '';
  return nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // saca tildes y diéresis (ñ -> n)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // signos -> espacio
    .replace(/\s+/g, ' ')
    .trim();
}

/** Similitud de 0 a 1 entre dos textos (coeficiente de Dice sobre pares de letras). */
export function similitud(a: string, b: string): number {
  const x = a.replace(/ /g, '');
  const y = b.replace(/ /g, '');
  if (x === y) return x.length > 0 ? 1 : 0;
  if (x.length < 2 || y.length < 2) return 0;

  const pares = new Map<string, number>();
  for (let i = 0; i < x.length - 1; i++) {
    const par = x.slice(i, i + 2);
    pares.set(par, (pares.get(par) ?? 0) + 1);
  }

  let coincidencias = 0;
  for (let i = 0; i < y.length - 1; i++) {
    const par = y.slice(i, i + 2);
    const cantidad = pares.get(par) ?? 0;
    if (cantidad > 0) {
      coincidencias++;
      pares.set(par, cantidad - 1);
    }
  }

  return (2 * coincidencias) / (x.length - 1 + (y.length - 1));
}

/** true si los nombres son iguales por clave o muy parecidos. */
export function nombresParecidos(a: string | null | undefined, b: string | null | undefined): boolean {
  const claveA = claveDeNombre(a);
  const claveB = claveDeNombre(b);
  if (claveA === '' || claveB === '') return false;
  if (claveA === claveB) return true;
  return similitud(claveA, claveB) >= UMBRAL_NOMBRES_PARECIDOS;
}
