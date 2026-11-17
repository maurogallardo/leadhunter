// "Procesar cola": toma los pendientes de cola_busquedas de a uno, en orden
// (zonas por prioridad, después rubros), corre gosom, importa con el MISMO
// importador que "Buscar" y marca cada pendiente como hecha o error.
// Se corre en GitHub Actions (workflow "Procesar cola").
//
// - Bloqueo (señales fuertes en el log, o 2 búsquedas seguidas sin
//   resultados): frena todo; la búsqueda en curso vuelve a pendiente.
// - Cerca del límite de tiempo: termina la búsqueda en curso y deja
//   escrito "si" en relanzar.txt para que el workflow se relance solo.
//
// Variables de entorno:
//   SUPABASE_URL, SUPABASE_SECRET_KEY  (Secrets de GitHub, solo en ese paso)
//   CARPETA_TRABAJO                    carpeta temporal (se borra al final)
//   GOSOM_IMAGE                        imagen de gosom con versión fija
//   INICIO_JOB                         hora de inicio del job (segundos)
//   MINUTOS_ANTES_DE_RELANZAR          por defecto 315
//
// REGLA DE ORO: por consola solo salen números y estados. Nunca nombres,
// teléfonos, mails, direcciones, consultas, claves ni el log de gosom.

import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import { cerrarCorrida, crearCliente, crearCorrida } from './importacion/base.js';
import { codigoDeErrorSeguro } from './importacion/decision.js';
import { importarCsv } from './importacion/importar-csv.js';
import type { ListaLocalidades } from './limpieza/localidad.js';
import { leerListaLocalidades } from './localidades/base-localidades.js';
import { LISTA_VACIA } from './localidades/lista.js';
import { actualizarPendiente, leerPendientesTomables, leerRubros, leerZonas, marcarInterrumpidas, tomarPendiente } from './cola/base-cola.js';
import { leerConfiguracionProcesar } from './cola/configuracion-cola.js';
import { archivosDeBusqueda, correrGosom } from './cola/gosom.js';
import {
  cambioAlTerminar,
  cambioAlTomar,
  construirConsulta,
  contarSenales,
  type DatosResumen,
  debeRelanzar,
  detalleCorridaCola,
  estadoCorridaCola,
  lineasResumenCola,
  MAXIMO_BUSQUEDAS_CON_ERROR_SEGUIDAS,
  type MotivoBloqueo,
  ordenarCola,
  pausaAlAzar,
  puedeEmpezarOtra,
  type Rubro,
  resultadoDeBusqueda,
  sumarBusqueda,
  type Tarea,
  totalesIniciales,
  totalSenales,
  type Zona,
} from './cola/reglas.js';

async function principal(): Promise<number> {
  const resultado = leerConfiguracionProcesar(process.env);
  if (!resultado.ok) {
    for (const error of resultado.errores) console.log(`ERROR: ${error}`);
    return 1;
  }
  const config = resultado.config;
  const archivoRelanzar = join(config.carpetaTrabajo, 'relanzar.txt');
  writeFileSync(archivoRelanzar, 'no\n', 'utf8');

  const minutosTranscurridos = (): number => (Date.now() / 1000 - config.inicioJob) / 60;
  const ahora = (): string => new Date().toISOString();
  const db = crearCliente(config.supabaseUrl, config.supabaseClave);

  // 1. Registrar la corrida
  let corridaId: string;
  try {
    corridaId = await crearCorrida(db);
  } catch (error) {
    console.log(`ERROR: no se pudo registrar la corrida (codigo ${codigoDeErrorSeguro(error)}).`);
    return 1;
  }

  let fatal = false;
  let codigoError: string | null = null;
  let interrumpidas = 0;
  let rubros: Rubro[] = [];
  let zonas: Zona[] = [];
  let tareas: Tarea[] = [];
  let listaLocalidades: ListaLocalidades = LISTA_VACIA;

  // 2. Limpiar restos de una corrida cortada y leer la cola
  try {
    interrumpidas = await marcarInterrumpidas(db, ahora());
    [rubros, zonas, listaLocalidades] = await Promise.all([leerRubros(db), leerZonas(db), leerListaLocalidades(db)]);
    tareas = ordenarCola(await leerPendientesTomables(db), rubros, zonas);
  } catch (error) {
    fatal = true;
    codigoError = codigoDeErrorSeguro(error);
    console.log(`ERROR: no se pudo leer la cola o las localidades oficiales (codigo ${codigoError}).`);
  }
  console.log(`Pendientes interrumpidos de una corrida anterior (pasan a error): ${interrumpidas}`);
  console.log(`Pendientes para hacer al empezar: ${tareas.length}`);

  // 3. Recorrer la cola
  let totales = totalesIniciales();
  let busquedas = 0;
  let cerosSeguidos = 0;
  let erroresSeguidos = 0;
  let bloqueo: MotivoBloqueo | null = null;
  let cortadaPorTiempo = false;

  for (let i = 0; i < tareas.length && !fatal; i++) {
    const tarea = tareas[i];
    if (!tarea) continue;

    if (!puedeEmpezarOtra(busquedas, minutosTranscurridos(), config.minutosAntesDeRelanzar)) {
      cortadaPorTiempo = true;
      break;
    }

    try {
      if (!(await tomarPendiente(db, tarea.pendiente, cambioAlTomar(tarea.pendiente, ahora())))) continue;
    } catch (error) {
      fatal = true;
      codigoError = codigoDeErrorSeguro(error);
      break;
    }
    busquedas++;
    const inicioBusqueda = Date.now();
    const archivos = archivosDeBusqueda(config.carpetaTrabajo, busquedas);

    let codigoGosom: number | null = null;
    try {
      codigoGosom = await correrGosom(config.imagenGosom, archivos, construirConsulta(tarea.rubro, tarea.zona));
    } catch {
      codigoGosom = null;
    }

    let log = '';
    try {
      log = readFileSync(archivos.log, 'utf8');
    } catch {
      log = '';
    }
    const senales = contarSenales(log);
    log = '';

    const importacion = await importarCsv(db, archivos.csv, tarea.rubro.id, listaLocalidades);
    const c = importacion.contadores;
    const r = resultadoDeBusqueda({
      senalesFuertes: totalSenales(senales, 'fuerte'),
      senalesDebiles: totalSenales(senales, 'debil'),
      filas: c.filasLeidas,
      codigoGosom,
      importacionFatal: importacion.fatal,
      erroresImportacion: c.errores,
      codigoError: importacion.codigoError,
      nuevos: c.nuevos,
      unidos: c.unidos,
      cerosSeguidosAntes: cerosSeguidos,
    });
    cerosSeguidos = r.cerosSeguidos;
    totales = sumarBusqueda(totales, r, c.nuevos, c.unidos);
    if (importacion.codigoError) codigoError = importacion.codigoError;

    try {
      rmSync(archivos.carpeta, { recursive: true, force: true });
    } catch {
      // Si no se puede (archivos de root), los borra el paso final con sudo.
    }

    const duracion = Math.round((Date.now() - inicioBusqueda) / 1000);
    console.log(
      `Busqueda ${busquedas} (de ${tareas.length} al empezar): ${r.tipo} | filas ${c.filasLeidas} | nuevos ${c.nuevos} | unidos ${c.unidos} | codigo gosom ${codigoGosom ?? 'desconocido'} | segundos ${duracion}`,
    );
    if (totalSenales(senales) > 0) {
      console.log(`  Senales en el log: ${senales.map((s) => `${s.etiqueta}=${s.cantidad}`).join(', ')}`);
    }

    try {
      await actualizarPendiente(db, tarea.pendiente.id, cambioAlTerminar(tarea.pendiente, r, ahora()));
    } catch (error) {
      fatal = true;
      codigoError = codigoDeErrorSeguro(error);
      break;
    }

    if (r.tipo === 'bloqueo') {
      bloqueo = r.motivo;
      break;
    }
    erroresSeguidos = r.tipo === 'error' ? erroresSeguidos + 1 : 0;
    if (erroresSeguidos >= MAXIMO_BUSQUEDAS_CON_ERROR_SEGUIDAS) {
      fatal = true;
      console.log(`ERROR: ${erroresSeguidos} busquedas seguidas con error. Se corta la corrida.`);
      break;
    }

    const hayOtra = i + 1 < tareas.length;
    if (hayOtra && puedeEmpezarOtra(busquedas, minutosTranscurridos(), config.minutosAntesDeRelanzar)) {
      await esperar(pausaAlAzar() * 1000);
    }
  }

  // 4. Cuántos quedan y si hay que relanzar
  let quedan: number | null = null;
  try {
    quedan = ordenarCola(await leerPendientesTomables(db), rubros, zonas).length;
  } catch (error) {
    codigoError = codigoDeErrorSeguro(error);
  }
  const relanzar = debeRelanzar({
    bloqueo: bloqueo !== null,
    fatal,
    cortadaPorTiempo,
    quedan: quedan ?? 0,
    busquedasEnEstaCorrida: busquedas,
  });
  if (relanzar) writeFileSync(archivoRelanzar, 'si\n', 'utf8');

  // 5. Cerrar la corrida
  const estado = estadoCorridaCola({ fatal, bloqueo: bloqueo !== null });
  const resumen: DatosResumen = { totales, quedan, estado, bloqueo, relanzar };
  try {
    await cerrarCorrida(db, corridaId, {
      estado,
      leadsNuevos: totales.leadsNuevos,
      bloqueoDetectado: bloqueo !== null,
      busquedasHechas: totales.busquedasHechas,
      detalle: detalleCorridaCola({ ...resumen, interrumpidas, codigoError, minutos: Math.round(minutosTranscurridos()) }),
    });
  } catch (error) {
    console.log(`ERROR: no se pudo cerrar la corrida (codigo ${codigoDeErrorSeguro(error)}).`);
  }

  for (const linea of lineasResumenCola(resumen)) console.log(linea);
  if (codigoError) console.log(`Ultimo codigo de error: ${codigoError}`);
  if (fatal) console.log('La corrida se corto antes de terminar.');

  return fatal ? 1 : 0;
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
