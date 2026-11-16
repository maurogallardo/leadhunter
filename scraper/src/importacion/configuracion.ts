// Lectura y validación de las variables de entorno del importador.
// Los mensajes de error nombran la variable, NUNCA su valor.

export interface Configuracion {
  supabaseUrl: string;
  supabaseClave: string;
  rutaCsv: string;
  rubro: string;
  palabrasDeBloqueo: number;
  codigoGosom: number | null;
}

export type ResultadoConfiguracion = { ok: true; config: Configuracion } | { ok: false; errores: string[] };

export function leerConfiguracion(env: Record<string, string | undefined>): ResultadoConfiguracion {
  const errores: string[] = [];
  const requerida = (nombre: string): string => {
    const valor = env[nombre]?.trim() ?? '';
    if (valor === '') errores.push(`Falta la variable ${nombre}.`);
    return valor;
  };

  const supabaseUrl = requerida('SUPABASE_URL');
  const supabaseClave = requerida('SUPABASE_SECRET_KEY');
  const rutaCsv = requerida('CSV_RESULTADOS');
  const rubro = requerida('RUBRO');

  if (supabaseUrl !== '' && !/^https:\/\/[^\s/]+/.test(supabaseUrl)) {
    errores.push('SUPABASE_URL no parece una dirección https válida.');
  }

  const palabrasTexto = env['PALABRAS_BLOQUEO']?.trim() ?? '';
  let palabrasDeBloqueo = 0;
  if (palabrasTexto !== '') {
    if (/^\d+$/.test(palabrasTexto)) palabrasDeBloqueo = Number(palabrasTexto);
    else errores.push('PALABRAS_BLOQUEO debe ser un número entero mayor o igual a 0.');
  }

  const codigoTexto = env['CODIGO_GOSOM']?.trim() ?? '';
  let codigoGosom: number | null = null;
  if (codigoTexto !== '') {
    if (/^\d+$/.test(codigoTexto)) codigoGosom = Number(codigoTexto);
    else errores.push('CODIGO_GOSOM debe ser un número entero.');
  }

  if (errores.length > 0) return { ok: false, errores };
  return { ok: true, config: { supabaseUrl, supabaseClave, rutaCsv, rubro, palabrasDeBloqueo, codigoGosom } };
}
