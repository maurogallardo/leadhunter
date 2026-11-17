// Localidad de un negocio (opción B, decidida por Mauro).
//
// Problema: gosom lee la localidad ("city") de una posición fija de los
// datos internos de Google. En direcciones argentinas esa posición a veces
// trae el código postal (X5000AVJ), un pedazo de él (AAU) o el código
// numérico (5000) en lugar del nombre.
//
// Regla:
// 1. Si "city" es un nombre válido, se usa (sacándole un código postal
//    pegado adelante o atrás: "X5000AVJ Córdoba" -> "Córdoba").
// 2. Si "city" está vacía o no sirve, se saca de la dirección escrita:
//    a. la parte que tiene el código postal adelante o atrás es la de la
//       localidad ("Calle 123, X5000AVJ Córdoba" -> "Córdoba");
//    b. si no hay código postal Y "city" vino VACÍA, la parte justo antes
//       de la provincia ("Calle 123, Villa Allende, Córdoba" ->
//       "Villa Allende"), solo si la dirección tiene calle, localidad y
//       provincia. Si "city" vino con un código o un pedazo, este paso NO
//       se usa (opción 2, decidida por Mauro): esa parte puede ser un
//       barrio escrito sin "B°" y es mejor dejar la localidad vacía.
// 3. Ante la duda, vacía: no se inventa.

/** Código postal argentino: CPA (X5000AVJ), corto (X5000) o numérico (5000). */
const CODIGO_POSTAL = /^[A-Za-z]?\d{4}(?:[A-Za-z]{3})?$/;

/** Pedazo de CPA: exactamente 3 letras mayúsculas (AAU, FDC). */
const FRAGMENTO_CPA = /^[A-Z]{3}$/;

/** Barrio escrito como tal (B° Centro, Bº Centro, Barrio Centro). */
const BARRIO = /^(?:b\s*[°º.]|barrio\s)/i;

/** Localidades con número en el nombre (25 de Mayo, 9 de Julio). */
const NUMERO_EN_NOMBRE = /^\d{1,2} de \p{L}/u;

/** Espacios simples y sin espacios en los bordes. */
const limpiar = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

/** Minúsculas y sin tildes, para comparar. */
const clave = (texto: string): string =>
  limpiar(texto)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

export const esCodigoPostal = (texto: string): boolean => CODIGO_POSTAL.test(limpiar(texto));

/** Saca un código postal pegado al principio o al final ("X5000AVJ Córdoba" -> "Córdoba"). */
function sinCodigoPostal(texto: string): { resto: string; teniaCodigo: boolean } {
  const palabras = limpiar(texto).split(' ');
  let teniaCodigo = false;
  if (palabras.length > 1 && CODIGO_POSTAL.test(palabras[0] ?? '')) {
    palabras.shift();
    teniaCodigo = true;
  }
  if (palabras.length > 1 && CODIGO_POSTAL.test(palabras[palabras.length - 1] ?? '')) {
    palabras.pop();
    teniaCodigo = true;
  }
  return { resto: palabras.join(' '), teniaCodigo };
}

/**
 * Devuelve la localidad limpia si el texto parece un nombre de localidad;
 * si no (código postal, pedazo de código, número, barrio, calle), null.
 */
export function limpiarLocalidad(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null;
  const { resto } = sinCodigoPostal(valor);
  if (resto === '') return null;
  if (!/\p{L}/u.test(resto)) return null; // sin letras (ej. "5000")
  if (CODIGO_POSTAL.test(resto) || FRAGMENTO_CPA.test(resto)) return null;
  if (BARRIO.test(resto)) return null;
  if (/\d/.test(resto) && !NUMERO_EN_NOMBRE.test(resto)) return null; // ej. "Calle Falsa 123"
  return resto;
}

/** true si la parte de la dirección es la provincia (o "Provincia de ..."). */
function esProvincia(parte: string, provincia: string | null | undefined): boolean {
  if (typeof provincia !== 'string' || limpiar(provincia) === '') return false;
  const p = clave(provincia).replace(/^provincia de /, '');
  const x = clave(parte).replace(/^provincia de /, '').replace(/ province$/, '');
  return x === p;
}

/**
 * Saca la localidad de la dirección escrita, o null si no queda claro.
 * permitirSinCodigo: si es true, cuando la dirección no tiene código postal
 * se usa la parte justo antes de la provincia (paso b). Por defecto, no.
 */
export function localidadDesdeDireccion(
  direccion: string | null | undefined,
  provincia: string | null | undefined,
  permitirSinCodigo = false,
): string | null {
  if (typeof direccion !== 'string') return null;
  const partes = direccion.split(',').map(limpiar).filter((p) => p !== '');
  while (partes.length > 0 && clave(partes[partes.length - 1] ?? '') === 'argentina') partes.pop();
  // Hace falta al menos calle + algo más. La primera parte (calle) nunca es la localidad.
  if (partes.length < 2) return null;

  // a. La parte con código postal es la de la localidad.
  for (let i = partes.length - 1; i >= 1; i--) {
    const { resto, teniaCodigo } = sinCodigoPostal(partes[i] ?? '');
    if (teniaCodigo) return limpiarLocalidad(resto);
  }

  // b. Sin código postal: la parte justo antes de la provincia (solo si se permite).
  const ultima = partes.length - 1;
  if (permitirSinCodigo && partes.length >= 3 && esProvincia(partes[ultima] ?? '', provincia)) {
    return limpiarLocalidad(partes[ultima - 1]);
  }
  return null;
}

/**
 * Localidad final: la de Google si sirve; si no, la de la dirección; si no,
 * null. La parte antes de la provincia (paso b) solo se usa si "city" vino vacía.
 */
export function elegirLocalidad(datos: {
  city: string | null | undefined;
  direccion: string | null | undefined;
  provincia: string | null | undefined;
}): string | null {
  const cityVacia = typeof datos.city !== 'string' || datos.city.trim() === '';
  return limpiarLocalidad(datos.city) ?? localidadDesdeDireccion(datos.direccion, datos.provincia, cityVacia);
}
