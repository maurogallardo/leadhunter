// Pruebas de nombres. Todos los nombres son inventados.
import { describe, expect, it } from 'vitest';
import { claveDeNombre, nombresParecidos, similitud, UMBRAL_NOMBRES_PARECIDOS } from './nombres.js';

describe('claveDeNombre', () => {
  it.each([
    ['Almacén Don Prueba', 'almacen don prueba'],
    ['  PANADERÍA   "La Inventada"  ', 'panaderia la inventada'],
    ['Distribuidora Ñandú S.R.L.', 'distribuidora nandu s r l'],
    ['Kiosco-24hs / Ficticio!!', 'kiosco 24hs ficticio'],
    ['Pingüino & Cía.', 'pinguino cia'],
    ['', ''],
  ])('%j -> %j', (nombre, clave) => {
    expect(claveDeNombre(nombre)).toBe(clave);
  });

  it('null y undefined -> texto vacío', () => {
    expect(claveDeNombre(null)).toBe('');
    expect(claveDeNombre(undefined)).toBe('');
  });
});

describe('similitud', () => {
  it('iguales = 1, nada en común = 0', () => {
    expect(similitud('abc', 'abc')).toBe(1);
    expect(similitud('abcd', 'wxyz')).toBe(0);
  });

  it('textos de una letra o vacíos', () => {
    expect(similitud('', '')).toBe(0);
    expect(similitud('a', 'b')).toBe(0);
  });
});

describe('nombresParecidos', () => {
  it('iguales por clave (tildes, mayúsculas, signos)', () => {
    expect(nombresParecidos('Almacén Don Prueba', 'ALMACEN DON PRUEBA.')).toBe(true);
  });

  it.each([
    ['Distribuidora Ejemplo Norte', 'Distribuidora Ejemplo Norte SRL'],
    ['Panadería Inventada', 'Panaderia Inventada 2'],
    ['Autoservicio Ficticio', 'Autoservicio Fictisio'], // error de tipeo
  ])('parecidos: %j ~ %j', (a, b) => {
    expect(nombresParecidos(a, b)).toBe(true);
  });

  it.each([
    ['Kiosco El Sol', 'Kiosco La Luna'],
    ['Distribuidora Ejemplo Norte', 'Distribuidora Modelo Sur'],
    ['Mayorista Inventado', 'Supermercado Ficticio'],
  ])('distintos: %j vs %j', (a, b) => {
    expect(nombresParecidos(a, b)).toBe(false);
  });

  it('vacíos nunca son parecidos', () => {
    expect(nombresParecidos('', '')).toBe(false);
    expect(nombresParecidos('Kiosco Ficticio', null)).toBe(false);
    expect(nombresParecidos('!!!', '...')).toBe(false);
  });

  it('el umbral separa los casos de borde', () => {
    // Por encima del umbral: un sufijo agregado
    expect(similitud('distribuidora ejemplo norte', 'distribuidora ejemplo norte srl')).toBeGreaterThanOrEqual(
      UMBRAL_NOMBRES_PARECIDOS,
    );
    // Por debajo del umbral: comparten solo la primera palabra
    expect(similitud('kiosco el sol', 'kiosco la luna')).toBeLessThan(UMBRAL_NOMBRES_PARECIDOS);
    expect(UMBRAL_NOMBRES_PARECIDOS).toBe(0.8);
  });
});
