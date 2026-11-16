// Pruebas de configuración de la cola. Valores INVENTADOS (no son claves ni URLs reales).
import { describe, expect, it } from 'vitest';
import { leerConfiguracionArmar, leerConfiguracionProcesar } from './configuracion-cola.js';

const COMPLETA = {
  SUPABASE_URL: 'https://proyecto-ficticio.test',
  SUPABASE_SECRET_KEY: 'clave-ficticia-de-prueba',
  CARPETA_TRABAJO: '/tmp/carpeta-ficticia',
  GOSOM_IMAGE: 'gosom/google-maps-scraper:v1.19.0',
  INICIO_JOB: '1790000000',
  MINUTOS_ANTES_DE_RELANZAR: '315',
};

describe('leerConfiguracionArmar', () => {
  it('ok con las dos variables de Supabase', () => {
    expect(leerConfiguracionArmar(COMPLETA)).toEqual({
      ok: true,
      config: { supabaseUrl: 'https://proyecto-ficticio.test', supabaseClave: 'clave-ficticia-de-prueba' },
    });
  });

  it('faltan: nombra la variable, nunca el valor', () => {
    const r = leerConfiguracionArmar({ SUPABASE_URL: 'http://proyecto-ficticio.test', SUPABASE_SECRET_KEY: '' });
    if (r.ok) throw new Error('se esperaba error');
    expect(r.errores).toContain('Falta la variable SUPABASE_SECRET_KEY.');
    expect(r.errores.join(' ')).not.toContain('proyecto-ficticio');
  });
});

describe('leerConfiguracionProcesar', () => {
  it('todo correcto', () => {
    const r = leerConfiguracionProcesar(COMPLETA);
    expect(r.ok && r.config).toMatchObject({ carpetaTrabajo: '/tmp/carpeta-ficticia', inicioJob: 1790000000, minutosAntesDeRelanzar: 315 });
  });

  it('minutos: vacío -> 315; valor chico para probar -> se respeta', () => {
    const vacio = leerConfiguracionProcesar({ ...COMPLETA, MINUTOS_ANTES_DE_RELANZAR: '' });
    expect(vacio.ok && vacio.config.minutosAntesDeRelanzar).toBe(315);
    const chico = leerConfiguracionProcesar({ ...COMPLETA, MINUTOS_ANTES_DE_RELANZAR: '5' });
    expect(chico.ok && chico.config.minutosAntesDeRelanzar).toBe(5);
  });

  it('minutos fuera de rango o no enteros -> error', () => {
    for (const valor of ['0', '316', '-5', '2.5', 'abc']) {
      expect(leerConfiguracionProcesar({ ...COMPLETA, MINUTOS_ANTES_DE_RELANZAR: valor }).ok).toBe(false);
    }
  });

  it('imagen sin versión, carpeta relativa e inicio inválido -> error, sin mostrar la clave', () => {
    const r = leerConfiguracionProcesar({ ...COMPLETA, GOSOM_IMAGE: 'gosom/google-maps-scraper', CARPETA_TRABAJO: 'relativa', INICIO_JOB: 'ayer' });
    if (r.ok) throw new Error('se esperaba error');
    expect(r.errores).toHaveLength(3);
    expect(r.errores.join(' ')).not.toContain('clave-ficticia-de-prueba');
  });
});
