// Pruebas de la localidad. Direcciones INVENTADAS (ningún negocio real).
import { describe, expect, it } from 'vitest';
import { elegirLocalidad, esCodigoPostal, limpiarLocalidad, localidadDesdeDireccion } from './localidad.js';
import { mapearFilaGosom } from './gosom.js';

describe('esCodigoPostal', () => {
  it('reconoce CPA, CP corto y CP numérico', () => {
    for (const cp of ['X5000AVJ', 'x5001cda', 'X5000', '5000']) expect(esCodigoPostal(cp)).toBe(true);
  });

  it('no confunde nombres con códigos', () => {
    for (const nombre of ['Córdoba', 'AAU', '500', 'X500AVJ', '25 de Mayo']) expect(esCodigoPostal(nombre)).toBe(false);
  });
});

describe('limpiarLocalidad (la "city" de Google)', () => {
  it('nombres válidos quedan igual', () => {
    for (const nombre of ['Córdoba', 'La Calera', 'Villa Allende', 'Guiñazu', '25 de Mayo', '9 de Julio']) {
      expect(limpiarLocalidad(nombre)).toBe(nombre);
    }
  });

  it('CPA, CP corto o numérico solos -> null', () => {
    for (const cp of ['X5000AVJ', 'X5001CDA', 'X5000', '5000']) expect(limpiarLocalidad(cp)).toBeNull();
  });

  it('pedazos de 3 letras mayúsculas -> null', () => {
    for (const pedazo of ['AAU', 'AES', 'AHB', 'FDC', 'IRB', 'KQD']) expect(limpiarLocalidad(pedazo)).toBeNull();
  });

  it('código pegado adelante o atrás: se saca y queda el nombre', () => {
    expect(limpiarLocalidad('X5000AVJ Córdoba')).toBe('Córdoba');
    expect(limpiarLocalidad('5000 Córdoba')).toBe('Córdoba');
    expect(limpiarLocalidad('Villa Allende X5105')).toBe('Villa Allende');
  });

  it('barrios, calles y vacíos -> null', () => {
    for (const valor of ['B° Inventado', 'Bº Inventado', 'Barrio Inventado', 'Calle Falsa 123', '', '   ', null, undefined]) {
      expect(limpiarLocalidad(valor)).toBeNull();
    }
  });

  it('espacios de más se limpian', () => {
    expect(limpiarLocalidad('  Villa   Allende ')).toBe('Villa Allende');
  });
});

describe('localidadDesdeDireccion', () => {
  it('CPA completo antes de la localidad', () => {
    expect(localidadDesdeDireccion('Calle Falsa 123, X5000AVJ Córdoba, Córdoba, Argentina', 'Córdoba')).toBe('Córdoba');
  });

  it('CP numérico antes de la localidad', () => {
    expect(localidadDesdeDireccion('Calle Falsa 123, 5000 Córdoba, Córdoba', 'Córdoba')).toBe('Córdoba');
  });

  it('CP corto, sin provincia', () => {
    expect(localidadDesdeDireccion('Calle Falsa 123, X5105 Villa Allende', null)).toBe('Villa Allende');
  });

  it('con barrio y código postal: gana la parte del código', () => {
    expect(localidadDesdeDireccion('Calle Falsa 123, B° Inventado, X5000AVJ Córdoba', 'Córdoba')).toBe('Córdoba');
  });

  it('sin código postal y permitido: la parte antes de la provincia', () => {
    expect(localidadDesdeDireccion('Calle Falsa 123, Villa Allende, Córdoba', 'Córdoba', true)).toBe('Villa Allende');
    expect(localidadDesdeDireccion('Calle Falsa 123, La Calera, Provincia de Córdoba, Argentina', 'Córdoba', true)).toBe('La Calera');
    expect(localidadDesdeDireccion('Calle Falsa 123, Córdoba, Cordoba', 'Córdoba', true)).toBe('Córdoba');
  });

  it('sin código postal y NO permitido (por defecto) -> null', () => {
    expect(localidadDesdeDireccion('Calle Falsa 123, Villa Allende, Córdoba', 'Córdoba')).toBeNull();
    expect(localidadDesdeDireccion('Calle Falsa 123, Villa Allende, Córdoba', 'Córdoba', false)).toBeNull();
  });

  it('con código postal no hace falta permiso', () => {
    expect(localidadDesdeDireccion('Calle Falsa 123, X5105 Villa Allende, Córdoba', 'Córdoba', false)).toBe('Villa Allende');
  });

  it('sin código postal y la parte antes de la provincia es un barrio con "B°" -> null', () => {
    expect(localidadDesdeDireccion('Calle Falsa 123, B° Inventado, Córdoba', 'Córdoba', true)).toBeNull();
  });

  it('ante la duda, null', () => {
    expect(localidadDesdeDireccion('Calle Falsa 123', 'Córdoba')).toBeNull(); // solo calle
    expect(localidadDesdeDireccion('Calle Falsa 123, Villa Allende', 'Córdoba')).toBeNull(); // sin provincia ni código
    expect(localidadDesdeDireccion('Calle Falsa 123, Villa Allende, Córdoba', null, true)).toBeNull(); // provincia desconocida
    expect(localidadDesdeDireccion('Calle Falsa 123, X5000AVJ, Santa Fe', 'Córdoba')).toBeNull(); // el código está solo
    expect(localidadDesdeDireccion('', 'Córdoba')).toBeNull();
    expect(localidadDesdeDireccion(null, 'Córdoba')).toBeNull();
  });

  it('la calle (primera parte) nunca es la localidad', () => {
    expect(localidadDesdeDireccion('X5000 Calle Inventada, Córdoba', 'Córdoba')).toBeNull();
  });
});

describe('elegirLocalidad', () => {
  const direccion = 'Calle Falsa 123, X5000AVJ Córdoba, Córdoba, Argentina';

  it('si la city de Google sirve, se usa', () => {
    expect(elegirLocalidad({ city: 'Villa Allende', direccion, provincia: 'Córdoba' })).toBe('Villa Allende');
  });

  it('si la city es un código o un pedazo, se saca de la dirección', () => {
    expect(elegirLocalidad({ city: 'X5000AVJ', direccion, provincia: 'Córdoba' })).toBe('Córdoba');
    expect(elegirLocalidad({ city: 'AAU', direccion, provincia: 'Córdoba' })).toBe('Córdoba');
    expect(elegirLocalidad({ city: '5000', direccion, provincia: 'Córdoba' })).toBe('Córdoba');
  });

  it('si la city está vacía, se saca de la dirección', () => {
    expect(elegirLocalidad({ city: null, direccion: 'Calle Falsa 123, Villa Allende, Córdoba', provincia: 'Córdoba' })).toBe(
      'Villa Allende',
    );
  });

  it('opción 2: si la city vino con código o pedazo, NO se usa la parte antes de la provincia', () => {
    const sinCodigo = 'Calle Falsa 123, Villa Allende, Córdoba';
    expect(elegirLocalidad({ city: 'FDC', direccion: sinCodigo, provincia: 'Córdoba' })).toBeNull();
    expect(elegirLocalidad({ city: 'X5000AVJ', direccion: sinCodigo, provincia: 'Córdoba' })).toBeNull();
    expect(elegirLocalidad({ city: '5000', direccion: sinCodigo, provincia: 'Córdoba' })).toBeNull();
  });

  it('city con espacios solamente cuenta como vacía', () => {
    expect(elegirLocalidad({ city: '   ', direccion: 'Calle Falsa 123, Villa Allende, Córdoba', provincia: 'Córdoba' })).toBe(
      'Villa Allende',
    );
  });

  it('si ninguna sirve, null (no se inventa)', () => {
    expect(elegirLocalidad({ city: 'KQD', direccion: 'Calle Falsa 123', provincia: 'Córdoba' })).toBeNull();
  });
});

describe('mapearFilaGosom usa la regla nueva', () => {
  const completa = (city: string) => JSON.stringify({ city, state: 'Córdoba', country: 'AR' });

  it('city con CPA -> localidad desde la dirección', () => {
    const lead = mapearFilaGosom({
      title: 'Almacén Inventado',
      address: 'Calle Falsa 123, X5000AVJ Córdoba, Córdoba',
      complete_address: completa('X5000AVJ'),
    });
    expect(lead?.localidad).toBe('Córdoba');
    expect(lead?.fuentes['localidad']).toEqual(['gosom']);
  });

  it('city con pedazo de CPA y dirección sin código -> sin localidad (opción 2)', () => {
    const lead = mapearFilaGosom({
      title: 'Almacén Inventado',
      address: 'Calle Falsa 123, Villa Allende, Córdoba',
      complete_address: completa('AES'),
    });
    expect(lead?.localidad).toBeUndefined();
  });

  it('city vacía y dirección sin código -> la parte antes de la provincia', () => {
    const lead = mapearFilaGosom({
      title: 'Almacén Inventado',
      address: 'Calle Falsa 123, Villa Allende, Córdoba',
      complete_address: completa(''),
    });
    expect(lead?.localidad).toBe('Villa Allende');
  });

  it('city con pedazo de CPA y dirección sin datos -> sin localidad', () => {
    const lead = mapearFilaGosom({ title: 'Almacén Inventado', address: 'Calle Falsa 123', complete_address: completa('FDC') });
    expect(lead?.localidad).toBeUndefined();
    expect(lead?.fuentes['localidad']).toBeUndefined();
    expect(lead?.provincia).toBe('Córdoba');
  });

  it('sin complete_address pero con código en la dirección -> localidad desde la dirección', () => {
    const lead = mapearFilaGosom({ title: 'Almacén Inventado', address: 'Calle Falsa 123, X5105 Villa Allende' });
    expect(lead?.localidad).toBe('Villa Allende');
    expect(lead?.provincia).toBeUndefined();
  });
});
