// Pruebas de los argumentos de gosom (no corre Docker).
import { describe, expect, it } from 'vitest';
import { archivosDeBusqueda, argumentosGosom, MINUTOS_MAXIMOS_GOSOM, PROFUNDIDAD_COLA } from './gosom.js';

describe('gosom de la cola', () => {
  it('cada búsqueda tiene su propia carpeta (nunca se reimporta un CSV viejo)', () => {
    const a = archivosDeBusqueda('/tmp/ficticia', 1);
    const b = archivosDeBusqueda('/tmp/ficticia', 2);
    expect(a.carpeta).toBe('/tmp/ficticia/busqueda-0001');
    expect(a.csv).toBe('/tmp/ficticia/busqueda-0001/out/results.csv');
    expect(a.carpeta).not.toBe(b.carpeta);
  });

  it('mismas opciones que Buscar, con profundidad fija y tope de tiempo', () => {
    const args = argumentosGosom('gosom/google-maps-scraper:v1.19.0', archivosDeBusqueda('/tmp/ficticia', 1));
    expect(args[0]).toBe(`${MINUTOS_MAXIMOS_GOSOM}m`);
    expect(MINUTOS_MAXIMOS_GOSOM).toBe(30);
    const texto = args.join(' ');
    expect(texto).toContain(`-depth ${PROFUNDIDAD_COLA}`);
    expect(texto).toContain('-lang es -c 1 -email -exit-on-inactivity 3m');
    expect(texto).toContain('-e DISABLE_TELEMETRY=1');
    expect(texto).toContain('/tmp/ficticia/busqueda-0001/queries.txt:/queries.txt:ro');
    // Docker no recibe ninguna variable de Supabase.
    expect(texto).not.toMatch(/SUPABASE/);
  });
});
