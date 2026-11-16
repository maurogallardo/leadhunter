// Importador: lee el CSV de gosom, limpia, une con lo que ya hay en la
// base y guarda. Se corre en GitHub Actions (workflow "Buscar").
//
// Variables de entorno:
//   SUPABASE_URL, SUPABASE_SECRET_KEY  (Secrets de GitHub, solo en ese paso)
//   CSV_RESULTADOS                     ruta del CSV de gosom
//   RUBRO                              nombre exacto de un rubro activo
//   PALABRAS_BLOQUEO                   cantidad de palabras de bloqueo en el log de gosom
//   CODIGO_GOSOM                       código de salida de gosom
//
// REGLA DE ORO: por consola solo salen números y estados. Nunca nombres,
// teléfonos, mails, direcciones, claves ni mensajes de error crudos
// (pueden traer datos de la fila): solo códigos de error.

import { existsSync, readFileSync } from 'node:fs';
import {
  actualizarLead,
  buscarCandidatos,
  buscarRubroActivo,
  cerrarCorrida,
  crearCliente,
  crearCorrida,
  insertarLead,
} from './importacion/base.js';
import { leerConfiguracion } from './importacion/configuracion.js';
import { leerFilasCsv } from './importacion/csv.js';
import {
  codigoDeErrorSeguro,
  contadoresIniciales,
  contarDecision,
  decidir,
  detalleTecnico,
  estadoDeCorrida,
  hayBloqueo,
  leadAFila,
  leadAFilaActualizacion,
  lineasDeResumen,
} from './importacion/decision.js';
import { FUENTE_GOSOM, mapearFilaGosom } from './limpieza/gosom.js';

/** Si fallan tantas filas seguidas, se corta (probablemente la base no responde). */
const MAXIMO_ERRORES_SEGUIDOS = 5;

async function principal(): Promise<number> {
  const resultado = leerConfiguracion(process.env);
  if (!resultado.ok) {
    for (const error of resultado.errores) console.log(`ERROR: ${error}`);
    return 1;
  }
  const config = resultado.config;
  const db = crearCliente(config.supabaseUrl, config.supabaseClave);

  // 1. Rubro
  let rubroId: string | null;
  try {
    rubroId = await buscarRubroActivo(db, config.rubro);
  } catch (error) {
    console.log(`ERROR: no se pudo consultar la tabla rubros (codigo ${codigoDeErrorSeguro(error)}).`);
    return 1;
  }
  if (!rubroId) {
    console.log('ERROR: el rubro indicado no existe en la tabla rubros o esta inactivo. Revisar que este escrito igual.');
    return 1;
  }

  // 2. Registrar la corrida
  let corridaId: string;
  try {
    corridaId = await crearCorrida(db);
  } catch (error) {
    console.log(`ERROR: no se pudo registrar la corrida (codigo ${codigoDeErrorSeguro(error)}).`);
    return 1;
  }

  // 3. Procesar el CSV
  let contadores = contadoresIniciales();
  let fatal = false;
  let codigoError: string | null = null;
  let erroresSeguidos = 0;

  try {
    const texto = existsSync(config.rutaCsv) ? readFileSync(config.rutaCsv, 'utf8') : '';
    const filas = leerFilasCsv(texto);

    for (const fila of filas) {
      contadores = { ...contadores, filasLeidas: contadores.filasLeidas + 1 };

      const lead = mapearFilaGosom(fila);
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

  // 4. Cerrar la corrida
  const bloqueo = hayBloqueo(config.palabrasDeBloqueo, contadores.filasLeidas);
  const estado = estadoDeCorrida({
    fatal,
    errores: contadores.errores,
    bloqueo,
    codigoGosom: config.codigoGosom,
    filasLeidas: contadores.filasLeidas,
  });

  try {
    await cerrarCorrida(db, corridaId, {
      estado,
      leadsNuevos: contadores.nuevos,
      bloqueoDetectado: bloqueo,
      detalle: detalleTecnico(contadores, {
        codigoGosom: config.codigoGosom,
        palabrasDeBloqueo: config.palabrasDeBloqueo,
        codigoError,
      }),
    });
  } catch (error) {
    console.log(`ERROR: no se pudo cerrar la corrida (codigo ${codigoDeErrorSeguro(error)}).`);
  }

  for (const linea of lineasDeResumen(contadores, estado, bloqueo)) console.log(linea);
  if (codigoError) console.log(`Ultimo codigo de error: ${codigoError}`);
  if (fatal) console.log('La importacion se corto antes de terminar.');

  return estado === 'error' ? 1 : 0;
}

principal().then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (error: unknown) => {
    console.log(`ERROR inesperado (codigo ${codigoDeErrorSeguro(error)}).`);
    process.exitCode = 1;
  },
);
