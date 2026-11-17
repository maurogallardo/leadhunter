// "Cargar localidades oficiales": baja de la API Georef (datos.gob.ar,
// fuente INDEC) las localidades y las localidades censales de Córdoba, y
// lee la población por municipio del Censo 2022 (INDEC) de la copia fija
// del repo (scraper/datos/, ver LEEME.md). Las guarda en
// public.localidades_oficiales (migración 0005).
// Se corre en GitHub Actions (workflow "Cargar localidades oficiales").
//
// Variables de entorno:
//   SUPABASE_URL, SUPABASE_SECRET_KEY  (Secrets de GitHub, solo en ese paso)
//   MODO                               "vista_previa" (solo cuenta) o "aplicar"
//
// Por consola solo salen números. Son datos públicos oficiales, pero igual
// no se imprimen nombres.

import { crearCliente } from './importacion/base.js';
import { codigoDeErrorSeguro } from './importacion/decision.js';
import { guardarLocalidades, leerClavesExistentes } from './localidades/base-localidades.js';
import { leerCopiaCenso } from './localidades/censo.js';
import { codigoDeCausa, describirErrorDescarga, ErrorDescarga, type FuenteDescarga } from './localidades/descarga.js';
import { leerConfiguracionLocalidades } from './localidades/modo.js';
import {
  agregarPoblacion,
  filasDesdeGeoref,
  nombresOriginales,
  poblacionPorMunicipio,
  resumirCarga,
  type TipoLocalidad,
} from './localidades/oficiales.js';

/** Provincia de Córdoba en Georef / INDEC. */
const PROVINCIA_CORDOBA = '14';
const GEOREF = 'https://apis.datos.gob.ar/georef/api';
const ENDPOINT: Record<TipoLocalidad, string> = { localidad: 'localidades', localidad_censal: 'localidades-censales' };
const ESPERA_MS = 60_000;

/**
 * Baja una fuente. Si falla, lanza ErrorDescarga con la etiqueta de la
 * fuente, el paso y el código de causa (nunca la URL).
 */
async function bajar(url: string, como: 'json' | 'texto', fuente: FuenteDescarga, paso: string): Promise<unknown> {
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(ESPERA_MS), headers: { 'User-Agent': 'leadhunter-localidades' } });
    if (!respuesta.ok) throw Object.assign(new Error('respuesta HTTP no exitosa'), { code: `HTTP_${respuesta.status}` });
    return await (como === 'json' ? respuesta.json() : respuesta.text());
  } catch (error) {
    throw new ErrorDescarga(fuente, paso, codigoDeCausa(error));
  }
}

const urlGeoref = (tipo: TipoLocalidad): string =>
  `${GEOREF}/${ENDPOINT[tipo]}?provincia=${PROVINCIA_CORDOBA}&max=5000&campos=completo`;

async function principal(): Promise<number> {
  const resultado = leerConfiguracionLocalidades(process.env);
  if (!resultado.ok) {
    for (const error of resultado.errores) console.log(`ERROR: ${error}`);
    return 1;
  }
  const { supabaseUrl, supabaseClave, modo } = resultado.config;

  // 1. Bajar las fuentes oficiales
  let jsonLocalidades: unknown;
  let jsonCensales: unknown;
  let csvCenso: string;
  // Se intentan las tres y se informa CADA una que falle.
  // El censo se lee de la copia fija del repo (no de internet).
  const leerCenso = async (): Promise<string> => {
    try {
      return leerCopiaCenso();
    } catch (error) {
      throw new ErrorDescarga('censo', 'lectura del censo', codigoDeCausa(error));
    }
  };
  const descargas = await Promise.allSettled([
    bajar(urlGeoref('localidad'), 'json', 'georef', 'descarga de localidades'),
    bajar(urlGeoref('localidad_censal'), 'json', 'georef', 'descarga de localidades censales'),
    leerCenso(),
  ]);
  const fallas = descargas.flatMap((d) => (d.status === 'rejected' ? [d.reason] : []));
  if (fallas.length > 0) {
    for (const falla of fallas) {
      const detalle = falla instanceof ErrorDescarga ? describirErrorDescarga(falla) : `causa: ${codigoDeErrorSeguro(falla)}`;
      console.log(`ERROR: no se pudo obtener una fuente (${detalle}).`);
    }
    return 1;
  }
  [jsonLocalidades, jsonCensales, csvCenso] = descargas.map((d) => (d.status === 'fulfilled' ? d.value : undefined)) as [
    unknown,
    unknown,
    string,
  ];

  // 2. Convertir y agregar población del municipio
  let filas;
  try {
    const poblacion = poblacionPorMunicipio(csvCenso);
    filas = agregarPoblacion(
      [...filasDesdeGeoref(jsonLocalidades, 'localidad'), ...filasDesdeGeoref(jsonCensales, 'localidad_censal')],
      poblacion,
    );
  } catch (error) {
    console.log(`ERROR: la lista oficial o el censo vinieron con un formato inesperado (codigo ${codigoDeErrorSeguro(error)}).`);
    return 1;
  }
  if (filas.length === 0) {
    console.log('ERROR: la lista oficial vino vacía. No se guarda nada.');
    return 1;
  }

  // 3. Comparar con lo que ya está guardado
  const db = crearCliente(supabaseUrl, supabaseClave);
  let existentes: Set<string>;
  try {
    existentes = await leerClavesExistentes(db);
  } catch (error) {
    console.log(`ERROR: no se pudo leer localidades_oficiales (codigo ${codigoDeErrorSeguro(error)}).`);
    return 1;
  }
  const resumen = resumirCarga(
    filas,
    [...nombresOriginales(jsonLocalidades, 'localidad'), ...nombresOriginales(jsonCensales, 'localidad_censal')],
    existentes,
  );

  // 4. Guardar (solo en modo aplicar)
  let guardadas = 0;
  if (modo === 'aplicar') {
    try {
      guardadas = await guardarLocalidades(db, filas);
    } catch (error) {
      console.log(`ERROR: no se pudieron guardar las localidades (codigo ${codigoDeErrorSeguro(error)}).`);
      return 1;
    }
  }

  console.log('===== RESUMEN CARGAR LOCALIDADES OFICIALES =====');
  console.log(`Modo: ${modo === 'aplicar' ? 'aplicar' : 'vista previa (no se guardo nada)'}`);
  console.log(`Localidades (Georef): ${resumen.localidades}`);
  console.log(`Localidades censales (Georef): ${resumen.localidadesCensales}`);
  console.log(`Nombres con caracteres invisibles limpiados: ${resumen.conInvisiblesLimpiados}`);
  console.log(`Con poblacion del municipio (Censo 2022): ${resumen.conPoblacion}`);
  console.log(`Sin poblacion (sin municipio o sin dato): ${resumen.sinPoblacion}`);
  console.log(`Nuevas: ${resumen.nuevas}`);
  console.log(`Ya existian (se actualizan): ${resumen.yaExistian}`);
  console.log(`Guardadas: ${guardadas}`);
  console.log('================================================');
  return 0;
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
