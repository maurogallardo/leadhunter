// Pruebas de los errores de descarga: solo etiquetas y códigos.
import { describe, expect, it } from 'vitest';
import { codigoDeCausa, describirErrorDescarga, ErrorDescarga } from './descarga.js';

const errorDeRed = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('x'), { code }) });

describe('codigoDeCausa', () => {
  it('usa el código de la causa de fondo (fallo de red de fetch)', () => {
    expect(codigoDeCausa(errorDeRed('UNABLE_TO_VERIFY_LEAF_SIGNATURE'))).toBe('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    expect(codigoDeCausa(errorDeRed('ENOTFOUND'))).toBe('ENOTFOUND');
    expect(codigoDeCausa(errorDeRed('ECONNRESET'))).toBe('ECONNRESET');
  });

  it('si no hay causa, el código del error (HTTP) o su nombre (timeout)', () => {
    expect(codigoDeCausa(Object.assign(new Error('x'), { code: 'HTTP_503' }))).toBe('HTTP_503');
    expect(codigoDeCausa(new DOMException('x', 'TimeoutError'))).toBe('TimeoutError');
    expect(codigoDeCausa(new TypeError('x'))).toBe('TypeError');
  });

  it('nunca devuelve textos con espacios, URLs o símbolos', () => {
    expect(codigoDeCausa(Object.assign(new Error('x'), { code: 'https://sitio.invalid/archivo.csv' }))).toBe('Error');
    expect(codigoDeCausa({ code: 'un texto largo con espacios' })).toBe('desconocido');
    expect(codigoDeCausa(null)).toBe('desconocido');
    expect(codigoDeCausa('texto')).toBe('desconocido');
  });
});

describe('describirErrorDescarga', () => {
  it('solo fuente, paso y causa', () => {
    const texto = describirErrorDescarga(new ErrorDescarga('censo', 'descarga del censo', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'));
    expect(texto).toBe('fuente: censo, paso: descarga del censo, causa: UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    expect(texto).not.toMatch(/https?:|\.gob\.ar/);
  });
});
