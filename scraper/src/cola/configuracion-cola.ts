// Variables de entorno de "Armar cola" y "Procesar cola".
// Los mensajes de error nombran la variable, NUNCA su valor.

import { MINUTOS_RELANZAR_MAXIMO, MINUTOS_RELANZAR_POR_DEFECTO } from './reglas.js';

export interface ConfiguracionArmar {
  supabaseUrl: string;
  supabaseClave: string;
}

export interface ConfiguracionProcesar extends ConfiguracionArmar {
  carpetaTrabajo: string;
  imagenGosom: string;
  /** Hora de inicio del job (segundos desde 1970). */
  inicioJob: number;
  minutosAntesDeRelanzar: number;
}

export type Resultado<T> = { ok: true; config: T } | { ok: false; errores: string[] };

type Entorno = Record<string, string | undefined>;

function leerSupabase(env: Entorno, errores: string[]): ConfiguracionArmar {
  const requerida = (nombre: string): string => {
    const valor = env[nombre]?.trim() ?? '';
    if (valor === '') errores.push(`Falta la variable ${nombre}.`);
    return valor;
  };
  const supabaseUrl = requerida('SUPABASE_URL');
  const supabaseClave = requerida('SUPABASE_SECRET_KEY');
  if (supabaseUrl !== '' && !/^https:\/\/[^\s/]+/.test(supabaseUrl)) {
    errores.push('SUPABASE_URL no parece una dirección https válida.');
  }
  return { supabaseUrl, supabaseClave };
}

export function leerConfiguracionArmar(env: Entorno): Resultado<ConfiguracionArmar> {
  const errores: string[] = [];
  const config = leerSupabase(env, errores);
  return errores.length > 0 ? { ok: false, errores } : { ok: true, config };
}

export function leerConfiguracionProcesar(env: Entorno): Resultado<ConfiguracionProcesar> {
  const errores: string[] = [];
  const base = leerSupabase(env, errores);

  const carpetaTrabajo = env['CARPETA_TRABAJO']?.trim() ?? '';
  if (!carpetaTrabajo.startsWith('/')) errores.push('CARPETA_TRABAJO tiene que ser una ruta absoluta.');

  const imagenGosom = env['GOSOM_IMAGE']?.trim() ?? '';
  if (!/^[a-z0-9][a-z0-9./_-]*:[A-Za-z0-9._-]+$/.test(imagenGosom)) {
    errores.push('GOSOM_IMAGE tiene que ser una imagen con versión fija (nombre:version).');
  }

  const inicioTexto = env['INICIO_JOB']?.trim() ?? '';
  const inicioJob = /^\d{9,11}$/.test(inicioTexto) ? Number(inicioTexto) : NaN;
  if (!Number.isFinite(inicioJob)) errores.push('INICIO_JOB tiene que ser la hora de inicio en segundos.');

  const minutosTexto = env['MINUTOS_ANTES_DE_RELANZAR']?.trim() ?? '';
  let minutosAntesDeRelanzar = MINUTOS_RELANZAR_POR_DEFECTO;
  if (minutosTexto !== '') {
    const n = /^\d+$/.test(minutosTexto) ? Number(minutosTexto) : NaN;
    if (Number.isInteger(n) && n >= 1 && n <= MINUTOS_RELANZAR_MAXIMO) minutosAntesDeRelanzar = n;
    else errores.push(`MINUTOS_ANTES_DE_RELANZAR tiene que ser un número entero de 1 a ${MINUTOS_RELANZAR_MAXIMO}.`);
  }

  if (errores.length > 0) return { ok: false, errores };
  return { ok: true, config: { ...base, carpetaTrabajo, imagenGosom, inicioJob, minutosAntesDeRelanzar } };
}
