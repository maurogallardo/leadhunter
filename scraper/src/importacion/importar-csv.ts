// Núcleo del importador: lee UN CSV de gosom, limpia cada fila, la une con
// lo que ya hay en la base y la guarda. Lo usan:
//   - importar.ts       (workflow "Buscar", una búsqueda manual)
//   - procesar-cola.ts  (workflow "Procesar cola", una búsqueda por pendiente)
// No imprime nada: devuelve contadores y, si hubo, un código de error seguro.

import { existsSync, readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { actualizarLead, buscarCandidatos, insertarLead } from './base.js';
import { leerFilasCsv } from './csv.js';
import {
  codigoDeErrorSeguro,
  type Contadores,
  contadoresIniciales,
  contarDecision,
  decidir,
  leadAFila,
  leadAFilaActualizacion,
} from './decision.js';
import { FUENTE_GOSOM, mapearFilaGosom } from '../limpieza/gosom.js';
import type { ListaLocalidades } from '../limpieza/localidad.js';

/** Si fallan tantas filas seguidas, se corta (probablemente la base no responde). */
export const MAXIMO_ERRORES_SEGUIDOS = 5;

export interface ResultadoImportacion {
  contadores: Contadores;
  /** La importación se cortó antes de terminar (base caída, CSV ilegible...). */
  fatal: boolean;
  /** Último código de error (seguro para imprimir), o null. */
  codigoError: string | null;
}

/**
 * Importa el CSV de rutaCsv con el rubro indicado. Si el archivo no existe, cuenta 0 filas.
 * listaLocalidades: lista oficial para validar la localidad (ver limpieza/localidad.ts).
 */
export async function importarCsv(
  db: SupabaseClient,
  rutaCsv: string,
  rubroId: string,
  listaLocalidades?: ListaLocalidades,
): Promise<ResultadoImportacion> {
  let contadores = contadoresIniciales();
  let fatal = false;
  let codigoError: string | null = null;
  let erroresSeguidos = 0;

  try {
    const texto = existsSync(rutaCsv) ? readFileSync(rutaCsv, 'utf8') : '';
    const filas = leerFilasCsv(texto);

    for (const fila of filas) {
      contadores = { ...contadores, filasLeidas: contadores.filasLeidas + 1 };

      const lead = mapearFilaGosom(fila, listaLocalidades);
      if (!lead) {
        contadores = { ...contadores, filasSinNombre: contadores.filasSinNombre + 1 };
        continue;
      }
      lead.rubro_id = rubroId;
      lead.fuentes = { ...lead.fuentes, rubro_id: [FUENTE_GOSOM] };

      try {
        const candidatos = await buscarCandidatos(db, lead);
        const decision = decidir(lead, candidatos);
        if (decision.accion === 'insertar') {
          await insertarLead(db, leadAFila(decision.lead));
        } else {
          await actualizarLead(db, decision.id, leadAFilaActualizacion(decision.lead, decision.reactivado));
        }
        contadores = contarDecision(contadores, decision);
        erroresSeguidos = 0;
      } catch (error) {
        contadores = { ...contadores, errores: contadores.errores + 1 };
        codigoError = codigoDeErrorSeguro(error);
        erroresSeguidos++;
        if (erroresSeguidos >= MAXIMO_ERRORES_SEGUIDOS) {
          fatal = true;
          break;
        }
      }
    }
  } catch (error) {
    fatal = true;
    codigoError = codigoDeErrorSeguro(error);
  }

  return { contadores, fatal, codigoError };
}
