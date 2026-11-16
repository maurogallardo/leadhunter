// Lectura del CSV de gosom.
// Los campos pueden traer comas, comillas y saltos de línea (JSON adentro):
// por eso se usa un lector de CSV de verdad (csv-parse).

import { parse } from 'csv-parse/sync';
import type { FilaGosom } from '../limpieza/gosom.js';

/** Convierte el texto del CSV en filas (columna -> texto). */
export function leerFilasCsv(texto: string): FilaGosom[] {
  if (texto.trim() === '') return [];
  const filas: unknown = parse(texto, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  if (!Array.isArray(filas)) return [];
  return filas.filter((f): f is FilaGosom => !!f && typeof f === 'object');
}
