// Pruebas de duplicados. Negocios, teléfonos y sitios inventados.
import { describe, expect, it } from 'vitest';
import { sonMismoNegocio } from './duplicados.js';
import type { Lead } from './tipos.js';

// Punto base y puntos a distintas distancias hacia el sur (≈ 111,2 m por 0,001°)
const BASE = { lat: -31.4, lng: -64.18 };
const A_30_M = { lat: -31.40027, lng: -64.18 };
const A_80_M = { lat: -31.40072, lng: -64.18 };
const A_500_M = { lat: -31.4045, lng: -64.18 };
const A_2_KM = { lat: -31.418, lng: -64.18 };

function lead(datos: Partial<Lead>): Lead {
  return { nombre: 'Negocio Ficticio', fuentes: {}, ...datos };
}

describe('sonMismoNegocio: google_place_id', () => {
  it('mismo place_id -> mismo negocio (aunque cambie el nombre y estén lejos)', () => {
    const a = lead({ nombre: 'Almacén Prueba', google_place_id: 'ChIJ_FICTICIO_001', ...BASE });
    const b = lead({ nombre: 'Otro Nombre', google_place_id: 'ChIJ_FICTICIO_001', ...A_2_KM });
    expect(sonMismoNegocio(a, b)).toBe(true);
  });

  it('place_id distinto y nada más en común -> distintos', () => {
    const a = lead({ nombre: 'Almacén Prueba', google_place_id: 'ChIJ_FICTICIO_001' });
    const b = lead({ nombre: 'Kiosco Inventado', google_place_id: 'ChIJ_FICTICIO_002' });
    expect(sonMismoNegocio(a, b)).toBe(false);
  });
});

describe('sonMismoNegocio: teléfono', () => {
  it('mismo celular escrito distinto, sin coordenadas -> mismo', () => {
    const a = lead({ nombre: 'Almacén Prueba', celular: '+5493515550123' });
    const b = lead({ nombre: 'Kiosco Inventado', celular: '0351 15 555-0123' });
    expect(sonMismoNegocio(a, b)).toBe(true);
  });

  it('mismo fijo -> mismo', () => {
    const a = lead({ nombre: 'Almacén Prueba', telefono_fijo: '+543515550123' });
    const b = lead({ nombre: 'Kiosco Inventado', telefono_fijo: '(0351) 555-0123' });
    expect(sonMismoNegocio(a, b)).toBe(true);
  });

  it('fijo en uno y sin clasificar en el otro (mismo número) -> mismo', () => {
    const a = lead({ nombre: 'Almacén Prueba', telefono_fijo: '+543515550123' });
    const b = lead({ nombre: 'Kiosco Inventado', telefono_sin_clasificar: '+543515550123' });
    expect(sonMismoNegocio(a, b)).toBe(true);
  });

  it('mismo teléfono a 500 m -> mismo', () => {
    const a = lead({ celular: '+5493515550123', ...BASE });
    const b = lead({ nombre: 'Otro', celular: '+5493515550123', ...A_500_M });
    expect(sonMismoNegocio(a, b)).toBe(true);
  });

  it('PROTECCIÓN: mismo teléfono a más de 1 km -> NO es el mismo', () => {
    const a = lead({ nombre: 'Cadena Ficticia Sucursal 1', celular: '+5493515550123', ...BASE });
    const b = lead({ nombre: 'Cadena Ficticia Sucursal 2', celular: '+5493515550123', ...A_2_KM });
    expect(sonMismoNegocio(a, b)).toBe(false);
  });

  it('mismo teléfono y solo uno tiene coordenadas -> mismo', () => {
    const a = lead({ celular: '+5493515550123', ...BASE });
    const b = lead({ nombre: 'Otro', celular: '+5493515550123' });
    expect(sonMismoNegocio(a, b)).toBe(true);
  });

  it('teléfonos distintos -> distintos', () => {
    const a = lead({ nombre: 'Almacén Prueba', celular: '+5493515550123' });
    const b = lead({ nombre: 'Kiosco Inventado', celular: '+5493515550124' });
    expect(sonMismoNegocio(a, b)).toBe(false);
  });

  it('teléfonos inválidos no cuentan como iguales', () => {
    const a = lead({ nombre: 'Almacén Prueba', celular: 'abc' });
    const b = lead({ nombre: 'Kiosco Inventado', celular: 'abc' });
    expect(sonMismoNegocio(a, b)).toBe(false);
  });
});

describe('sonMismoNegocio: nombre + distancia', () => {
  it('nombres parecidos a 30 m -> mismo', () => {
    const a = lead({ nombre: 'Distribuidora Ejemplo Norte', ...BASE });
    const b = lead({ nombre: 'Distribuidora Ejemplo Norte SRL', ...A_30_M });
    expect(sonMismoNegocio(a, b)).toBe(true);
  });

  it('nombres parecidos a 80 m -> distintos', () => {
    const a = lead({ nombre: 'Distribuidora Ejemplo Norte', ...BASE });
    const b = lead({ nombre: 'Distribuidora Ejemplo Norte SRL', ...A_80_M });
    expect(sonMismoNegocio(a, b)).toBe(false);
  });

  it('nombres parecidos sin coordenadas -> distintos', () => {
    const a = lead({ nombre: 'Distribuidora Ejemplo Norte' });
    const b = lead({ nombre: 'Distribuidora Ejemplo Norte' });
    expect(sonMismoNegocio(a, b)).toBe(false);
  });

  it('nombres distintos a 10 m -> distintos', () => {
    const a = lead({ nombre: 'Kiosco El Sol', ...BASE });
    const b = lead({ nombre: 'Kiosco La Luna', lat: -31.40009, lng: -64.18 });
    expect(sonMismoNegocio(a, b)).toBe(false);
  });
});

describe('sonMismoNegocio: sitio web', () => {
  it('el mismo sitio web SOLO nunca alcanza', () => {
    const a = lead({ nombre: 'Cadena Ficticia Centro', sitio_web: 'https://cadena-ficticia.test', ...BASE });
    const b = lead({ nombre: 'Cadena Ficticia Barrio', sitio_web: 'https://cadena-ficticia.test', ...A_2_KM });
    expect(sonMismoNegocio(a, b)).toBe(false);
  });
});
