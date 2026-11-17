// Descargas de "Cargar localidades oficiales" con errores que se pueden
// imprimir en un registro público: solo una etiqueta de fuente, el paso y
// un código de causa. NUNCA la URL, los datos ni claves.

export type FuenteDescarga = 'georef' | 'censo';

export class ErrorDescarga extends Error {
  override name = 'ErrorDescarga';
  constructor(
    readonly fuente: FuenteDescarga,
    readonly paso: string,
    readonly causa: string,
  ) {
    super('fallo una descarga');
  }
}

const CODIGO_SEGURO = /^[A-Za-z0-9_]{1,40}$/;

/**
 * Código de la causa de fondo, seguro para imprimir:
 * error.cause.code (ej. ENOTFOUND, ECONNRESET, UNABLE_TO_VERIFY_LEAF_SIGNATURE),
 * si no error.code (ej. HTTP_503), si no el nombre del error (ej. TimeoutError).
 */
export function codigoDeCausa(error: unknown): string {
  const leer = (obj: unknown, campo: 'code' | 'name'): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    const valor = (obj as Record<string, unknown>)[campo];
    return typeof valor === 'string' && CODIGO_SEGURO.test(valor) ? valor : null;
  };
  const causa = error && typeof error === 'object' ? (error as { cause?: unknown }).cause : undefined;
  return leer(causa, 'code') ?? leer(error, 'code') ?? leer(causa, 'name') ?? leer(error, 'name') ?? 'desconocido';
}

/** Texto para el registro: fuente, paso y causa. */
export const describirErrorDescarga = (e: ErrorDescarga): string =>
  `fuente: ${e.fuente}, paso: ${e.paso}, causa: ${e.causa}`;
