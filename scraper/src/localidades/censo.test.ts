// Pruebas de la copia fija del Censo 2022 (scraper/datos/). Solo cuentan
// filas: no imprimen datos.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARCHIVO_CENSO, leerCopiaCenso } from './censo.js';
import { codigoDeCausa } from './descarga.js';
import { poblacionPorMunicipio } from './oficiales.js';

describe('copia fija del censo', () => {
  it('el archivo existe en scraper/datos/', () => {
    expect(ARCHIVO_CENSO.replace(/\\/g, '/')).toMatch(/\/scraper\/datos\/censo2022_gobierno_local\.csv$/);
    expect(existsSync(ARCHIVO_CENSO)).toBe(true);
  });

  it('se lee y trae la población de todos los gobiernos locales', () => {
    const poblacion = poblacionPorMunicipio(leerCopiaCenso());
    expect(poblacion.size).toBe(2291);
    // Córdoba (provincia 14): 428 gobiernos locales.
    expect([...poblacion.keys()].filter((codigo) => codigo.startsWith('14')).length).toBe(428);
    expect([...poblacion.values()].every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
  });

  it('si el archivo falta, el error da un código seguro (ENOENT)', () => {
    let codigo = '';
    try {
      leerCopiaCenso(ARCHIVO_CENSO + '.no-existe');
    } catch (error) {
      codigo = codigoDeCausa(error);
    }
    expect(codigo).toBe('ENOENT');
  });
});
