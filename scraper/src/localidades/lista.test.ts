// Pruebas de la validación de localidades contra la lista oficial.
// Las direcciones y los negocios son INVENTADOS. Los nombres de localidades
// son públicos (lista oficial); "Ixa" es una entrada SIMULADA de 3 letras
// (en la lista oficial de Córdoba no hay ninguna de 3 letras; las más
// cortas tienen 4, como Nono).
import { describe, expect, it } from 'vitest';
import { mapearFilaGosom } from '../limpieza/gosom.js';
import { elegirLocalidad } from '../limpieza/localidad.js';
import { crearListaLocalidades, LISTA_VACIA } from './lista.js';

const lista = crearListaLocalidades([
  { nombre: 'Córdoba', provincia: 'Córdoba', municipio: 'Córdoba', localidad_censal: 'Córdoba' },
  { nombre: 'Guiñazú Norte', provincia: 'Córdoba', municipio: 'Córdoba', localidad_censal: 'Córdoba' },
  { nombre: 'Villa Allende', provincia: 'Córdoba', municipio: 'Villa Allende', localidad_censal: 'Villa Allende' },
  { nombre: 'Rí­o Tercero', provincia: 'Córdoba', municipio: 'Río Tercero', localidad_censal: null },
  { nombre: 'Nono', provincia: 'Córdoba', municipio: 'Nono', localidad_censal: 'Nono' },
  { nombre: 'Ixa', provincia: 'Córdoba', municipio: null, localidad_censal: null },
  { nombre: 'Barrio Simulado Sur', provincia: 'Córdoba', municipio: 'Municipio Simulado', localidad_censal: null },
]);

const elegir = (city: string | null, direccion: string | null, provincia: string | null = 'Córdoba') =>
  elegirLocalidad({ city, direccion, provincia }, lista);

describe('crearListaLocalidades', () => {
  it('sabe qué provincias tienen lista (sin importar tildes ni "Provincia de")', () => {
    expect(lista.tieneLista('Córdoba')).toBe(true);
    expect(lista.tieneLista('cordoba')).toBe(true);
    expect(lista.tieneLista('Provincia de Córdoba')).toBe(true);
    expect(lista.tieneLista('Santa Fe')).toBe(false);
    expect(lista.tieneLista(null)).toBe(false);
    expect(LISTA_VACIA.tieneLista('Córdoba')).toBe(false);
  });

  it('devuelve el nombre oficial sin importar tildes ni mayúsculas', () => {
    expect(lista.oficial('cordoba', 'Córdoba')).toBe('Córdoba');
    expect(lista.oficial('VILLA ALLENDE', 'Córdoba')).toBe('Villa Allende');
    expect(lista.oficial('Guiñazu Norte', 'Córdoba')).toBe('Guiñazú Norte');
    expect(lista.oficial('Rio Tercero', 'Córdoba')).toBe('Río Tercero'); // sin el invisible
  });

  it('acepta también el nombre del municipio', () => {
    expect(lista.oficial('Municipio Simulado', 'Córdoba')).toBe('Municipio Simulado');
  });

  it('no acepta nombres de otra provincia ni que no estén', () => {
    expect(lista.oficial('Villa Allende', 'Santa Fe')).toBeNull();
    expect(lista.oficial('Nueva Inventada', 'Córdoba')).toBeNull();
  });
});

describe('elegirLocalidad con lista oficial', () => {
  it('city oficial con o sin tildes y mayúsculas -> nombre oficial', () => {
    expect(elegir('Cordoba', 'Calle Falsa 123')).toBe('Córdoba');
    expect(elegir('VILLA ALLENDE', 'Calle Falsa 123')).toBe('Villa Allende');
  });

  it('"Guiñazú" y "Guiñazu" no están en la lista (solo "Guiñazú Norte"): se usa la dirección', () => {
    expect(elegir('Guiñazú', 'Calle Falsa 123, X5000AVJ Córdoba, Córdoba')).toBe('Córdoba');
    expect(elegir('Guiñazu', 'Calle Falsa 123, X5000 Córdoba')).toBe('Córdoba');
    expect(elegir('Guiñazu', 'Calle Falsa 123')).toBeNull();
    expect(elegir('Guiñazu Norte', 'Calle Falsa 123')).toBe('Guiñazú Norte');
  });

  it('nombres cortos que están en la lista se aceptan aunque vengan en mayúsculas', () => {
    expect(elegir('NONO', 'Calle Falsa 123')).toBe('Nono');
    expect(elegir('IXA', 'Calle Falsa 123')).toBe('Ixa');
  });

  it('códigos postales y pedazos (AAU) no están en la lista: se usa la dirección', () => {
    const direccion = 'Calle Falsa 123, X5000AVJ Córdoba, Córdoba, Argentina';
    expect(elegir('X5000AVJ', direccion)).toBe('Córdoba');
    expect(elegir('AAU', direccion)).toBe('Córdoba');
    expect(elegir('5000', direccion)).toBe('Córdoba');
    expect(elegir('X5000AVJ Córdoba', 'Calle Falsa 123')).toBe('Córdoba');
  });

  it('código o pedazo y dirección sin código: vacía (opción 2)', () => {
    expect(elegir('AAU', 'Calle Falsa 123, Villa Allende, Córdoba')).toBeNull();
  });

  it('city vacía: la parte antes de la provincia, solo si está en la lista', () => {
    expect(elegir(null, 'Calle Falsa 123, Villa Allende, Córdoba')).toBe('Villa Allende');
    expect(elegir('', 'Calle Falsa 123, Barrio Inventado, Córdoba')).toBeNull(); // barrio que no está
  });

  it('nombre que no está en la lista: vacía (no se inventa)', () => {
    expect(elegir('Nueva Inventada', 'Calle Falsa 123')).toBeNull();
  });

  it('provincia sin lista: regla de antes (sin validar contra la lista)', () => {
    expect(elegir('Ciudad Inventada', 'Calle Falsa 123', 'Santa Fe')).toBe('Ciudad Inventada');
    expect(elegir('AAU', 'Calle Falsa 123, S2000 Ciudad Inventada', 'Santa Fe')).toBe('Ciudad Inventada');
    expect(elegir('AAU', 'Calle Falsa 123', 'Santa Fe')).toBeNull();
  });

  it('sin lista (o vacía): igual que antes', () => {
    expect(elegirLocalidad({ city: 'Nueva Inventada', direccion: null, provincia: 'Córdoba' })).toBe('Nueva Inventada');
    expect(elegirLocalidad({ city: 'Nueva Inventada', direccion: null, provincia: 'Córdoba' }, LISTA_VACIA)).toBe('Nueva Inventada');
  });
});

describe('mapearFilaGosom con lista oficial', () => {
  const completa = (city: string) => JSON.stringify({ city, state: 'Córdoba', country: 'AR' });

  it('guarda el nombre oficial', () => {
    const lead = mapearFilaGosom({ title: 'Almacén Inventado', address: 'Calle Falsa 123', complete_address: completa('cordoba') }, lista);
    expect(lead?.localidad).toBe('Córdoba');
    expect(lead?.fuentes['localidad']).toEqual(['gosom']);
  });

  it('nombre fuera de la lista y dirección sin datos: sin localidad', () => {
    const lead = mapearFilaGosom(
      { title: 'Almacén Inventado', address: 'Calle Falsa 123', complete_address: completa('Barrio Inventado') },
      lista,
    );
    expect(lead?.localidad).toBeUndefined();
    expect(lead?.fuentes['localidad']).toBeUndefined();
  });
});
