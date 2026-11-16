// Pruebas de configuración. Valores INVENTADOS (no son claves ni URLs reales).
import { describe, expect, it } from 'vitest';
import { leerConfiguracion } from './configuracion.js';

const COMPLETA = {
  SUPABASE_URL: 'https://proyecto-ficticio.test',
  SUPABASE_SECRET_KEY: 'clave-ficticia-de-prueba',
  CSV_RESULTADOS: '/tmp/resultados.csv',
  RUBRO: 'Mayoristas',
  PALABRAS_BLOQUEO: '0',
  CODIGO_GOSOM: '0',
};

describe('leerConfiguracion', () => {
  it('todo correcto', () => {
    const r = leerConfiguracion(COMPLETA);
    expect(r).toEqual({
      ok: true,
      config: {
        supabaseUrl: 'https://proyecto-ficticio.test',
        supabaseClave: 'clave-ficticia-de-prueba',
        rutaCsv: '/tmp/resultados.csv',
        rubro: 'Mayoristas',
        palabrasDeBloqueo: 0,
        codigoGosom: 0,
      },
    });
  });

  it('opcionales vacíos: 0 palabras y código desconocido', () => {
    const r = leerConfiguracion({ ...COMPLETA, PALABRAS_BLOQUEO: '', CODIGO_GOSOM: undefined });
    expect(r.ok && r.config.palabrasDeBloqueo).toBe(0);
    expect(r.ok && r.config.codigoGosom).toBeNull();
  });

  it('faltan variables: nombra la variable, no muestra valores', () => {
    const r = leerConfiguracion({ ...COMPLETA, SUPABASE_SECRET_KEY: '  ', RUBRO: undefined });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores).toEqual(['Falta la variable SUPABASE_SECRET_KEY.', 'Falta la variable RUBRO.']);
  });

  it('URL no https -> error sin mostrar el valor', () => {
    const r = leerConfiguracion({ ...COMPLETA, SUPABASE_URL: 'http://proyecto-ficticio.test' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores.join(' ')).not.toContain('proyecto-ficticio');
  });

  it('números inválidos', () => {
    const r = leerConfiguracion({ ...COMPLETA, PALABRAS_BLOQUEO: '-1', CODIGO_GOSOM: 'abc' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores).toHaveLength(2);
  });

  it('ningún mensaje de error contiene la clave', () => {
    const r = leerConfiguracion({ ...COMPLETA, SUPABASE_URL: 'ftp://x', PALABRAS_BLOQUEO: 'x' });
    if (r.ok) throw new Error('se esperaba error');
    expect(r.errores.join(' ')).not.toContain('clave-ficticia-de-prueba');
  });
});
