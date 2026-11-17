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

import { buscarRubroActivo, cerrarCorrida, crearCliente, crearCorrida } from './importacion/base.js';
import { leerConfiguracion } from './importacion/configuracion.js';
import {
  codigoDeErrorSeguro,
  detalleTecnico,
  estadoDeCorrida,
  hayBloqueo,
  lineasDeResumen,
} from './importacion/decision.js';
import { importarCsv } from './importacion/importar-csv.js';
import type { ListaLocalidades } from './limpieza/localidad.js';
import { leerListaLocalidades } from './localidades/base-localidades.js';

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

  // 1b. Lista oficial de localidades (para validar la localidad de cada lead)
  let listaLocalidades: ListaLocalidades;
  try {
    listaLocalidades = await leerListaLocalidades(db);
  } catch (error) {
    console.log(`ERROR: no se pudo leer la tabla localidades_oficiales (codigo ${codigoDeErrorSeguro(error)}).`);
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

  // 3. Procesar el CSV (mismo núcleo que usa la cola)
  const { contadores, fatal, codigoError } = await importarCsv(db, config.rutaCsv, rubroId, listaLocalidades);

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
