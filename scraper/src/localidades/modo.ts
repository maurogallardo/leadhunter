// Modo de los workflows manuales de localidades: "vista_previa" (solo
// cuenta, no escribe nada) o "aplicar" (escribe en la base).
// Los mensajes de error nombran la variable, NUNCA su valor.

export type Modo = 'vista_previa' | 'aplicar';

export interface ConfiguracionLocalidades {
  supabaseUrl: string;
  supabaseClave: string;
  modo: Modo;
}

export type ResultadoConfiguracion = { ok: true; config: ConfiguracionLocalidades } | { ok: false; errores: string[] };

export function leerConfiguracionLocalidades(env: Record<string, string | undefined>): ResultadoConfiguracion {
  const errores: string[] = [];
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
  const modoTexto = env['MODO']?.trim() ?? '';
  let modo: Modo = 'vista_previa';
  if (modoTexto === 'aplicar' || modoTexto === 'vista_previa') modo = modoTexto;
  else errores.push('MODO tiene que ser "vista_previa" o "aplicar".');

  if (errores.length > 0) return { ok: false, errores };
  return { ok: true, config: { supabaseUrl, supabaseClave, modo } };
}
