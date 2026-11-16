// Pruebas de unión de leads. Todos los datos son inventados.
import { describe, expect, it } from 'vitest';
import type { Lead } from './tipos.js';
import { unirLeads } from './union.js';

function lead(datos: Partial<Lead>): Lead {
  return { nombre: 'Almacén Prueba', fuentes: { nombre: ['gosom'] }, ...datos };
}

describe('unirLeads: completar vacíos', () => {
  it('toma del nuevo los campos que el existente no tiene, con su fuente', () => {
    const existente = lead({ id: 'id-1', celular: '+5493515550123', fuentes: { nombre: ['gosom'], celular: ['gosom'] } });
    const nuevo = lead({
      email: 'ventas@ficticia.test',
      instagram: '@almacen_prueba',
      fuentes: { nombre: ['sitio_web'], email: ['sitio_web'], instagram: ['sitio_web'] },
    });

    const unido = unirLeads(existente, nuevo);

    expect(unido.id).toBe('id-1');
    expect(unido.celular).toBe('+5493515550123');
    expect(unido.email).toBe('ventas@ficticia.test');
    expect(unido.instagram).toBe('@almacen_prueba');
    expect(unido.fuentes).toEqual({
      nombre: ['gosom', 'sitio_web'],
      celular: ['gosom'],
      email: ['sitio_web'],
      instagram: ['sitio_web'],
    });
  });
});

describe('unirLeads: mismo dato', () => {
  it('suma las fuentes sin repetirlas', () => {
    const existente = lead({ celular: '+5493515550123', fuentes: { nombre: ['gosom'], celular: ['gosom'] } });
    const nuevo = lead({ celular: '+5493515550123', fuentes: { nombre: ['gosom'], celular: ['gosom', 'web'] } });

    const unido = unirLeads(existente, nuevo);

    expect(unido.celular).toBe('+5493515550123');
    expect(unido.fuentes['celular']).toEqual(['gosom', 'web']);
    expect(unido.fuentes['nombre']).toEqual(['gosom']);
  });

  it('considera iguales textos que solo difieren en tildes o mayúsculas', () => {
    const existente = lead({ localidad: 'Córdoba', fuentes: { localidad: ['gosom'] } });
    const nuevo = lead({ localidad: 'CORDOBA', fuentes: { localidad: ['web'] } });

    const unido = unirLeads(existente, nuevo);

    expect(unido.localidad).toBe('Córdoba');
    expect(unido.fuentes['localidad']).toEqual(['gosom', 'web']);
  });
});

describe('unirLeads: datos distintos -> gana lo existente', () => {
  it('celular distinto: se queda el existente', () => {
    const existente = lead({ celular: '+5493515550123', fuentes: { celular: ['gosom'] } });
    const nuevo = lead({ celular: '+5493515550199', fuentes: { celular: ['web'] } });

    const unido = unirLeads(existente, nuevo);

    expect(unido.celular).toBe('+5493515550123');
    expect(unido.fuentes['celular']).toEqual(['gosom']);
  });

  it('dirección ampliada: gana la más completa y suma fuentes', () => {
    const existente = lead({ direccion: 'Calle Falsa 123', fuentes: { direccion: ['gosom'] } });
    const nuevo = lead({ direccion: 'Calle Falsa 123, X5000 Córdoba', fuentes: { direccion: ['web'] } });

    const unido = unirLeads(existente, nuevo);

    expect(unido.direccion).toBe('Calle Falsa 123, X5000 Córdoba');
    expect(unido.fuentes['direccion']).toEqual(['gosom', 'web']);
  });

  it('dirección distinta (no ampliada): se queda la existente', () => {
    const existente = lead({ direccion: 'Calle Falsa 123' });
    const nuevo = lead({ direccion: 'Avenida Inventada 456' });

    expect(unirLeads(existente, nuevo).direccion).toBe('Calle Falsa 123');
  });

  it('nombre ampliado: gana el más completo', () => {
    const existente = lead({ nombre: 'Distribuidora Ejemplo' });
    const nuevo = lead({ nombre: 'Distribuidora Ejemplo Norte SRL' });

    expect(unirLeads(existente, nuevo).nombre).toBe('Distribuidora Ejemplo Norte SRL');
  });
});

describe('unirLeads: lo cargado a mano no se toca', () => {
  it('dirección manual: no se amplía', () => {
    const existente = lead({ direccion: 'Calle Falsa 123', fuentes: { direccion: ['manual'] } });
    const nuevo = lead({ direccion: 'Calle Falsa 123, X5000 Córdoba', fuentes: { direccion: ['gosom'] } });

    const unido = unirLeads(existente, nuevo);

    expect(unido.direccion).toBe('Calle Falsa 123');
    expect(unido.fuentes['direccion']).toEqual(['manual']);
  });

  it('nombre manual: no se amplía', () => {
    const existente = lead({ nombre: 'Almacén Prueba', fuentes: { nombre: ['manual'] } });
    const nuevo = lead({ nombre: 'Almacén Prueba Sucursal Centro', fuentes: { nombre: ['gosom'] } });

    expect(unirLeads(existente, nuevo).nombre).toBe('Almacén Prueba');
  });

  it('notas, descartado y motivo_descarte siempre se conservan', () => {
    const existente = lead({ notas: 'Llamar a la tarde', descartado: true, motivo_descarte: 'No vende al por mayor' });
    const nuevo = lead({ notas: 'texto que no debe entrar', descartado: false, motivo_descarte: null });

    const unido = unirLeads(existente, nuevo);

    expect(unido.notas).toBe('Llamar a la tarde');
    expect(unido.descartado).toBe(true);
    expect(unido.motivo_descarte).toBe('No vende al por mayor');
  });

  it('notas vacías en el existente: tampoco se toman del nuevo', () => {
    const unido = unirLeads(lead({}), lead({ notas: 'texto de otra fuente' }));
    expect(unido.notas).toBeNull();
    expect(unido.descartado).toBe(false);
  });

  it('rating manual: no se reemplaza aunque el nuevo tenga más reseñas', () => {
    const existente = lead({ rating: 3, resenas: 5, fuentes: { rating: ['manual'], resenas: ['manual'] } });
    const nuevo = lead({ rating: 4.5, resenas: 50, fuentes: { rating: ['gosom'], resenas: ['gosom'] } });

    const unido = unirLeads(existente, nuevo);

    expect(unido.rating).toBe(3);
    expect(unido.resenas).toBe(5);
  });
});

describe('unirLeads: rating y reseñas', () => {
  it('se toman del registro con más reseñas', () => {
    const existente = lead({ rating: 4.1, resenas: 10, fuentes: { rating: ['gosom'], resenas: ['gosom'] } });
    const nuevo = lead({ rating: 4.3, resenas: 25, fuentes: { rating: ['gosom'], resenas: ['gosom'] } });

    const unido = unirLeads(existente, nuevo);

    expect(unido.rating).toBe(4.3);
    expect(unido.resenas).toBe(25);
  });

  it('si el nuevo tiene menos reseñas, se queda lo existente', () => {
    const existente = lead({ rating: 4.1, resenas: 30 });
    const nuevo = lead({ rating: 2, resenas: 3 });

    const unido = unirLeads(existente, nuevo);

    expect(unido.rating).toBe(4.1);
    expect(unido.resenas).toBe(30);
  });

  it('completa el rating si el existente no lo tenía', () => {
    const unido = unirLeads(lead({ resenas: 30 }), lead({ rating: 4, resenas: 3, fuentes: { rating: ['gosom'] } }));
    expect(unido.rating).toBe(4);
    expect(unido.resenas).toBe(30);
    expect(unido.fuentes['rating']).toEqual(['gosom']);
  });
});

describe('unirLeads: coordenadas', () => {
  it('completa coordenadas si faltan', () => {
    const unido = unirLeads(lead({}), lead({ lat: -31.4, lng: -64.18, fuentes: { lat: ['gosom'], lng: ['gosom'] } }));
    expect(unido.lat).toBe(-31.4);
    expect(unido.lng).toBe(-64.18);
    expect(unido.fuentes['lat']).toEqual(['gosom']);
  });

  it('no pisa coordenadas existentes', () => {
    const unido = unirLeads(lead({ lat: -31.4, lng: -64.18 }), lead({ lat: -31.5, lng: -64.2 }));
    expect(unido.lat).toBe(-31.4);
    expect(unido.lng).toBe(-64.18);
  });
});

describe('unirLeads: robustez', () => {
  it('no modifica los objetos recibidos', () => {
    const existente = lead({ celular: '+5493515550123', fuentes: { celular: ['gosom'] } });
    const nuevo = lead({ email: 'ventas@ficticia.test', fuentes: { email: ['web'] } });
    const copiaE = structuredClone(existente);
    const copiaN = structuredClone(nuevo);

    unirLeads(existente, nuevo);

    expect(existente).toEqual(copiaE);
    expect(nuevo).toEqual(copiaN);
  });

  it('acepta fuentes guardadas como texto suelto', () => {
    const existente = lead({
      celular: '+5493515550123',
      fuentes: { celular: 'gosom' } as unknown as Lead['fuentes'],
    });
    const nuevo = lead({ celular: '+5493515550123', fuentes: { celular: ['web'] } });

    expect(unirLeads(existente, nuevo).fuentes['celular']).toEqual(['gosom', 'web']);
  });

  it('valores vacíos del nuevo no borran nada', () => {
    const existente = lead({ email: 'ventas@ficticia.test', direccion: 'Calle Falsa 123' });
    const nuevo = lead({ email: '', direccion: null });

    const unido = unirLeads(existente, nuevo);

    expect(unido.email).toBe('ventas@ficticia.test');
    expect(unido.direccion).toBe('Calle Falsa 123');
  });
});
